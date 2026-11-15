#!/usr/bin/env python3
"""
Builds data/writeups.js by scanning CTF/, sherlocks/, malware-analysis/ and
tools/ for .md files. Tools are listed in the same file with section "tools".

Where each field comes from (first match wins):
  1. Front matter at the top of the .md file:
         ---
         title: Cap
         platform: Hack The Box
         level: Easy
         status: complete
         attack: T1190, T1040, T1548
         tags: IDOR, pcap, Linux capabilities
         summary: One sentence for the list page.
         ---
     Tools also take: creator, repo (https link), license, category,
     platforms (comma-separated) and software (an ATT&CK S-number).
  2. An entry for that path in data/writeup-meta.json
  3. A guess: title from the first heading, platform from the folder name,
     summary from the first paragraph, status "in progress" for very short files.

Run it locally with:  python3 scripts/build_manifest.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECTIONS = {"CTF": "ctf", "sherlocks": "sherlocks", "malware-analysis": "malware", "malware": "malware",
            "tools": "tools"}
LISTS = ("tags", "attack", "platforms")       # front matter fields written as comma-separated lists
KEYS = ["section", "platform", "title", "path", "level", "status", "attack", "tags", "summary",
        "creator", "repo", "license", "category", "platforms", "software"]
PLATFORMS = {"htb": "Hack The Box", "thm": "TryHackMe", "rootme": "Root-Me", "root-me": "Root-Me",
             "breachlabs": "BreachLab", "breachlab": "BreachLab", "overthewire": "OverTheWire"}
STUB_BYTES = 600   # files shorter than this are treated as work in progress
FM = re.compile(r"\A---\s*\n(.*?)\n---\s*(?:\n|\Z)", re.S)


def front_matter(text):
    m = FM.match(text)
    if not m:
        return {}, text
    data = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            data[k.strip().lower()] = v.strip().strip('"\'')
    for key in LISTS:
        if key in data:
            data[key] = [t.strip() for t in data[key].strip("[]").split(",") if t.strip()]
    return data, text[m.end():]


def check_attack(rel, ids):
    """Upper-case IDs, swap ones MITRE renamed, and warn about unknown ones."""
    if not (ROOT / "data" / "attack.json").exists():
        return [i.upper() for i in ids]
    import attack_map
    good, notes, unknown = attack_map.normalize(", ".join(ids))
    for n in notes:
        print(f"note: {rel}: {n}", file=sys.stderr)
    for u in unknown:
        print(f"warning: {rel}: {u} is not an ATT&CK technique and was left out", file=sys.stderr)
    return good


def guess(path, body, size):
    parts = path.split("/")
    title = next((re.sub(r"^#+\s*", "", l).strip() for l in body.splitlines() if l.startswith("#")),
                 Path(path).stem.replace("_", " ").replace("-", " ").title())
    platform = next((PLATFORMS[p.lower()] for p in parts[1:-1] if p.lower() in PLATFORMS),
                    parts[1] if len(parts) > 2 else parts[0])
    para = next((" ".join(b.split()) for b in re.split(r"\n\s*\n", body)
                 if b.strip() and not b.lstrip().startswith(("#", "|", "```", "<", "---", "!["))), "")
    if len(para) > 180:
        para = para[:177].rsplit(" ", 1)[0] + "..."
    return {"title": title, "platform": platform, "status": "complete" if size >= STUB_BYTES else "in progress",
            "tags": [], "summary": para}


def main():
    meta_file = ROOT / "data" / "writeup-meta.json"
    meta = json.loads(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else {}

    found = {}
    for folder, section in SECTIONS.items():
        base = ROOT / folder
        if not base.is_dir():
            continue
        for f in sorted(base.rglob("*.md")):
            rel = f.relative_to(ROOT).as_posix()
            text = f.read_text(encoding="utf-8", errors="replace")
            fm, body = front_matter(text)
            entry = {"section": section, **guess(rel, body, len(text.encode()))}
            if section == "tools":
                entry.pop("platform")                      # tools show their creator instead
            entry.update({k: v for k, v in meta.get(rel, {}).items() if k != "section" or v})
            entry.update(fm)
            entry["path"] = rel
            if entry.get("attack"):
                entry["attack"] = check_attack(rel, entry["attack"])
            if entry.get("repo") and not re.match(r"https?://", entry["repo"]):
                del entry["repo"]                          # only ever link to web addresses
            found[rel] = entry

    for rel in meta:
        if rel not in found:
            print(f"note: data/writeup-meta.json lists {rel}, but that file no longer exists", file=sys.stderr)

    order = [p for p in meta if p in found] + sorted(p for p in found if p not in meta)
    out = [found[p] for p in order]
    items = [{k: e[k] for k in KEYS if k in e and e[k] not in ("", None, [])} for e in out]

    header = ("/* GENERATED by scripts/build_manifest.py. Do not edit by hand: your changes would be overwritten.\n"
              "   To change a title, summary or tags, add front matter to the .md file or edit data/writeup-meta.json. */\n\n")
    (ROOT / "data" / "writeups.js").write_text(
        header + "const WRITEUPS = " + json.dumps(items, indent=2, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"wrote data/writeups.js with {len(items)} entries")


if __name__ == "__main__":
    main()
