import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

function getGitCommit(): string | null {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getPackageVersion(): string {
  try {
    const packagePath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

export function getVersion(): string {
  const packageVersion = getPackageVersion();
  const gitCommit = getGitCommit();
  
  return gitCommit ? `${packageVersion}-${gitCommit}` : packageVersion;
}

export function logVersion(context: string): void {
  const version = getVersion();
  console.log(`🧀 Cheesso ${context} v${version}`);
}