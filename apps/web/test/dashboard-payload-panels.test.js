import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('dashboard payload panels', () => {
  test('removes merged payload and account payload panels from the dashboard', () => {
    expect(appSource).not.toContain('title="Merged payload"');
    expect(appSource).not.toContain('title="Account payload"');
    expect(appSource).not.toContain('description="Combined raw JSON."');
    expect(appSource).not.toContain('description="Raw JSON for this account."');
    expect(appSource).not.toContain("summary.aggregatedUsage ?? { message: 'No data yet' }");
    expect(appSource).not.toContain("account.usage ?? {");
    expect(appSource).not.toContain("import { JsonViewer } from '@/components/json-viewer';");
  });
});
