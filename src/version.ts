export function getVersion(): string {
  return process.env.COMMIT || 'dev';
}

export function logVersion(context: string): void {
  const version = getVersion();
  console.log(`🧀 Cheesso ${context} v${version}`);
}