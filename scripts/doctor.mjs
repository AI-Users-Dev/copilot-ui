#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const PASS = '✅';
const WARN = '⚠️';
const FAIL = '❌';

const minMajor = 20;
let hasFailure = false;

function loadDotEnv() {
  const envPath = '.env';
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function log(status, title, detail = '') {
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`${status} ${title}${suffix}`);
}

function runCheck(title, fn) {
  try {
    const result = fn();
    if (result?.warn) {
      log(WARN, title, result.warn);
      return;
    }
    log(PASS, title, result?.ok ?? 'ok');
  } catch (error) {
    hasFailure = true;
    const message = error instanceof Error ? error.message : String(error);
    log(FAIL, title, message);
  }
}

function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  }).trim();
}

console.log('Copilot UI doctor');
console.log('=================');
loadDotEnv();

runCheck('Node.js version', () => {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isNaN(major) || major < minMajor) {
    throw new Error(`requires Node >=${minMajor}; found ${process.versions.node}`);
  }
  return { ok: process.versions.node };
});

runCheck('npm dependencies installed', () => {
  runCmd('npm ls --silent', { cwd: process.cwd() });
  return { ok: 'workspace dependency tree is valid' };
});

runCheck('Prisma schema validates', () => {
  if (!process.env.DATABASE_URL) {
    return { warn: 'DATABASE_URL is not set (create .env from .env.example)' };
  }

  const output = runCmd('npx prisma validate --schema prisma/schema.prisma');
  const line = output.split('\n').find((entry) => entry.toLowerCase().includes('validated'));
  return { ok: line ?? 'schema validated' };
});

runCheck('Prisma migration status', () => {
  if (!process.env.DATABASE_URL) {
    return { warn: 'DATABASE_URL is not set (create .env from .env.example)' };
  }

  const output = runCmd('npx prisma migrate status --schema prisma/schema.prisma');
  const line = output
    .split('\n')
    .find((entry) => entry.toLowerCase().includes('database schema is up to date'));

  if (line) {
    return { ok: line };
  }

  return { warn: 'database is reachable, but migrations may need to run (see prisma migrate status output)' };
});

runCheck('Backend readiness (optional)', () => {
  try {
    const response = runCmd('curl -sSf http://localhost:4000/api/diagnostics');
    return { ok: response.length > 80 ? `${response.slice(0, 80)}...` : response };
  } catch {
    return { warn: 'backend not reachable at http://localhost:4000 (start with npm run dev:server)' };
  }
});

runCheck('Frontend readiness (optional)', () => {
  try {
    runCmd('curl -I -sSf http://localhost:5173');
    return { ok: 'frontend reachable at http://localhost:5173' };
  } catch {
    return { warn: 'frontend not reachable at http://localhost:5173 (start with npm run dev:web)' };
  }
});

if (hasFailure) {
  console.log('\nDoctor finished with failures.');
  process.exit(1);
}

console.log('\nDoctor finished successfully.');
