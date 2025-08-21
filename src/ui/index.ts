import { CheessoAuthButton, CheessoUIConfig } from './auth-button';
import { injectStyles, removeStyles } from './styles';
import { CheessoBuilder } from './chainable-builder';
import { getVersion } from '../version';


// Global API interface
export interface CheessoGlobalAPI {
  destroyAll(): void;
  injectStyles(): void;
  removeStyles(): void;
  version: string;
  // Chainable API - can be called as Cheesso(container) or window.Cheesso(container)
  (container: string | HTMLElement): CheessoBuilder;
}

// Create a callable function that also has methods
function createCheessoAPI(container?: string | HTMLElement): CheessoBuilder {
  if (!container) {
    throw new Error('Container is required for chainable API.');
  }
  return new CheessoBuilder(container);
}

// Create the global API object
const CheessoAPIObject = {
  destroyAll(): void {
    removeStyles();
  },

  injectStyles,
  removeStyles,

  version: getVersion()
};



// Export for direct imports
export { CheessoAuthButton, type CheessoUIConfig };
export { injectStyles, removeStyles };
export { CheessoBuilder };

// Make API available globally
declare global {
  interface Window {
    Cheesso: CheessoGlobalAPI;
  }
}

// Merge the function with the API object methods
const MergedAPI = Object.assign(createCheessoAPI, CheessoAPIObject) as CheessoGlobalAPI;

// Attach to window
if (typeof window !== 'undefined') {
  window.Cheesso = MergedAPI;
}

// Export the API for module usage
export default MergedAPI;