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
    this.cheesso.onAuthStateChanged((state) => {
      this.currentUser = state.user;
      this.render();
    });
  }

  private render(): void {
    const authState = this.cheesso.getAuthState();

    // Check for SSO user in cookie directly
    const ssoCookie = this.getCrossDomainCookie('cheesso_sso_user');
    let ssoUser = null;
    if (ssoCookie) {
      try {
        ssoUser = JSON.parse(ssoCookie);
        console.log('SSO user found in cookie: ', ssoUser);
      } catch (error) {
        console.warn('Failed to parse SSO cookie:', error);
      }
    }

    console.log('Render decision:', {
      'authState.loading': authState.loading,
      'authState.isAuthenticated': authState.isAuthenticated,
      'authState.user': !!authState.user,
      'ssoUser': !!ssoUser
    });

    if (authState.loading) {
      console.log('Rendering loading state');
      this.renderLoading();
    } else if (authState.isAuthenticated && authState.user) {
      console.log('Rendering user info (normal auth)');
      this.renderUserInfo();
    } else if (ssoUser) {
      console.log('Rendering user info (SSO)');
      // Use SSO user info
      this.renderUserInfo(ssoUser);
    } else {
      console.log('Rendering login button');
      this.renderLoginButton();
    }

    if (this.error) {
      this.renderError();
    }
  }

  private getCrossDomainCookie(key: string): string | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieKey, cookieValue] = cookie.trim().split('=');
        if (cookieKey === key) {
          return decodeURIComponent(cookieValue);
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to get cross-domain cookie:', error);
      return null;
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
    const loginText = this.config.customLabels?.loginButton || 'log in';

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
              ${this.config.customLabels?.logout || 'logout'}
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

    const errorDiv = document.createElement('div');
    errorDiv.className = 'cheesso-error';
    errorDiv.textContent = this.error;
    this.container.appendChild(errorDiv);
  }

  private attachLoginEventListeners(): void {
    const loginBtn = this.container.querySelector('#cheesso-login-btn') as HTMLButtonElement;
    const dropdown = this.container.querySelector('#cheesso-dropdown') as HTMLElement;
    const socialButtons = this.container.querySelectorAll('.cheesso-social-button') as NodeListOf<HTMLButtonElement>;

    if (loginBtn && dropdown) {
      loginBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });

      if (this.config.showDropdownOnHover) {
        loginBtn.addEventListener('mouseenter', () => this.openDropdown());
        this.container.addEventListener('mouseleave', () => this.closeDropdown());
      }
    }

    socialButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const provider = button.getAttribute('data-provider') as SocialProvider;
        this.handleSocialLogin(provider);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });
  }

  private attachUserEventListeners(): void {
    const authContainer = this.container.querySelector('#cheesso-auth-container') as HTMLElement;
    const userAvatar = this.container.querySelector('#cheesso-user-avatar') as HTMLElement;
    const logoutBtn = this.container.querySelector('#cheesso-logout-btn') as HTMLButtonElement;
    const tooltip = this.container.querySelector('#cheesso-user-tooltip') as HTMLElement;

    console.log('attachUserEventListeners - elements found:', {
      authContainer: !!authContainer,
      userAvatar: !!userAvatar,
      logoutBtn: !!logoutBtn,
      tooltip: !!tooltip
    });

    if (userAvatar && authContainer) {
      console.log('Adding click listener to user avatar');
      // Click avatar to toggle tooltip
      userAvatar.addEventListener('click', (e) => {
        console.log('Avatar clicked!');
        e.stopPropagation();
        this.toggleTooltip(authContainer, tooltip);
      });

      // Click backdrop to close tooltip
      authContainer.addEventListener('click', (e) => {
        if (e.target === authContainer) {
          this.hideTooltip(authContainer, tooltip);
        }
      });
    }

    if (logoutBtn) {
      console.log('Adding click listener to logout button');
      logoutBtn.addEventListener('click', (e) => {
        console.log('Logout button clicked!');
        e.stopPropagation();
        this.handleLogout();
      });
    }
  }

  private toggleTooltip(authContainer: HTMLElement, tooltip: HTMLElement): void {
    if (authContainer.classList.contains('tooltip-active')) {
      this.hideTooltip(authContainer, tooltip);
    } else {
      console.log('toggleTooltip click')
      this.showTooltip(authContainer, tooltip);
    }
  }

  private showTooltip(authContainer: HTMLElement, tooltip: HTMLElement): void {
    // Check for SSO user if no current user
    let user = this.currentUser;
    if (!user) {
      const ssoCookie = this.getCrossDomainCookie('cheesso_sso_user');
      if (ssoCookie) {
        try {
          user = JSON.parse(ssoCookie);
        } catch (error) {
          console.warn('Failed to parse SSO cookie in showTooltip:', error);
        }
      }
    }

    if (!user) {
      console.log('No user found for tooltip');
      return;
    }

    console.log('Showing tooltip for user:', user);

    // Activate fullscreen backdrop
    authContainer.classList.add('tooltip-active');

    // Show tooltip
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
      this.render();

      // Clear SSO cookie directly
      this.clearCrossDomainCookie('cheesso_sso_user');

      await this.cheesso.logout();

      // Force re-render after logout
      setTimeout(() => this.render(), 100);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'log out failed';
      this.render();
    }
  }

  private clearCrossDomainCookie(key: string): void {
    try {
      document.cookie = `${key}=; domain=${this.config.crossDomainCookie}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      console.log(`Cross-domain cookie cleared: ${key}`);
    } catch (error) {
      console.warn('Failed to clear cross-domain cookie:', error);
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
    this.cheesso.destroy();
    this.container.innerHTML = '';
  }

  public updateConfig(newConfig: Partial<CheessoUIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.render();
  }
}