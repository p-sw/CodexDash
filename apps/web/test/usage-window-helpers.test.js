import { describe, expect, test } from 'bun:test';
import {
  extractUsageWindows,
  formatDurationSeconds,
  getFastestResetAt,
  getUsageProgressTone,
  summarizeUsageWindows,
} from '../src/lib/utils';

describe('usage window helpers', () => {
  test('extracts primary and secondary windows from codex rate_limit payloads', () => {
    const windows = extractUsageWindows({
      rate_limit: {
        primary_window: {
          used_percent: 14,
          limit_window_seconds: 18_000,
          reset_at: '2026-05-09T12:00:00.000Z',
        },
        secondary_window: {
          used_percent: 19,
          limit_window_seconds: 604_800,
          reset_at: '2026-05-16T12:00:00.000Z',
        },
      },
    });

    expect(windows).toEqual({
      primary: {
        usedPercent: 14,
        limitWindowSeconds: 18_000,
        resetAt: '2026-05-09T12:00:00.000Z',
      },
      secondary: {
        usedPercent: 19,
        limitWindowSeconds: 604_800,
        resetAt: '2026-05-16T12:00:00.000Z',
      },
    });
  });

  test('formats canonical codex limit windows into readable labels', () => {
    expect(formatDurationSeconds(18_000)).toBe('5h window');
    expect(formatDurationSeconds(604_800)).toBe('7d window');
    expect(formatDurationSeconds(null)).toBe('Unknown window');
  });

  test('maps usage thresholds to warning progress colors', () => {
    expect(getUsageProgressTone(49)).toContain('from-sky-400');
    expect(getUsageProgressTone(50)).toContain('from-amber-400');
    expect(getUsageProgressTone(80)).toContain('from-rose-500');
  });

  test('picks the fastest reset time across available windows', () => {
    expect(
      getFastestResetAt([
        '2026-05-09T12:00:00.000Z',
        null,
        '2026-05-09T10:00:00.000Z',
      ]),
    ).toBe('2026-05-09T10:00:00.000Z');
  });

  test('summarizes windows across multiple account payloads without summing percentages', () => {
    const windows = summarizeUsageWindows([
      {
        rate_limit: {
          primary_window: {
            used_percent: 20,
            limit_window_seconds: 18_000,
            reset_at: '2026-05-09T12:00:00.000Z',
          },
          secondary_window: {
            used_percent: 40,
            limit_window_seconds: 604_800,
            reset_at: '2026-05-16T12:00:00.000Z',
          },
        },
      },
      {
        rate_limit: {
          primary_window: {
            used_percent: 60,
            limit_window_seconds: 18_000,
            reset_at: '2026-05-09T10:00:00.000Z',
          },
          secondary_window: {
            used_percent: 80,
            limit_window_seconds: 604_800,
            reset_at: '2026-05-15T10:00:00.000Z',
          },
        },
      },
    ]);

    expect(windows).toEqual({
      primary: {
        accountCount: 2,
        usedPercent: 40,
        limitWindowSeconds: 18_000,
        resetAt: '2026-05-09T10:00:00.000Z',
      },
      secondary: {
        accountCount: 2,
        usedPercent: 60,
        limitWindowSeconds: 604_800,
        resetAt: '2026-05-15T10:00:00.000Z',
      },
    });
  });

  test('keeps window summaries null-safe for partial or inconsistent account data', () => {
    const windows = summarizeUsageWindows([
      {
        rate_limit: {
          primary_window: {
            limit_window_seconds: 18_000,
            reset_at: '2026-05-09T12:00:00.000Z',
          },
        },
      },
      {
        rate_limit: {
          primary_window: {
            used_percent: 50,
            reset_at: '2026-05-09T11:00:00.000Z',
          },
          secondary_window: {
            used_percent: 22,
            limit_window_seconds: 604_800,
            reset_at: '2026-05-16T12:00:00.000Z',
          },
        },
      },
      {
        rate_limit: {
          secondary_window: {
            used_percent: 44,
            limit_window_seconds: 86_400,
            reset_at: '2026-05-15T12:00:00.000Z',
          },
        },
      },
    ]);

    expect(windows).toEqual({
      primary: {
        accountCount: 2,
        usedPercent: 50,
        limitWindowSeconds: null,
        resetAt: '2026-05-09T11:00:00.000Z',
      },
      secondary: {
        accountCount: 2,
        usedPercent: 33,
        limitWindowSeconds: null,
        resetAt: '2026-05-15T12:00:00.000Z',
      },
    });
  });

  test('ignores empty window shells with no meaningful values', () => {
    expect(
      extractUsageWindows({
        rate_limit: {
          primary_window: {},
          secondary_window: null,
        },
      }),
    ).toEqual({ primary: null, secondary: null });
  });

  test('falls back to later candidate paths when earlier window shells are empty', () => {
    expect(
      extractUsageWindows({
        rate_limit: {
          primary_window: {},
        },
        primary_window: {
          used_percent: 42,
          limit_window_seconds: 18_000,
          reset_at: '2026-05-09T12:00:00.000Z',
        },
      }),
    ).toEqual({
      primary: {
        usedPercent: 42,
        limitWindowSeconds: 18_000,
        resetAt: '2026-05-09T12:00:00.000Z',
      },
      secondary: null,
    });
  });
 });
