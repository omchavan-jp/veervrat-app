import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir, copyFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagramTheme } from './diagram-theme.mjs';

const tooling = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.resolve(tooling, '..');
const output = path.join(tooling, 'public/diagrams');
const cache = path.join(tooling, '.cache/diagrams');

async function sources(dir = content) {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = (
    await Promise.all(
      entries.map((entry) => {
        if (entry.name === 'tooling') return [];
        const name = path.join(dir, entry.name);
        return entry.isDirectory() ? sources(name) : entry.name.endsWith('.d2') ? [name] : [];
      }),
    )
  ).flat();
  return paths.sort();
}

await Promise.all([mkdir(output, { recursive: true }), mkdir(cache, { recursive: true })]);
const version = execFileSync('d2', ['--version'], { encoding: 'utf8' }).trim();
const files = await sources();
const manifest = {};
for (const file of files) {
  const key = '/' + path.relative(content, file).split(path.sep).join('/');
  const source = await readFile(file, 'utf8');
  const entry = {};
  for (const mode of ['light', 'dark']) {
    const theme = diagramTheme(mode);
    const digest = createHash('sha256')
      .update(JSON.stringify([source, theme, version]))
      .digest('hex')
      .slice(0, 24);
    const asset = `${digest}.${mode}.svg`;
    const cached = path.join(cache, asset);
    let svg;
    try {
      svg = await readFile(cached, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      svg = execFileSync(
        'd2',
        ['--layout', 'elk', '--pad', '32', '--no-xml-tag', '--salt', digest, '-', '-'],
        {
          input: `${theme}\n${source}`,
          encoding: 'utf8',
          maxBuffer: 16 * 1024 * 1024,
          timeout: 120_000,
        },
      );
      if (!svg.includes('<svg') || /<script\b|<foreignObject\b|(?:href|src)="https?:/i.test(svg))
        throw new Error(`Unsafe SVG: ${key}`);
      await writeFile(cached, svg);
    }
    await copyFile(cached, path.join(output, asset));
    const viewBox = svg.match(/viewBox="([\d. -]+)"/);
    if (!viewBox) throw new Error(`Missing viewBox: ${key}`);
    const [, , width, height] = viewBox[1].split(/\s+/).map(Number);
    entry[mode] = `/product-docs/diagrams/${asset}`;
    entry.width = width;
    entry.height = height;
  }
  manifest[key] = entry;
}
const active = new Set(
  Object.values(manifest).flatMap((entry) => [
    path.basename(entry.light),
    path.basename(entry.dark),
  ]),
);
for (const name of await readdir(output))
  if (name.endsWith('.svg') && !active.has(name)) await unlink(path.join(output, name));
await writeFile(
  path.join(tooling, '.cache/diagrams.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(`Rendered ${files.length} canonical D2 diagram(s).`);
