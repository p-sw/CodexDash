import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');
const readmeSource = readFileSync(join(import.meta.dir, '../../../README.md'), 'utf8');
const legacyProjectName = ['codex', 'pool'].join('-');
const legacyRepoPath = ['darvell', legacyProjectName].join('/');

describe('legacy upstream copy removal', () => {
  test('removes legacy upstream references from the web app copy', () => {
    expect(appSource).not.toContain(legacyProjectName);
    expect(appSource).not.toContain('public-client login shape discovered in');
  });

  test('removes legacy upstream references from the README', () => {
    expect(readmeSource).not.toContain(legacyProjectName);
    expect(readmeSource).not.toContain(legacyRepoPath);
  });
});
