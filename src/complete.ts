// Complete Cheesso bundle with UI components
// This file exports everything needed for a standalone JS file

// Export core functionality
export * from './index';
export * from './cheesso';
export * from './cross-domain';
export * from './providers';
export * from './types';

// Export UI functionality
export * from './ui';
export { CheessoAuthButton, type CheessoUIConfig } from './ui/auth-button';

// Import and setup global API
import CheessoAPI from './ui';

// The default export will be the global API
export default CheessoAPI;

// Ensure window.Cheesso is available (this happens in ui/index.ts too, but for safety)
if (typeof window !== 'undefined') {
  window.Cheesso = CheessoAPI;
}