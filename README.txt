ANOVA Automation Frontend

- Host this folder with Firebase Hosting.
- Backend (voice assistant) runs at:
  https://anova-realtime-backend-46703179756.us-central1.run.app/api/realtime-session
- The floating voice widget already calls this backend.

Structure:
- public/index.html       (language redirect)
- public/en/index.html    (English homepage)
- public/fr/index.html    (French homepage)
- public/demo/index.html  (demo page)
- public/pricing/index.html
- public/contact/index.html
- public/styles/global.css
- public/assets/logo.svg
- src/anova-voice-widget.js
- firebase.json
