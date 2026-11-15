#!/usr/bin/env python3
"""
Turns a submitted write-up issue form into a markdown file in the right folder.

Run by .github/workflows/writeup-from-issue.yml. It reads the issue from the
event file GitHub provides ($GITHUB_EVENT_PATH), so issue text is never passed
through the shell.

Where the file goes:
  CTF               ->  CTF/<platform>/<case-name>/README.md
  Sherlock          ->  sherlocks/<platform>/<case-name>/README.md
  Malware analysis  ->  malware-analysis/<case-name>/README.md
  Tool              ->  tools/<tool-name>/README.md

ATT&CK techniques typed in the form are checked against data/attack.json.
Renamed IDs are replaced, unknown ones stop the run with an explanation, and
suggestions from the text are written to $RUNNER_TEMP/attack_notes.md, which
the workflow posts on the issue.

If "Existing file to replace" is filled in, that file is overwritten instead.
The form fields are written as front matter, which scripts/build_manifest.py
reads to build the list shown on the site.
"""
import json
import os
import re
import sys
from pathlib import Path

import attack_map

ROOT = Path(__file__).resolve().parent.parent

SECTIONS = {
    "CTF":              {"root": "CTF",              "by_platform": True},
    "Sherlock":         {"root": "sherlocks",        "by_platform": True},
    "Malware analysis": {"root": "malware-analysis", "by_platform": False},
    "Tool":             {"root": "tools",            "by_platform": False},
}
SITE_SECTION = {"CTF": "ctf", "Sherlock": "sherlocks", "Malware analysis": "malware", "Tool": "tools"}

# Folder names already used in the repo for each platform.
PLATFORM_DIRS = {
    "Hack The Box": "HTB", "TryHackMe": "THM", "Root-Me": "Rootme",
    "BreachLab": "Breachlabs", "OverTheWire": "Overthewire",
}

# Every field label used by the four forms. "Write-up" must stay the last
# field in each form: everything after its heading belongs to the write-up,
# including any "### ..." headings inside it.
LABELS = ["Section", "Case name", "Tool name", "Platform", "Other platform", "Source", "Difficulty",
          "Analysis type", "Creator or maintainer", "Homepage or repository", "License", "Category",
          "Platforms", "Use", "Status", "ATT&CK techniques", "Tags", "Summary",
          "Existing file to replace", "Write-up"]
LAST = "Write-up"
EMPTY = {"", "_No response_", "None", "Not rated"}


def fail(message):
    tmp = os.environ.get("RUNNER_TEMP", "/tmp")
    Path(tmp, "writeup_error.txt").write_text(message + "\n", encoding="utf-8")
    print("error: " + message, file=sys.stderr)
    sys.exit(1)


def output(**pairs):
    target = os.environ.get("GITHUB_OUTPUT")
    lines = [f"{k}={v}" for k, v in pairs.items()]
    if target:
        with open(target, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


def parse_form(body):
    fields, current, seen = {}, None, set()
    for line in body.replace("\r\n", "\n").split("\n"):
        m = re.fullmatch(r"### (.+?)\s*", line)
        if m and current != LAST and m.group(1) in LABELS and m.group(1) not in seen:
            current = m.group(1)
            seen.add(current)
            fields[current] = []
        elif current:
            fields[current].append(line)
    clean = {}
    for key, lines in fields.items():
        value = "\n".join(lines).strip()
        clean[key] = "" if value in EMPTY else value
    return clean


def checked(text):
    """Ticked boxes of a checkboxes field: "- [X] Linux" -> ["Linux"]."""
    return [m.group(1).strip() for m in re.finditer(r"^- \[[xX]\] (.+)$", text, re.M)]


def write_notes(text):
    tmp = os.environ.get("RUNNER_TEMP", "/tmp")
    Path(tmp, "attack_notes.md").write_text(text, encoding="utf-8")


def attack_report(ids, notes, hits, software):
    lines = ["**ATT&CK mapping**", ""]
    lines.append("Mapped: " + (", ".join(attack_map.label(t) for t in ids) if ids else "nothing yet."))
    for n in notes:
        lines += ["", n]
    from_text = [(t, why) for t, why in hits if not why.startswith("ATT&CK lists")]
    from_attack = [t for t, why in hits if why.startswith("ATT&CK lists")]
    if from_text:
        lines += ["", "Suggested from your text (not added yet, keep only what you actually did or saw):", ""]
        lines += [f"- `{tid}` {attack_map.label(tid)[len(tid) + 1:]}: {why}" for tid, why in from_text[:10]]
    if software:
        sid, s = software
        lines += ["", f"ATT&CK lists **{s['name']}** as software [{sid}](https://attack.mitre.org/software/{sid}/), "
                      "and its page on the site will link there."]
        if from_attack:
            lines += [f"ATT&CK says it uses {len(from_attack)} techniques you have not mapped yet:", ""]
            lines += [f"- `{tid}` {attack_map.label(tid)[len(tid) + 1:]}" for tid in from_attack[:15]]
            if len(from_attack) > 15:
                lines.append(f"- and {len(from_attack) - 15} more on the ATT&CK page")
    picks = [t for t, _ in from_text[:5]] or from_attack[:5]
    if picks:
        lines += ["", "To add some, edit the issue and put them in \"ATT&CK techniques\", for example:",
                  "", "```", ", ".join(ids + picks), "```"]
    return "\n".join(lines) + "\n"


def one_line(text):
    return re.sub(r"\s+", " ", text).strip()


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:60].strip("-")


def existing_dir(parent, wanted):
    """Reuse a folder that differs only by upper/lower case (HTB vs htb)."""
    if parent.is_dir():
        for child in parent.iterdir():
            if child.is_dir() and child.name.lower() == wanted.lower():
                return child.name
    return wanted


def main():
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    form = parse_form(event["issue"].get("body") or "")

    section_name = form.get("Section", "")
    if section_name not in SECTIONS:
        output(skip="true")          # an ordinary issue, not one of the write-up forms
        return
    section = SECTIONS[section_name]

    title = one_line(form.get("Case name") or form.get("Tool name") or "")
    body = form.get(LAST, "")
    if not title:
        fail("The form has no name. Edit the issue, fill in the name field and save it.")
    if not body:
        fail("The write-up field is empty. Edit the issue, add the write-up text and save it.")

    platform = one_line(form.get("Platform") or form.get("Source") or "")
    if section_name == "Tool":
        platform = one_line(form.get("Creator or maintainer", ""))
    if platform == "Other":
        platform = one_line(form.get("Other platform", ""))
        if not platform:
            fail("Platform is set to \"Other\" but \"Other platform\" is empty. Edit the issue, type the platform name and save it.")

    replace = one_line(form.get("Existing file to replace", ""))
    if replace:
        rel = replace.lstrip("./")
        ok = (re.fullmatch(r"[A-Za-z0-9 _.\-/]+\.md", rel) and ".." not in rel.split("/")
              and rel.split("/")[0] == section["root"] and (ROOT / rel).is_file())
        if not ok:
            fail(f"\"{replace}\" is not an existing .md file inside {section['root']}/. "
                 "Copy the path exactly as it appears in the repo (capital letters matter), or leave the field empty to create a new write-up.")
        mode = "Update"
    else:
        slug = slugify(title)
        if not slug:
            fail("The case name needs at least one letter or number so a folder can be named after it.")
        parts = [section["root"]]
        if section["by_platform"]:
            wanted = PLATFORM_DIRS.get(platform) or slugify(platform) or "other"
            parts.append(existing_dir(ROOT / section["root"], wanted))
        parts.append(existing_dir(ROOT.joinpath(*parts), slug))
        parts.append("README.md")
        rel = "/".join(parts)
        mode = "Update" if (ROOT / rel).is_file() else "Add"

    # Front matter comes from the form, so drop any that was pasted in with the text.
    body = re.sub(r"\A---\s*\n.*?\n---\s*(?:\n|\Z)", "", body, flags=re.S).lstrip("\n")

    # ATT&CK techniques: validate what was typed, then suggest more from the text.
    ids, notes, unknown = attack_map.normalize(form.get("ATT&CK techniques", ""))
    if unknown:
        fail("These are not ATT&CK techniques in the current data: " + ", ".join(unknown) + ". "
             "Use IDs such as T1110.001, separated by commas. To look one up, open the Techniques page on the site "
             "or run `python3 scripts/attack_map.py --find \"brute force\"`. Then edit the issue and save it.")
    site_section = SITE_SECTION[section_name]
    software = attack_map.software_match(title) if site_section in ("tools", "malware") else (None, None)
    hits = attack_map.suggest(body + "\n" + title, title, site_section, ids)
    write_notes(attack_report(ids, notes, hits, software if software[0] else None))

    extra = []
    if section_name == "Tool":
        repo = one_line(form.get("Homepage or repository", ""))
        if not re.fullmatch(r"https?://[^\s<>\"']+", repo):
            fail(f"\"{repo or 'Homepage or repository'}\" is not a web address. Paste a full link that starts with https://, then save the issue.")
        extra = [("creator", platform), ("repo", repo), ("license", one_line(form.get("License", ""))),
                 ("category", one_line(form.get("Category", ""))),
                 ("platforms", ", ".join(checked(form.get("Platforms", ""))))]
        platform = ""
    if software[0]:
        extra.append(("software", software[0]))

    level = one_line(form.get("Difficulty") or form.get("Analysis type") or form.get("Use") or "")
    tags = ", ".join(t for t in (one_line(t) for t in form.get("Tags", "").replace("\n", ",").split(",")) if t)
    meta = [("title", title), ("platform", platform), ("level", level),
            ("status", one_line(form.get("Status", "")) or "complete"),
            ("attack", ", ".join(ids)), ("tags", tags), ("summary", one_line(form.get("Summary", "")))] + extra
    front = "---\n" + "".join(f"{k}: {v}\n" for k, v in meta if v) + "---\n\n"

    target = ROOT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(front + body.rstrip() + "\n", encoding="utf-8")
    output(skip="false", path=rel, title=title, mode=mode)


if __name__ == "__main__":
    main()
