---
title: Burp Suite
creator: PortSwigger
repo: https://portswigger.net/burp
license: Commercial (free Community Edition)
category: Web application testing
platforms: Linux, Windows, macOS
level: Red team
status: in progress
attack: T1190, T1595.002
tags: Web, proxy, scanner
summary: Intercept, replay and fuzz HTTP and HTTPS traffic. The core tool for web application testing.
---

## What it does

Intercept, replay, and fuzz HTTP/S traffic. Core tool for web application testing. Extensions from the BApp Store worth installing: Autorize, JWT Editor, Turbo Intruder.

## Installation

```bash
# Kali ships it; elsewhere download it from portswigger.net/burp
sudo apt install burpsuite
```

## Usage

```text
# Set the browser proxy to 127.0.0.1:8080
# Import Burp's CA certificate into the browser to intercept HTTPS
```

## Technical details

To be written.

## How it maps to ATT&CK

Used to find and exploit flaws in web applications (T1190) and to scan them for vulnerabilities (T1595.002).

## Detection

To be written.
