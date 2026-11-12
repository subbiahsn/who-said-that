# Who Said That? — setup

Two pages:

- **host.html**: your page. The home screen (title + QR code) is what you put on the projector. You run the game from here.
- **index.html**: the player page the QR code opens. No sign-in. Players type their name and play.

## Try it right now (local demo mode)

While `config.js` has `firebaseConfig = null`, everything runs inside one browser, with no setup.

1. Serve the folder (ES modules don't run from `file://`):
   ```
   cd who-said-that-site
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000/host.html` → **Manage facts** and add or paste a few facts, then **Back to home**.
3. Open `http://localhost:8000/index.html` in one or two more tabs. Each tab counts as a different player.
4. Press **Start the game** on the host tab and play.

Phones can't reach this demo. For the real game, do the one-time setup below.

## Real game setup (about 15 minutes, free)

### 1. Create a Firebase project
Go to <https://console.firebase.google.com> → **Add project** → give it a name (e.g. `who-said-that`). Google Analytics isn't needed.

### 2. Turn on sign-in
**Build → Authentication → Get started**, then under **Sign-in method** enable:
- **Anonymous** (players get an invisible account, so they never see a sign-in screen)
- **Email/Password** (just for you, the host)

Under **Users → Add user**, add your own email and a password. Copy the **User UID** it shows. You need it in step 3.

### 3. Create the database and lock it down
**Build → Realtime Database → Create database** → choose a location → **Start in locked mode**.

Open the **Rules** tab. Paste in all of `database.rules.json`, replace every `ADMIN_UID` with the User UID from step 2, and click **Publish**.

The rules make sure that:
- only you can see the facts, the answers, and everyone's guesses
- each player can lock in **one** guess per fact, only for the current fact, only while guessing is open, and can never change it
- players can only heart the fact that is currently showing

### 4. Connect the site to Firebase
**Project settings (gear icon) → General → Your apps → Web (`</>`)** → register an app (no hosting needed). Copy the `firebaseConfig` object it shows into `config.js`:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://...firebasedatabase.app",   // must be included
  projectId: "...",
  appId: "..."
};
```

If `databaseURL` is missing, copy it from the top of the Realtime Database page.

### 5. Put it online
The easiest option is **Netlify Drop**: go to <https://app.netlify.com/drop> and drag the whole `who-said-that-site` folder onto the page. You get an address like `https://lucky-name-123.netlify.app`. GitHub Pages or any static host works too.

Then in Firebase: **Authentication → Settings → Authorized domains → Add domain**, and add that Netlify address (without `https://`).

### 6. Run the game
1. Open `https://your-site/host.html` and sign in with the email and password from step 2.
2. **Manage facts**: paste the submissions (`Name | fact`, one per line), or add them one by one.
3. Go back to **Home** and press **Full screen**. Players scan the QR code and enter their names, and you watch them appear.
4. **Start the game**. For each door: **Reveal guesses** (shows the top 3 and closes guessing on every phone) → **Reveal answer** → **Next door**.
5. After the last door, **Finish & show results** shows the top 5 guessers and the most loved facts.

## Good to know
- Firebase's free plan allows **100 people connected at the same time**, which is plenty for most retreats.
- Players who refresh or close the page keep their name and guesses, as long as it's the same phone and browser.
- **Start a new game** reshuffles the doors and clears earlier guesses and hearts. Players stay joined.
- Keyboard shortcuts on the host stage: **G** reveal guesses · **A** reveal answer · **N** next door.
