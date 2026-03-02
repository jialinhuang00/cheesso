# Google Identity Services (GIS) Setup

GIS shows a credential prompt without a popup. No popup blocker issues. Same flow as Medium's login.

## 1. Load the script

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

## 2. Configure OAuth client

Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials). Select your Firebase project.

Find the OAuth 2.0 Client ID. Add your domains to **Authorized JavaScript origins**:

```
https://yourdomain.com
https://app.yourdomain.com
http://localhost:3000
```

Wildcards (`*.domain.com`) are not supported. Add each subdomain individually.

## 3. Use with Cheesso

```ts
import { CheessoAuthButton } from 'cheesso/ui';

const authButton = new CheessoAuthButton({
  container: '#auth-button',
  firebaseConfig: { /* ... */ },
  crossDomainCookie: '.yourdomain.com',
  socialProviders: ['google', 'github']
});

const cheesso = authButton.getCheesso();

if (window.google && !cheesso.isAuthenticated()) {
  google.accounts.id.initialize({
    client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com",
    callback: async (res) => {
      await cheesso.loginWithGIS(res.credential);
    }
  });
  google.accounts.id.prompt();
}
```

## Finding your client ID

Firebase creates a web OAuth client automatically. Format:

```
PROJECT_NUMBER-randomstring.apps.googleusercontent.com
```

Look under **OAuth 2.0 Client IDs** in GCP Credentials.

## GIS vs Firebase popup

| | GIS | Firebase popup |
|---|---|---|
| User interaction | Auto-prompt, no click needed | Requires click |
| Popup blocker | Never blocked | Can be blocked |
| Setup | OAuth client config required | Works out of the box |

Both write to the same Firebase Auth instance. Both support cross-subdomain sync.

## Troubleshooting

| Error | Fix |
|---|---|
| Origin not allowed | Add domain to Authorized JavaScript origins |
| Project not found | Select correct Firebase project in GCP Console |
| Prompt not showing after dismiss | GIS cooldown. Clear Google cookies or use incognito. Provide a manual login button as fallback. |
