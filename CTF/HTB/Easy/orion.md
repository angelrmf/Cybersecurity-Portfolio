# HTB Writeup: Orion

**Difficulty:** Easy
**Target IP:** 10.129.53.6
**Platform:** Hack The Box

## 1. Description

*(TODO: add box description/summary)*

## 2. Reconnaissance

Kicked off with an Nmap scan:

```
Nmap scan report for 10.129.53.6
Host is up (0.038s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.15 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 3e:ea:45:4b:c5:d1:6d:6f:e2:d4:d1:3b:0a:3d:a9:4f (ECDSA)
|_  256 64:cc:75:de:4a:e6:a5:b4:73:eb:3f:1b:cf:b4:e3:94 (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://orion.htb/
Device type: general purpose|router
Running: Linux 5.X, MikroTik RouterOS 7.X
OS CPE: cpe:/o:linux:linux_kernel:5 cpe:/o:mikrotik:routeros:7 cpe:/o:linux:linux_kernel:5.6.3
OS details: Linux 5.0 - 5.14, MikroTik RouterOS 7.2 - 7.5 (Linux 5.6.3)
Network Distance: 2 hops
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 143/tcp)
HOP RTT      ADDRESS
1   34.06 ms 10.10.14.1
2   35.08 ms 10.129.53.6
```

Only two ports open: **SSH (22)** and **HTTP (80, nginx)**. Time to poke at the web server and consider a directory bruteforce.

Requesting the IP directly over HTTP returned a redirect to a hostname:

```
HTTP/1.1 302 Moved Temporarily
Server: nginx/1.18.0 (Ubuntu)
Date: Thu, 16 Jul 2026 09:54:09 GMT
Content-Type: text/html
Content-Length: 154
Connection: keep-alive
Location: http://orion.htb/
```

Since the app redirects to `orion.htb` rather than the raw IP, the vhost has to be resolved locally before the site will load properly:

```bash
echo "10.129.53.6 orion.htb" | sudo tee -a /etc/hosts
```

**Next steps:** enumerate `orion.htb` (vhost/dir bruteforce) to find the actual attack surface.

## 3. Vulnerabilities

*(TODO)*

## 4. Exploitation

*(TODO)*

## 5. Privilege Escalation

*(TODO)*

## 6. Flags

*(TODO)*
