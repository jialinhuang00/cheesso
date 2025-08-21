import { CheessoBuilder } from './ui/chainable-builder';

declare global {
  interface Window {
    Cheesso: (container: string | HTMLElement) => CheessoBuilder;
  }
}

export {};