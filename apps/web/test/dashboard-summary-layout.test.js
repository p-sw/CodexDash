import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('dashboard summary layout', () => {
  test('stacks the session summary cards vertically beside unified capacity on desktop', () => {
    expect(appSource).toContain(
      'className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] xl:items-stretch"',
    );
    expect(appSource).toContain('className="h-full"');
    expect(appSource).toContain('className="grid gap-4 xl:grid-rows-3"');
    expect(appSource).not.toContain('className="grid gap-4 md:grid-cols-3 xl:grid-cols-4"');
    expect(appSource).not.toContain('className="md:col-span-2"');
  });
});
