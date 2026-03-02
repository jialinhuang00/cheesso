// Complete Cheesso bundle with UI components
export * from './index';
export * from './ui';

import CheessoAPI from './ui';
export default CheessoAPI;

if (typeof window !== 'undefined') {
  window.Cheesso = CheessoAPI;
}
