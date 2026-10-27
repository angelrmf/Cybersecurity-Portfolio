# BreachLab — "Ghost" Track Writeup

A progressive Linux / networking wargame (Bandit-style) focused on command-line
fundamentals, filesystem navigation, text parsing, and basic network recon. Each
level yields a password used to authenticate into the next.

> **Portfolio note:** flags are included here for completeness. If this document is
> going public while the wargame is still live, consider redacting the password values
> (keep the technique). Most writeup etiquette favors explaining the *method* over
> publishing live answers.

**Author:** ghost operator
**Platform:** BreachLab
**Last updated:** 2026-10-27

---

## Progress Summary

| Level | Theme | Core skill | Status | Flag |
|-------|-------|-----------|--------|------|
| 0 → 1 | Orientation | File reading / recon |  Complete | `W3lc0m3T0Gh0st` |
| 1 → 2 | Dash Is Not A Flag | Filenames that collide with shell syntax |  Complete | `D4shIsN0tAFl4g` |
| 2 → 3 | Hidden In Shadow | Hidden files / dotfiles |  Complete | `H1dd3nInSh4dow` |
| 3 → 4 | Permissions Matter | Special filenames & permissions |  Complete | `P3rm1ss10ns_M4tt3r` |
| 4 → 5 | Grep Finds Truth | Pattern-based text filtering |  Complete | `Gr3p_F1nds_Truth` |
| 5 → 6 | Ports Never Lie | Port discovery & raw interaction (netcat) |  Complete | `P0rts_N3v3r_L13` |
| 6 → 7 | Ghost in the Machine | Secrets in memory (history / process env) |  In progress | — |

---

## Level 0 → 1 — Orientation

**Objective:** Get oriented on the box and recover the first password.

**Approach**

The entry level is about not panicking at an unfamiliar shell. The habits that pay
off immediately:

```bash
ls -a        # list everything, including hidden entries
cat README   # read whatever the level hands you first
pwd          # always know where you are
```

**Takeaway:** Before reaching for tools, *read what the box tells you*. Half of every
level is hidden in the files already in front of you.

**Flag:** `W3lc0m3T0Gh0st`

---

## Level 1 → 2 — Dash Is Not A Flag

**Objective:** Read a file whose name is a single dash (`-`).

**The trap**

A file literally named `-` can't be read with the obvious command, because `cat -`
tells `cat` to read from **standard input**, not a file called `-`. The shell / tool
interprets the dash as "stdin", so the terminal just hangs.

**Solution — disambiguate the filename from the option syntax:**

```bash
cat ./-        # prepend ./ so it's unmistakably a path, not a flag
# or
cat < -        # feed it via input redirection
```

**Takeaway:** Filenames can collide with command-line syntax (`-`, `--`, leading
dashes). Prefixing with `./` forces the shell to treat the string as a path. This
generalizes to any "weird" filename.

**Flag:** `D4shIsN0tAFl4g`

---

## Level 2 → 3 — Hidden In Shadow

**Objective:** Find the password hidden in files/directories that don't show up in a
plain listing.

**Approach**

Dotfiles (names starting with `.`) are hidden from a default `ls`. The whole level is
built around remembering the `-a` flag and being willing to descend into nested hidden
directories:

```bash
ls -a                     # reveal . entries
cd .cache && ls
cd ../.local && ls -a     # e.g. .local/share/... nested trees
```

Real example of the kind of nested structure encountered:
`~/.local/share/kitty-ssh-kitten/shell-integration/zsh/`.

**Takeaway:** A clean `ls` is a lie — hidden files and deep directory trees are the
default hiding spot. `ls -a` (and later `find`) should be reflexive.

**Flag:** `H1dd3nInSh4dow`

---

## Level 3 → 4 — Permissions Matter

**Objective:** Access a file protected by awkward naming and/or permissions.

**Approach**

Two obstacles show up here:

1. **Filenames with spaces or special characters** (e.g. `file name`) — these must be
   quoted or escaped or the shell splits them into multiple arguments:

   ```bash
   cat 'file name'
   cat file\ name
   ```

2. **File permissions** — checking what you can actually read/execute:

   ```bash
   ls -la            # inspect owner, group, and permission bits
   ```

**Takeaway:** Quoting rules and permission bits both decide whether a command
succeeds. Reading `ls -la` output fluently (owner / group / rwx) is a core skill that
reappears constantly in privilege-escalation work later.

**Flag:** `P3rm1ss10ns_M4tt3r`

---

## Level 4 → 4 — Grep Finds Truth

**Objective:** Find the one real flag hidden among **500 decoy files**
(`record_0000` … `record_0500`), each stuffed with random strings.

**The insight**

The decoys contained random **hex strings** (e.g. `f2f2ffd3bdbbd0a63ec6da711e58bbb7`),
while the real flag was a readable leetspeak phrase (e.g. `H1dding_1n_th3_sh4d0ws`).
Rather than filter by *meaning*, filter by **structure** — the two look completely
different at the character level:

- Random hex: fixed charset `0-9a-f`, lowercase only, **no underscores**
- Flag phrase: mixed case, underscores, letters outside the hex range

**Solution**

```bash
# strongest single tell: hex blobs essentially never contain underscores
grep -rl "_" record_*

# tighten further: require both an underscore and an uppercase letter
grep -rlE '[A-Z]' record_* | grep -lE '_'
```

Supporting techniques explored (useful when content-grep fails):

```bash
ls -la record_* | sort -k5 -n              # find a size outlier
file record_* | grep -v "ASCII text"       # find a file-type outlier
```

**Takeaway:** When you can't filter by semantics, filter by **shape**. Regex that keys
on structural features (charset, case, separators) beats eyeballing 500 files.

**Flag:** `Gr3p_F1nds_Truth`

---

## Level 5 → 6 — Ports Never Lie

**Objective:** A "back channel" left running on the box — **two hidden ports**, with
`ss` and `netstat` deliberately disabled. "One tells you how to talk, the other answers
if you say the right word." Only `nc` and `curl` are available.

**Why netstat/ss were useless**

Those tools read socket state from the kernel (`/proc/net/tcp`), which the level locked
down. The workaround doesn't touch `/proc` at all — it just **attempts real TCP
connections**, which no amount of kernel-table restriction can hide.

**Step 1 — discover listening ports with netcat**

```bash
# -z = zero-I/O (just test the port), -v = verbose
nc -zv 127.0.0.1 1-10000 2>&1 | grep succeeded
nc -zv 127.0.0.1 10000-65535 2>&1 | grep succeeded   # chunk it to stay responsive
```

> `127.0.0.1` (loopback) means "this same machine" — no need to discover the box's
> real IP for a locally-running service.
> `2>&1` is required because `nc -v` prints to **stderr**, so it must be merged into
> stdout before `grep` can see it.

This surfaced a cluster of open ports; the deliberate **pair** (adjacent port numbers)
stood out from the random background services.

**Step 2 — interact with the ports (plain `nc`, no `-z`)**

```bash
nc 127.0.0.1 <instruction_port>   # read what it tells you
nc 127.0.0.1 <answer_port>        # send back the expected word
```

In plain mode netcat wires the port straight to your terminal's stdin/stdout, so you
read the banner/prompt and type the response directly. (`curl ip:port` is the
alternative when a port speaks HTTP rather than a raw text protocol.)

**Takeaway:** You don't need privileged scanners to map a host — raw connection
attempts via `nc -zv` bypass kernel-level tool lockdowns entirely. Netcat is both a
scanner *and* a client for hand-speaking custom protocols.

**Flag:** `P0rts_N3v3r_L13`

---

## Level 6 → 7 — Ghost in the Machine *(in progress)*

**Objective:** Retrieve the password for `ghost7`.
**Hint:** *"KAEL stopped writing secrets to disk. He told himself the shell would
forget them. It doesn't."*

**Working hypothesis**

The clue points away from files on disk and toward secrets that persist in **memory /
process state**. Angles under investigation:

1. **Shell history** — commands (and any secrets passed to them) logged after the
   session ends:
   ```bash
   cat ~/.bash_history
   ```
2. **Live process environment** — a running process keeps its env vars readable via
   `/proc/<pid>/environ` for as long as it's alive, even if a fresh shell's `env`
   wouldn't show them.
3. **Command-line arguments in the process table** — anything passed as an argument
   (e.g. a credential) is visible to any user via:
   ```bash
   ps aux | grep ghost7
   ps -ef
   ```

**Next step:** enumerate processes owned by / related to `ghost7`, then inspect that
process's environment and arguments.

**Status:** 🔄 Not yet solved — enumeration ongoing.

---

## Skills & Tools Demonstrated

**Filesystem & shell**
- Hidden-file discovery (`ls -a`), deep directory traversal
- Handling adversarial filenames — leading dashes, spaces, quoting/escaping
- Reading and interpreting `ls -la` permission output

**Text processing**
- Recursive content search with `grep` (`-r`, `-l`, `-i`, `-E`)
- Structural / regex-based filtering (charset, case, separators) to isolate a signal
  from hundreds of decoys
- Supporting triage: `sort -k`, `file`, output outlier detection

**Networking & recon**
- Port discovery without `netstat`/`ss` using `nc -zv` (and bash `/dev/tcp`)
- Understanding why connection-based scanning bypasses kernel-table lockdowns
- Raw service interaction with `netcat` and `curl` (loopback, stderr handling)

**Methodology**
- Reading the challenge before reaching for tools
- Choosing elegant/logic-based paths over brute force
- Reasoning about *where* secrets live (disk vs. memory vs. process state)

---

*Writeup produced for personal portfolio / learning record.*
