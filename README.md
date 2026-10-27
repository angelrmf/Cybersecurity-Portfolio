# Cybersecurity Portfolio

A professional portfolio and knowledge base for cybersecurity research, offensive tradecraft, and technical documentation. This repository hosts a static GitHub Pages site that organizes techniques, tools, references, and notes in a clean, searchable format.

[![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-blue?logo=github)](https://pages.github.com/)
[![License](https://img.shields.io/badge/License-Open%20Project-green)](#license)

## Overview

This project serves as a centralized documentation hub for:

- Red team and offensive security techniques
- Security tooling and script references
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

## How to Use

### Local Preview

Open `index.html` directly in a browser, or serve the repository locally with a simple web server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

### GitHub Pages Deployment

1. Push the repository to GitHub.
2. Open the repository settings.
3. Navigate to Pages.
4. Select the root branch (for example, `main`) as the deployment source.
5. Save the configuration.

The site will be available at:

```text
https://<username>.github.io/<repository-name>/
```

## Adding Content

The main content is defined in `data/techniques.js`. Each technique entry includes metadata such as the title, severity, tags, summary, and notes. This makes it easy to extend the portfolio with new offensive techniques, tools, and references.

Example structure:

```js
{
  id: "web-sqli",
  name: "SQL INJECTION",
  alias: "SQLi",
  tags: ["Injection", "DB"],
  severity: "critical",
  summary: "Description shown in the modal.",
  notes: "sqlmap -u ...\npayload...",
  link: "https://owasp.org/",
  group: "Injection"
}
```

## Security Notice

This repository is intended for educational and professional documentation purposes. All content should be used responsibly and in accordance with applicable laws, ethical standards, and organizational policies.

## License

This project is provided as an open educational resource for cybersecurity research and portfolio documentation. Please review the repository policies and use the content responsibly.

## Contributing

Contributions are welcome for:

- New technique entries
- Improved documentation
- Better categorization and navigation
- UX or styling enhancements

If you want to add content, keep it structured, clearly labeled, and aligned with the existing portfolio format.

## Contact

For questions, collaboration opportunities, or professional inquiries, please reach out through the repository's contact channels or GitHub profile associated with this project.

---

Built for knowledge-sharing, research, and a professional cybersecurity portfolio.
