// This will be replaced during build with actual commit hash
const BUILD_COMMIT = '8aa93d8';

export function getVersion(): string {
  // Check if running in Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.COMMIT || BUILD_COMMIT;
  }
  // For browser environment, return the build-time commit
  return BUILD_COMMIT;
}

export function logVersion(context: string): void {
  const version = getVersion();
  console.log(`🧀 Cheesso ${context} ${version}`);
}