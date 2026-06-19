import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const ROOT = path.resolve(__dirname, '..');

// Extract all process.env.VAR_NAME usages from source files
function extractFromSource(patterns: string[]): Set<string> {
  const found = new Set<string>();
  const regex = /process\.env\.([A-Z0-9_]+)/g;

  for (const pattern of patterns) {
    const files = glob.sync(pattern, { cwd: ROOT, absolute: true });
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const [, key] of content.matchAll(regex)) {
        found.add(key);
      }
    }
  }

  return found;
}

// Extract variable names declared in a Joi or Zod schema file
function extractFromSchema(schemaFile: string): Set<string> {
  const content = fs.readFileSync(path.resolve(ROOT, schemaFile), 'utf-8');

  // Matches lines like:   PORT: Joi.number() or   API_URL: z.string()
  const regex = /^\s{2}([A-Z0-9_]+):/gm;
  return new Set([...content.matchAll(regex)].map(([, key]) => key));
}

// Extract variable names declared in a .env.example file
function extractFromEnvExample(envFile: string): Set<string> {
  const content = fs.readFileSync(path.resolve(ROOT, envFile), 'utf-8');
  const regex = /^([A-Z0-9_]+)=/gm;
  return new Set([...content.matchAll(regex)].map(([, key]) => key));
}

// Run audit for a single app
function audit(label: string, opts: {
  sourceGlobs: string[];
  schemaFile: string;
  envExampleFile: string;
  ignoreVars?: string[];
}): boolean {
  const { sourceGlobs, schemaFile, envExampleFile, ignoreVars = [] } = opts;

  const usedInCode   = extractFromSource(sourceGlobs);
  const inSchema     = extractFromSchema(schemaFile);
  const inEnvExample = extractFromEnvExample(envExampleFile);

  const ignore = new Set(ignoreVars);
  const used   = new Set([...usedInCode].filter(v => !ignore.has(v)));

  const missingFromSchema     = [...used].filter(v => !inSchema.has(v));
  const missingFromEnvExample = [...used].filter(v => !inEnvExample.has(v));
  const inSchemaNotUsed       = [...inSchema].filter(v => !used.has(v));

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`📦  ${label}`);
  console.log(`${'─'.repeat(52)}`);
  console.log(`   Used in code:       ${used.size}`);
  console.log(`   In schema:          ${inSchema.size}`);
  console.log(`   In .env.example:    ${inEnvExample.size}`);

  let hasIssue = false;

  if (missingFromSchema.length) {
    hasIssue = true;
    console.log(`\n⚠️  Used but NOT in schema:\n   ${missingFromSchema.join(', ')}`);
  }
  if (missingFromEnvExample.length) {
    hasIssue = true;
    console.log(`\n⚠️  Used but NOT in .env.example:\n   ${missingFromEnvExample.join(', ')}`);
  }
  if (inSchemaNotUsed.length) {
    console.log(`\nℹ️  In schema but not found in code:\n   ${inSchemaNotUsed.join(', ')}`);
  }
  if (!hasIssue) {
    console.log('\n🎉 All good!');
  }

  return !hasIssue;
}

// Run audit for all apps
let allOk = true;

allOk = audit('API (apps/api)', {
  sourceGlobs: ['apps/api/src/**/*.ts'],
  schemaFile: 'apps/api/src/config/env.validation.ts',
  envExampleFile: 'apps/api/.env.example',
  // ADMIN_* vars are passed inline at seed time, not stored in .env
  ignoreVars: ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME'],
}) && allOk;

allOk = audit('WEB (apps/web)', {
  sourceGlobs: [
    'apps/web/lib/**/*.ts',
    'apps/web/app/**/*.ts',
    'apps/web/app/**/*.tsx',
    'apps/web/proxy.ts',       // Next.js 16.1.6 — uses proxy.ts instead of middleware.ts
  ],
  schemaFile: 'apps/web/lib/env.ts',
  envExampleFile: 'apps/web/.env.example',
  // NODE_ENV is injected automatically by Next.js
  ignoreVars: ['NODE_ENV'],
}) && allOk;

console.log(`\n${'═'.repeat(52)}`);
if (allOk) {
  console.log('✅  Audit complete — no issues found.');
} else {
  console.log('❌  Audit complete — fix the issues above.');
  process.exit(1);
}
