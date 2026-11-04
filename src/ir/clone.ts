/**
 * Deep copy for IR and symbol data: plain objects, arrays and primitives
 * (including bigint literals). Several times faster than `structuredClone`,
 * which matters on the watch-mode replay path. IR is an acyclic tree, so no
 * identity map is kept; shared subtrees are duplicated, which is harmless for
 * values that are only ever read or rewritten in place.
 */
export function cloneData<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (let index = 0; index < value.length; index++) copy[index] = cloneData(value[index]);
    return copy as T;
  }
  const source = value as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const key in source) copy[key] = cloneData(source[key]);
  return copy as T;
}
