# 🧀 Cheesso

Firebase auth that works across subdomains. Login once, stay logged in everywhere.

## ⚠️ Important Notice

**Read this first!** This library only provides API wrapper. You need to setup your own:
- Firebase project configuration  
- OAuth provider credentials (GitHub, Microsoft, Apple, etc.)
- Domain configuration and certificates

I just make the APIs easier to use - you handle the Firebase setup yourself

**Firebase included for NPM users** - no separate Firebase install needed. CDN users need to load Firebase first.

## When to use what

**Just want a login button?** Use the chainable API:
```javascript
// Simple drop-in auth button with cross-subdomain sync
Cheesso('#auth-button')
  .firebase({
    apiKey: "your-api-key",
    authDomain: "your-domain.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-bucket.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  })
  .google()
  .render();
```

**Need programmatic control?** Use the Cheesso class directly:
```javascript
// For custom auth logic, hooks, or multiple components
import { Cheesso } from 'cheesso';

const cheesso = new Cheesso({
  provider: 'firebase',
  firebaseConfig: { /* ... */ },
  crossDomainCookie: '.yourdomain.com'
});

await cheesso.initialize();
await cheesso.loginWithSocial('google');
```

## Installation

**NPM/Yarn:**
```bash
npm install cheesso
# or
yarn add cheesso
```

**CDN (Browser):**
```html
<!-- 1. Load Firebase first (required) -->
<script src="https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"></script>

<!-- 2. Load Cheesso -->
<script src="https://cdn.jsdelivr.net/npm/cheesso@latest/dist/cheesso-complete.js"></script>

<!-- 3. Use the chainable API -->
<script>
  window.Cheesso('#auth-button')
    .firebase({
      apiKey: "your-api-key",
      authDomain: "your-domain.firebaseapp.com",
      projectId: "your-project",
      storageBucket: "your-bucket.firebasestorage.app",
      messagingSenderId: "123456789",
      appId: "your-app-id"
    })
    .google()
    .render();
</script>

<!-- 4. Add the container -->
<div id="auth-button"></div>
```

## React Example

```tsx
import Cheesso from 'cheesso/ui';

function AuthButton() {
  useEffect(() => {
    Cheesso('#auth-button')
      .firebase({ /* config */ })
      .google()
      .render();
  }, []);

  return <div id="auth-button" />;
}
```

## How cross-subdomain sync works

- Uses cookies to share auth state across `*.yourdomain.com`
- Login on `app1.example.com` → auto-login on `app2.example.com`
- Logout anywhere → logout everywhere via `visibilityChange` events
- **Only works for same-site subdomains** (not different domains)
- Automatic sync when switching between tabs/domains

## Supported scenarios

✅ `app.example.com` ↔ `admin.example.com`  
✅ `example.com` ↔ `blog.example.com`  
❌ `example.com` ↔ `different.com`

## Cross-domain configuration

By default, cookies are set for `.jialin00.com`. To use your own domain:

**Chainable API:**
```javascript
Cheesso('#container')
  .firebase(config)
  .crossDomain('.example.com') // Your domain
  .google()
  .render();
```

**Programmatic API:**
```javascript
new Cheesso({
  provider: 'firebase',
  firebaseConfig: { /* ... */ },
  crossDomainCookie: '.example.com'
});
```

## Full chainable API

```javascript
Cheesso('#container')
  .firebase(config)     // or .cognito(config)
  .crossDomain('.example.com') // Set cookie domain
  .google()            // Add Google login
  .microsoft()         // Add Microsoft login  
  .apple()             // Add Apple login
  .facebook()          // Add Facebook login
  .github()            // Add GitHub login
  .loginText('Sign In')
  .logoutText('Sign Out')
  .hoverDropdown(true) // Open on hover
  .render();
```

## Google Identity Services (GIS) Integration

Cheesso supports Google Identity Services for popup-free authentication experience, similar to Medium's login flow.

### Setup GIS Authentication

**1. Load GIS Script:**
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**2. Configure OAuth Client:**
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Important**: Select your Firebase project from the project dropdown (top-left)
- Find your OAuth 2.0 Client ID (should match your Firebase project)
- Edit the client and add your domains to **Authorized JavaScript origins**:
  ```
  https://yourdomain.com
  https://www.yourdomain.com
  http://localhost:3000  # For development
  ```
- **Note**: Wildcards (*.domain.com) are NOT supported

**3. Use GIS with Cheesso:**
```javascript
import { Cheesso } from 'cheesso';

const cheesso = new Cheesso({
  provider: 'firebase',
  firebaseConfig: { /* your config */ },
  crossDomainCookie: '.yourdomain.com'
});

await cheesso.initialize();

// Setup GIS auto-prompt
if (window.google) {
  window.google.accounts.id.initialize({
    client_id: "YOUR-FIREBASE-WEB-CLIENT-ID.apps.googleusercontent.com",
    callback: async (response) => {
      await cheesso.loginWithGIS(response.credential);
    }
  });
  
  // Auto-show login prompt (no popup blocker)
  window.google.accounts.id.prompt();
}
```

### Finding Your Web Client ID

Your Firebase project automatically creates a web OAuth client. The format is:
```
PROJECT-NUMBER-randomstring.apps.googleusercontent.com
```

**Troubleshooting:**
- **"Origin not allowed"**: Add your domain to Authorized JavaScript origins
- **"Project not found"**: Make sure you selected the correct Firebase project in Google Cloud Console
- **Can't find client ID**: Look for "OAuth 2.0 Client IDs" section in GCP Credentials

### GIS vs Firebase Popup

| Method | User Experience | Popup Blocker | Setup Complexity |
|--------|-----------------|---------------|------------------|
| Firebase `signInWithPopup` | Requires user click | Can be blocked | Simple |
| Google Identity Services | Auto-prompt, like Medium | Never blocked | Requires OAuth setup |

Both methods write to the same Firebase Auth instance and support cross-domain sync.

## License

MIT