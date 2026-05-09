import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appSource = readFileSync(join(import.meta.dir, '../src/App.tsx'), 'utf8');

describe('mobile overflow guards', () => {
  test('unified capacity window cards stay inside the card without h-full overflow', () => {
    expect(appSource).toContain('className="flex h-full flex-col overflow-hidden"');
    expect(appSource).toContain('className="flex flex-1 flex-col gap-4"');
    expect(appSource).toContain('className="grid flex-1 items-stretch gap-4 md:grid-cols-2"');
    expect(appSource).toContain('className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-white/10 bg-white/4 p-4"');
    expect(appSource).toContain('Replenishes at {formatDate(item.window.resetAt)}');
  });

  test('connected account tabs no longer render a side-by-side payload column', () => {
    expect(appSource).not.toContain('lg:grid-cols-[0.9fr_1.1fr]');
    expect(appSource).not.toContain('Account payload');
  });
});
