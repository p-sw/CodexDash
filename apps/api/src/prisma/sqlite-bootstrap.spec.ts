import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ensureSqliteSchema,
  parseSqliteFilePath,
  resolveSqliteFilePath,
} from './sqlite-bootstrap';

describe('sqlite-bootstrap', () => {
  it('parses sqlite file URLs', () => {
    expect(parseSqliteFilePath('file:./dev.db')).toBe('./dev.db');
    expect(parseSqliteFilePath('file:/tmp/codexdash.db')).toBe(
      '/tmp/codexdash.db',
    );
    expect(
      parseSqliteFilePath('file:/tmp/codexdash.db?connection_limit=1'),
    ).toBe('/tmp/codexdash.db');
    expect(parseSqliteFilePath(undefined)).toBeNull();
    expect(parseSqliteFilePath('postgresql://example.com/app')).toBeNull();
  });

  it('resolves relative sqlite URLs like the Prisma schema layout', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'codexdash-sqlite-path-'));

    try {
      const repoStylePrismaDir = join(tempDir, 'apps', 'api', 'prisma');
      mkdirSync(repoStylePrismaDir, { recursive: true });
      expect(resolveSqliteFilePath('file:./dev.db', tempDir)).toBe(
        join(repoStylePrismaDir, 'dev.db'),
      );

      const packageStyleRoot = mkdtempSync(
        join(tmpdir(), 'codexdash-package-prisma-'),
      );
      try {
        const packageStylePrismaDir = join(packageStyleRoot, 'prisma');
        mkdirSync(packageStylePrismaDir, { recursive: true });
        expect(resolveSqliteFilePath('file:./dev.db', packageStyleRoot)).toBe(
          join(packageStylePrismaDir, 'dev.db'),
        );
      } finally {
        rmSync(packageStyleRoot, { force: true, recursive: true });
      }

      expect(resolveSqliteFilePath('file:/tmp/absolute.db', tempDir)).toBe(
        '/tmp/absolute.db',
      );
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it('skips bootstrap for non-sqlite database URLs', async () => {
    await expect(
      ensureSqliteSchema('postgresql://example.com/app'),
    ).resolves.toBe(false);
  });
});
