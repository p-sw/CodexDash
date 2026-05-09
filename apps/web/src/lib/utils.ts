import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

type UsageWindowSummary = {
  usedPercent: number | null;
  limitWindowSeconds: number | null;
  resetAt: string | null;
};

type AggregatedUsageWindowSummary = UsageWindowSummary & {
  accountCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getPath(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }
  return current;
}

function normalizeResetAt(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  return null;
}

function extractWindow(value: unknown, paths: string[][]): UsageWindowSummary | null {
  for (const path of paths) {
    const windowValue = getPath(value, path);

    if (!isRecord(windowValue)) {
      continue;
    }

    const summary = {
      usedPercent: toFiniteNumber(windowValue.used_percent),
      limitWindowSeconds:
        toFiniteNumber(windowValue.limit_window_seconds) ??
        (toFiniteNumber(windowValue.window_minutes) !== null
          ? toFiniteNumber(windowValue.window_minutes)! * 60
          : null),
      resetAt: normalizeResetAt(windowValue.reset_at ?? windowValue.resets_at),
    };

    if (
      summary.usedPercent === null &&
      summary.limitWindowSeconds === null &&
      summary.resetAt === null
    ) {
      continue;
    }

    return summary;
  }

  return null;
}

export function extractUsageWindows(value: unknown) {
  return {
    primary: extractWindow(value, [
      ['rate_limit', 'primary_window'],
      ['rate_limits', 'primary'],
      ['primary_window'],
    ]),
    secondary: extractWindow(value, [
      ['rate_limit', 'secondary_window'],
      ['rate_limits', 'secondary'],
      ['secondary_window'],
    ]),
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function earliestDate(values: Array<string | null>) {
  const validDates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, timestamp: Date.parse(value) }))
    .filter((value) => Number.isFinite(value.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);

  return validDates[0]?.value ?? null;
}

function summarizeWindowCollection(
  windows: Array<UsageWindowSummary | null>,
): AggregatedUsageWindowSummary | null {
  const presentWindows = windows.filter(
    (window): window is UsageWindowSummary => window !== null,
  );

  if (presentWindows.length === 0) {
    return null;
  }

  const usedPercentValues = presentWindows
    .map((window) => window.usedPercent)
    .filter((value): value is number => value !== null);

  const limitWindowValues = presentWindows
    .map((window) => window.limitWindowSeconds)
    .filter((value): value is number => value !== null);

  const uniqueLimitWindowValues = [...new Set(limitWindowValues)];

  return {
    accountCount: presentWindows.length,
    usedPercent: average(usedPercentValues),
    limitWindowSeconds:
      limitWindowValues.length === presentWindows.length &&
      uniqueLimitWindowValues.length === 1
        ? uniqueLimitWindowValues[0]
        : null,
    resetAt: earliestDate(presentWindows.map((window) => window.resetAt)),
  };
}

export function summarizeUsageWindows(values: Array<unknown>) {
  const extractedWindows = values.map((value) => extractUsageWindows(value));

  return {
    primary: summarizeWindowCollection(
      extractedWindows.map((windows) => windows.primary),
    ),
    secondary: summarizeWindowCollection(
      extractedWindows.map((windows) => windows.secondary),
    ),
  };
}

export function formatDurationSeconds(value: number | null) {
  if (!value || value <= 0) {
    return 'Unknown window';
  }

  if (value % 86_400 === 0) {
    const days = value / 86_400;
    return `${days}d window`;
  }

  if (value % 3_600 === 0) {
    const hours = value / 3_600;
    return `${hours}h window`;
  }

  if (value % 60 === 0) {
    const minutes = value / 60;
    return `${minutes}m window`;
  }

  return `${value}s window`;
}

export function flattenNumericMetrics(
  value: unknown,
  path: string[] = [],
): Array<{ label: string; value: number }> {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [{ label: path.join(' / ') || 'value', value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenNumericMetrics(item, [...path, String(index + 1)]));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      flattenNumericMetrics(nestedValue, [...path, key]),
    );
  }

  return [];
}

export function titleizeMetric(label: string) {
  return label
    .split('/')
    .map((part) => part.trim())
    .map((part) => part.replace(/[_-]+/g, ' '))
    .map((part) => part.replace(/\b\w/g, (char) => char.toUpperCase()))
    .join(' · ');
}
