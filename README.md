# Cheesso

Swiss cheese has holes. Your subdomains have walls. Cheesso punches through them.

Cross-subdomain SSO for Firebase. Login on `app.example.com`, stay logged in on `blog.example.com`.

## How it works

Firebase Auth keeps its session per origin, so a login on `app.example.com` is invisible to `blog.example.com`. Cheesso bridges that with cookies on the parent domain. No server required.

```
app.example.com: popup login
  → Firebase session on app.example.com
  → cookies on .example.com:
      cheesso_sso_token_<projectId>   Google ID token, 10 min
      cheesso_sso_user_<projectId>    who is signed in, 24 h

blog.example.com, opened within 10 min
  → signs in with the token (signInWithCredential), no popup
  → now has its own Firebase session; Firestore calls work

blog.example.com, opened later
  → shows a one-click "as <name>" button → popup → signed in

logout on any subdomain
  → cookies cleared, logout marker written
  → the other subdomains sign out when their tab comes back into view
```

Cookie names carry the Firebase project ID, so two apps on different projects under one parent domain keep separate cookies.

Only same-site subdomains. `example.com` and `other.com` will not work.

The token cookie is readable by script on every subdomain of the parent domain. Keep third-party scripts off those pages, and keep the token window short (`tokenMaxAge`, default 600 s).

## Install

```bash
npm install cheesso
```

## Quick start

### Drop-in button (chainable API)

```ts
import Cheesso from 'cheesso/ui';

Cheesso('#auth-button')
  .firebase({ apiKey: "...", authDomain: "...", projectId: "..." })
  .crossDomain('.example.com')
  .google()
  .render();
```

### Programmatic

```ts
import { Cheesso } from 'cheesso';

const cheesso = new Cheesso({
  firebaseConfig: { apiKey: "...", authDomain: "...", projectId: "..." },
  crossDomainCookie: '.example.com'
});

await cheesso.initialize();
await cheesso.loginWithSocial('google');
```

## API

| Method | Does |
|---|---|
| `loginWithSocial(provider)` | Firebase popup login. `'google'`, `'github'`, `'microsoft'`, `'apple'`, `'facebook'` |
| `loginWithGIS(idToken)` | Login with Google Identity Services credential |
| `logout()` | Clears cookies, writes the logout marker, signs out of Firebase |
| `initialize()` | Restores this origin's session or signs in with the shared token. Idempotent; `await` it before reading state |
| `isAuthenticated()` | `true` only when Firebase has a session on this origin |
| `getUser()` | The Firebase user on this origin: `{ uid, email, displayName, photoURL }` or `null` |
| `getKnownUser()` | Who is signed in on a sibling subdomain while this origin is not; for a "sign in as" button. Grants nothing |
| `getAuthState()` | `{ isAuthenticated, user, knownUser, loading }` |
| `on(event, callback)` | Listen to `'auth-changed'`, `'login-success'`, `'logout-success'`, `'auth-error'` |

`login-success` also fires when the shared token signs this origin in without a popup.

## Chainable API

```ts
Cheesso('#container')
  .firebase(config)
  .crossDomain('.example.com')
  .google()
  .github()
  .microsoft()
  .apple()
  .facebook()
  .loginText('Sign In')
  .logoutText('Sign Out')
  .tokenMaxAge(600)
  .hoverDropdown(true)
  .render();
```

## React

```tsx
import Cheesso from 'cheesso/ui';

function AuthButton() {
  useEffect(() => {
    Cheesso('#auth-button')
      .firebase(config)
      .crossDomain('.example.com')
      .google()
      .render();
  }, []);

  return <div id="auth-button" />;
}
```

## GIS (Google Identity Services)

Popup-free login. Requires OAuth client setup in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). See [docs/gis.md](docs/gis.md) for full setup.

```ts
const cheesso = authButton.getCheesso();

google.accounts.id.initialize({
  client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  callback: (res) => cheesso.loginWithGIS(res.credential)
});
google.accounts.id.prompt();
```

## Limitations

- The shared token comes from a Google popup or GIS login. Other providers (Apple, Microsoft, GitHub, Facebook) share who is signed in, but the next subdomain still needs its own popup.
- The token window is 10 minutes by default. A subdomain opened for the first time after that shows the one-click button instead of signing in by itself.
- GIS prompt has a cooldown after user dismisses it.

## Upgrading from 1.x

- `isAuthenticated()` and `getUser()` now reflect Firebase on this origin only. In 1.x they also returned `true` / a user when only the cookie was present, while Firestore calls were still unauthenticated.
- `getSSOUser()` is now `getKnownUser()` (the old name still works).
- `CheessoAuthState` has a new `knownUser` field, and `loading` stays `true` until `initialize()` has finished.
- Cookie names now end in the Firebase project ID. The 1.x cookie `cheesso_sso_user` is cleared on first load.
- A cookie that merely expired no longer signs the other subdomains out; only an explicit `logout()` does.

## License

MIT
