import { FirebaseAuthProvider } from './providers';
import { CrossDomainMessenger } from './cross-domain';
import { CheessoConfig, CheessoUser, CheessoAuthState, SocialProvider } from './types';

interface CheessoEventMap {
  'auth-changed': CheessoAuthState;
  'login-success': CheessoUser;
  'logout-success': null;
  'auth-error': Error;
}

export class Cheesso {
  private authProvider: FirebaseAuthProvider;
  private crossDomain: CrossDomainMessenger;
  private initialized = false;

  private ssoManagedAuth = false;

  constructor(config: CheessoConfig) {
    if (!config.crossDomainCookie) {
      throw new Error('crossDomainCookie is required in CheessoConfig');
    }

    this.authProvider = this.createAuthProvider(config);
    this.crossDomain = new CrossDomainMessenger(config.crossDomainCookie);

    // SSO check runs synchronously to set ssoManagedAuth before listeners fire
    this.checkSSOAutoLogin();

    // Always set up both listeners regardless of SSO path
    this.setupAuthStateListener();
    this.crossDomain.setupCrossDomainSync((authData) => {
      this.handleCrossDomainAuthSync(authData);
    });
  }

  private createAuthProvider(config: CheessoConfig): FirebaseAuthProvider {
    if (!config.firebaseConfig) {
      throw new Error('Firebase config is required');
    }
    return new FirebaseAuthProvider(config.firebaseConfig);
  }

  private ssoLoginInProgress = false;
  private lastCookieClearTime = 0;

  private checkSSOAutoLogin(): void {
    try {
      const currentState = this.authProvider.getAuthState();
      if (currentState.isAuthenticated) return;

      const ssoUserData = this.crossDomain.getCrossDomainCookie('cheesso_sso_user');
      if (!ssoUserData) return;

      this.ssoLoginInProgress = true;
      try {
        const userInfo = JSON.parse(ssoUserData);

        // Check if data is not too old (24 hours)
        if (userInfo.timestamp && (Date.now() - userInfo.timestamp) > 86400000) {
          this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
          return;
        }

        this.ssoManagedAuth = true;
        this.currentSSOState = {
          isAuthenticated: true,
          user: {
            uid: userInfo.uid,
            email: userInfo.email,
            displayName: userInfo.displayName,
            photoURL: userInfo.photoURL
          },
          loading: false
        };
        this.emitAuthEvent('auth-changed', this.currentSSOState);
      } catch {
        this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
      } finally {
        this.ssoLoginInProgress = false;
      }
    } catch (error) {
      console.warn('SSO auto-login failed:', error);
      this.ssoLoginInProgress = false;
    }
  }

  private handleCrossDomainAuthSync(authData: { token: string | null; user: CheessoUser | null }): void {
    if (!authData.token && !authData.user) {
      // Cookie gone — another domain logged out
      if (this.ssoManagedAuth || this.currentSSOState?.isAuthenticated) {
        const loggedOutState = {
          isAuthenticated: false,
          user: null,
          loading: false
        };
        this.currentSSOState = loggedOutState;
        this.ssoManagedAuth = false;
        this.emitAuthEvent('auth-changed', loggedOutState);
      }

      this.authProvider.logout().catch(error => {
        console.warn('Firebase Auth logout failed (may already be logged out):', error);
      });
    } else if (authData.user) {
      // Cookie found — another domain logged in
      const loginState = {
        isAuthenticated: true,
        user: {
          uid: authData.user.uid,
          email: authData.user.email,
          displayName: authData.user.displayName,
          photoURL: authData.user.photoURL
        },
        loading: false
      };

      this.ssoManagedAuth = true;
      this.currentSSOState = loginState;
      this.emitAuthEvent('auth-changed', loginState);
    }
  }

  private async setSSOCookie(): Promise<void> {
    try {
      // Store user info instead of Firebase token for better cross-domain compatibility
      const currentState = this.authProvider.getAuthState();
      if (currentState.isAuthenticated && currentState.user) {
        const userInfo = {
          uid: currentState.user.uid,
          email: currentState.user.email,
          displayName: currentState.user.displayName,
          photoURL: currentState.user.photoURL,
          timestamp: Date.now()
        };

        // Set cookie with 24 hour expiration
        this.crossDomain.setCrossDomainCookie('cheesso_sso_user', JSON.stringify(userInfo), 86400);
      }
    } catch (error) {
      console.warn('Failed to set SSO cookie:', error);
    }
  }

  private setupAuthStateListener(): void {
    this.authProvider.onAuthStateChanged((state) => {
      if (state.isAuthenticated && state.user) {
        // Firebase has a real session — it takes over from SSO
        this.ssoManagedAuth = false;
        this.setSSOCookie();
      } else if (!this.ssoLoginInProgress && !this.ssoManagedAuth) {
        // Only clear cookie when not SSO-managed and not mid-login
        const now = Date.now();
        if (now - this.lastCookieClearTime > 5000) {
          this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
          this.lastCookieClearTime = now;
        }
      }

      // Only emit Firebase state changes when SSO isn't managing auth
      if (!this.ssoManagedAuth) {
        this.emitAuthEvent('auth-changed', state);
      }
    });
  }

  private emitAuthEvent<K extends keyof CheessoEventMap>(type: K, data: CheessoEventMap[K]): void {
    const event = new CustomEvent(`cheesso:${type}`, { detail: data });
    window.dispatchEvent(event);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize the auth provider
    await this.authProvider.initialize();

    // SSO will check for existing auth state via cookies automatically

    // SSO will handle cross-domain sync automatically via cookies

    this.initialized = true;
  }


  async loginWithSocial(provider: SocialProvider): Promise<CheessoUser> {
    try {
      const user = await this.authProvider.loginWithSocial(provider);
      this.emitAuthEvent('login-success', user);
      return user;
    } catch (error) {
      this.emitAuthEvent('auth-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async loginWithGIS(idToken: string): Promise<CheessoUser> {
    try {
      const user = await this.authProvider.loginWithGISCredential(idToken);
      this.emitAuthEvent('login-success', user);
      return user;
    } catch (error) {
      this.emitAuthEvent('auth-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');

      const loggedOutState = {
        isAuthenticated: false,
        user: null,
        loading: false
      };
      this.currentSSOState = loggedOutState;
      // Reset SSO flag BEFORE Firebase logout so listeners work normally
      this.ssoManagedAuth = false;
      this.emitAuthEvent('auth-changed', loggedOutState);

      await this.authProvider.logout();
      this.emitAuthEvent('logout-success', null);
    } catch (error) {
      console.error('Logout failed:', error);
      this.emitAuthEvent('auth-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private currentSSOState: CheessoAuthState | null = null;

  isAuthenticated(): boolean {
    if (this.ssoManagedAuth) {
      return this.currentSSOState?.isAuthenticated || false;
    }
    return this.authProvider.isAuthenticated();
  }

  getUser(): CheessoUser | null {
    if (this.ssoManagedAuth && this.currentSSOState?.user) {
      return this.currentSSOState.user;
    }
    return this.authProvider.getUser();
  }

  getSSOUser(): CheessoUser | null {
    const ssoData = this.crossDomain.getCrossDomainCookie('cheesso_sso_user');
    if (!ssoData) return null;
    try {
      const parsed = JSON.parse(ssoData);
      return {
        uid: parsed.uid,
        email: parsed.email,
        displayName: parsed.displayName,
        photoURL: parsed.photoURL
      };
    } catch {
      return null;
    }
  }

  clearSSOCookie(): void {
    this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
  }

  getAuthState(): CheessoAuthState {
    return this.authProvider.getAuthState();
  }

  onAuthStateChanged(callback: (state: CheessoAuthState) => void): () => void {
    return this.authProvider.onAuthStateChanged(callback);
  }

  // Event listeners for auth events
  on<K extends keyof CheessoEventMap>(eventType: K, callback: (data: CheessoEventMap[K]) => void): () => void {

    const handler = (event: CustomEvent) => callback(event.detail);
    const eventName = `cheesso:${eventType}`;

    window.addEventListener(eventName, handler as EventListener);

    return () => {
      window.removeEventListener(eventName, handler as EventListener);
    };
  }

  destroy(): void {
    this.authProvider.destroy();
    // Firebase will handle cleanup automatically
  }
}