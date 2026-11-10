# Who Said That?

A real-time icebreaker game for groups. Everyone submits one surprising fact about themselves. The host shows the facts one at a time ("doors") on a projector, and players guess on their phones whose fact it is. At the end you get a leaderboard of the best guessers and the most loved facts.

It is a static site (plain HTML, CSS and JavaScript modules) backed by Firebase Realtime Database. No build step.

## How it works

| Page | Who uses it | What it does |
| --- | --- | --- |
| [host.html](host.html) | The host | Home screen with a QR code for projecting, fact management, the how-to-play screen, and the game controls |
| [index.html](index.html) | Players | Opened via the QR code. Join with a name, guess, and favourite facts. No sign-in |

**Game flow**

1. Players scan the QR code and enter their name. They wait in a lobby with the instructions.
2. The host presses **Start the game**, which opens a how-to-play screen. Then **Open the first door**.
3. Per door: players type a name, pick it from the dropdown and press **Lock in my guess**. They can also tap ♥ to mark or unmark a favourite fact.
4. The host presses **Reveal guesses** (shows the top 3 and closes guessing), then **Reveal answer**, then **Next door**.
5. After the last door, the results show the top 5 guessers and the most loved facts. Players see "The game has ended" if they weren't part of the game.

Host keyboard shortcuts on the game screen: **G** reveal guesses, **A** reveal answer, **N** next door.

## Files

- [host.html](host.html): host UI and game logic
- [index.html](index.html): player UI
- [common.js](common.js): shared data layer (Firebase or local demo mode), name autocomplete and render helpers
- [config.js](config.js): your Firebase web config
- [database.rules.json](database.rules.json): Realtime Database security rules
- [styles.css](styles.css): shared styles
- [SETUP.md](SETUP.md): detailed Firebase setup walkthrough

## Quick try (local demo mode)

While `firebaseConfig` in `config.js` is `null`, everything runs in one browser using localStorage.

```bash
python3 -m http.server 8000
```

1. Open `http://localhost:8000/host.html`, go to **Manage facts**, then **Load demo data** (15 facts and 15 players).
2. Open `http://localhost:8000/index.html` in more tabs. Each tab is a separate player.
3. Press **Start the game** on the host tab.

Phones can't join this mode. Use Firebase for a real game.

## Real setup

Full steps are in [SETUP.md](SETUP.md). In short:

1. Create a Firebase project and enable **Anonymous** and **Email/Password** sign-in.
2. Create a Realtime Database and publish [database.rules.json](database.rules.json), replacing every `ADMIN_UID` with your host account's User UID.
3. Paste your web app config into [config.js](config.js).
4. Host the folder on any static host (see below) and add the domain under Firebase **Authentication → Settings → Authorized domains**.

## Deploy on GitHub Pages

1. Push to `main`.
2. In the repo, go to **Settings → Pages**, set **Source** to **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. Your site will be at `https://<user>.github.io/who-said-that/`. Players use that URL and you use `.../host.html`.
4. Add `<user>.github.io` to Firebase **Authorized domains**.

## Security notes

- The Firebase web config in `config.js` is not a secret. It ships to every browser. Protection comes from the database rules and Firebase Auth, so make sure the rules are published with your real admin UID.
- Optionally restrict the API key to your site's domain in Google Cloud Console → Credentials.
- Never commit service account keys or admin credentials.

## Good to know

- Firebase's free plan allows 100 simultaneous connections.
- Players who refresh keep their name and guesses (same browser).
- **Start a new game** reshuffles the doors and clears earlier guesses and hearts. Players stay joined.
- Manage facts hides the facts by default. Revealing them takes a confirmation, to avoid spoilers.
