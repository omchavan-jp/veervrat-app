import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function checkReferences(text, filename, policy) {
  const errors = [];
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('#') || !/\buses\s*:/.test(line)) continue;
    const match = line.match(
      /^\s*(?:-\s*)?uses:\s*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s#]+))\s*(?:#.*)?$/,
    );
    if (!match) {
      errors.push(`${filename}: unsupported uses syntax; use a standalone literal reference`);
      continue;
    }
    const reference = match[1] ?? match[2] ?? match[3];
    if (reference.startsWith('./.github/actions/') && !reference.includes('..')) continue;
    if (!/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/i.test(reference)) {
      errors.push(`${filename}: Action must use a full commit SHA: ${reference}`);
      continue;
    }
    const allowed = policy.patterns_allowed.some((pattern) => {
      const escaped = pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${escaped}$`, 'i').test(reference);
    });
    if (!allowed)
      errors.push(`${filename}: Action is outside the reviewed allowlist: ${reference}`);
  }
  return errors;
}

export function checkWorkflow(text, filename) {
  const errors = [];
  if (!/^permissions:\s*\n[ ]{2}contents: read\s*$/m.test(text)) {
    errors.push(`${filename}: declare workflow-level contents: read`);
  }
  if (/^\s{2}id-token:\s*write\b/m.test(text))
    errors.push(`${filename}: OIDC permission belongs on trusted jobs, not the whole workflow`);
  if (/^\s*(?:pull_request_target|workflow_run)\s*:/m.test(text))
    errors.push(`${filename}: privileged PR triggers require a separate security review`);
  if (filename !== '.github/workflows/cd.yml' && /^\s*id-token:\s*write\b/m.test(text)) {
    errors.push(`${filename}: PR checks must not request deployment OIDC tokens`);
  }
  return errors;
}

function yamlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? yamlFiles(file) : /\.ya?ml$/.test(file) ? [file] : [];
  });
}

export function verifyRepository() {
  const policy = JSON.parse(readFileSync('.github/actions-policy.json', 'utf8'));
  if (
    policy.github_owned_allowed !== false ||
    policy.verified_allowed !== false ||
    !policy.patterns_allowed?.length
  ) {
    throw new Error('Action policy must list reviewed Actions without broad publisher allowances');
  }
  const files = [...yamlFiles('.github/workflows'), ...yamlFiles('.github/actions')];
  if (!files.length) throw new Error('No workflow/action files found');
  const errors = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return [
      ...checkReferences(text, file, policy),
      ...(file.startsWith('.github/workflows/') ? checkWorkflow(text, file) : []),
    ];
  });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Actions security policy passed for ${files.length} workflow/action files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  verifyRepository();
