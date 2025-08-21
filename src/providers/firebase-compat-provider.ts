import { BaseAuthProvider } from './base-auth';
import { FirebaseConfig, CheessoUser, CheessoAuthState, SocialProvider } from '../types';

// Firebase compat types - use any to avoid conflicts
declare global {
  interface Window {
    firebase: any;
  }
}

export class FirebaseCompatAuthProvider extends BaseAuthProvider {
  private app: any;
  private auth: any;
  private unsubscribeAuth: (() => void) | null = null;

  constructor(private config: FirebaseConfig) {
    super();

    if (typeof window === 'undefined' || !window.firebase) {
      throw new Error('Firebase compat SDK not loaded. Please include firebase-app-compat.js and firebase-auth-compat.js');
    }

    this.app = window.firebase.initializeApp(config);
    this.auth = window.firebase.auth();
  }

  async initialize(): Promise<void> {
    this.setupAuthListener();
  }

  private setupAuthListener(): void {
    this.unsubscribeAuth = this.auth.onAuthStateChanged((user: any) => {
      const newState: CheessoAuthState = {
        isAuthenticated: !!user,
        user: user ? this.mapFirebaseUser(user) : null,
        loading: false
      };

      this.notifyStateChange(newState);
    });
  }

  private mapFirebaseUser(user: any): CheessoUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }


  async loginWithSocial(provider: SocialProvider): Promise<CheessoUser> {
    try {
      const authProvider = this.createSocialProvider(provider);
      const result = await this.auth.signInWithPopup(authProvider);
      return this.mapFirebaseUser(result.user);
    } catch (error: any) {
      throw new Error(`Firebase ${provider} login failed: ${error.message}`);
    }
  }

  private createSocialProvider(provider: SocialProvider) {
    switch (provider) {
      case 'google':
        return new window.firebase.auth.GoogleAuthProvider();
      case 'microsoft':
        const microsoftProvider = new window.firebase.auth.OAuthProvider('microsoft.com');
        microsoftProvider.addScope('user.read');
        return microsoftProvider;
      case 'apple':
        const appleProvider = new window.firebase.auth.OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        return appleProvider;
      case 'facebook':
        const facebookProvider = new window.firebase.auth.OAuthProvider('facebook.com');
        facebookProvider.addScope('email');
        return facebookProvider;
      case 'github':
        const githubProvider = new window.firebase.auth.OAuthProvider('github.com');
        githubProvider.addScope('user:email');
        return githubProvider;
      default:
        throw new Error(`Unsupported social provider: ${provider}`);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (error: any) {
      throw new Error(`Firebase logout failed: ${error.message}`);
    }
  }

  // SSO methods for cross-domain authentication
  async getIdToken(): Promise<string | null> {
    try {
      const user = this.auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.warn('Failed to get Firebase compat ID token:', error);
      return null;
    }
  }

  async signInWithToken(token: string): Promise<CheessoUser> {
    try {
      const userCredential = await this.auth.signInWithCustomToken(token);
      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      throw new Error(`Firebase compat token sign-in failed: ${error.message}`);
    }
  }

  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.authStateListeners = [];
  }
}