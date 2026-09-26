import { assign, isContainer, isPlainObject } from '../shared/guards.ts';
import { pathFormat, validateNotation } from '../shared/notation.ts';
import { isIndex } from '../shared/path.ts';
import { validate } from '../shared/validate.ts';
import type { Unflatten, UnflattenOptions } from './types.ts';

type Container = Record<string, unknown>;

const hasOwn = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);

function validateArrayLimit(arrayLimit: number): void {
  if (arrayLimit !== Infinity && (!Number.isInteger(arrayLimit) || arrayLimit < 0)) throw new RangeError('`arrayLimit` must be a non-negative integer or Infinity');
}

/** An object built for a key followed by an array index (`list` for `'list.0'`): it may become an array. */
type Candidate = [parent: Container, key: string, object: Container];

/**
 * Walks from `parent` into `key`, creating the object when it is missing. Returns `undefined` when a
 * value that is not an object or array is in the way and `overwrite` is off.
 *
 * `owned` holds the objects built by `unflatten`. Objects and arrays that came in as values of `input`
 * are not in it: they are copied before new keys go in, never modified.
 */
function descend(parent: Container, key: string, overwrite: boolean, owned: Set<object>, candidates: Candidate[] | undefined): Container | undefined {
  // Own properties only: `constructor` or `toString` must not resolve to what `Object.prototype` inherits.
  const current = hasOwn(parent, key) ? parent[key] : undefined;
  if (isContainer(current, false) && owned.has(current)) return current;
  if (current !== undefined && !isContainer(current, false) && !overwrite) return undefined;

  const next: Container = {};
  if (isContainer(current, false)) for (const k of Object.keys(current)) assign(next, k, current[k]);
  owned.add(next);
  assign(parent, key, next);
  candidates?.push([parent, key, next]);
  return next;
}

/**
 * Turns the candidates whose keys are all array indices into arrays. They are visited from the last one
 * built, so nested arrays are in place before the object that holds them is converted.
 */
function restoreArrays(candidates: Candidate[], arrayLimit: number): void {
  for (let c = candidates.length - 1; c >= 0; c--) {
    const [parent, key, object] = candidates[c];
    // Replaced by a later key with `overwrite`.
    if (parent[key] !== object) continue;
    const keys = Object.keys(object);
    if (!keys.every((k) => isIndex(k, arrayLimit))) continue;
    const array: unknown[] = [];
    for (const k of keys) array[Number(k)] = object[k];
    parent[key] = array;
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
 * // Form-field style names, or JSON Pointers
 * unflatten({ 'user[name]': 'Ada', 'user[tags][0]': 'admin' }, { notation: 'bracket' });
 * unflatten({ '/user/name': 'Ada' }, { notation: 'pointer' });
 *
 * // Back to the array given to `flatten`
 * unflatten({ '0.id': 1, '1.id': 2 }, { asArray: true });
 * // [{ id: 1 }, { id: 2 }]
 * ```
 *
 * @param input A flat object, such as the one returned by `flatten`.
 * @param options See {@link UnflattenOptions}.
 * @returns A new object (an array with `asArray`). Objects and arrays found in `input` are copied before keys are added to them.
 * @throws {TypeError} If `input` is not a plain object, with `asArray` when a top-level key is not an array index, or with the `'pointer'` notation when a key does not start with `/`.
 */
export function unflatten<T extends object>(input: T): Unflatten<T>;
export function unflatten<T extends object, const O extends UnflattenOptions>(input: T, options: O): Unflatten<T, O>;
export function unflatten(input: object, options: UnflattenOptions = {}): Record<string, unknown> | unknown[] {
  const { delimiter = '.', notation = 'dot', object = false, overwrite = false, escape = true, arrayLimit = 1000, asArray = false, transformKey } = options;
  validateNotation(notation);
  if (notation !== 'pointer') validate(delimiter, escape);
  validateArrayLimit(arrayLimit);
  const { split } = pathFormat(notation, delimiter, escape);
  if (!isPlainObject(input)) throw new TypeError('unflatten() expects a plain object');

  const result: Container = {};
  const owned = new Set<object>([result]);
  const candidates: Candidate[] | undefined = object ? undefined : [];

  entries: for (const key of Object.keys(input)) {
    const segments = split(key);
    if (segments.length === 0) throw new TypeError('The JSON Pointer "" (the whole document) cannot be a key of a flat object');
    if (segments.includes('__proto__')) continue;
    if (transformKey) {
      for (let i = 0; i < segments.length; i++) if (!isIndex(segments[i], Infinity)) segments[i] = transformKey(segments[i]);
    }

    let target = result;
    for (let i = 0; i < segments.length - 1; i++) {
      const next = descend(target, segments[i], overwrite, owned, candidates && isIndex(segments[i + 1], arrayLimit) ? candidates : undefined);
      if (next === undefined) continue entries;
      target = next;
    }

    const last = segments[segments.length - 1];
    const value = input[key];
    const current = hasOwn(target, last) ? target[last] : undefined;
    // Keys already set below this path are kept, unless `overwrite` replaces them with this value. An
    // empty object or array (kept by `flatten`) never replaces them.
    const isEmpty = isContainer(value, false) && Object.keys(value).length === 0;
    if (isContainer(current, false) && (!overwrite || isEmpty)) continue;
    assign(target, last, value);
  }

  if (candidates) restoreArrays(candidates, arrayLimit);
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
