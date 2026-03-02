# Cheesso

Swiss cheese has holes. Your subdomains have walls. Cheesso punches through them.

Cross-subdomain SSO for Firebase. Login on `app.example.com`, stay logged in on `blog.example.com`.

## How it works

A shared cookie on `.example.com` carries auth state across subdomains. Tab switches trigger `visibilitychange` to sync. No server required.

```
app.example.com logs in → cookie set on .example.com → blog.example.com reads cookie → synced
```

Only same-site subdomains. `example.com` and `other.com` will not work.

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
| `logout()` | Clears cookie and Firebase session |
| `isAuthenticated()` | Returns `boolean` |
| `getUser()` | Returns `{ uid, email, displayName, photoURL }` or `null` |
| `on(event, callback)` | Listen to `'auth-changed'`, `'login-success'`, `'logout-success'`, `'auth-error'` |

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

- Cookie carries user info, not a Firebase token. Other subdomains can display who's logged in but cannot call Firestore or other Firebase services.
- SSO cookie expires after 24 hours.
- GIS prompt has a cooldown after user dismisses it.

## License

MIT
