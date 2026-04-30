type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const isObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function mergeValues(values: JsonValue[]): JsonValue {
  const filtered = values.filter((value) => value !== null);
  if (filtered.length === 0) {
    return null;
  }

  if (filtered.every((value) => typeof value === 'number')) {
    return filtered.reduce((sum, value) => sum + value, 0);
  }

  if (filtered.every((value) => Array.isArray(value))) {
    const arrays = filtered as JsonValue[][];
    const maxLength = Math.max(...arrays.map((array) => array.length));
    return Array.from({ length: maxLength }, (_, index) =>
      mergeValues(arrays.map((array) => array[index] ?? null)),
    );
  }

  if (filtered.every((value) => isObject(value))) {
    const keys = [...new Set(filtered.flatMap((value) => Object.keys(value)))];
    return Object.fromEntries(
      keys.map((key) => [
        key,
        mergeValues(
          filtered.map(
            (value) => (value as Record<string, JsonValue>)[key] ?? null,
          ),
        ),
      ]),
    );
  }

  const unique = [
    ...new Set(filtered.map((value) => JSON.stringify(value))),
  ].map((value) => JSON.parse(value) as JsonValue);
  return unique.length === 1 ? unique[0] : unique[0];
}

export function aggregateUsagePayloads(
  payloads: Array<Record<string, unknown> | null | undefined>,
) {
  const normalized = payloads.filter(Boolean) as Array<Record<string, unknown>>;

  if (normalized.length === 0) {
    return null;
  }

  return mergeValues(normalized as JsonValue[]) as Record<string, unknown>;
}
