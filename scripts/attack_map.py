#!/usr/bin/env python3
"""
Helps map write-ups and tools to MITRE ATT&CK technique IDs.

Used by scripts/issue_to_writeup.py (the issue bot) and by you from the CLI:

  python3 scripts/attack_map.py CTF/HTB/Easy/cap.md      suggest IDs for one file
  python3 scripts/attack_map.py --all                     every write-up: mapped vs suggested
  python3 scripts/attack_map.py --find "brute force"      look up techniques by name or ID

Suggestions come from three places, strongest first:
  1. ATT&CK's own software list: a tool or malware whose name matches the
     title (Tools and Malware sections only) gets the techniques ATT&CK says it uses
  2. data/attack-keywords.json: commands and words such as nmap or "sudo -l"
  3. technique names written in the text, such as "Password Guessing"
They are suggestions: pick the ones that describe what you actually did.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ID_RE = re.compile(r"\bT\d{4}(?:[./]\d{3})?\b", re.I)
_cache = {}


def data():
    if not _cache:
        d = ROOT / "data"
        _cache["attack"] = json.loads((d / "attack.json").read_text(encoding="utf-8"))
        sw = d / "attack-software.json"
        _cache["software"] = json.loads(sw.read_text(encoding="utf-8")) if sw.exists() else {}
        kw = d / "attack-keywords.json"
        _cache["keywords"] = json.loads(kw.read_text(encoding="utf-8")) if kw.exists() else {}
    return _cache


def techniques():
    return data()["attack"]["techniques"]


def label(tid):
    t = techniques().get(tid)
    if not t:
        return tid
    parent = techniques().get(t.get("parent", ""), {})
    return f"{tid} {parent['name'] + ': ' if parent else ''}{t['name']}"


def normalize(raw):
    """Turn what was typed into valid IDs.

    Accepts IDs (T1110.001, t1110/001) and exact technique names ("Password Guessing").
    Returns (ids, notes, unknown): notes explain replaced or dropped entries.
    """
    tech, att = techniques(), data()["attack"]
    by_name = {}
    for tid, t in tech.items():
        by_name.setdefault(t["name"].lower(), []).append(tid)
    ids, notes, unknown = [], [], []
    for token in re.split(r"[,;\n]+", raw or ""):
        token = token.strip().strip("-*").strip()
        if not token:
            continue
        found = [m.upper().replace("/", ".") for m in ID_RE.findall(token)]
        if not found:
            match = by_name.get(token.lower(), [])
            if len(match) == 1:
                found = match
            else:
                unknown.append(token)
                continue
        for tid in found:
            if tid in tech:
                ids.append(tid)
            elif tid in att.get("revoked", {}):
                new = att["revoked"][tid]
                notes.append(f"{tid} was replaced by MITRE with {label(new)}, so that is used instead.")
                ids.append(new)
            elif tid in att.get("deprecated", []):
                notes.append(f"{tid} is deprecated in ATT&CK {att['version']} and was left out.")
            else:
                unknown.append(tid)
    return list(dict.fromkeys(ids)), notes, unknown


def _norm_text(text):
    return " " + re.sub(r"\s+", " ", text.lower().replace("-", " ").replace("_", " ")) + " "


def software_match(title):
    """ATT&CK software whose name or alias is exactly the title."""
    t = title.strip().lower()
    for sid, s in data()["software"].items():
        if t == s["name"].lower() or t in (a.lower() for a in s["aliases"]):
            return sid, s
    return None, None


def suggest(text, title="", section="", have=()):
    """Return [(id, reason)] for techniques not already in `have`, strongest first."""
    tech = techniques()
    scores, reasons = {}, {}

    def add(tid, score, why):
        if tid not in tech or tid in have:
            return
        scores[tid] = scores.get(tid, 0) + score
        reasons.setdefault(tid, why)

    if section in ("tools", "malware") and title:
        sid, s = software_match(title)
        if s:
            for tid in s["techniques"]:
                add(tid, 5, f"ATT&CK lists {s['name']} ({sid}) as using it")

    raw = " " + text.lower() + " "
    norm = _norm_text(text)
    for word, ids in data()["keywords"].items():
        w = word.lower()
        pattern = r"(?<![a-z0-9])" + re.escape(w) + (r"(?![a-z0-9])" if w[-1].isalnum() else "")
        if re.search(pattern, raw):
            for tid in ids:
                add(tid, 3, f'mentions "{word}"')

    names = {}
    for tid, t in tech.items():
        names.setdefault(t["name"].lower().replace("-", " "), []).append(tid)
    for name, tids in names.items():
        # One-word names ("Software", "Credentials") and names shared by several
        # techniques ("Local Account") say too little; the keyword list covers those.
        if " " not in name or len(tids) > 1:
            continue
        tid, t = tids[0], tech[tids[0]]
        if f" {name} " in norm:
            add(tid, 4 if "parent" in t else 2, f'names the technique "{t["name"]}"')

    # Prefer a sub-technique over its parent when both were found.
    for tid in list(scores):
        parent = tech[tid].get("parent")
        if parent in scores:
            scores[parent] -= 2
    ranked = sorted(scores, key=lambda k: (-scores[k], k))
    return [(tid, reasons[tid]) for tid in ranked if scores[tid] > 0]


# ---------------- CLI ----------------

def _front_matter(text):
    m = re.match(r"\A﻿?---\s*\n(.*?)\n---\s*(?:\n|\Z)", text, re.S)
    if not m:
        return {}, text
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip().lower()] = v.strip()
    return fm, text[m.end():]


def _section_of(path):
    first = path.split("/")[0].lower()
    return {"malware-analysis": "malware", "tools": "tools", "ctf": "ctf", "sherlocks": "sherlocks"}.get(first, "")


def _print_for(path, have):
    text = (ROOT / path).read_text(encoding="utf-8", errors="replace")
    fm, body = _front_matter(text)
    have = list(have) or normalize(fm.get("attack", ""))[0]
    title = fm.get("title") or next((l.lstrip("# ").strip() for l in body.splitlines() if l.startswith("#")), "")
    hits = suggest(body + "\n" + title, title, _section_of(path), have)
    print(f"\n{path}")
    print("  mapped:    " + (", ".join(have) if have else "nothing yet"))
    for tid, why in hits[:12]:
        print(f"  suggest:   {label(tid)}  ({why})")
    if hits:
        print("  paste:     " + ", ".join(t for t, _ in hits[:6]))


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return
    if argv[0] == "--find":
        q = " ".join(argv[1:]).lower()
        ids, _, _ = normalize(q)
        hits = ids or [tid for tid, t in techniques().items() if q in t["name"].lower()]
        for tid in hits[:30]:
            t = techniques()[tid]
            print(f"{label(tid)}   [{', '.join(t['tactics'])}]")
        if not hits:
            print("No technique matches that. Try a shorter word.")
        return
    if argv[0] == "--all":
        meta_file = ROOT / "data" / "writeup-meta.json"
        meta = json.loads(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else {}
        for folder in ("CTF", "sherlocks", "malware-analysis", "tools"):
            for f in sorted((ROOT / folder).rglob("*.md")) if (ROOT / folder).is_dir() else []:
                rel = f.relative_to(ROOT).as_posix()
                _print_for(rel, meta.get(rel, {}).get("attack", []))
        return
    for path in argv:
        _print_for(Path(path).resolve().relative_to(ROOT).as_posix(), [])


if __name__ == "__main__":
    main(sys.argv[1:])
