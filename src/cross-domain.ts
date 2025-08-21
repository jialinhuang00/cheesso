export class CrossDomainMessenger {
  private domain: string;

  constructor(domain: string = '.jialin00.com') {
    this.domain = domain;
  }

  // Cross-domain cookie management for SSO
  setCrossDomainCookie(key: string, value: string, maxAge: number = 3600): void {
    try {
      const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
      // URL encode the value to handle special characters and prevent truncation
      const encodedValue = encodeURIComponent(value);
      document.cookie = `${key}=${encodedValue}; domain=${this.domain}; path=/; expires=${expires}; samesite=lax`;
      console.log(`Cross-domain cookie set: ${key}`, `Length: ${encodedValue.length}`);
    } catch (error) {
      console.warn('Failed to set cross-domain cookie:', error);
    }
  }

  getCrossDomainCookie(key: string): string | null {
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

  clearCrossDomainCookie(key: string): void {
    try {
      document.cookie = `${key}=; domain=${this.domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      console.log(`Cross-domain cookie cleared: ${key}`);
    } catch (error) {
      console.warn('Failed to clear cross-domain cookie:', error);
    }
  }

}