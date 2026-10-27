export interface CheessoUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type AuthProvider = 'firebase';

export type SocialProvider = 'google' | 'apple' | 'microsoft' | 'facebook' | 'github';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface CheessoConfig {
  provider: AuthProvider;
  firebaseConfig?: FirebaseConfig;
  socialProviders?: SocialProvider[];
  crossDomainCookie?: string; // Domain for SSO cookies (e.g., '.example.com')
  /**
   * Seconds the shared Google ID token stays in the cookie after a login.
   * Other subdomains opened within this window sign in without a popup.
   * Default 600. The token itself expires on Google's schedule (about an hour).
   */
  tokenCookieMaxAge?: number;
}

export interface CheessoAuthState {
  /** true only when Firebase Auth has a session on this origin */
  isAuthenticated: boolean;
  /** the Firebase user on this origin, or null */
  user: CheessoUser | null;
  /**
   * Who is signed in on a sibling subdomain (from the shared cookie) when this
   * origin has no session of its own. Lets the UI offer "sign in as X" with one
   * click. Never grants access: Firebase on this origin still has no user.
   */
  knownUser: CheessoUser | null;
  /** true until initialize() has restored the stored session and tried the shared token */
  loading: boolean;
}

export interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        cancel_on_tap_outside?: boolean;
        auto_select?: boolean;
      }) => void;
      prompt: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}
