# HTB Sherlock: Unit42 — Notes

**Category:** DFIR (Windows / Sysmon log analysis) · **Difficulty:** Easy
**Artifact:** Sysmon event logs exported to JSON (169 events, one JSON object per line in the `.jsonl` version)
**Scenario:** Inspired by Palo Alto Unit42's research on an UltraVNC campaign in which attackers used a backdoored UltraVNC to keep access. The lab covers the initial access stage: a user downloaded a malicious file from Dropbox and ran it.

---

## 1. Key facts at a glance

| Item | Value |
|---|---|
| Machine / user | `DESKTOP-887GK2L` / `CyberJunkie` |
| Malicious process | `C:\Users\CyberJunkie\Downloads\Preventivo24.02.14.exe.exe` (PID 10672) |
| Launched by | `explorer.exe` (the user double-clicked it) |
| Distribution | Dropbox (`*.dl.dropboxusercontent.com`) |
| Connectivity check | DNS query for `www.example.com`, connection to `93.184.216.34:80` |
| Termination | `2024-02-14 03:41:58` |

---

## 2. Sysmon Event IDs used

| ID | Meaning | Useful fields |
|---|---|---|
| 1 | Process creation | `Image`, `ParentImage`, `CommandLine`, `Hashes`, `User` |
| 2 | File creation time changed (timestomping) | `Image`, `TargetFilename`, `CreationUtcTime`, `PreviousCreationUtcTime` |
| 3 | Network connection | `Image`, `DestinationIp`, `DestinationPort` |
| 5 | Process terminated | `Image`, `ProcessId` |
| 11 | File created | `Image`, `TargetFilename` |
| 15 | File stream created (downloaded-file marker) | `TargetFilename` |
| 22 | DNS query | `Image`, `QueryName`, `QueryResults` |
| 23 | File deleted | `Image`, `TargetFilename` |

Event counts in this file: ID 1 ×6, 2 ×16, 3 ×1, 5 ×1, 7 ×15, 10 ×1, 11 ×56, 12 ×14, 13 ×19, 15 ×2, 17 ×7, 22 ×3, 23 ×26, 26 ×2.

**In Sysmon events, `Image` is the full path of the program that performed the action.** `TargetFilename` is what was affected. For process creation, `ParentImage` is the program that launched it.

---

## 3. Mac workflow (no Event Viewer)

```bash
brew install evtx jq
evtx_dump -o jsonl file.evtx > file.jsonl     # xml | json | jsonl
```

If the file has `Record N` lines between events (the JSON version), filter them out with `grep '^{'` before `jq`.

```bash
# count events per ID
jq -r '.Event.System.EventID' file.jsonl | sort -n | uniq -c

# DNS queries
jq -c 'select(.Event.System.EventID==22) | [.Event.System.TimeCreated."#attributes".SystemTime, .Event.EventData.Image, .Event.EventData.QueryName]' file.jsonl

# process creations
jq -c 'select(.Event.System.EventID==1) | [.Event.System.TimeCreated."#attributes".SystemTime, .Event.EventData.ProcessId, .Event.EventData.Image, .Event.EventData.ParentImage, .Event.EventData.CommandLine]' file.jsonl

# copy a raw (unescaped) path to the clipboard
jq -r 'select(.Event.System.EventID==1 and .Event.EventData.ProcessId==10672) | .Event.EventData.Image' file.jsonl | pbcopy
```

`jq -r` prints the real path: the JSON shows `\\` for each backslash, which is only escaping.

---

## 4. Timeline (UTC, 2024-02-14)

| Time | Event |
|---|---|
| 03:41:25 | Firefox resolves `uc2f030016253ec53f4953980a4e.dl.dropboxusercontent.com` (ID 22) — the download |
| 03:41:45 | Firefox's `pingsender.exe` sends telemetry to `incoming.telemetry.mozilla.org` (ID 1) — **benign** |
| 03:41:56 | `Preventivo24.02.14.exe.exe` launched from `Downloads` by `explorer.exe` (ID 1, PID 10672) |
| 03:41:57 | `msiexec.exe` chain starts: SYSTEM service instance, then user-mode `msiexec` processes (ID 1) |
| 03:41:58.404 | Malware writes files into `AppData\Roaming\Photo and Fax Vn\Photo and vn 1.1.2\install\F97891C\...`; `~.pdf` is timestomped (ID 11 / 2) |
| 03:41:58.407 | `once.cmd` created by the malware in `...\WindowsVolume\Games\` (ID 11) |
| 03:41:58.575–.590 | `msiexec.exe` copies `on.cmd`, `c.cmd`, `cmmc.cmd`, `once.cmd` into `C:\Games\` (ID 11) |
| 03:41:58 | DNS query for `www.example.com` by the malware (ID 22) |
| 03:41:58 | Network connection to `93.184.216.34:80` by the malware (ID 3) |
| 03:41:58.795 | Malware process terminates itself (ID 5, PID 10672) |

---

## 5. Questions and answers

1. **How many events have Event ID 11?** `56`
2. **What is the malicious process?** `C:\Users\CyberJunkie\Downloads\Preventivo24.02.14.exe.exe`
   *Common mistake:* the PID 5584 process is Firefox's `pingsender.exe` sending telemetry to Mozilla. It's launched by Firefox from Program Files, so it's legitimate. The malicious one was launched by `explorer.exe` from `Downloads` and has a double `.exe.exe` extension.
3. **Which cloud drive distributed the malware?** `Dropbox`
4. **Timestomped time of the PDF file?** `2024-01-14 08:10:06`
   The event records `CreationUtcTime` = `2024-01-14 08:10:06.029` for `...\TempFolder\~.pdf` and `PreviousCreationUtcTime` = `2024-02-14 03:41:58.404`, so the malware set the date back exactly one month. The answer box needed the time **without milliseconds**.
5. **Where was `once.cmd` created?**
   `C:\Users\CyberJunkie\AppData\Roaming\Photo and Fax Vn\Photo and vn 1.1.2\install\F97891C\WindowsVolume\Games\once.cmd`
   It was created twice: by the malware itself at that path, and later by `msiexec.exe` in `C:\Games\`. The question asks about the file the malicious process dropped, so the first one is the answer.
6. **Dummy domain it tried to reach?** `www.example.com`
7. **IP address it reached out to?** `93.184.216.34`
8. **When did the process terminate itself?** `2024-02-14 03:41:58`

---

## 6. Lessons learned

1. **Judge a process by its parent and path**, not only by who it talks to. A browser helper from Program Files launched by Firefox is normal; an executable in `Downloads` launched by Explorer is not.
2. **Double extensions** (`.exe.exe`) are a classic disguise.
3. **Timestomping shows up in ID 2**, with both the fake and the original timestamp, so the real creation time is on record.
4. **Answer formats matter:** some boxes want times without milliseconds, no `https://` on a domain, and an unescaped path.
5. **Start small.** Check the rare Event IDs first (22, 1, 3, 5, 2), then follow the filename into the noisy ones (11, 23, 15).
6. The dummy-domain check (`example.com`) is a typical connectivity test and a good IOC to remember.
