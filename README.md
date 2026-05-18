# REDTEAM CODEX

A modular, static GitHub Pages site for documenting pentesting techniques, tools, and references.

## File Structure

```
/
├── index.html              ← Main page
├── css/
│   ├── theme.css           ← CSS variables & dark/light mode
│   ├── layout.css          ← Page structure (header, nav, grid)
│   ├── components.css      ← Cards, modal, buttons, tags
│   └── animations.css      ← Motion & transitions
├── js/
│   ├── theme.js            ← Dark/light toggle (persists to localStorage)
│   ├── nav.js              ← Navigation & category dropdown
│   ├── render.js           ← Renders cards/sections from data
│   ├── modal.js            ← Detail modal logic
│   ├── search.js           ← Live search/filter
│   └── app.js              ← Entry point
├── data/
│   └── techniques.js       ← ⭐ YOUR DATA — add all techniques here
└── assets/
    └── images/             ← Drop card images here (optional)
```

## Adding Techniques

Edit `data/techniques.js`. Each **category** looks like:

```js
{
  id: "webapp",           // unique slug, used for anchor links
  name: "WEB APPLICATION", // displayed as section header
  entries: [
    {
      id: "web-sqli",           // unique entry id
      name: "SQL INJECTION",    // card title
      alias: "SQLi",            // subtitle / CVE / tool name
      tags: ["Injection", "DB"],
      severity: "critical",     // critical | high | medium | low | info
      image: "assets/images/sqli.jpg",  // optional
      summary: "Description shown in modal...",
      notes: "sqlmap -u ...\npayload...",  // commands/snippets
      link: "https://owasp.org/...",       // optional external link
      group: "Injection"        // sub-group label within category (optional)
    }
  ]
}
```

## Severity Tags

| Value      | Color   |
|------------|---------|
| `critical` | Red     |
| `high`     | Orange  |
| `medium`   | Yellow  |
| `low`      | Green   |
| `info`     | Blue    |

## GitHub Pages

1. Push the repo.
2. Go to **Settings → Pages → Source → main / root**.
3. Your site is live at `https://<username>.github.io/<repo>/`.

No build step required — pure HTML/CSS/JS.
