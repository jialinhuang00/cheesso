export function getVersion(): string {
  // Check if running in Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.COMMIT || 'dev';
  }
  // For browser environment, return a static version
  return 'dev';
}

export function logVersion(context: string): void {
  const version = getVersion();
  console.log(`🧀 Cheesso ${context} v${version}`);
}