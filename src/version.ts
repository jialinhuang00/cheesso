// This will be replaced during build with actual commit hash
const BUILD_COMMIT = 'aae1a9b';

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
  console.log(`🧀 Cheesso ${context} v${version}`);
}