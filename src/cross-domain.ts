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

  // Setup visibility change listener to sync auth state across domains
  setupCrossDomainSync(callback?: (authData: any) => void): () => void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking auth sync...')
        // Check for auth state changes when tab becomes visible
        const ssoUserData = this.getCrossDomainCookie('cheesso_sso_user');

        if (ssoUserData) {
          try {
            const userInfo = JSON.parse(ssoUserData);
            const authData = {
              token: null,
              user: userInfo
            };

            if (callback) {
              callback(authData);
            }

            console.log('c synced on visibility change');
          } catch (error) {
            console.warn('Failed to parse SSO user data:', error);
          }
        } else if (callback) {
          // No auth data found, trigger logout sync
          callback({ token: null, user: null });
        }
      }
    };

    const handleFocus = () => {
      console.log('Window focused, checking auth sync...');
      // Same logic as visibility change
      const ssoUserData = this.getCrossDomainCookie('cheesso_sso_user');

      if (ssoUserData) {
        try {
          const userInfo = JSON.parse(ssoUserData);
          const authData = {
            token: null,
            user: userInfo
          };

          if (callback) {
            callback(authData);
          }

          console.log('Cross-domain auth state synced on focus');
        } catch (error) {
          console.warn('Failed to parse SSO user data:', error);
        }
      } else if (callback) {
        // No auth data found, trigger logout sync
        callback({ token: null, user: null });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Return cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }

}