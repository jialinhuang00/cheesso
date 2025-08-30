import { BaseAuthProvider, FirebaseAuthProvider, FirebaseCompatAuthProvider, CognitoAuthProvider } from './providers';
import { CrossDomainMessenger } from './cross-domain';
import { CheessoConfig, CheessoUser, CheessoAuthState, SocialProvider } from './types';

export class Cheesso {
  private authProvider: BaseAuthProvider;
  private crossDomain: CrossDomainMessenger;
  private initialized = false;

  private ssoManagedAuth = false;

  constructor(config: CheessoConfig) {
    if (!config.crossDomainCookie) {
      throw new Error('crossDomainCookie is required in CheessoConfig');
    }

    this.authProvider = this.createAuthProvider(config);
    this.crossDomain = new CrossDomainMessenger(config.crossDomainCookie);
    // SSO check must happen BEFORE setting up auth state listeners
    this.checkSSOAutoLogin().then((ssoSuccess) => {
      if (ssoSuccess) {
        console.log('SSO successful, will not use Firebase auth state management');
        this.ssoManagedAuth = true;
        // Don't set up Firebase listeners, SSO will manage everything
      } else {
        console.log('No SSO, using normal Firebase auth state management');
        this.setupAuthStateListener();
        // Set up cross-domain sync listener
        this.crossDomain.setupCrossDomainSync((authData) => {
          this.handleCrossDomainAuthSync(authData);
        });
      }
    });
  }

  private createAuthProvider(config: CheessoConfig): BaseAuthProvider {
    switch (config.provider) {
      case 'firebase':
        if (!config.firebaseConfig) {
          throw new Error('Firebase config is required when using Firebase provider');
        }

        // Check if we're in browser environment with compat SDK
        if (typeof window !== 'undefined' && (window as any).firebase) {
          return new FirebaseCompatAuthProvider(config.firebaseConfig);
        } else {
          // Use modern Firebase SDK for Node.js or ES modules
          return new FirebaseAuthProvider(config.firebaseConfig);
        }

      case 'cognito':
        if (!config.cognitoConfig) {
          throw new Error('Cognito config is required when using Cognito provider');
        }
        return new CognitoAuthProvider(config.cognitoConfig);

      default:
        throw new Error(`Unsupported auth provider: ${config.provider}`);
    }
  }

  private ssoLoginInProgress = false;
  private lastCookieClearTime = 0;

  private async checkSSOAutoLogin(): Promise<boolean> {
    try {
      // Check if already authenticated
      const currentState = this.authProvider.getAuthState();
      if (currentState.isAuthenticated) {
        console.log('Already authenticated, skipping SSO check');
        return false;
      }

      // Check for SSO user info in cookie
      const ssoUserData = this.crossDomain.getCrossDomainCookie('cheesso_sso_user');
      if (ssoUserData) {
        console.log('SSO user data found in cookie');
        this.ssoLoginInProgress = true;

        try {
          // Add more debugging

          const userInfo = JSON.parse(ssoUserData);

          // Check if data is not too old (24 hours)
          const now = Date.now();
          if (userInfo.timestamp && (now - userInfo.timestamp) > 86400000) {
            console.log('SSO user data has expired');
            this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
            return false;
          }

          // Set auth state directly since we have the user info
          const authState = {
            isAuthenticated: true,
            user: {
              uid: userInfo.uid,
              email: userInfo.email,
              displayName: userInfo.displayName,
              photoURL: userInfo.photoURL
            },
            loading: false
          };

          console.log('SSO auto-login successful with user:', userInfo.email);
          this.currentSSOState = authState; // Store SSO state
          this.emitAuthEvent('auth-changed', authState);
          return true; // SSO was successful
        } catch (parseError) {
          console.error('Failed to parse SSO user data:', parseError);
          console.log('Clearing corrupted SSO cookie');
          this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
          return false;
        } finally {
          this.ssoLoginInProgress = false;
        }
      }
    } catch (error) {
      console.warn('SSO auto-login failed:', error);
      this.ssoLoginInProgress = false;
    }

    return false; // No SSO happened
  }

  private handleCrossDomainAuthSync(authData: any): void {
    // Handle cross-domain auth state sync from visibility change
    if (!authData.token && !authData.user) {
      // User logged out from another domain
      console.log('Cross-domain logout detected, performing local logout...');

      if (this.ssoManagedAuth && this.currentSSOState?.isAuthenticated) {
        const loggedOutState = {
          isAuthenticated: false,
          user: null,
          loading: false
        };
        this.currentSSOState = loggedOutState;
        this.emitAuthEvent('auth-changed', loggedOutState);
      }

      this.authProvider.logout().catch(error => {
        console.warn('Firebase Auth logout failed (may already be logged out):', error);
      });
    } else if (authData.user) {
      // User logged in from another domain
      console.log('Cross-domain login detected, updating local state...');
      
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
        console.log('SSO user info cookie set successfully');
      }
    } catch (error) {
      console.warn('Failed to set SSO cookie:', error);
    }
  }

  private setupAuthStateListener(): void {
    // Listen for auth state changes and write to cross-domain cookies
    this.authProvider.onAuthStateChanged((state) => {
      // Handle SSO cookie management
      if (state.isAuthenticated && state.user) {
        console.log('state.isAuthenticated && state.user', state.isAuthenticated, state.user)
        // Set SSO cookie for cross-domain access
        this.setSSOCookie();
      } else if (!this.ssoLoginInProgress) {
        // Only clear SSO cookie on actual logout, not during SSO login process
        // Add rate limiting to prevent infinite clearing
        const now = Date.now();
        if (now - this.lastCookieClearTime > 5000) { // Only clear once per 5 seconds
          console.log('User logged out, clearing SSO cookie');
          this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');
          this.lastCookieClearTime = now;
        }
      }

      // Emit custom event for local listeners
      this.emitAuthEvent('auth-changed', state);
    });

    // SSO will handle cross-domain sync automatically via cookies
  }

  private emitAuthEvent(type: string, data: any): void {
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
      this.emitAuthEvent('auth-error', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('Starting logout process...');

      // Clear SSO cookie (this will trigger other domains to logout via polling)
      console.log('Clearing SSO cookie...');
      this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');

      // Local logout
      if (this.ssoManagedAuth) {
        const loggedOutState = {
          isAuthenticated: false,
          user: null,
          loading: false
        };
        this.currentSSOState = loggedOutState;
        this.emitAuthEvent('auth-changed', loggedOutState);
      }

      // Firebase logout
      await this.authProvider.logout();

      this.emitAuthEvent('logout-success', null);
      console.log('Logout process completed');
    } catch (error) {
      console.error('Logout failed:', error);
      this.emitAuthEvent('auth-error', error);
      throw error;
    }
  }

  private currentSSOState: any = null;

  isAuthenticated(): boolean {
    if (this.ssoManagedAuth) {
      return this.currentSSOState?.isAuthenticated || false;
    }
    return this.authProvider.isAuthenticated();
  }

  getUser(): CheessoUser | null {
    return this.authProvider.getUser();
  }

  getAuthState(): CheessoAuthState {
    return this.authProvider.getAuthState();
  }

  onAuthStateChanged(callback: (state: CheessoAuthState) => void): () => void {
    return this.authProvider.onAuthStateChanged(callback);
  }

  // Event listeners for auth events
  on(eventType: 'auth-changed' | 'login-success' | 'logout-success' | 'auth-error',
    callback: (data: any) => void): () => void {

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