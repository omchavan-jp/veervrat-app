#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { productDesignDir } from './governance.mjs';

const governanceDir = path.join(productDesignDir, '00-governance');
const roadmapPath = path.join(governanceDir, 'design-roadmap.mdx');
const registerPath = path.join(governanceDir, 'deferred-topics.json');
const requestedPhase = process.argv[2];
const roadmap = readFileSync(roadmapPath, 'utf8');
const phases = new Map();
for (const line of roadmap.split('\n')) {
  const match = line.match(/^\| `(PH-\d{3,})` \| ([^|]+) \| ([^|]+) \| (completed|current|planned) \|$/);
  if (match) phases.set(match[1], match[2].trim());
}

if (process.argv.length > 3) {
  console.error('Usage: pnpm deferred:list [PH-###]');
  process.exit(2);
}
if (requestedPhase && !phases.has(requestedPhase)) {
  console.error(`Unknown phase '${requestedPhase}'. Valid phase IDs: ${[...phases.keys()].join(', ')}.`);
  process.exit(2);
}

const register = JSON.parse(readFileSync(registerPath, 'utf8'));
const topics = register.topics
  .filter((topic) => topic.status === 'open' && (!requestedPhase || topic.target_phase === requestedPhase))
  .sort((left, right) => left.id.localeCompare(right.id));

if (topics.length === 0) {
  console.log(requestedPhase ? `No open deferred topics for ${requestedPhase} (${phases.get(requestedPhase)}).` : 'No open deferred topics.');
  process.exit(0);
}

console.log(requestedPhase ? `Open deferred topics for ${requestedPhase} (${phases.get(requestedPhase)}):` : 'Open deferred topics:');
for (const topic of topics) {
  console.log(`\n${topic.id} — ${topic.title}\n  Target: ${topic.target_phase} (${phases.get(topic.target_phase)})\n  Reason: ${topic.reason}`);
  if (topic.notes) console.log(`  Notes: ${topic.notes}`);
  if (topic.reconcile_in?.length) console.log(`  Reconcile in: ${topic.reconcile_in.map((id) => `${id} (${phases.get(id)})`).join(', ')}`);
  if (topic.downstream_phases?.length) console.log(`  Downstream: ${topic.downstream_phases.map((id) => `${id} (${phases.get(id)})`).join(', ')}`);
  for (const move of topic.moves ?? []) console.log(`  Moved: ${move.from_phase} → ${move.to_phase} — ${move.reason}`);
}
