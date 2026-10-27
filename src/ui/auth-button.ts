import { Cheesso } from '../cheesso';
import { CheessoConfig, CheessoUser, SocialProvider } from '../types';
import { injectStyles } from './styles';

export interface CheessoUIConfig extends CheessoConfig {
  container?: string | HTMLElement;
  showDropdownOnHover?: boolean;
  customLabels?: {
    loginButton?: string;
    providers?: Record<SocialProvider, string>;
    logout?: string;
    /** label before the name on the one-click button, default 'as' */
    signInAs?: string;
  };
}

/** Text that goes between tags. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only https URLs are allowed into an <img src>; anything else is dropped. */
function safeImageUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export class CheessoAuthButton {
  private cheesso: Cheesso;
  private container: HTMLElement;
  private config: CheessoUIConfig;
  private dropdownOpen = false;
  private currentUser: CheessoUser | null = null;
  private error: string | null = null;
  private cleanupFns: (() => void)[] = [];

  constructor(config: CheessoUIConfig) {
    this.config = config;

    // Inject styles
    injectStyles();

    // Initialize Cheesso core
    this.cheesso = new Cheesso(config);

    // Setup container
    this.container = this.resolveContainer(config.container);

    // Setup auth state listener
    this.setupAuthListener();

    // Initial render
    this.render();

    // Initialize
    this.initialize();
  }

  private resolveContainer(container?: string | HTMLElement): HTMLElement {
    if (!container) {
      throw new Error('Container is required');
    }

    if (typeof container === 'string') {
      const element = document.querySelector(container) as HTMLElement;
      if (!element) {
        throw new Error(`Container element not found: ${container}`);
      }
      return element;
    }

    return container;
  }

  private async initialize(): Promise<void> {
    try {
      await this.cheesso.initialize();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Initialization failed';
      this.render();
    }
  }

  private setupAuthListener(): void {
    // Firebase state on this origin, plus the shared-cookie state from cheesso
    this.cheesso.on('auth-changed', (state) => {
      this.currentUser = state.user;
      this.render();
    });
  }

  private render(): void {
    this.cleanupListeners();

    const authState = this.cheesso.getAuthState();
    this.currentUser = authState.user;

    if (authState.loading) {
      this.renderLoading();
    } else if (authState.isAuthenticated && authState.user) {
      this.renderUserInfo(authState.user);
    } else if (authState.knownUser) {
      this.renderKnownUser(authState.knownUser);
    } else {
      this.renderLoginButton();
    }

    if (this.error) {
      this.renderError();
    }
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="cheesso-auth-container cheesso-loading">
        <button class="cheesso-auth-button" disabled>
          Loading...
        </button>
      </div>
    `;
  }

  private renderLoginButton(): void {
    const loginText = this.config.customLabels?.loginButton || 'In';

    this.container.innerHTML = `
      <div class="cheesso-auth-container">
        <button class="cheesso-auth-button" id="cheesso-login-btn">
          ${escapeHtml(loginText)}
        </button>
        <div class="cheesso-dropdown" id="cheesso-dropdown">
          <div class="cheesso-dropdown-header">choose</div>
          <div class="cheesso-social-buttons">
            ${this.renderSocialButtons()}
          </div>
        </div>
      </div>
    `;

    this.attachLoginEventListeners();
  }

  /**
   * Someone is signed in on a sibling subdomain but not here (the shared
   * token has expired). One click opens the popup; no dropdown.
   */
  private renderKnownUser(user: CheessoUser): void {
    const name = user.displayName || user.email || 'User';
    const prefix = this.config.customLabels?.signInAs || 'as';

    this.container.innerHTML = `
      <div class="cheesso-auth-container">
        <button class="cheesso-auth-button cheesso-known-user" id="cheesso-known-btn" title="${escapeHtml(user.email || name)}">
          ${escapeHtml(prefix)} ${escapeHtml(name)}
        </button>
      </div>
    `;

    const btn = this.container.querySelector('#cheesso-known-btn') as HTMLButtonElement | null;
    if (btn) {
      this.addListener(btn, 'click', (e) => {
        e.stopPropagation();
        const provider = this.config.socialProviders?.[0] || 'google';
        this.handleSocialLogin(provider);
      });
    }
  }

  private renderUserInfo(user: CheessoUser): void {
    const displayName = user.displayName || user.email || 'User';
    const initials = this.getInitials(displayName);
    const photo = safeImageUrl(user.photoURL);
    const jsonData = this.formatUserDataAsJSON(user);

    this.container.innerHTML = `
      <div class="cheesso-auth-container" id="cheesso-auth-container">
        <div class="cheesso-user-avatar" id="cheesso-user-avatar">
          ${photo
        ? `<img src="${escapeHtml(photo)}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`
        : escapeHtml(initials)
      }
        </div>

        <div class="cheesso-user-tooltip" id="cheesso-user-tooltip">
          <div class="cheesso-user-tooltip-header">
            payload
            <button class="cheesso-logout-btn" id="cheesso-logout-btn">
              ${escapeHtml(this.config.customLabels?.logout || 'out')}
            </button>
          </div>
          <div class="cheesso-user-tooltip-content">${jsonData}</div>
        </div>

      </div>
    `;

    this.attachUserEventListeners();
  }

  private renderSocialButtons(): string {
    const providers = this.config.socialProviders || ['google'];
    const labels = this.config.customLabels?.providers || {};

    const providerLabels: Record<SocialProvider, string> = {
      google: 'Google',
      apple: 'Apple',
      microsoft: 'Microsoft',
      facebook: 'Facebook',
      github: 'GitHub',
      ...labels
    };

    return providers.map(provider => `
      <button class="cheesso-social-button" data-provider="${escapeHtml(provider)}">
        <span>${escapeHtml(providerLabels[provider])} </span>
      </button>
    `).join('');
  }

  private renderError(): void {
    if (!this.error) return;

    this.showErrorSnackbar(this.error);
  }

  private showErrorSnackbar(message: string): void {
    // Remove any existing error snackbar
    const existingError = document.querySelector('.cheesso-error');
    if (existingError) {
      existingError.remove();
    }

    // Create new error snackbar
    const errorDiv = document.createElement('div');
    errorDiv.className = 'cheesso-error';
    errorDiv.textContent = message;

    // Add to body so it appears as a global snackbar
    document.body.appendChild(errorDiv);

    // Auto-hide after 4 seconds with fadeout animation
    setTimeout(() => {
      errorDiv.classList.add('fadeout');

      // Remove from DOM after animation completes
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.remove();
        }
      }, 500); // Match the animation duration
    }, 4000);
  }

  private cleanupListeners(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }

  private addListener(target: EventTarget, event: string, handler: EventListener): void {
    target.addEventListener(event, handler);
    this.cleanupFns.push(() => target.removeEventListener(event, handler));
  }

  private attachLoginEventListeners(): void {
    const loginBtn = this.container.querySelector('#cheesso-login-btn') as HTMLButtonElement;
    const dropdown = this.container.querySelector('#cheesso-dropdown') as HTMLElement;
    const socialButtons = this.container.querySelectorAll('.cheesso-social-button') as NodeListOf<HTMLButtonElement>;

    if (loginBtn && dropdown) {
      this.addListener(loginBtn, 'click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });

      if (this.config.showDropdownOnHover) {
        this.addListener(loginBtn, 'mouseenter', () => this.openDropdown());
        this.addListener(this.container, 'mouseleave', () => this.closeDropdown());
      }
    }

    socialButtons.forEach(button => {
      this.addListener(button, 'click', (e) => {
        e.stopPropagation();
        const provider = button.getAttribute('data-provider') as SocialProvider;
        this.handleSocialLogin(provider);
      });
    });

    const outsideClickHandler = (e: Event) => {
      if (!this.container.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    this.addListener(document, 'click', outsideClickHandler);
  }

  private attachUserEventListeners(): void {
    const authContainer = this.container.querySelector('#cheesso-auth-container') as HTMLElement;
    const userAvatar = this.container.querySelector('#cheesso-user-avatar') as HTMLElement;
    const logoutBtn = this.container.querySelector('#cheesso-logout-btn') as HTMLButtonElement;
    const tooltip = this.container.querySelector('#cheesso-user-tooltip') as HTMLElement;

    if (userAvatar && authContainer) {
      this.addListener(userAvatar, 'click', (e) => {
        e.stopPropagation();
        this.toggleTooltip(authContainer, tooltip);
      });

      this.addListener(authContainer, 'click', (e) => {
        if (e.target === authContainer) {
          this.hideTooltip(authContainer, tooltip);
        }
      });
    }

    if (logoutBtn) {
      this.addListener(logoutBtn, 'click', (e) => {
        e.stopPropagation();
        this.handleLogout();
      });
    }
  }

  private toggleTooltip(authContainer: HTMLElement, tooltip: HTMLElement): void {
    if (authContainer.classList.contains('tooltip-active')) {
      this.hideTooltip(authContainer, tooltip);
    } else {
      this.showTooltip(authContainer, tooltip);
    }
  }

  private showTooltip(authContainer: HTMLElement, tooltip: HTMLElement): void {
    if (!this.currentUser) return;

    authContainer.classList.add('tooltip-active');
    tooltip.classList.add('show');
  }

  private hideTooltip(authContainer: HTMLElement, tooltip: HTMLElement): void {
    // Remove fullscreen backdrop
    authContainer.classList.remove('tooltip-active');

    // Hide tooltip
    tooltip.classList.remove('show');
  }

  private async handleSocialLogin(provider: SocialProvider): Promise<void> {
    try {
      this.error = null;
      this.render();

      await this.cheesso.loginWithSocial(provider);
      this.closeDropdown();
    } catch (error) {
      this.error = error instanceof Error ? error.message : `${provider} log in failed`;
      this.render();
    }
  }

  private async handleLogout(): Promise<void> {
    try {
      this.error = null;
      await this.cheesso.logout();
      this.currentUser = null;
      this.render();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'log out failed';
      this.render();
    }
  }

  private toggleDropdown(): void {
    if (this.dropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    const dropdown = this.container.querySelector('.cheesso-dropdown') as HTMLElement;
    if (dropdown) {
      dropdown.classList.add('open');
      this.dropdownOpen = true;
    }
  }

  private closeDropdown(): void {
    const dropdown = this.container.querySelector('.cheesso-dropdown') as HTMLElement;
    if (dropdown) {
      dropdown.classList.remove('open');
      this.dropdownOpen = false;
    }
  }


  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private formatUserDataAsJSON(user: CheessoUser): string {
    // Create enhanced user data object
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      provider: this.detectProvider(user),
      loginTime: new Date().toISOString(),
      isAuthenticated: true,
      authState: this.cheesso.getAuthState()
    };

    // Format JSON with proper indentation and syntax highlighting
    return this.syntaxHighlightJSON(userData);
  }

  private detectProvider(user: CheessoUser): string {
    // Try to detect provider from email or other hints
    if (user.email?.includes('@gmail.com')) return 'google';
    if (user.photoURL?.includes('googleusercontent.com')) return 'google';
    if (user.photoURL?.includes('graph.microsoft.com')) return 'microsoft';
    if (user.photoURL?.includes('platform-lookaside.fbsbx.com')) return 'facebook';

    return 'firebase';
  }

  private syntaxHighlightJSON(obj: Record<string, unknown>): string {
    // Escape first so a value like "<img onerror=...>" stays text; the
    // highlighting below only wraps spans around quotes and keywords.
    const json = escapeHtml(JSON.stringify(obj, null, 2));

    return json
      .replace(/&quot;([^&]+)&quot;:/g, '<span class="json-key">&quot;$1&quot;</span>:')
      .replace(/: &quot;([^\n]*?)&quot;(,?)$/gm, ': <span class="json-string">&quot;$1&quot;</span>$2')
      .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: null/g, ': <span class="json-null">null</span>');
  }

  // Public methods
  public getCheesso(): Cheesso {
    return this.cheesso;
  }

  public destroy(): void {
    this.cleanupListeners();
    this.cheesso.destroy();
    this.container.innerHTML = '';
  }

}
