#!/usr/bin/env node
/**
 * Alias Migration Script
 * Converts imports using "@/" (TypeScript baseUrl + paths alias) into relative paths.
 *
 * Usage:
 *   node dy_react/scripts/alias-migrate.js            # dry-run (default)
 *   node dy_react/scripts/alias-migrate.js --dry      # explicit dry-run
 *   node dy_react/scripts/alias-migrate.js --write    # apply changes
 *   node dy_react/scripts/alias-migrate.js --root dy_react  # change root (default: dy_react)
 *
 * Notes:
 * - Only processes .ts / .tsx files (excluding node_modules & .next).
 * - Keeps original quote style (single vs double).
 * - Ensures relative paths start with './' or '../'.
 * - Skips if the target file doesn't exist (prints a warning).
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const DRY = args.includes('--dry') || !WRITE;
const rootArgIndex = args.indexOf('--root');
const projectRoot = rootArgIndex !== -1 ? args[rootArgIndex + 1] : 'dy_react';

const absoluteRoot = path.resolve(process.cwd(), projectRoot);
if (!fs.existsSync(absoluteRoot)) {
  console.error(`[ERROR] Root directory not found: ${absoluteRoot}`);
  process.exit(1);
}

const exts = new Set(['.ts', '.tsx']);
const aliasPrefix = '@/';

/** Collect all TS/TSX files recursively */
function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(absoluteRoot, full);
    if (rel.startsWith('node_modules') || rel.startsWith('.next')) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (stat.isFile()) {
      if (exts.has(path.extname(entry))) out.push(full);
    }
  }
  return out;
}

/** Convert an alias import path into a relative path */
function convertAlias(importPath, fromFileDir) {
  if (!importPath.startsWith(aliasPrefix)) return null;
  const subPath = importPath.slice(aliasPrefix.length); // remove '@/'
  const targetAbs = path.join(absoluteRoot, subPath);
  // If file or directory doesn't exist, just return null to skip (could be a type-only import)
  if (!fs.existsSync(targetAbs)) {
    return { newPath: makeRelativeFallback(subPath, fromFileDir), warning: `Target not found on disk for '${importPath}'` };
  }
  const rel = path.relative(fromFileDir, targetAbs).replace(/\\/g, '/');
  const normalized = rel.startsWith('.') ? rel : `./${rel}`;
  return { newPath: normalized, warning: null };
}

function makeRelativeFallback(subPath, fromFileDir) {
  // Attempt a relative path even if file missing, to reduce alias usage
  const targetAbs = path.join(absoluteRoot, subPath);
  const rel = path.relative(fromFileDir, targetAbs).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/** Process a single file: returns {file, changes: [{oldLine,newLine,lineNumber,warn}] } */
function processFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  const lines = original.split(/\r?\n/);
  const dir = path.dirname(file);
  const changes = [];

  const importRegex = /^\s*import\s+([^'"/]|[^"'])*['"]@\/(.+?)['"];?|^\s*import\s+['"]@\/(.+?)['"];?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Quick contains check first
    if (!line.includes(aliasPrefix)) continue;

    // Match import statements more precisely
    const match = line.match(/^(\s*import\s+[^'";]*['"])(@\/[^'";]+)(['"];)/) ||
                  line.match(/^(\s*import\s+['"])(@\/[^'";]+)(['"];)/);
    if (!match) continue;

    const prefix = match[1];
    const aliasImport = match[2];
    const suffix = match[3];

    const conv = convertAlias(aliasImport, dir);
    if (conv) {
      const newLine = `${prefix}${conv.newPath}${suffix}`;
      if (newLine !== line) {
        changes.push({ oldLine: line, newLine, lineNumber: i + 1, warn: conv.warning });
        lines[i] = newLine; // apply in-memory so subsequent modifications see updated state
      }
    }
  }

  return { file, changes, updatedContent: lines.join('\n') };
}

function main() {
  console.log(`Alias Migration (dry=${DRY}) root=${absoluteRoot}`);
  const files = collectFiles(absoluteRoot);
  let totalChanges = 0;
  const warnings = [];

  for (const f of files) {
    const result = processFile(f);
    if (result.changes.length) {
      totalChanges += result.changes.length;
      console.log(`\nFile: ${path.relative(absoluteRoot, f)}`);
      for (const ch of result.changes) {
        console.log(`  [line ${ch.lineNumber}] ${ch.oldLine.trim()} => ${ch.newLine.trim()}`);
        if (ch.warn) warnings.push(`  ${path.relative(absoluteRoot, f)}:${ch.lineNumber} - ${ch.warn}`);
      }
      if (WRITE) {
        fs.writeFileSync(f, result.updatedContent, 'utf8');
      }
    }
  }

  console.log(`\nSummary: ${totalChanges} import(s) would be rewritten.`);
  if (warnings.length) {
    console.log('\nWarnings (targets not found, used fallback relative):');
    warnings.forEach(w => console.log(w));
  }
  if (!WRITE) {
    console.log('\nDry run only. Re-run with --write to apply changes.');
  } else {
    console.log('\nChanges applied. Consider removing baseUrl/paths & ignoreDeprecations afterwards.');
  }
}

main();
