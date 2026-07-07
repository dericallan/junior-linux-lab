# Junior Linux Lab

Marketing site + student/mentor portal for Junior Linux Lab, a Linux & coding
course for kids aged 8-15. Static HTML/CSS/JS — no build step, no backend.

**Live site:** https://dericallan.github.io/junior-linux-lab/

## Structure

```
index.html                   Landing page (curriculum, pricing, FAQ, enroll)
pages/
  student-dashboard.html     Full-page student workspace (after login)
css/
  style.css                  All site styles
js/
  app.js                     Bash simulator, enroll form, mobile menu, FAQ
  chatbot.js                 "Tux" the Linux-teacher chatbot
  portal-data.js             Shared data layer, credentials, EmailJS config
  portal.js                  Login modal + Mentor Portal (index.html only)
  student-dashboard.js       Student dashboard logic (pages/student-dashboard.html)
assets/
  images/                    Site images
```

## Running locally

Any static file server works, e.g.:

```
python -m http.server 8010
```

then open http://localhost:8010/.

## Key things to know

- **No backend or database.** Student accounts, projects, and fee status live
  in the browser's `localStorage` — a demo/prototype data layer, not
  production-grade. See the notice at the top of `js/portal-data.js`.
- **EmailJS** sends the enrollment confirmation email. Configure your own
  Service ID / Template ID / Public Key at the top of `js/portal-data.js` —
  see the comment there for the exact template variables it sends.
- **Mentor login** credentials are also in `js/portal-data.js`
  (`MENTOR_CREDENTIALS`). This repo is public, so treat that value as hidden
  from casual UI viewing, not as a real secret — anyone can read the source.
- **The embedded terminal** (student/mentor "Terminal" tabs) is a separate
  project: https://github.com/dericallan/browser-linux-terminal — a real
  Alpine Linux booted via [v86](https://github.com/copy/v86) (WebAssembly x86
  emulation), embedded via iframe. Live mentor↔student terminal mirroring
  runs over WebRTC (PeerJS), independent of this repo.

## Deploying

Pushing to `main` triggers a GitHub Pages rebuild automatically (Settings →
Pages → deploy from `main`, root).
