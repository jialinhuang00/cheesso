// Convenience functions for easy import
import { Cheesso } from './cheesso';
import { CheessoConfig, SocialProvider } from './types';
import { logVersion } from './version';

let globalCheesso: Cheesso | null = null;

export function initCheesso(config: CheessoConfig): Cheesso {
  logVersion('Core');
  
  if (globalCheesso) {
    globalCheesso.destroy();
  }

  globalCheesso = new Cheesso(config);
  globalCheesso.initialize();

  return globalCheesso;
}

export function getCheesso(): Cheesso | null {
  return globalCheesso;
}


export async function loginWithSocial(provider: SocialProvider) {
  if (!globalCheesso) {
    throw new Error('Cheesso not initialized. Call initCheesso() first.');
  }
  return globalCheesso.loginWithSocial(provider);
}

export async function logout() {
  if (!globalCheesso) {
    throw new Error('Cheesso not initialized. Call initCheesso() first.');
  }
  return globalCheesso.logout();
}

export function isAuthenticated(): boolean {
  if (!globalCheesso) {
    return false;
  }
  return globalCheesso.isAuthenticated();
}

export function getUser() {
  if (!globalCheesso) {
    return null;
  }
  return globalCheesso.getUser();
}

export function onAuthStateChanged(callback: (state: any) => void) {
  if (!globalCheesso) {
    throw new Error('Cheesso not initialized. Call initCheesso() first.');
  }
  return globalCheesso.onAuthStateChanged(callback);
}

// Re-export other modules
export { Cheesso } from './cheesso';
export { CrossDomainMessenger } from './cross-domain';
export * from './providers';
export * from './types';

// Default export for easier importing
export default {
  initCheesso,
  getCheesso,
  loginWithSocial,
  logout,
  isAuthenticated,
  getUser,
  onAuthStateChanged
};