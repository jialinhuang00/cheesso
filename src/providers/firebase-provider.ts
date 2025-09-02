import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPopup,
  signInWithCustomToken,
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

export class FirebaseAuthProvider extends BaseAuthProvider {
  private app: FirebaseApp;
  private auth: Auth;
  private unsubscribeAuth: Unsubscribe | null = null;

  constructor(private config: FirebaseConfig) {
    super();
    this.app = initializeApp(config);
    this.auth = getAuth(this.app);
  }

  async initialize(): Promise<void> {
    this.setupAuthListener();
  }

  private setupAuthListener(): void {
    this.unsubscribeAuth = onAuthStateChanged(this.auth, (user: User | null) => {
      const newState: CheessoAuthState = {
        isAuthenticated: !!user,
        user: user ? this.mapFirebaseUser(user) : null,
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
    try {
      const authProvider = this.createSocialProvider(provider);
      const result = await signInWithPopup(this.auth, authProvider);
      return this.mapFirebaseUser(result.user);
    } catch (error: any) {
      // Handle account-exists-with-different-credential error
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        if (email) {
          // Show a more user-friendly error message
          throw new Error(`Looks like ${email} is already taken by another login method. Try signing in with your original method instead!`);
        }
      }
      
      throw new Error(`Firebase ${provider} login failed: ${error.message}`);
    }
  }

  private createSocialProvider(provider: SocialProvider) {
    switch (provider) {
      case 'google':
        return new GoogleAuthProvider();
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

  // SSO methods for cross-domain authentication
  async getIdToken(): Promise<string | null> {
    try {
      const user = this.auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.warn('Failed to get Firebase ID token:', error);
      return null;
    }
  }

  async signInWithToken(token: string): Promise<CheessoUser> {
    try {
      const userCredential = await signInWithCustomToken(this.auth, token);
      return this.mapFirebaseUser(userCredential.user);
    } catch (error) {
      throw new Error(`Firebase token sign-in failed: ${(error as Error).message}`);
    }
  }

  async loginWithGISCredential(idToken: string): Promise<CheessoUser> {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(this.auth, credential);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      throw new Error(`GIS credential login failed: ${(error as Error).message}`);
    }
  }

  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    this.authStateListeners = [];
  }
}