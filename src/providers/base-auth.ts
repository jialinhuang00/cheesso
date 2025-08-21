import { CheessoUser, CheessoAuthState, SocialProvider } from '../types';

export abstract class BaseAuthProvider {
  protected authStateListeners: ((state: CheessoAuthState) => void)[] = [];
  protected currentState: CheessoAuthState = {
    isAuthenticated: false,
    user: null,
    loading: true
  };

  abstract initialize(): Promise<void>;
  abstract loginWithSocial(provider: SocialProvider): Promise<CheessoUser>;
  abstract logout(): Promise<void>;
  abstract destroy(): void;

  isAuthenticated(): boolean {
    return this.currentState.isAuthenticated;
  }

  getUser(): CheessoUser | null {
    return this.currentState.user;
  }

  getAuthState(): CheessoAuthState {
    return { ...this.currentState };
  }

  onAuthStateChanged(callback: (state: CheessoAuthState) => void): () => void {
    this.authStateListeners.push(callback);

    // Immediately call with current state
    callback(this.currentState);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  protected notifyStateChange(state: CheessoAuthState): void {
    this.currentState = state;
    this.authStateListeners.forEach(listener => listener(state));
  }
}