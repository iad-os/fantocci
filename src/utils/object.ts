/** Return a shallow copy of `source` without the listed keys. */
export function omit<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> {
  const result = {
    ...source,
  };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/** Return a shallow copy of `source` without the keys whose value is `undefined`. */
export function compact<T extends object>(source: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(source) as [
    keyof T,
    T[keyof T],
  ][]) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
