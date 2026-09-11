import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const htmlFiles = [];
const requiredPages = ['index.html', 'comics.html', 'cards.html', 'collectibles.html', 'about.html', 'visit.html'];
const requiredNavTargets = ['index.html', 'comics.html', 'cards.html', 'collectibles.html', 'about.html', 'visit.html'];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.validation') continue;
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (entry.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
}

function fileLabel(file) {
  return relative(root, file) || file;
}

function resolveLocalReference(sourceFile, reference) {
  const cleanReference = reference.split('#')[0].split('?')[0];
  if (!cleanReference || cleanReference.startsWith('mailto:') || cleanReference.startsWith('tel:')) return null;
  if (/^(https?:|\/\/|#|data:|javascript:)/i.test(cleanReference)) return null;
  // Skip Vercel-provided paths (analytics, insights, etc.)
  if (cleanReference.startsWith('/_vercel/')) return null;
  return cleanReference.startsWith('/')
    ? join(root, cleanReference.replace(/^\/+/, ''))
    : join(sourceFile, '..', cleanReference);
}

walk(root);

const errors = [];
const warnings = [];
for (const page of requiredPages) {
  if (!existsSync(join(root, page))) errors.push(`Missing required page: ${page}`);
}

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const label = fileLabel(file);

  for (const requirement of [
    ['doctype', /<!doctype html>/i],
    ['language declaration', /<html[^>]+lang=["']en["']/i],
    ['viewport meta tag', /<meta[^>]+name=["']viewport["']/i],
    ['page title', /<title>[^<]+<\/title>/i],
    ['main landmark', /<main[\s>]/i],
    ['skip link', /class=["'][^"']*skip-link/i],
    ['responsive menu control', /class=["']menu-toggle/i],
    ['shared stylesheet', /href=["']assets\/css\/styles\.css["']/i],
    ['shared navigation script', /src=["']assets\/js\/site\.js["']/i],
  ]) {
    if (!requirement[1].test(html)) errors.push(`${label}: missing ${requirement[0]}`);
  }

  const primaryNavigation = html.match(/<nav[^>]+id=["']site-nav["'][\s\S]*?<\/nav>/i)?.[0] || '';
  if (!primaryNavigation) {
    errors.push(`${label}: missing primary navigation`);
  } else {
    for (const target of requiredNavTargets) {
      if (!new RegExp(`href=["']${target}["']`, 'i').test(primaryNavigation)) {
        errors.push(`${label}: primary navigation missing ${target}`);
      }
    }
  }

  if (/harris|placeholder|lorem ipsum|your business|generic starter|template copy/i.test(html)) {
    errors.push(`${label}: contains leftover starter or placeholder language`);
  }

  const attributePattern = /(?:href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = attributePattern.exec(html)) !== null) {
    const target = resolveLocalReference(file, match[1]);
    if (target && !existsSync(target)) {
      errors.push(`${label}: broken local reference ${match[1]}`);
    }
  }

  if (!/Infinite Heroes Comics/i.test(html)) {
    warnings.push(`${label}: business name not found in page content`);
  }
}

if (errors.length) {
  console.error('\nStatic validation failed:\n');
  errors.forEach((error) => console.error(`  ✗ ${error}`));
  process.exit(1);
}

console.log(`\nStatic validation passed for ${htmlFiles.length} page(s), shared navigation, and local references.`);
if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach((warning) => console.warn(`  ! ${warning}`));
}
