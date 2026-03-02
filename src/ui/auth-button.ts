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
  };
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
    // Listen to Firebase auth state changes
    this.cheesso.onAuthStateChanged((state) => {
      this.currentUser = state.user;
      this.render();
    });

    // Also listen to cross-domain auth events
    this.cheesso.on('auth-changed', (state) => {
      this.currentUser = state.user;
      this.render();
    });
  }

  private render(): void {
    this.cleanupListeners();

    const authState = this.cheesso.getAuthState();
    const ssoUser = this.cheesso.getSSOUser();

    if (authState.loading) {
      this.renderLoading();
    } else if (authState.isAuthenticated && authState.user) {
      this.renderUserInfo();
    } else if (ssoUser) {
      this.renderUserInfo(ssoUser);
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
          ${loginText}
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

  private renderUserInfo(ssoUser?: any): void {
    const user = ssoUser || this.currentUser;
    if (!user) return;

    const displayName = user.displayName || user.email || 'User';
    const initials = this.getInitials(displayName);
    const jsonData = this.formatUserDataAsJSON(user);

    this.container.innerHTML = `
      <div class="cheesso-auth-container" id="cheesso-auth-container">
        <div class="cheesso-user-avatar" id="cheesso-user-avatar">
          ${user.photoURL
        ? `<img src="${user.photoURL}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`
        : initials
      }
        </div>
        
        <div class="cheesso-user-tooltip" id="cheesso-user-tooltip">
          <div class="cheesso-user-tooltip-header">
            payload
            <button class="cheesso-logout-btn" id="cheesso-logout-btn">
              ${this.config.customLabels?.logout || 'out'}
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
      <button class="cheesso-social-button" data-provider="${provider}">
        <span>${providerLabels[provider]} </span>
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
    const user = this.currentUser || this.cheesso.getSSOUser();
    if (!user) return;

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

  private formatUserDataAsJSON(user?: any): string {
    const targetUser = user || this.currentUser;
    if (!targetUser) return '';

    // Create enhanced user data object
    const userData = {
      uid: targetUser.uid,
      email: targetUser.email,
      displayName: targetUser.displayName,
      photoURL: targetUser.photoURL,
      provider: this.detectProvider(),
      loginTime: new Date().toISOString(),
      isAuthenticated: true,
      authState: this.cheesso.getAuthState()
    };

    // Format JSON with proper indentation and syntax highlighting
    return this.syntaxHighlightJSON(userData);
  }

  private detectProvider(): string {
    if (!this.currentUser) return 'unknown';

    // Try to detect provider from email or other hints
    if (this.currentUser.email?.includes('@gmail.com')) return 'google';
    if (this.currentUser.photoURL?.includes('googleusercontent.com')) return 'google';
    if (this.currentUser.photoURL?.includes('graph.microsoft.com')) return 'microsoft';
    if (this.currentUser.photoURL?.includes('platform-lookaside.fbsbx.com')) return 'facebook';

    return 'firebase';
  }

  private syntaxHighlightJSON(obj: any): string {
    const json = JSON.stringify(obj, null, 2);

    return json
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
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