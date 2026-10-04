import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const toolingDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const productDesignDir = path.resolve(toolingDir, '..');
export const registryPath = path.join(productDesignDir, '00-governance', 'decision-registry.json');
export const validStatuses = ['confirmed', 'proposed', 'open', 'superseded', 'source-derived'];

export function walk(dir, predicate, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(full, predicate, found);
    else if (predicate(full)) found.push(full);
  }
  return found.sort();
}

export function loadRegistry() {
  return JSON.parse(readFileSync(registryPath, 'utf8'));
}

export function stripMdxNonProse(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/<[^>]+>/g, '');
}

export function findReferences(file) {
  const raw = readFileSync(file, 'utf8');
  const content = file.endsWith('.mdx') ? stripMdxNonProse(raw) : raw;
  const references = [];
  const pattern = /\b(PD-[A-Za-z0-9-]+)([ \t]+\(historical\))?/gi;
  for (const match of content.matchAll(pattern)) {
    const offset = match.index ?? 0;
    const line = content.slice(0, offset).split('\n').length;
    references.push({ id: match[1], kind: match[2] === ' (historical)' ? 'HISTORICAL' : 'LIVE', line });
  }
  return references;
}
