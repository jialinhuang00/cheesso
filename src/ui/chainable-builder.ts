import { CheessoAuthButton, CheessoUIConfig } from './auth-button';
import { FirebaseConfig, SocialProvider } from '../types';
import { logVersion } from '../version';

export class CheessoBuilder {
  private container: string | HTMLElement;
  private config: Partial<CheessoUIConfig> = {};

  constructor(container: string | HTMLElement) {
    this.container = container;
  }

  firebase(config: FirebaseConfig): CheessoBuilder {
    this.config.provider = 'firebase';
    this.config.firebaseConfig = config;
    return this;
  }

  social(providers: SocialProvider[]): CheessoBuilder {
    this.config.socialProviders = providers;
    return this;
  }

  google(): CheessoBuilder {
    this.config.socialProviders = [...(this.config.socialProviders || []), 'google'];
    return this;
  }

  microsoft(): CheessoBuilder {
    this.config.socialProviders = [...(this.config.socialProviders || []), 'microsoft'];
    return this;
  }

  apple(): CheessoBuilder {
    this.config.socialProviders = [...(this.config.socialProviders || []), 'apple'];
    return this;
  }

  facebook(): CheessoBuilder {
    this.config.socialProviders = [...(this.config.socialProviders || []), 'facebook'];
    return this;
  }

  github(): CheessoBuilder {
    this.config.socialProviders = [...(this.config.socialProviders || []), 'github'];
    return this;
  }

  labels(customLabels: {
    loginButton?: string;
    providers?: Record<SocialProvider, string>;
    logout?: string;
  }): CheessoBuilder {
    this.config.customLabels = customLabels;
    return this;
  }

  loginText(text: string): CheessoBuilder {
    this.config.customLabels = {
      ...this.config.customLabels,
      loginButton: text
    };
    return this;
  }

  logoutText(text: string): CheessoBuilder {
    this.config.customLabels = {
      ...this.config.customLabels,
      logout: text
    };
    return this;
  }

  crossDomain(domain: string): CheessoBuilder {
    this.config.crossDomainCookie = domain;
    return this;
  }

  hoverDropdown(enabled: boolean = true): CheessoBuilder {
    this.config.showDropdownOnHover = enabled;
    return this;
  }


  render(): CheessoAuthButton {
    logVersion('UI Builder');
    
    if (!this.config.provider) {
      throw new Error('Provider is required. Use .firebase() first.');
    }

    const finalConfig: CheessoUIConfig = {
      container: this.container,
      ...this.config
    } as CheessoUIConfig;

    return new CheessoAuthButton(finalConfig);
  }
}