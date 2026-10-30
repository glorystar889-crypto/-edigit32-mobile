# eDigit32 Mobile — Android-ready web app

This is an independent eDigit32-style companion app, not the original eDigit32 product.

## Run it on Android
1. Upload this folder to a static HTTPS host (for example Firebase Hosting, Netlify, or another HTTPS web host).
2. Open the hosted address in Chrome on your Android phone.
3. Use Chrome menu → **Install app** or **Add to Home screen**.
4. It opens like an app. The service worker caches the interface for offline use.

You can also test on a computer by serving this folder from a local web server. ES modules and service workers generally do not work from a `file://` URL.

## Data
- Slips and customers are saved in this browser's local storage on the phone.
- Use **Export** regularly to download a JSON backup.
- **Import** restores a previously exported JSON backup.
- Clearing browser data or uninstalling/removing the site can remove local data.

## Enable online backup (Firebase)
Online backup is included but needs your own Firebase project and internet connection.

1. Create a project at https://console.firebase.google.com/
2. Add a Web App in Project settings and copy its Firebase config.
3. Replace the placeholder values in `firebase-config.js`.
4. In Firebase Authentication → Sign-in method, enable **Email/Password**.
5. Create the Firestore database.
6. Publish the rules in `firestore.rules` under Firestore → Rules.
7. In Authentication, create a user email/password for yourself.
8. Deploy the folder to an HTTPS host and open the app.
9. Tap **Sign in / Cloud backup**, enter that Firebase email/password, and tap **Sign in & sync**.

The app writes the signed-in user's backup to `users/{uid}/backups/main`. The included Firestore rules restrict access to each signed-in user's own backup document.

## Important notes
- The first cloud sync uploads the data currently on the phone to the cloud. Later syncs upload the current app data to the same backup document.
- For multiple phones, export/merge data carefully before first sync on a second phone; this starter version is not a live multi-device merge engine.
- Do not share your Firebase service-account keys. This app only uses the public web-app config and Firebase Authentication.
- This app calculates and records entries only. It does not connect to a lottery, submit bets, or guarantee winnings.
