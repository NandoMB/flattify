import { assign, isContainer, isPlainObject } from '../shared/guards.ts';
import { isIndex, splitPath } from '../shared/path.ts';
import type { Unflatten, UnflattenOptions } from './types.ts';

type Container = Record<string, unknown>;

const hasOwn = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);

function validate(delimiter: string, escape: boolean, arrayLimit: number): void {
  if (typeof delimiter !== 'string' || delimiter === '') throw new TypeError('`delimiter` must be a non-empty string');
  if (escape && delimiter.includes('\\')) throw new RangeError('`delimiter` cannot contain `\\` while `escape` is enabled: it is the escape character');
  if (arrayLimit !== Infinity && (!Number.isInteger(arrayLimit) || arrayLimit < 0)) throw new RangeError('`arrayLimit` must be a non-negative integer or Infinity');
}

/**
 * Walks from `parent` into `key`, creating the object when it is missing. Returns `undefined` when a
 * value that is not an object or array is in the way and `overwrite` is off.
 */
function descend(parent: Container, key: string, overwrite: boolean, owned: WeakSet<object>): Container | undefined {
  // Own properties only: `constructor` or `toString` must not resolve to what `Object.prototype` inherits.
  const current = hasOwn(parent, key) ? parent[key] : undefined;
  if (typeof current === 'object' && current !== null && owned.has(current)) return current as Container;
  if (current !== undefined && !isContainer(current, false) && !overwrite) return undefined;

  const next: Container = {};
  // An object or array coming from the input is copied before new keys go in, never modified.
  if (isContainer(current, false)) for (const k of Object.keys(current)) assign(next, k, current[k]);
  owned.add(next);
  assign(parent, key, next);
  return next;
}

/** Turns the objects built by `unflatten` whose keys are all array indices into arrays. */
function restoreArrays(root: Container, arrayLimit: number, owned: WeakSet<object>): void {
  const stack: Container[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Container;
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (typeof child !== 'object' || child === null || !owned.has(child)) continue;
      const keys = Object.keys(child);
      let next = child as Container;
      if (keys.length > 0 && keys.every((k) => isIndex(k, arrayLimit))) {
        const array: unknown[] = [];
        for (const k of keys) array[Number(k)] = (child as Container)[k];
        next = array as unknown as Container;
        node[key] = array;
      }
      stack.push(next);
    }
  }
}

/**
 * Rebuilds a nested object from a flat object whose keys are paths: the reverse of `flatten`.
 *
 * Safe on untrusted input (form fields, query strings, JSON bodies): keys are only ever created as own
 * properties, so no path, including `__proto__`, `constructor` or `prototype`, can reach
 * `Object.prototype`. Paths with a `__proto__` segment are skipped.
 *
 * @example
 * ```ts
 * import { unflatten } from 'flattify';
 *
 * unflatten({ 'user.name': 'Ada', 'user.tags.0': 'admin' });
 * // { user: { name: 'Ada', tags: ['admin'] } }
 *
 * // Form fields named `address.city`, `address.zip`...
 * const body = unflatten(Object.fromEntries(new FormData(form)));
 *
 * // Back to the array given to `flatten`
 * unflatten({ '0.id': 1, '1.id': 2 }, { asArray: true });
 * // [{ id: 1 }, { id: 2 }]
 * ```
 *
 * @param input A flat object, such as the one returned by `flatten`.
 * @param options See {@link UnflattenOptions}.
 * @returns A new object (an array with `asArray`). Objects and arrays found in `input` are copied before keys are added to them.
 * @throws {TypeError} If `input` is not a plain object, or with `asArray` when a top-level key is not an array index.
 */
export function unflatten<T extends object>(input: T): Unflatten<T>;
export function unflatten<T extends object, const O extends UnflattenOptions>(input: T, options: O): Unflatten<T, O>;
export function unflatten(input: object, options: UnflattenOptions = {}): Record<string, unknown> | unknown[] {
  const { delimiter = '.', object = false, overwrite = false, escape = true, arrayLimit = 1000, asArray = false, transformKey } = options;
  validate(delimiter, escape, arrayLimit);
  if (!isPlainObject(input)) throw new TypeError('unflatten() expects a plain object');

  const result: Container = {};
  // Objects created here, as opposed to objects that came in as values and must not be modified.
  const owned = new WeakSet<object>([result]);

  entries: for (const key of Object.keys(input)) {
    const segments = splitPath(key, delimiter, escape);
    if (segments.includes('__proto__')) continue;
    if (transformKey) {
      for (let i = 0; i < segments.length; i++) if (!isIndex(segments[i], Infinity)) segments[i] = transformKey(segments[i]);
    }

    let target = result;
    for (let i = 0; i < segments.length - 1; i++) {
      const next = descend(target, segments[i], overwrite, owned);
      if (next === undefined) continue entries;
      target = next;
    }

    const last = segments[segments.length - 1];
    const value = input[key];
    const current = hasOwn(target, last) ? target[last] : undefined;
    // An empty object or array (kept by `flatten`) never replaces keys that were already set below it.
    const isEmpty = isContainer(value, false) && Object.keys(value).length === 0;
    if (isContainer(current, false) && (isEmpty || !overwrite)) continue;
    assign(target, last, value);
  }

  if (!object) restoreArrays(result, arrayLimit, owned);
  return asArray ? toRootArray(result, arrayLimit) : result;
}

/** `asArray`: the top-level keys are the indices of the array, as written by `flatten(array)`. */
function toRootArray(result: Container, arrayLimit: number): unknown[] {
  const array: unknown[] = [];
  for (const key of Object.keys(result)) {
    if (!isIndex(key, arrayLimit)) throw new TypeError(`\`asArray\` expects every top-level key to be an array index up to \`arrayLimit\`, got "${key}"`);
    array[Number(key)] = result[key];
  }
  return array;
}
