# Junior Linux Lab

Marketing site + student/mentor portal for Junior Linux Lab, a Linux & coding
course for kids aged 8-15. Static HTML/CSS/JS — no build step, hosted on
GitHub Pages — backed by Firebase (Authentication + Firestore) for real,
cross-device student/mentor data.

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

- **Firebase backend.** Student accounts, enrollment data, fee status, and
  the mentor-editable syllabus live in Firestore, gated by Firebase
  Authentication — real, shared data visible from any browser/device, not a
  per-browser demo. Config lives at the top of `js/portal-data.js`
  (`firebaseConfig`) — that object is safe to be public; it's a client
  identifier, not a secret. Security comes from `firestore.rules` (repo
  root), which must be deployed via Firebase Console → Firestore Database →
  Rules.
- **Mentor login** is a real Firebase Auth account (Authentication → Users in
  the Firebase console), matched against the fixed email in `MENTOR_EMAIL` in
  `js/portal-data.js`. Change the mentor's password from the Firebase
  console, not from this repo.
- **Student login** is also a real Firebase Auth account, created
  automatically at enrollment (`registerStudent()` in `js/portal-data.js`)
  with an auto-generated password shown once in the enrollment confirmation
  and sent via email.
- **EmailJS** sends the enrollment confirmation email. Configure your own
  Service ID / Template ID / Public Key at the top of `js/portal-data.js` —
  see the comment there for the exact template variables it sends.
- **The embedded terminal** (student/mentor "Terminal" tabs) is a separate
  project: https://github.com/dericallan/browser-linux-terminal — a real
  Alpine Linux booted via [v86](https://github.com/copy/v86) (WebAssembly x86
  emulation), embedded via iframe. Live mentor↔student terminal mirroring
  runs over WebRTC (PeerJS), independent of this repo and of Firebase.

## Deploying

Pushing to `main` triggers a GitHub Pages rebuild automatically (Settings →
Pages → deploy from `main`, root).
