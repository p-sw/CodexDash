import { join } from 'node:path';
import {
  buildSpaFallbackPath,
  resolveCallbackListenHost,
  resolveWebDistDir,
  shouldServeSpaFallback,
} from './runtime-assets';

describe('runtime asset helpers', () => {
  it('prefers WEB_DIST_DIR when it points to an existing directory', () => {
    const webDistDir = resolveWebDistDir({
      envWebDistDir: '/tmp/codexdash-web',
      execPath: '/app/codexdash',
      directoryExists: (candidate) => candidate === '/tmp/codexdash-web',
    });

    expect(webDistDir).toBe('/tmp/codexdash-web');
  });

  it('falls back to a web directory next to the compiled binary', () => {
    const expected = join('/app', 'web');

    const webDistDir = resolveWebDistDir({
      execPath: '/app/codexdash',
      directoryExists: (candidate) => candidate === expected,
    });

    expect(webDistDir).toBe(expected);
  });

  it('returns null when no candidate directory exists', () => {
    expect(
      resolveWebDistDir({
        envWebDistDir: '/missing',
        execPath: '/app/codexdash',
        directoryExists: () => false,
      }),
    ).toBeNull();
  });

  it('serves SPA fallback only for browser GET requests outside API routes', () => {
    expect(
      shouldServeSpaFallback({
        method: 'GET',
        path: '/dashboard',
        acceptHeader: 'text/html,application/xhtml+xml',
      }),
    ).toBe(true);
    expect(
      shouldServeSpaFallback({
        method: 'GET',
        path: '/health',
        acceptHeader: 'text/html',
      }),
    ).toBe(false);
    expect(
      shouldServeSpaFallback({
        method: 'GET',
        path: '/auth/login',
        acceptHeader: 'text/html',
      }),
    ).toBe(false);
    expect(
      shouldServeSpaFallback({
        method: 'POST',
        path: '/dashboard',
        acceptHeader: 'text/html',
      }),
    ).toBe(false);
    expect(
      shouldServeSpaFallback({
        method: 'GET',
        path: '/app.js',
        acceptHeader: 'text/html',
      }),
    ).toBe(false);
  });

  it('builds the SPA entrypoint path from the web dist directory', () => {
    expect(buildSpaFallbackPath('/app/web')).toBe('/app/web/index.html');
  });

  it('prefers an explicit callback bind host override for containers', () => {
    expect(resolveCallbackListenHost('localhost', '0.0.0.0')).toBe('0.0.0.0');
    expect(resolveCallbackListenHost('127.0.0.1')).toBe('127.0.0.1');
  });
});
