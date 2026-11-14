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

- Clean, dark-themed cybersecurity aesthetic
- Searchable technique catalog
- Sectioned content for tools, references, and walkthroughs
- Expandable, card-based layout for easy browsing
- Responsive design for desktop and mobile viewing
- Zero dependency setup for GitHub Pages deployment

## Adding a write-up

Drop the `.md` file into `CTF/`, `sherlocks/` or `malware-analysis/` and push. A GitHub Action (`.github/workflows/manifest.yml`) scans the folders and rebuilds `data/writeups.js`, so the site picks the file up by itself. Do not edit `data/writeups.js` by hand.

The title, platform, summary and status are guessed from the file. To set them yourself, put this at the very top of the `.md` file (the site hides it when it shows the write-up):

```text
---
title: Cap
platform: Hack The Box
level: Easy
status: complete
tags: IDOR, pcap, Linux capabilities
summary: One sentence for the list page.
---
```

You can also set these fields in `data/writeup-meta.json`, keyed by file path. Files under 600 bytes are treated as "in progress" until you write more. To rebuild the list locally, run `python3 scripts/build_manifest.py`.

## Submitting a write-up with a form

Instead of committing a file, open the repo's **Issues** tab, click **New issue** and pick the CTF, Sherlock or Malware analysis form. Fill it in and submit. A GitHub Action (`.github/workflows/writeup-from-issue.yml`) then:

1. writes the markdown file into the right folder, in a new folder named after the case
   (`CTF/<platform>/<case>/README.md`, `sherlocks/<platform>/<case>/README.md` or `malware-analysis/<case>/README.md`),
2. rebuilds `data/writeups.js`,
3. opens a pull request and links it on the issue.

Merging the pull request publishes the write-up and closes the issue. To change something before merging, edit the issue and the pull request updates itself. To edit a write-up that is already published, fill in "Existing file to replace" with its path and paste the full updated text.

Only issues opened by the repo owner are acted on.

## Repository Structure

```text
.
├── index.html              # Main landing page
├── README.md               # Project overview and usage guide
├── SECURITY.md             # Security policy and reporting guidance
├── css/                    # Styling and layout assets
│   ├── animations.css
│   ├── components.css
│   ├── layout.css
│   └── theme.css
├── js/                     # Front-end behavior and rendering logic
│   ├── app.js
│   ├── modal.js
│   ├── nav.js
│   ├── render.js
│   ├── search.js
│   └── theme.js
├── data/
│   └── techniques.js       # Technique entries and metadata
├── CTF/                    # CTF-related content and notes
├── sherlocks/              # Research or investigation notes
└── assets/                 # Optional images and supporting media
```



## Contact

For questions, collaboration opportunities, or professional inquiries, please reach out through the repository's contact channels or GitHub profile associated with this project.

---

Built for knowledge-sharing, research, and a professional cybersecurity portfolio.
