import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('dashboard card copy', () => {
  test('removes verbose dashboard card descriptions and keeps concise labels', () => {
    expect(appSource).toContain('<CardTitle>Unified capacity</CardTitle>');
    expect(appSource).toContain('<CardTitle>Connected OpenAI accounts</CardTitle>');
    expect(appSource).toContain('Primary window');
    expect(appSource).toContain('Secondary window');
    expect(appSource).not.toContain('<CardTitle>Usage metrics</CardTitle>');
    expect(appSource).toContain(">Merged by default. Inspect each account below.<");
    expect(appSource).not.toContain(
      'Fast glance card for the first two numeric metrics extracted from the merged usage payload.',
    );
    expect(appSource).not.toContain(
      'CodexDash extracts numeric leaf nodes from the aggregated usage payload for quick overview cards.',
    );
    expect(appSource).not.toContain(
      'Raw aggregated JSON merged from every attached OpenAI Codex account.',
    );
    expect(appSource).not.toContain('Combined raw JSON.');
    expect(appSource).not.toContain(
      'By default, these accounts are merged into one Codex usage view. Switch tabs to inspect individual account payloads and timestamps.',
    );
    expect(appSource).not.toContain('Raw JSON for this account.');
  });
});
