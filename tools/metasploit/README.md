---
title: Metasploit
creator: Rapid7
repo: https://github.com/rapid7/metasploit-framework
license: BSD-3-Clause
category: Exploitation framework
platforms: Linux, Windows, macOS
level: Red team
status: in progress
attack: T1190, T1203, T1059
tags: Exploitation, post-exploitation, payloads
summary: Exploitation framework covering initial exploitation, post-exploitation and pivoting, with msfvenom for payloads.
---

## What it does

Full exploitation framework covering initial exploitation, post-exploitation, and pivoting. Use msfvenom for payload generation.

## Installation

```bash
# Kali ships it; on other systems see docs.metasploit.com
sudo apt install metasploit-framework
```

## Usage

```bash
msfconsole
use exploit/...
set RHOSTS <target>
run
```

## Technical details

To be written.

## How it maps to ATT&CK

Exploits public-facing services (T1190) and client software (T1203), then runs commands and payloads on the target (T1059).

## Detection

To be written.
