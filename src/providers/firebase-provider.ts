import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Unsubscribe
} from 'firebase/auth';
import { BaseAuthProvider } from './base-auth';
import { FirebaseConfig, CheessoUser, CheessoAuthState, SocialProvider } from '../types';

export interface PopupLoginResult {
  user: CheessoUser;
  /**
   * Google's ID token from the popup, present only for the Google provider.
   * Another origin of the same Firebase project can sign in with it through
   * signInWithGoogleIdToken(), which is what makes the SSO cookie worth sharing.
   */
  googleIdToken: string | null;
}

export class FirebaseAuthProvider extends BaseAuthProvider {
  private app: FirebaseApp;
  private auth: Auth;
  private unsubscribeAuth: Unsubscribe | null = null;

  constructor(private config: FirebaseConfig) {
    super();
    try {
      this.app = getApp('cheesso');
    } catch {
      this.app = initializeApp(config, 'cheesso');
    }
    this.auth = getAuth(this.app);
  }

  async initialize(): Promise<void> {
    this.setupAuthListener();
  }

  /**
   * Resolves once Firebase has read the session persisted for this origin
   * (IndexedDB), so currentUser is trustworthy afterwards.
   */
  async waitForStoredSession(): Promise<void> {
    await this.auth.authStateReady();
    const user = this.auth.currentUser;
    this.currentState = {
      isAuthenticated: !!user,
      user: user ? this.mapFirebaseUser(user) : null,
      knownUser: null,
      loading: false
    };
  }

  private setupAuthListener(): void {
    if (this.unsubscribeAuth) return;
    this.unsubscribeAuth = onAuthStateChanged(this.auth, (user: User | null) => {
      const newState: CheessoAuthState = {
        isAuthenticated: !!user,
        user: user ? this.mapFirebaseUser(user) : null,
        knownUser: null,
        loading: false
      };

      this.notifyStateChange(newState);
    });
  }

  private mapFirebaseUser(user: User): CheessoUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }


  async loginWithSocial(provider: SocialProvider): Promise<CheessoUser> {
    const result = await this.loginWithSocialPopup(provider);
    return result.user;
  }

  async loginWithSocialPopup(provider: SocialProvider): Promise<PopupLoginResult> {
    try {
      const authProvider = this.createSocialProvider(provider);
      const result = await signInWithPopup(this.auth, authProvider);
      const googleIdToken = provider === 'google'
        ? GoogleAuthProvider.credentialFromResult(result)?.idToken ?? null
        : null;
      return { user: this.mapFirebaseUser(result.user), googleIdToken };
    } catch (error: unknown) {
      // Handle account-exists-with-different-credential error
      const firebaseError = error as { code?: string; customData?: { email?: string }; message?: string };
      if (firebaseError.code === 'auth/account-exists-with-different-credential') {
        const email = firebaseError.customData?.email;
        if (email) {
          // Show a more user-friendly error message
          throw new Error(`Looks like ${email} is already taken by another login method. Try signing in with your original method instead!`);
        }
      }

      throw new Error(`Firebase ${provider} login failed: ${firebaseError.message}`);
    }
  }

  private createSocialProvider(provider: SocialProvider) {
    switch (provider) {
      case 'google':
        const googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        return googleProvider;
      case 'microsoft':
        const microsoftProvider = new OAuthProvider('microsoft.com');
        microsoftProvider.addScope('user.read');
        return microsoftProvider;
      case 'apple':
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        return appleProvider;
      case 'facebook':
        // Note: Facebook provider needs separate import in real implementation
        const facebookProvider = new OAuthProvider('facebook.com');
        facebookProvider.addScope('email');
        return facebookProvider;
      case 'github':
        const githubProvider = new OAuthProvider('github.com');
        githubProvider.addScope('user:email');
        return githubProvider;
      default:
        throw new Error(`Unsupported social provider: ${provider}`);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw new Error(`Firebase logout failed: ${(error as Error).message}`);
    }
  }

  /**
   * Signs this origin in with a Google ID token: one from GIS, or one another
   * subdomain shared through the SSO cookie after its own popup login.
   */
  async signInWithGoogleIdToken(idToken: string): Promise<CheessoUser> {
    try {
      const credential = GoogleAuthProvider.credential(idToken, null);
      const result = await signInWithCredential(this.auth, credential);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      throw new Error(`Google ID token login failed: ${(error as Error).message}`);
    }
  }

  /** @deprecated use signInWithGoogleIdToken */
  async loginWithGISCredential(idToken: string): Promise<CheessoUser> {
    return this.signInWithGoogleIdToken(idToken);
  }

  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.authStateListeners = [];
  }
}
