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
