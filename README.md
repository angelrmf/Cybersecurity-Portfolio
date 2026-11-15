# Cybersecurity Portfolio

A professional portfolio and knowledge base for cybersecurity research, offensive tradecraft, and technical documentation. This repository hosts a static GitHub Pages site that organizes techniques, tools, references, and notes in a clean, searchable format.

[![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-blue?logo=github)](https://pages.github.com/)
[![License](https://img.shields.io/badge/License-Open%20Project-green)](#license)

## Overview

This project serves as a centralized documentation hub for:

- Enumeration, exploitation, and post-exploitation notes
- CTF writeups and walkthroughs
- General cybersecurity research and portfolio documentation

The site is intentionally lightweight and easy to maintain: it is built with plain HTML, CSS, and JavaScript, making it ideal for static hosting on GitHub Pages without a build pipeline.

## Features

- Write-up sections for CTF, Sherlocks (blue team) and Malware analysis, rendered from the markdown files in this repo
- A tool inventory: what each tool does, who makes it, how to install it and which ATT&CK techniques it serves
- A Techniques page built from MITRE ATT&CK Enterprise, grouped by phase, with every technique my write-ups and tools cover lit up on a pixel matrix
- Every write-up and tool is tagged with ATT&CK technique IDs, linked both ways
- Issue forms that turn into pull requests, with a bot that suggests ATT&CK techniques from the text
- Pixel effects, an ambient background, light and dark themes; effects switch off for reduced motion
- No build step: plain HTML, CSS and JavaScript on GitHub Pages

## Adding a write-up or a tool

The easiest way is an issue form (below). To add one by hand, drop the `.md` file into `CTF/`, `sherlocks/`, `malware-analysis/` or `tools/` and push. A GitHub Action (`.github/workflows/manifest.yml`) rebuilds `data/writeups.js`, so the site picks it up. Do not edit `data/writeups.js` by hand.

Details come from front matter at the very top of the file (the site hides it):

```text
---
title: Cap
platform: Hack The Box
level: Easy
status: complete
attack: T1190, T1040, T1548
tags: IDOR, pcap, Linux capabilities
summary: One sentence for the list page.
---
```

Tools also take `creator`, `repo` (an https link), `license`, `category`, `platforms` and `software` (an ATT&CK S-number, such as S0521). You can also set any of these in `data/writeup-meta.json`, keyed by file path.

## Submitting with a form

Open **Issues → New issue** and pick the CTF, Sherlock, Malware analysis or Tool form. A GitHub Action (`.github/workflows/writeup-from-issue.yml`) then:

1. writes the file into a new folder named after the case or tool
   (`CTF/<platform>/<case>/README.md`, `sherlocks/<platform>/<case>/README.md`, `malware-analysis/<case>/README.md` or `tools/<tool>/README.md`),
2. checks the ATT&CK technique IDs, replacing any that MITRE renamed,
3. rebuilds `data/writeups.js` and opens a pull request,
4. comments on the issue with the pull request link and ATT&CK suggestions read from your text. For a tool or malware family that ATT&CK lists as software (BloodHound, Mimikatz, Emotet...), it also lists the techniques ATT&CK links to it.

Merging the pull request publishes it. To change something first, edit the issue and the pull request updates itself. Only issues opened by the repo owner are acted on.

## Mapping to ATT&CK from the command line

```bash
python3 scripts/attack_map.py --find "brute force"        # look up technique IDs
python3 scripts/attack_map.py CTF/HTB/Easy/cap.md         # suggest IDs for one file
python3 scripts/attack_map.py --all                       # every file: mapped vs suggested
```

Suggestions come from ATT&CK's software list, from `data/attack-keywords.json` (commands and words such as `nmap` or `sudo -l`, which you can extend) and from technique names in the text. Keep only what you actually did or saw.

## ATT&CK data

`data/attack.json` (used by the site) and `data/attack-software.json` (used by the bot) are built from MITRE's own data in [mitre-attack/attack-stix-data](https://github.com/mitre-attack/attack-stix-data) by `scripts/build_attack.py`. A weekly Action (`.github/workflows/attack-data.yml`) rebuilds them and opens a pull request when MITRE publishes a new version; the pull request lists any IDs in your write-ups that MITRE renamed. To run it now, open **Actions → Update ATT&CK data → Run workflow**.

## Previewing locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Repository Structure

```text
.
├── index.html                  # Page shell: header, footer, effects canvases
├── .nojekyll                   # Serve the .md files as they are on GitHub Pages
├── css/                        # theme, layout, components, effects
├── js/
│   ├── app.js                  # Routing and rendering of every page
│   ├── fx.js                   # Click effects, page wipe, pixel name, cursor readout
│   ├── bg.js                   # Ambient background that keeps clear of text
│   └── vendor/marked.min.js    # Markdown parser (MIT)
├── fonts/                      # Jersey 15 pixel typeface (SIL Open Font License)
├── data/
│   ├── writeups.js             # GENERATED list of write-ups and tools
│   ├── writeup-meta.json       # Optional details per file (titles, tags, ATT&CK IDs)
│   ├── techniques.js           # My technique notes, each attached to ATT&CK IDs
│   ├── attack.json             # GENERATED ATT&CK phases and techniques (site)
│   ├── attack-software.json    # GENERATED ATT&CK software list (bot only)
│   └── attack-keywords.json    # Words and commands mapped to techniques, for suggestions
├── scripts/
│   ├── build_manifest.py       # Rebuilds data/writeups.js from the folders
│   ├── build_attack.py         # Rebuilds the ATT&CK data from MITRE
│   ├── attack_map.py           # ATT&CK lookup and suggestions (bot and CLI)
│   └── issue_to_writeup.py     # Turns an issue form into a markdown file
├── .github/
│   ├── ISSUE_TEMPLATE/         # CTF, Sherlock, Malware analysis and Tool forms
│   └── workflows/              # manifest, writeup-from-issue, attack-data
├── CTF/                        # CTF write-ups
├── sherlocks/                  # Blue-team write-ups
├── malware-analysis/           # Malware analysis write-ups
└── tools/                      # Tool inventory, one folder per tool
```

## Contact

For questions, collaboration opportunities, or professional inquiries, please reach out through the repository's contact channels or GitHub profile associated with this project.

---

Built for knowledge-sharing, research, and a professional cybersecurity portfolio.
