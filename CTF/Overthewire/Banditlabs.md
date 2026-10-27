
# OverTheWire Bandit Walkthrough (Levels 0 → 8)

My notes and solutions for the [OverTheWire Bandit](https://overthewire.org/wargames/bandit/) wargame. Bandit teaches Linux command-line basics and is aimed at complete beginners. Each level is an SSH login where the goal is to find the password for the next level.

> **Spoiler warning:** this document contains the passwords for each level. Read the rules at <https://overthewire.org/rules/> before using or sharing it. If you are following a course or workshop, tell your instructor about the rules too.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Connection details](#connection-details)
- [Level 0](#level-0)
- [Level 0 → 1](#level-0--1)
- [Level 1 → 2](#level-1--2)
- [Level 2 → 3](#level-2--3)
- [Level 3 → 4](#level-3--4)
- [Level 4 → 5](#level-4--5)
- [Level 5 → 6](#level-5--6)
- [Level 6 → 7](#level-6--7)
- [Level 7 → 8](#level-7--8)
- [Level 8 → 9](#level-8--9)
- [Command cheat sheet](#command-cheat-sheet)
- [Password summary](#password-summary)

---

## Prerequisites

- A terminal (Linux, macOS, WSL, or Git Bash on Windows)
- An SSH client (`ssh`)
- Optional: `sshpass`, used in this guide to pass the password on the command line

Install `sshpass` on Debian/Ubuntu:

```bash
sudo apt install sshpass
```

> **Security note:** `sshpass -p '<password>'` places the password in your shell history and in the process list. That is fine for a public game like Bandit, but never do it with real credentials. Safer alternatives are `sshpass -e` (reads the `SSHPASS` environment variable) or simply typing the password when `ssh` prompts for it.

## Connection details

| Setting  | Value                         |
| -------- | ----------------------------- |
| Host     | `bandit.labs.overthewire.org` |
| Port     | `2220`                        |
| Username | `banditN` (N = level number)  |

The general pattern for every level is:

```bash
ssh bandit<N>@bandit.labs.overthewire.org -p 2220
```

Or, with `sshpass` to skip the password prompt:

```bash
sshpass -p '<password>' ssh bandit<N>@bandit.labs.overthewire.org -p 2220
```

---

## Level 0

**Goal:** Log in to the game using SSH.

### Steps

1. Connect as `bandit0`:

   ```bash
   ssh bandit0@bandit.labs.overthewire.org -p 2220
   ```

2. The first time you connect, SSH asks whether you trust the host's fingerprint. Type `yes` to continue.
3. When prompted for the password, enter `bandit0`.

### Explanation

| Part                            | Meaning                                         |
| ------------------------------- | ----------------------------------------------- |
| `ssh`                           | Secure Shell client for logging in to a remote machine |
| `bandit0@`                      | The user to log in as                           |
| `bandit.labs.overthewire.org`   | The server hostname                             |
| `-p 2220`                       | Connect to port 2220 (the default is 22)        |

**Password for the level:** `bandit0`

---

## Level 0 → 1

**Goal:** The password for the next level is stored in a file called `readme` located in the home directory.

### Commands

```console
bandit0@bandit:~$ ls
readme
bandit0@bandit:~$ cat readme
Congratulations on your first steps into the bandit game!!
Please make sure you have read the rules at https://overthewire.org/rules/
If you are following a course, workshop, walkthrough or other educational activity,
please inform the instructor about the rules as well and encourage them to
contribute to the OverTheWire community so we can keep these games free!

The password you are looking for is: 6y2kwnwK6grgvwvpvLaa2T1cpFEKOhNR
```

### Explanation

- `ls` lists the files in the current directory.
- `cat <file>` prints the contents of a file to the terminal.

**Password for Level 1:** `6y2kwnwK6grgvwvpvLaa2T1cpFEKOhNR`

---

## Level 1 → 2

**Goal:** The password for the next level is stored in a file called `-` located in the home directory.

### Log in

```bash
sshpass -p '6y2kwnwK6grgvwvpvLaa2T1cpFEKOhNR' ssh bandit1@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit1@bandit:~$ ls
-
bandit1@bandit:~$ cat ./-
PK8fYLZg2hnHSz83plBL1iEPKdD3QToB
```

### Explanation

A bare `cat -` does **not** read a file named `-`. In many Unix tools a lone `-` means "read from standard input", so the command would just wait for you to type something.

Prefixing the name with `./` makes it an explicit path ("the file called `-` in the current directory"), so the shell and `cat` treat it as a normal filename.

**Password for Level 2:** `PK8fYLZg2hnHSz83plBL1iEPKdD3QToB`

---

## Level 2 → 3

**Goal:** The password for the next level is stored in a file called `spaces in this filename` located in the home directory.

### Log in

```bash
sshpass -p 'PK8fYLZg2hnHSz83plBL1iEPKdD3QToB' ssh bandit2@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit2@bandit:~$ ls
--spaces in this filename--
bandit2@bandit:~$ cat -- '--spaces in this filename--'
7ZZ2LFrykP2zEyvBl4m3clcL7tGYJPME
```

### Explanation

This filename has two problems:

1. **It contains spaces.** Without quotes the shell splits the name into separate arguments. Wrap the name in quotes (`'...'`) or escape each space with a backslash (`\ `).
2. **It starts with dashes.** `cat` would interpret `--spaces...` as an option. The special argument `--` means "end of options; everything after this is a filename".

Alternative that avoids both issues:

```bash
cat ./--spaces\ in\ this\ filename--
```

**Password for Level 3:** `7ZZ2LFrykP2zEyvBl4m3clcL7tGYJPME`

---

## Level 3 → 4

**Goal:** The password for the next level is stored in a hidden file in the `inhere` directory.

### Log in

```bash
sshpass -p '7ZZ2LFrykP2zEyvBl4m3clcL7tGYJPME' ssh bandit3@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit3@bandit:~$ ls
inhere
bandit3@bandit:~$ cd inhere
bandit3@bandit:~/inhere$ ls
bandit3@bandit:~/inhere$ ls -a
.  ..  ...Hiding-From-You
bandit3@bandit:~/inhere$ cat ...Hiding-From-You
xzTXq1rDJQVVAzdv5cHq1TQytTWufAMq
```

### Explanation

- On Linux, files whose names start with a dot (`.`) are **hidden**, so plain `ls` shows nothing.
- `ls -a` lists **all** files, including hidden ones.
- `.` is the current directory and `..` is the parent directory. Both always appear with `-a`.

**Password for Level 4:** `xzTXq1rDJQVVAzdv5cHq1TQytTWufAMq`

---

## Level 4 → 5

**Goal:** The password for the next level is stored in the only human-readable file in the `inhere` directory.

### Log in

```bash
sshpass -p 'xzTXq1rDJQVVAzdv5cHq1TQytTWufAMq' ssh bandit4@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit4@bandit:~$ ls
inhere
bandit4@bandit:~$ cd inhere
bandit4@bandit:~/inhere$ ls -a
-file00  -file01  -file02  -file03  -file04  -file05  -file06  -file07  -file08  -file09  .  ..
bandit4@bandit:~/inhere$ file ./-file*
./-file00: data
./-file01: data
./-file02: data
./-file03: data
./-file04: data
./-file05: data
./-file06: data
./-file07: ASCII text
./-file08: data
./-file09: data
bandit4@bandit:~/inhere$ cat ./-file07
6C7h9GD8M6ai5nr7wo1RonrzFjj9yIrG
```

### Explanation

- All filenames start with `-`, so use the `./` prefix again (see [Level 1 → 2](#level-1--2)).
- `file <path>` inspects a file's content and reports its type. Binary junk shows up as `data`, while readable text shows up as `ASCII text`.
- `./-file*` is a **glob**: the shell expands `*` to match every file starting with `-file`, so a single command checks all ten files.

**Password for Level 5:** `6C7h9GD8M6ai5nr7wo1RonrzFjj9yIrG`

---

## Level 5 → 6

**Goal:** The password for the next level is stored in a file somewhere under the `inhere` directory and has all of the following properties:

- human-readable
- 1033 bytes in size
- not executable

### Log in

```bash
sshpass -p '6C7h9GD8M6ai5nr7wo1RonrzFjj9yIrG' ssh bandit5@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit5@bandit:~$ ls
inhere
bandit5@bandit:~$ cd inhere
bandit5@bandit:~/inhere$ ls -a
.   maybehere00  maybehere02  maybehere04  maybehere06  maybehere08  maybehere10  maybehere12  maybehere14  maybehere16  maybehere18
..  maybehere01  maybehere03  maybehere05  maybehere07  maybehere09  maybehere11  maybehere13  maybehere15  maybehere17  maybehere19
bandit5@bandit:~/inhere$ find . -type f -size 1033c ! -executable
./maybehere07/.file2
bandit5@bandit:~/inhere$ cat ./maybehere07/.file2
pXa26xhMWaC2SvDotA4r9EgZkulOeSBW
```

### Explanation

There are 20 directories, each with several files, so checking by hand is impractical. `find` searches a directory tree using filters:

| Option           | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| `.`              | Start searching in the current directory                       |
| `-type f`        | Only regular files (not directories)                           |
| `-size 1033c`    | Exactly 1033 bytes (the `c` suffix means bytes)                |
| `! -executable`  | Negation: only files that are **not** executable               |

`find` also searches hidden files, which is why `.file2` turns up here.

**Password for Level 6:** `pXa26xhMWaC2SvDotA4r9EgZkulOeSBW`

---

## Level 6 → 7

**Goal:** The password for the next level is stored somewhere on the server and has all of the following properties:

- owned by user `bandit7`
- owned by group `bandit6`
- 33 bytes in size

### Log in

```bash
sshpass -p 'pXa26xhMWaC2SvDotA4r9EgZkulOeSBW' ssh bandit6@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit6@bandit:~$ find / -user bandit7 -group bandit6 -size 33c 2>/dev/null
/var/lib/dpkg/info/bandit7.password
bandit6@bandit:~$ cat /var/lib/dpkg/info/bandit7.password
Bmnnvf82KzQlfxgAI2d1zYbr1u9pr3E3
```

### Explanation

The home directory is empty, so the search has to cover the whole filesystem starting at `/`.

| Option             | Meaning                                              |
| ------------------ | ---------------------------------------------------- |
| `/`                | Start at the filesystem root                         |
| `-user bandit7`    | File owner is `bandit7`                              |
| `-group bandit6`   | File group is `bandit6`                              |
| `-size 33c`        | Exactly 33 bytes                                     |
| `2>/dev/null`      | Discard error output (stream 2) so the thousands of "Permission denied" messages do not bury the result |

**Password for Level 7:** `Bmnnvf82KzQlfxgAI2d1zYbr1u9pr3E3`

---

## Level 7 → 8

**Goal:** The password for the next level is stored in the file `data.txt` next to the word `millionth`.

### Log in

```bash
sshpass -p 'Bmnnvf82KzQlfxgAI2d1zYbr1u9pr3E3' ssh bandit7@bandit.labs.overthewire.org -p 2220
```

### Commands

```console
bandit7@bandit:~$ ls
data.txt
bandit7@bandit:~$ grep millionth data.txt
millionth       VR1ljMayciFxbnUokuQmJFw6QC9VKtub
```

### Explanation

`data.txt` is a huge file of word/password pairs. `grep <pattern> <file>` prints only the lines that contain the pattern, which is much faster than scrolling through the file.

**Password for Level 8:** `VR1ljMayciFxbnUokuQmJFw6QC9VKtub`

---

## Level 8 → 9

**Goal:** _Work in progress._

### Log in

```bash
sshpass -p 'VR1ljMayciFxbnUokuQmJFw6QC9VKtub' ssh bandit8@bandit.labs.overthewire.org -p 2220
```

_Steps and password to be added._

---

## Command cheat sheet

| Command                    | What it does                                        | Used in      |
| -------------------------- | --------------------------------------------------- | ------------ |
| `ssh user@host -p PORT`    | Log in to a remote machine                          | Level 0      |
| `ls` / `ls -a`             | List files / list including hidden files            | 0, 3, 4      |
| `cd <dir>`                 | Change directory                                    | 3, 4, 5      |
| `cat <file>`               | Print a file's contents                             | All levels   |
| `./` prefix                | Force a name to be read as a path, not an option    | 1, 4         |
| `--`                       | Mark the end of command options                     | 2            |
| `file <path>`              | Identify a file's type                              | 4            |
| `find <dir> <filters>`     | Search for files by name, size, owner, and so on    | 5, 6         |
| `2>/dev/null`              | Hide error messages                                 | 6            |
| `grep <pattern> <file>`    | Show lines matching a pattern                       | 7            |

## Password summary

| Level | Username  | Password                           |
| ----- | --------- | ---------------------------------- |
| 0     | `bandit0` | `bandit0`                          |
| 1     | `bandit1` | `6y2kwnwK6grgvwvpvLaa2T1cpFEKOhNR` |
| 2     | `bandit2` | `PK8fYLZg2hnHSz83plBL1iEPKdD3QToB` |
| 3     | `bandit3` | `7ZZ2LFrykP2zEyvBl4m3clcL7tGYJPME` |
| 4     | `bandit4` | `xzTXq1rDJQVVAzdv5cHq1TQytTWufAMq` |
| 5     | `bandit5` | `6C7h9GD8M6ai5nr7wo1RonrzFjj9yIrG` |
| 6     | `bandit6` | `pXa26xhMWaC2SvDotA4r9EgZkulOeSBW` |
| 7     | `bandit7` | `Bmnnvf82KzQlfxgAI2d1zYbr1u9pr3E3` |
| 8     | `bandit8` | `VR1ljMayciFxbnUokuQmJFw6QC9VKtub` |
