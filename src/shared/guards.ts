/**
 * Plain objects are the ones created by `{}`, `Object.create(null)` or `JSON.parse`, including those
 * from another realm (iframe, `vm`): their prototype is `null` or a root prototype. Dates, maps, class
 * instances and every other object are treated as values.
 */
export function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null) return false;
  const proto: unknown = Object.getPrototypeOf(input);
  return proto === Object.prototype || proto === null || Object.getPrototypeOf(proto) === null;
}

/** Plain objects, and arrays unless `safe` keeps them as values. */
export function isContainer(input: unknown, safe: boolean): input is Record<string, unknown> {
  return Array.isArray(input) ? !safe : isPlainObject(input);
}

/**
 * Sets an own enumerable property. A plain assignment of `__proto__` would change the prototype of
 * `target` instead of creating a key.
 */
export function assign(target: Record<string, unknown>, key: string, value: unknown): void {
  if (key === '__proto__') Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
  else target[key] = value;
}
