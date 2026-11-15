#!/usr/bin/env python3
"""
Builds the ATT&CK data the site and the issue bot use, from MITRE's own
STIX bundle (https://github.com/mitre-attack/attack-stix-data).

Writes:
  data/attack.json           tactics (phases) and techniques, loaded by the site
  data/attack-software.json  ATT&CK software and the techniques each one uses,
                             only read by scripts/attack_map.py (not by the site)

Usage:
  python3 scripts/build_attack.py                     download the latest bundle
  python3 scripts/build_attack.py enterprise.json     use a file you already have

Run by .github/workflows/attack-data.yml once a week.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ("https://raw.githubusercontent.com/mitre-attack/attack-stix-data/"
          "master/enterprise-attack/enterprise-attack.json")
DESC_LIMIT = 420


def ext_id(obj):
    for ref in obj.get("external_references", []):
        if ref.get("source_name") == "mitre-attack":
            return ref.get("external_id")
    return None


def clean(text):
    """First paragraph, without citations, markdown links or HTML tags."""
    text = (text or "").strip().split("\n\n")[0]
    text = re.sub(r"\(Citation:[^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > DESC_LIMIT:
        cut = text[:DESC_LIMIT]
        end = cut.rfind(". ")
        text = cut[:end + 1] if end > 200 else cut.rsplit(" ", 1)[0] + "..."
    return text


def id_key(tid):
    base, _, sub = tid[1:].partition(".")
    return (int(base), int(sub or 0))


def main():
    if len(sys.argv) > 1:
        bundle = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    else:
        print("downloading " + SOURCE)
        with urllib.request.urlopen(SOURCE, timeout=120) as res:
            bundle = json.loads(res.read().decode("utf-8"))
    objects = bundle["objects"]
    by_ref = {o["id"]: o for o in objects}
    live = lambda o: not o.get("revoked") and not o.get("x_mitre_deprecated")

    collection = next((o for o in objects if o["type"] == "x-mitre-collection"), {})
    matrix = next(o for o in objects if o["type"] == "x-mitre-matrix")

    tactics = []
    for ref in matrix["tactic_refs"]:                       # matrix order = phase order
        t = by_ref[ref]
        tactics.append({"id": ext_id(t), "short": t["x_mitre_shortname"],
                        "name": t["name"], "desc": clean(t.get("description"))})

    techniques, deprecated = {}, []
    for o in objects:
        if o["type"] != "attack-pattern":
            continue
        tid = ext_id(o)
        if not tid:
            continue
        if o.get("x_mitre_deprecated") and not o.get("revoked"):
            deprecated.append(tid)
        if not live(o):
            continue
        techniques[tid] = {
            "name": o["name"],
            "tactics": [p["phase_name"] for p in o.get("kill_chain_phases", [])
                        if p.get("kill_chain_name") == "mitre-attack"],
            "platforms": o.get("x_mitre_platforms", []),
            "desc": clean(o.get("description")),
        }
        if "." in tid:
            techniques[tid]["parent"] = tid.split(".")[0]

    # Old IDs that MITRE replaced, so the bot can say what to use instead.
    revoked = {}
    for r in objects:
        if r["type"] == "relationship" and r.get("relationship_type") == "revoked-by":
            src, dst = by_ref.get(r["source_ref"]), by_ref.get(r["target_ref"])
            if src and dst and src["type"] == dst["type"] == "attack-pattern":
                a, b = ext_id(src), ext_id(dst)
                if a and b and b in techniques:
                    revoked[a] = b

    software = {}
    for o in objects:
        if o["type"] in ("tool", "malware") and live(o) and ext_id(o):
            software[o["id"]] = {"id": ext_id(o), "name": o["name"], "type": o["type"],
                                 "aliases": [a for a in o.get("x_mitre_aliases", []) if a != o["name"]],
                                 "techniques": set()}
    for r in objects:
        if r["type"] == "relationship" and r.get("relationship_type") == "uses" and live(r):
            s, t = software.get(r["source_ref"]), by_ref.get(r["target_ref"])
            if s and t and t["type"] == "attack-pattern":
                tid = ext_id(t)
                if tid in techniques:
                    s["techniques"].add(tid)

    site = {
        "version": collection.get("x_mitre_version", ""),
        "modified": (collection.get("modified") or "")[:10],
        "source": "https://github.com/mitre-attack/attack-stix-data",
        "tactics": tactics,
        "techniques": {k: techniques[k] for k in sorted(techniques, key=id_key)},
        "revoked": dict(sorted(revoked.items())),
        "deprecated": sorted(deprecated, key=id_key),
    }
    soft = {s["id"]: {"name": s["name"], "type": s["type"], "aliases": s["aliases"],
                      "techniques": sorted(s["techniques"], key=id_key)}
            for s in sorted(software.values(), key=lambda s: int(s["id"][1:]))}

    out = ROOT / "data"
    (out / "attack.json").write_text(json.dumps(site, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (out / "attack-software.json").write_text(json.dumps(soft, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"ATT&CK {site['version']} ({site['modified']}): {len(tactics)} phases, "
          f"{len(techniques)} techniques, {len(soft)} software entries")

    check_repo_ids(techniques, revoked)

    # The keyword list in data/attack-keywords.json is written by hand, so check it still matches.
    kw_file = out / "attack-keywords.json"
    if kw_file.exists():
        stale = sorted({t for ids in json.loads(kw_file.read_text(encoding="utf-8")).values()
                        for t in ids if t not in techniques})
        if stale:
            print("warning: data/attack-keywords.json uses IDs that are not in this ATT&CK version: "
                  + ", ".join(f"{t} (now {revoked[t]})" if t in revoked else t for t in stale))


def check_repo_ids(techniques, revoked):
    """Warn about IDs in your write-ups and notes that this ATT&CK version no longer has."""
    found = {}
    wj = ROOT / "data" / "writeups.js"
    if wj.exists():
        text = wj.read_text(encoding="utf-8")
        for w in json.loads(text[text.index("["):text.rindex("]") + 1]):
            for t in w.get("attack", []):
                found.setdefault(t, []).append(w["path"])
    notes = ROOT / "data" / "techniques.js"
    if notes.exists():
        for t in re.findall(r'"(T\d{4}(?:\.\d{3})?)"', notes.read_text(encoding="utf-8")):
            found.setdefault(t, []).append("data/techniques.js")
    for t, where in sorted(found.items()):
        if t not in techniques:
            hint = f"MITRE replaced it with {revoked[t]}" if t in revoked else "it is no longer in ATT&CK"
            print(f"warning: {t} is used in {', '.join(sorted(set(where)))}, but {hint}")


if __name__ == "__main__":
    main()
