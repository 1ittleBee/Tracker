# Donghua Episode Tracker

A lightweight web app for tracking donghua watch progress. It uses Google
sign-in and Firebase Firestore to sync the show list, watched episode counts,
history, and usage stats.

## Features

- Sign in with Google using Firebase Authentication
- Add multiple donghua titles at once
- Increase, decrease, or manually edit watched episode counts
- Rename and delete shows
- Realtime Firestore sync
- Search, sort, paginate, and jump between pages
- Frequently used shows view
- Dashboard stats for total shows, in-progress shows, watched episodes, and most-used show
- JSON import/export
- CSV export
- Light and dark mode
- Responsive layout for desktop and mobile

## Project Structure

```text
.
├── index.html   # Page markup
├── styles.css   # App styling and responsive layout
├── app.js       # Firebase setup, app state, rendering, and event handlers
└── README.md
```

## Local Preview

Because the app uses JavaScript modules, preview it through a local static
server instead of opening `index.html` directly.

One simple option with Node.js:

```bash
npx serve .
```

Then open the URL shown in the terminal.

If you prefer Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Firebase Notes

The app currently reads and writes shows from the top-level Firestore
collection:

```text
shows
```

Google sign-in must be enabled in Firebase Authentication, and your Firestore
rules must allow the signed-in users you expect to use the app.

## GitHub Pages

This project is designed to work as a static GitHub Pages site. In the
repository settings, configure Pages like this:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

The live site should be available at:

```text
https://1ittlebee.github.io/Tracker/
```

## Data Backup

Use **Export JSON** for a full backup that can be imported back into the app.
Use **Export CSV** when you want to view or analyze the tracker data in a
spreadsheet.
