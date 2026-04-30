import { describe, expect, test } from 'bun:test';
import { getApiBaseUrl } from '../src/lib/api-base.ts';

describe('getApiBaseUrl', () => {
  test('uses the configured API base when provided', () => {
    expect(getApiBaseUrl('https://api.example.com/', 'https://app.example.com')).toBe(
      'https://api.example.com',
    );
  });

  test('defaults to the current window origin when no API base is configured', () => {
    expect(getApiBaseUrl(undefined, 'https://app.example.com/')).toBe(
      'https://app.example.com',
    );
  });

  test('falls back to localhost in non-browser contexts without configuration', () => {
    expect(getApiBaseUrl(undefined, undefined)).toBe('http://localhost:3001');
  });
});
