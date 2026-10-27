# HTB Writeup: Reactor

**Difficulty:** Easy
**Target IP:** 10.129.45.97
**Platform:** Hack The Box

## 1. Reconnaissance

Full TCP port/version scan:

```bash
sudo nmap -sV -A -T4 -sC -p- 10.129.45.97
```

```
Nmap scan report for 10.129.45.97
Host is up (0.050s latency).
Not shown: 65533 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.16 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 ce:fd:0d:82:c0:23:ed:6e:4b:ea:13:fa:4f:ea:ef:b7 (ECDSA)
|_  256 f8:44:c6:46:58:7a:39:21:ef:16:44:e9:58:c2:f3:62 (ED25519)
3000/tcp open  ppp?
| fingerprint-strings:
|   GetRequest:
|     HTTP/1.1 200 OK
|     Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
|     x-nextjs-cache: HIT
|     x-nextjs-prerender: 1
|     x-nextjs-stale-time: 4294967294
|     X-Powered-By: Next.js
|     Cache-Control: s-maxage=31536000,
|     ETag: "p02u6gnhufd8t"
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 17175
|     Date: Wed, 15 Jul 2026 09:39:58 GMT
|     Connection: close
|     <!DOCTYPE html>...<script src="/_next/static/chunks/webpack-db0a529a99835594.js"/>
|     <script src="/_next/static/chunks/4bd1b696-80bcaf75e1b4285e.js" async=""></script>
|     <script src="/_next/static/chunks/517-d083b552e04dead1.js" async=""></script>
|   HTTPOptions, RTSPRequest:
|     HTTP/1.1 400 Bad Request
|     vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
|     Allow: GET
|     Allow: HEAD
|   Help, NCP, RPCCheck:
|     HTTP/1.1 400 Bad Request
|_    Connection: close
1 service unrecognized despite returning data.
Device type: general purpose|router
Running: Linux 5.X, MikroTik RouterOS 7.X
OS details: Linux 5.0 - 5.14, MikroTik RouterOS 7.2 - 7.5 (Linux 5.6.3)
Network Distance: 2 hops

TRACEROUTE (using port 111/tcp)
HOP RTT      ADDRESS
1   62.51 ms 10.10.14.1
2   65.56 ms 10.129.45.97
```

Nmap couldn't fingerprint port 3000, but the raw response banner gives it away: it's a **Next.js** application (`X-Powered-By: Next.js`).

A plain `curl` to port 80 fails outright:

```
% curl -i http://10.129.45.97
curl: (7) Failed to connect to 10.129.45.97 port 80 after 48 ms: Could not connect to server
```

Browsing to `http://10.129.45.97:3000` instead loads a dashboard for a nuclear reactor. Confirming with curl:

```
curl -I http://10.129.45.97:3000

HTTP/1.1 200 OK
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-stale-time: 4294967294
X-Powered-By: Next.js
Cache-Control: s-maxage=31536000,
ETag: "p02u6gnhufd8t"
Content-Type: text/html; charset=utf-8
Content-Length: 17175
Date: Wed, 15 Jul 2026 11:45:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

Regular directory bruteforcing against the app didn't turn up much useful (lots of noise/false positives from the Next.js routing).

## 2. Vulnerabilities

As the Nmap output hinted, the page references Next.js **chunks** — the compiled JS bundles the framework ships to the browser.

**What are chunks?** When a Next.js app is built, the framework takes the app's JavaScript and splits it into smaller bundled files ("chunks") so the browser can load pages faster — similar to splitting a book into chapters instead of shipping it as one giant file:

```
Your Next.js app code
        ↓
    [bundler]
        ↓
chunk1.js + chunk2.js + chunk3.js + webpack.js
```

**Why the browser needs them:** visiting the app triggers downloads of these chunk files so the frontend can actually run.

**Why that matters to an attacker:** chunks ship the real frontend source, which can leak:
- Route names (e.g. `/admin`, `/dashboard`, `/api/users`)
- API endpoint names
- Hardcoded secrets or tokens (occasionally)
- General application logic

**Next step:** pull down the referenced chunk files and grep them for routes, endpoints, and secrets.

## 3. Exploitation

*(TODO)*

## 4. Privilege Escalation to Root

*(TODO)*

## 5. Flags, Hints, Advice

*(TODO)*
