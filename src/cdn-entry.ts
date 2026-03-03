// CDN entry point — bundles core + UI into a single file with window.Cheesso
export * from './index';
export * from './ui';

import CheessoAPI from './ui';
export default CheessoAPI;

if (typeof window !== 'undefined') {
  window.Cheesso = CheessoAPI;
}
