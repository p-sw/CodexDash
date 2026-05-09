import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('mobile overflow guards', () => {
  test('usage metrics cards allow long metric labels to wrap on mobile', () => {
    expect(appSource).toContain('className="mt-6 min-w-0"');
    expect(appSource).toContain('className="grid gap-3 sm:grid-cols-2"');
    expect(appSource).toContain('className="min-w-0 rounded-2xl border border-white/10 bg-white/4 p-4"');
    expect(appSource).toContain('className="text-sm text-slate-400 break-words"');
  });

  test('connected account tabs no longer render a side-by-side payload column', () => {
    expect(appSource).not.toContain('lg:grid-cols-[0.9fr_1.1fr]');
    expect(appSource).not.toContain('Account payload');
  });
});
