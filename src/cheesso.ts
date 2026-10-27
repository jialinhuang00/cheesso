import { FirebaseAuthProvider } from './providers';
import { CrossDomainMessenger } from './cross-domain';
import { CheessoConfig, CheessoUser, CheessoAuthState, SocialProvider } from './types';

interface CheessoEventMap {
  'auth-changed': CheessoAuthState;
  'login-success': CheessoUser;
  'logout-success': null;
  'auth-error': Error;
}

/** Seconds the "who is signed in" cookie lives. Display only; grants nothing. */
const USER_COOKIE_MAX_AGE = 86400;
/** Seconds the shared Google ID token lives. Short on purpose: it can sign in. */
const DEFAULT_TOKEN_COOKIE_MAX_AGE = 600;
/** Seconds the logout marker lives, so sites opened later still notice. */
const LOGOUT_MARKER_MAX_AGE = 86400;

/**
 * How the subdomains share one login.
 *
 * Firebase Auth keeps its session per origin, so a login on app.example.com
 * is invisible to blog.example.com. cheesso bridges that with cookies on the
 * parent domain (.example.com), all named after the Firebase project so two
 * apps on different projects under the same parent never read each other's:
 *
 *   cheesso_sso_user_<projectId>    who is signed in (uid, email, name, photo). 24 h.
 *                                   Lets the next site show "sign in as X". Grants nothing.
 *   cheesso_sso_token_<projectId>   the Google ID token from the popup. 10 min.
 *                                   The next site signs in with it, no popup, and from
 *                                   then on has its own Firebase session.
 *   cheesso_sso_logout_<projectId>  timestamp of the last logout. 24 h.
 *                                   A site whose session is older than it signs out too.
 *
 * isAuthenticated() and getUser() reflect Firebase on this origin only. A
 * cookie by itself never counts as being logged in.
 */
export class Cheesso {
  private authProvider: FirebaseAuthProvider;
  private crossDomain: CrossDomainMessenger;
  private cookies: { user: string; token: string; logout: string };
  private loginAtKey: string;
  private tokenCookieMaxAge: number;

  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private knownUser: CheessoUser | null = null;
  private tokenLoginInFlight = false;
  private stopCrossDomainSync: (() => void) | null = null;

  constructor(config: CheessoConfig) {
    if (!config.crossDomainCookie) {
      throw new Error('crossDomainCookie is required in CheessoConfig');
    }
    if (!config.firebaseConfig) {
      throw new Error('Firebase config is required');
    }

    const projectId = config.firebaseConfig.projectId;
    this.cookies = {
      user: `cheesso_sso_user_${projectId}`,
      token: `cheesso_sso_token_${projectId}`,
      logout: `cheesso_sso_logout_${projectId}`
    };
    this.loginAtKey = `cheesso_login_at_${projectId}`;
    this.tokenCookieMaxAge = config.tokenCookieMaxAge ?? DEFAULT_TOKEN_COOKIE_MAX_AGE;

    this.authProvider = new FirebaseAuthProvider(config.firebaseConfig);
    this.crossDomain = new CrossDomainMessenger(config.crossDomainCookie);

    // 1.x wrote one cookie for every project under this name. It carries no
    // project tag, so it cannot be trusted; drop it once.
    this.crossDomain.clearCrossDomainCookie('cheesso_sso_user');

    this.knownUser = this.readUserCookie();

    this.authProvider.onAuthStateChanged((state) => this.onFirebaseState(state));
    this.stopCrossDomainSync = this.crossDomain.setupCrossDomainSync(() => {
      this.syncFromCookies().catch((error) => console.warn('SSO sync failed:', error));
    });
  }

  // ---- lifecycle ----------------------------------------------------------

  /**
   * Restores this origin's stored session, or signs in with a token another
   * subdomain shared. Idempotent: every call returns the same promise.
   */
  initialize(): Promise<void> {
    this.initPromise ??= this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    await this.authProvider.initialize();
    await this.authProvider.waitForStoredSession();

    if (this.authProvider.isAuthenticated()) {
      this.rememberLoginAt(false);
    } else {
      await this.tryTokenLogin();
    }

    this.initialized = true;
    await this.syncFromCookies();
    this.emitAuthEvent('auth-changed', this.getAuthState());
  }

  private onFirebaseState(state: CheessoAuthState): void {
    if (!this.initialized) return;
    this.emitAuthEvent('auth-changed', { ...state, knownUser: state.isAuthenticated ? null : this.knownUser });
  }

  // ---- cookie sync --------------------------------------------------------

  /**
   * Runs at the end of initialize() and whenever the tab comes back into view.
   * Applies what other subdomains wrote while this tab was not looking.
   */
  private async syncFromCookies(): Promise<void> {
    if (this.authProvider.isAuthenticated()) {
      const logoutAt = this.readLogoutMarker();
      if (logoutAt !== null && logoutAt > this.readLoginAt()) {
        // Another subdomain logged out after this one logged in.
        await this.authProvider.logout();
        this.knownUser = this.readUserCookie();
        this.emitAuthEvent('auth-changed', this.getAuthState());
        return;
      }
      // The user cookie expires after 24 h while the Firebase session lives
      // on. Re-share so sibling subdomains keep showing who is signed in.
      if (!this.readUserCookie()) {
        const user = this.authProvider.getUser();
        if (user) this.writeUserCookie(user);
      }
      return;
    }

    const known = this.readUserCookie();
    if (known?.uid !== this.knownUser?.uid) {
      this.knownUser = known;
      if (this.initialized) this.emitAuthEvent('auth-changed', this.getAuthState());
    }

    // Another subdomain logged in while this tab was open: use its token.
    if (this.initialized) await this.tryTokenLogin();
  }

  private async tryTokenLogin(): Promise<boolean> {
    if (this.tokenLoginInFlight) return false;
    const token = this.crossDomain.getCrossDomainCookie(this.cookies.token);
    if (!token) return false;

    this.tokenLoginInFlight = true;
    try {
      const user = await this.authProvider.signInWithGoogleIdToken(token);
      this.rememberLoginAt(true);
      this.emitAuthEvent('login-success', user);
      return true;
    } catch (error) {
      // Expired, revoked, or minted for another project: stop retrying it.
      this.crossDomain.clearCrossDomainCookie(this.cookies.token);
      console.warn('SSO token login failed:', error);
      return false;
    } finally {
      this.tokenLoginInFlight = false;
    }
  }

  private shareLogin(user: CheessoUser, googleIdToken: string | null): void {
    this.writeUserCookie(user);
    if (googleIdToken) {
      this.crossDomain.setCrossDomainCookie(this.cookies.token, googleIdToken, this.tokenCookieMaxAge);
    }
    this.crossDomain.clearCrossDomainCookie(this.cookies.logout);
    this.rememberLoginAt(true);
  }

  private writeUserCookie(user: CheessoUser): void {
    const userInfo = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      timestamp: Date.now()
    };
    this.crossDomain.setCrossDomainCookie(this.cookies.user, JSON.stringify(userInfo), USER_COOKIE_MAX_AGE);
  }

  private readUserCookie(): CheessoUser | null {
    const raw = this.crossDomain.getCrossDomainCookie(this.cookies.user);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.uid !== 'string') return null;
      return {
        uid: parsed.uid,
        email: typeof parsed.email === 'string' ? parsed.email : null,
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
        photoURL: typeof parsed.photoURL === 'string' ? parsed.photoURL : null
      };
    } catch {
      this.crossDomain.clearCrossDomainCookie(this.cookies.user);
      return null;
    }
  }

  private readLogoutMarker(): number | null {
    const raw = this.crossDomain.getCrossDomainCookie(this.cookies.logout);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  }

  /**
   * When this origin's session began. Kept in localStorage (per origin) so a
   * reloaded page still knows whether a logout marker is newer than its login.
   * `always` = an explicit login; otherwise only fill in a missing value.
   */
  private rememberLoginAt(always: boolean): void {
    try {
      if (always || !localStorage.getItem(this.loginAtKey)) {
        localStorage.setItem(this.loginAtKey, String(Date.now()));
      }
    } catch {
      // Storage blocked: readLoginAt() falls back to "now", which only means
      // a logout elsewhere is not propagated to this already-open page.
    }
  }

  private readLoginAt(): number {
    try {
      const raw = localStorage.getItem(this.loginAtKey);
      const ts = raw ? Number(raw) : NaN;
      if (Number.isFinite(ts)) return ts;
    } catch {
      // see rememberLoginAt
    }
    return Date.now();
  }

  private emitAuthEvent<K extends keyof CheessoEventMap>(type: K, data: CheessoEventMap[K]): void {
    const event = new CustomEvent(`cheesso:${type}`, { detail: data });
    window.dispatchEvent(event);
  }

  // ---- public API ---------------------------------------------------------

  async loginWithSocial(provider: SocialProvider): Promise<CheessoUser> {
    try {
      const { user, googleIdToken } = await this.authProvider.loginWithSocialPopup(provider);
      this.shareLogin(user, googleIdToken);
      this.emitAuthEvent('login-success', user);
      return user;
    } catch (error) {
      this.emitAuthEvent('auth-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async loginWithGIS(idToken: string): Promise<CheessoUser> {
    try {
      const user = await this.authProvider.signInWithGoogleIdToken(idToken);
      this.shareLogin(user, idToken);
      this.emitAuthEvent('login-success', user);
      return user;
    } catch (error) {
      this.emitAuthEvent('auth-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      this.crossDomain.clearCrossDomainCookie(this.cookies.user);
      this.crossDomain.clearCrossDomainCookie(this.cookies.token);
      this.crossDomain.setCrossDomainCookie(this.cookies.logout, String(Date.now()), LOGOUT_MARKER_MAX_AGE);
      this.knownUser = null;

      await this.authProvider.logout();
      this.emitAuthEvent('logout-success', null);
    } catch (error) {
      console.error('Logout failed:', error);
      this.emitAuthEvent('auth-error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /** true only when Firebase Auth has a session on this origin */
  isAuthenticated(): boolean {
    return this.authProvider.isAuthenticated();
  }

  /** the Firebase user on this origin, or null */
  getUser(): CheessoUser | null {
    return this.authProvider.getUser();
  }

  /**
   * Who is signed in on a sibling subdomain, when this origin is not.
   * For a "sign in as X" button. Null once this origin has its own session.
   */
  getKnownUser(): CheessoUser | null {
    return this.authProvider.isAuthenticated() ? null : this.knownUser;
  }

  /** @deprecated use getKnownUser() */
  getSSOUser(): CheessoUser | null {
    return this.getKnownUser();
  }

  /** Forgets the shared "who is signed in" cookie. Does not sign anything out. */
  clearSSOCookie(): void {
    this.crossDomain.clearCrossDomainCookie(this.cookies.user);
    this.knownUser = null;
  }

  getAuthState(): CheessoAuthState {
    const state = this.authProvider.getAuthState();
    return {
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      knownUser: state.isAuthenticated ? null : this.knownUser,
      loading: !this.initialized
    };
  }

  /** Firebase-level state on this origin. Fires immediately with the current state. */
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
    this.stopCrossDomainSync?.();
    this.stopCrossDomainSync = null;
    this.authProvider.destroy();
  }
}
