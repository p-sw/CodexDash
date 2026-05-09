import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('dashboard account capacity bars', () => {
  test('renders compact per-account capacity bars in a dedicated panel', () => {
    expect(appSource).toContain('<CardTitle>Per-account capacity</CardTitle>');
    expect(appSource).toContain('const accountWindows = extractUsageWindows(account.usage);');
    expect(appSource).toContain('const accountCapacityBars = [');
    expect(appSource).toContain("className=\"space-y-3\"");
    expect(appSource).toContain("className=\"space-y-2 rounded-2xl border border-white/10 bg-white/4 p-4\"");
    expect(appSource).toContain('indicatorClassName={getUsageProgressTone(progressValue)}');
    expect(appSource).toContain("className=\"min-w-10 text-right text-xs font-medium text-slate-400\"");
    expect(appSource).not.toContain('Primary window used');
    expect(appSource).not.toContain('Secondary window used');
  });
});
