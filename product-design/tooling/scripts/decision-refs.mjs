#!/usr/bin/env node
import path from 'node:path';
import { findReferences, loadRegistry, productDesignDir, validStatuses, walk } from './governance.mjs';

const id = process.argv[2];
if (!id || process.argv.length !== 3 || !/^PD-\d{3,}$/.test(id)) {
  console.error('Usage: pnpm decision:refs PD-014');
  process.exit(2);
}

try {
  const registry = loadRegistry();
  const record = registry.decisions.find((decision) => decision.id === id);
  if (!record) {
    console.error(`Unknown decision ID: ${id}`);
    process.exit(2);
  }
  if (!validStatuses.includes(record.status)) {
    console.error(`${id} has invalid registry status '${record.status}'.`);
    process.exit(2);
  }

  console.log(`${id} — ${record.title} [${record.status}]`);
  const files = walk(productDesignDir, (file) => file.endsWith('.mdx') || file.endsWith('.d2'));
  const backlinks = [];
  for (const file of files) {
    for (const reference of findReferences(file)) {
      if (reference.id === id) backlinks.push({ file: path.relative(productDesignDir, file), ...reference });
    }
  }

  const live = backlinks.filter((item) => item.kind === 'LIVE');
  const historical = backlinks.filter((item) => item.kind === 'HISTORICAL');
  console.log(`\nLIVE dependencies (${live.length}) — revisit these if ${id} is superseded:`);
  if (live.length === 0) console.log('  (none)');
  else for (const item of live) console.log(`  ${item.file}:${item.line}`);
  console.log(`\nHISTORICAL references (${historical.length}) — recorded history; no live dependency implied:`);
  if (historical.length === 0) console.log('  (none)');
  else for (const item of historical) console.log(`  ${item.file}:${item.line}`);

  if (record.status === 'superseded' && live.length > 0) process.exitCode = 1;
} catch (error) {
  console.error(`Could not inspect decision references: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
