import { readFileSync } from 'node:fs';
import { assertRollbackPlan, validateManifest } from './production-release.mjs';

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (
  typeof plan.format_version !== 'string' ||
  !Array.isArray(plan.resource_changes) ||
  plan.resource_changes.some((resource) => resource.change.actions.includes('delete'))
)
  throw new Error('Production refuses deletion/replacement or unreadable plan');
if (process.env.MANIFEST_FILE) {
  const manifest = validateManifest(JSON.parse(readFileSync(process.env.MANIFEST_FILE, 'utf8')));
  if (manifest.rollback) assertRollbackPlan(plan.resource_changes);
}
