/* ============================================
   data/whoami.js — the whoami page
   ─────────────────────────────────────────
   Replace the [bracketed] placeholders with your own text.
   Leave email or linkedin as "" to show a placeholder instead of a link.

   The ASCII portrait is in data/whoami.txt (taken from the
   card on github.com/angelrmf). Replace that file to change it.
   ============================================ */

const WHOAMI = {
  handle: "angelrmf",

  // Shown in the info panel next to the portrait.
  role:     "[Your role, for example: Junior SOC analyst]",
  focus:    "[What you work on, for example: DFIR, threat hunting, CTFs]",
  location: "[City, country]",
  learning: "[What you are studying right now]",

  // Contact. Email is public once filled in; use an address you are happy to share.
  email:    "",                                 // for example "you@example.com"
  linkedin: "",                                 // full link: "https://www.linkedin.com/in/your-name"
  github:   "https://github.com/angelrmf",

  // About: one string per paragraph.
  about: [
    "[A short paragraph about who you are and how you got into security.]",
    "[A second paragraph about what you are looking for: a role, projects, collaboration.]"
  ]
};
