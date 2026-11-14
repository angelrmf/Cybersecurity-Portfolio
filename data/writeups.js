/* ============================================
   data/writeups.js
   ─────────────────────────────────────────
   ADD YOUR WRITE-UPS HERE.
   Write the markdown file, put it in CTF/, sherlocks/ or malware/,
   then add one entry below. The site renders the markdown itself.

   Entry fields:
     section   — "ctf" | "sherlocks" | "malware"
     platform  — shown as the badge and used for the filter chips
     title     — display title
     path      — path to the .md file, exactly as it is in the repo (case matters)
     level     — difficulty or track, optional
     status    — "complete" | "in progress"
     tags      — array of short strings
     summary   — one sentence shown in the list
   ============================================ */

const WRITEUPS = [
  /* ---------- CTF ---------- */
  {
    section: "ctf", platform: "Hack The Box", title: "Cap",
    path: "CTF/HTB/Easy/cap.md", level: "Easy", status: "complete",
    tags: ["IDOR", "pcap", "Linux capabilities"],
    summary: "An IDOR exposes another user's packet capture with plaintext credentials, then a Linux capability gives root."
  },
  {
    section: "ctf", platform: "Hack The Box", title: "Vaccine",
    path: "CTF/HTB/Easy/vaccine.md", level: "Easy", status: "complete",
    tags: ["FTP", "John", "SQL injection", "sqlmap"],
    summary: "Anonymous FTP leaks a zip backup. Cracked credentials lead to SQL injection and a shell."
  },
  {
    section: "ctf", platform: "Hack The Box", title: "Three",
    path: "CTF/HTB/Easy/three.md", level: "Easy", status: "complete",
    tags: ["vhost enumeration", "S3", "webshell"],
    summary: "Vhost enumeration finds an S3-compatible bucket behind the site. A PHP webshell uploaded to it gives code execution."
  },
  {
    section: "ctf", platform: "Hack The Box", title: "Reactor",
    path: "CTF/HTB/Easy/reactor.md", level: "Easy", status: "in progress",
    tags: ["Next.js", "recon"],
    summary: "Recon on a Next.js app and what its JavaScript chunks can leak. Exploitation still to come."
  },
  {
    section: "ctf", platform: "Hack The Box", title: "Orion",
    path: "CTF/HTB/Easy/orion.md", level: "Easy", status: "in progress",
    tags: ["nmap", "vhost"],
    summary: "Port scan and vhost resolution for orion.htb. Enumeration in progress."
  },
  {
    section: "ctf", platform: "Root-Me", title: "FTP authentication",
    path: "CTF/Rootme/Network/FTP.md", level: "Network", status: "complete",
    tags: ["pcap", "FTP", "Wireshark"],
    summary: "Pulling FTP credentials out of a packet capture."
  },
  {
    section: "ctf", platform: "BreachLab", title: "Ghost track",
    path: "CTF/Breachlabs/track1.md", level: "Levels 0 to 6", status: "in progress",
    tags: ["Linux", "grep", "netcat", "permissions"],
    summary: "A Linux and networking wargame: dotfiles, awkward filenames, permissions, pattern matching and raw port interaction."
  },
  {
    section: "ctf", platform: "OverTheWire", title: "Bandit walkthrough",
    path: "CTF/Overthewire/Banditlabs.md", level: "Levels 0 to 8", status: "complete",
    tags: ["Linux", "SSH", "command line"],
    summary: "Notes and solutions for the Bandit wargame, with an explanation of each command."
  },

  /* ---------- SHERLOCKS / BLUE TEAM ---------- */
  {
    section: "sherlocks", platform: "TryHackMe", title: "Threat hunt: npm supply chain compromise on PAW-TOM",
    path: "sherlocks/THM/threat_hunting_sim.md", level: "Threat hunting", status: "complete",
    tags: ["Splunk", "Sysmon", "PowerShell", "MITRE ATT&CK"],
    summary: "An IOC-driven hunt in Splunk: pivoting from a domain to a package, rebuilding the process tree and deobfuscating the payload."
  },
  {
    section: "sherlocks", platform: "TryHackMe", title: "SOC Simulator: Introduction to Phishing",
    path: "sherlocks/THM/soc_simulator.md", level: "SOC triage", status: "complete",
    tags: ["phishing", "alert triage", "incident report"],
    summary: "Working alerts as a SOC analyst: true or false positive, correlation across sources, escalation and case reports."
  }

  /* ---------- MALWARE ANALYSIS ----------
     Nothing yet. Example entry:
  ,{
    section: "malware", platform: "MalwareBazaar", title: "Sample name",
    path: "malware/sample-name.md", level: "Static analysis", status: "complete",
    tags: ["PE", "strings", "YARA"],
    summary: "One sentence on what the sample does and how you took it apart."
  }
  */
];
