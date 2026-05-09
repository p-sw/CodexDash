import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const legacyProjectName = ['codex', 'pool'].join('-');
const legacyRepoPath = ['darvell', legacyProjectName].join('/');

describe('CodexService source copy', () => {
  it('does not reference the legacy upstream project in usage headers', () => {
    const serviceSource = readFileSync(
      join(__dirname, 'codex.service.ts'),
      'utf8',
    );

    expect(serviceSource).not.toContain(legacyRepoPath);
    expect(serviceSource).not.toContain(legacyProjectName);
  });
});
