export class CrossDomainMessenger {
  private domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  // Cross-domain cookie management for SSO
  setCrossDomainCookie(key: string, value: string, maxAge: number = 3600): void {
    try {
      const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
      // URL encode the value to handle special characters and prevent truncation
      const encodedValue = encodeURIComponent(value);
      document.cookie = `${key}=${encodedValue}; domain=${this.domain}; path=/; expires=${expires}; samesite=lax; secure`;
    } catch (error) {
      console.warn('Failed to set cross-domain cookie:', error);
    }
  }

  getCrossDomainCookie(key: string): string | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        // Split on the first '=' only: a value may itself contain '='.
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        if (trimmed.slice(0, eq) === key) {
          return decodeURIComponent(trimmed.slice(eq + 1));
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to get cross-domain cookie:', error);
      return null;
    }
  }

  clearCrossDomainCookie(key: string): void {
    try {
      document.cookie = `${key}=; domain=${this.domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax; secure`;
    } catch (error) {
      console.warn('Failed to clear cross-domain cookie:', error);
    }
  }

  /**
   * Runs the callback whenever this tab comes back into view, which is when
   * a cookie written by another subdomain can first be noticed.
   * Returns a function that removes the listeners.
   */
  setupCrossDomainSync(callback: () => void): () => void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };

    const handleFocus = () => callback();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }

}
