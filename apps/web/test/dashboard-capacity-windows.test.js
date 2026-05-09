import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('dashboard unified capacity windows', () => {
  test('shows primary and secondary windows inside unified capacity and removes usage metrics card', () => {
    expect(appSource).toContain('<CardTitle>Unified capacity</CardTitle>');
    expect(appSource).toContain('Primary window');
    expect(appSource).toContain('Secondary window');
    expect(appSource).toContain('const windowCards = [');
    expect(appSource).toContain("} => item.window !== null,");
    expect(appSource).toContain('item.window.limitWindowSeconds !== null ? (');
    expect(appSource).not.toContain('<CardTitle>Usage metrics</CardTitle>');
    expect(appSource).not.toContain('flattenNumericMetrics(summaryQuery.data?.aggregatedUsage).slice(0, 6)');
    expect(appSource).not.toContain('const firstMetric = metricCards[0]?.value ?? 0;');
    expect(appSource).not.toContain('const secondMetric = metricCards[1]?.value ?? 0;');
  });
});
