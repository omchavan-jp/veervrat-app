import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCliPrisma } from './cli-prisma';

const DIR = __dirname;

describe('createCliPrisma', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it('refuses to start rather than guessing a database', () => {
    delete process.env.DATABASE_URL;
    expect(() => createCliPrisma()).toThrow(/DATABASE_URL is not set/);
  });

  it('builds a client when the url is present', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db?schema=public';
    expect(createCliPrisma()).toBeDefined();
  });
});

describe('every standalone script connects the same way', () => {
  // The nightly cleanup job shipped with a bare `new PrismaClient()`, which Prisma 7 refuses.
  // It was invisible to unit tests — they inject a mock client — and it failed on its first
  // real execution. A manual job would have been caught by whoever ran it; a *scheduled* one
  // would simply have stopped working, quietly, at 02:00 with nobody watching.
  //
  // So this asserts the shape rather than the behaviour: no script may construct its own.
  const scripts = readdirSync(DIR).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'cli-prisma.ts',
  );

  it('finds the scripts it is meant to be guarding', () => {
    // Without this, a rename could empty the list and the checks below would pass vacuously.
    expect(scripts).toEqual(expect.arrayContaining(['seed.ts', 'wipe-users.ts', 'grant-admin.ts']));
  });

  it.each(scripts)('%s does not construct a PrismaClient itself', (file) => {
    const source = readFileSync(join(DIR, file), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

    expect(code).not.toContain('new PrismaClient(');
    expect(code).not.toContain('new PrismaPg(');
  });
});
