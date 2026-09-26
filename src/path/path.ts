import { flatten } from '../flatten/flatten.ts';
import type { Flatten, FlattenOptions } from '../flatten/types.ts';
import { assign, isPlainObject } from '../shared/guards.ts';
import { pathFormat, validateNotation, type PathFormat } from '../shared/notation.ts';
import { escapeKey as escapeDotKey, escapePointer, isIndex } from '../shared/path.ts';
import type { PathContext, Segments } from '../shared/path-types.ts';
import type { Option } from '../shared/types.ts';
import { validate } from '../shared/validate.ts';
import type { Get, Path, PathOptions, SetOptions, SetValue } from './types.ts';

type Target = Record<string, unknown>;

const MISSING: unique symbol = Symbol('missing');
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

const hasOwn = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);
const isTraversable = (value: unknown): value is Target => (typeof value === 'object' && value !== null) || typeof value === 'function';

function formatOf(options: PathOptions): PathFormat {
  const { delimiter = '.', notation = 'dot', escape = true } = options;
  validateNotation(notation);
  if (notation !== 'pointer') validate(delimiter, escape);
  return pathFormat(notation, delimiter, escape);
}

/**
 * Reads `key` of `target`. Plain objects and arrays expose their own keys only, so `'toString'` or
 * `'constructor'` are missing on data; other objects (class instances, dates...) expose inherited
 * properties too, except `__proto__`, `constructor` and `prototype`.
 */
function read(target: Target, key: string): unknown {
  if (isPlainObject(target) || Array.isArray(target)) return hasOwn(target, key) ? target[key] : MISSING;
  if (FORBIDDEN.has(key) && !hasOwn(target, key)) return MISSING;
  return key in target ? target[key] : MISSING;
}

function checkTarget(input: unknown, name: string): void {
  if (!isTraversable(input)) throw new TypeError(`${name}() expects an object or an array`);
}

/**
 * Reads the value at `path`, or `undefined` when a key is missing along the way. The JSON Pointer `''`
 * is `obj` itself.
 *
 * The path is autocompleted and the result typed from `obj`. Plain objects and arrays are read through
 * their own keys only: `get({}, 'constructor')` is `undefined`.
 *
 * @example
 * ```ts
 * import { get } from 'flattify/path';
 *
 * const order = { items: [{ sku: 'A1', qty: 2 }] };
 * get(order, 'items.0.sku'); // 'A1', typed string | undefined
 * get(order, '/items/0/qty', { notation: 'pointer' }); // 2
 * ```
 */
export function get<T extends object, P extends Path<T>>(obj: T, path: P): Get<T, P>;
/**
 * Reads the value at `path`, written in another `delimiter` or `notation`.
 *
 * @example
 * ```ts
 * get(order, '/items/0/sku', { notation: 'pointer' }); // 'BOOK-1'
 * ```
 */
export function get<T extends object, P extends Path<T, O>, const O extends PathOptions>(obj: T, path: P, options: O): Get<T, P, O>;
/**
 * Reads the value at a path only known at runtime, such as one coming from user input: the result is
 * `unknown`.
 *
 * @example
 * ```ts
 * const value = get(data, error.instancePath, { notation: 'pointer' }); // unknown
 * ```
 */
export function get(obj: object, path: string, options?: PathOptions): unknown;
export function get(obj: object, path: string, options: PathOptions = {}): unknown {
  checkTarget(obj, 'get');
  let current: unknown = obj;
  for (const key of formatOf(options).split(path)) {
    if (!isTraversable(current)) return undefined;
    current = read(current, key);
    if (current === MISSING) return undefined;
  }
  return current;
}

/**
 * `true` when every key of `path` exists, even if the value there is `undefined`.
 *
 * @example
 * ```ts
 * has({ a: { b: undefined } }, 'a.b'); // true
 * has({ a: {} }, 'a.b'); // false
 * ```
 */
export function has<T extends object, O extends PathOptions = {}>(obj: T, path: Path<T, O> | (string & {}), options?: O): boolean;
export function has(obj: object, path: string, options: PathOptions = {}): boolean {
  checkTarget(obj, 'has');
  let current: unknown = obj;
  for (const key of formatOf(options).split(path)) {
    if (!isTraversable(current)) return false;
    current = read(current, key);
    if (current === MISSING) return false;
  }
  return true;
}

/**
 * Sets the value at `path`, creating the missing objects (or arrays, for index keys) along the way, and
 * returns `obj`, which is modified. The value is type-checked against the path.
 *
 * Paths with a `__proto__` segment are ignored; other keys are only ever created as own properties, so
 * no path reaches `Object.prototype`.
 *
 * @example
 * ```ts
 * import { set } from 'flattify/path';
 *
 * const config: { db: { port: number } } = { db: { port: 5432 } };
 * set(config, 'db.port', 6543);
 * set(config, 'db.port', '6543'); // type error: string is not number
 * ```
 */
export function set<T extends object, P extends Path<T>>(obj: T, path: P, value: SetValue<T, P>): T;
/**
 * Sets the value at `path`, written in another `delimiter` or `notation`, or with `object` and
 * `arrayLimit` to choose what is created for missing keys.
 *
 * @example
 * ```ts
 * set(config, 'db__port', 6543, { delimiter: '__' });
 * ```
 */
export function set<T extends object, P extends Path<T, O>, const O extends SetOptions>(obj: T, path: P, value: SetValue<T, P, O>, options: O): T;
export function set(obj: object, path: string, value: unknown, options: SetOptions = {}): object {
  checkTarget(obj, 'set');
  const { object = false, arrayLimit = 1000 } = options;
  if (arrayLimit !== Infinity && (!Number.isInteger(arrayLimit) || arrayLimit < 0)) throw new RangeError('`arrayLimit` must be a non-negative integer or Infinity');
  const segments = formatOf(options).split(path);
  if (segments.length === 0) throw new TypeError('set() cannot replace the whole object: the JSON Pointer "" has no key');
  if (segments.includes('__proto__')) return obj;

  let target = obj as Target;
  for (let i = 0; i < segments.length - 1; i++) {
    const child = read(target, segments[i]);
    if (isTraversable(child)) {
      target = child;
    } else {
      const next: Target = !object && isIndex(segments[i + 1], arrayLimit) ? ([] as unknown as Target) : {};
      assign(target, segments[i], next);
      target = next;
    }
  }
  assign(target, segments[segments.length - 1], value);
  return obj;
}

/**
 * Deletes the key at `path` and returns `true`, or `false` when there was nothing to delete. Array
 * elements are deleted in place, leaving a hole, as `delete` does.
 *
 * @example
 * ```ts
 * const user = { name: 'Ada', password: 'secret' };
 * del(user, 'password'); // true, user is { name: 'Ada' }
 * ```
 */
export function del<T extends object, O extends PathOptions = {}>(obj: T, path: Path<T, O> | (string & {}), options?: O): boolean;
export function del(obj: object, path: string, options: PathOptions = {}): boolean {
  checkTarget(obj, 'del');
  const segments = formatOf(options).split(path);
  if (segments.length === 0) return false;
  let target: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (!isTraversable(target)) return false;
    target = read(target, segments[i]);
  }
  const last = segments[segments.length - 1];
  if (!isTraversable(target) || !hasOwn(target, last)) return false;
  return delete target[last];
}

/**
 * The path of every value `flatten` would produce, in the same order.
 *
 * @example
 * ```ts
 * paths({ user: { name: 'Ada', tags: ['admin'] } });
 * // ['user.name', 'user.tags.0']
 * ```
 */
export function paths<T extends object>(obj: T): Extract<keyof Flatten<T>, string>[];
/**
 * The paths `flatten(obj, options)` produces, with the same options.
 *
 * @example
 * ```ts
 * paths({ user: { tags: ['admin'] } }, { notation: 'bracket' }); // ['user.tags[0]']
 * ```
 */
export function paths<T extends object, const O extends FlattenOptions>(obj: T, options: O): Extract<keyof Flatten<T, O>, string>[];
export function paths(obj: object, options: FlattenOptions = {}): string[] {
  return Object.keys(flatten(obj, options));
}

type ContextOf<O> = { delimiter: Option<O, 'delimiter', '.'>; notation: Option<O, 'notation', 'dot'>; escape: Option<O, 'escape', true> };
type ParsedPath<P extends string, O> = string extends P ? string[] : ContextOf<O> extends infer C extends PathContext ? (string extends C['delimiter'] ? string[] : Segments<P, C>) : string[];

/**
 * Splits a path into its keys, reading escapes and brackets.
 *
 * @example
 * ```ts
 * parsePath('user.tags.0'); // ['user', 'tags', '0']
 * parsePath('a\\.b.c'); // ['a.b', 'c']
 * parsePath('items[0][id]', { notation: 'bracket' }); // ['items', '0', 'id']
 * ```
 */
export function parsePath<const P extends string, const O extends PathOptions = {}>(path: P, options?: O): ParsedPath<P, O>;
export function parsePath(path: string, options: PathOptions = {}): string[] {
  return formatOf(options).split(path);
}

/**
 * Joins keys into a path, escaping them when needed: the reverse of `parsePath`. In bracket notation,
 * keys that are array indices are written between brackets.
 *
 * @example
 * ```ts
 * stringifyPath(['user', 'first.name']); // 'user.first\\.name'
 * stringifyPath(['items', '0', 'id'], { notation: 'bracket' }); // 'items[0].id'
 * stringifyPath(['a/b', 'c'], { notation: 'pointer' }); // '/a~1b/c'
 * ```
 */
export function stringifyPath(keys: readonly (string | number)[], options: PathOptions = {}): string {
  const format = formatOf(options);
  const bracket = options.notation === 'bracket';
  let path: string | undefined;
  for (const key of keys) path = format.join(path, String(key), bracket && isIndex(String(key), Infinity));
  return path ?? '';
}

/**
 * Escapes a single key so it can be put in a path as it is.
 *
 * @example
 * ```ts
 * `user.${escapeKey('first.name')}`; // 'user.first\\.name'
 * escapeKey('a/b', { notation: 'pointer' }); // 'a~1b'
 * ```
 */
export function escapeKey(key: string, options: PathOptions = {}): string {
  const { delimiter = '.', notation = 'dot' } = options;
  formatOf(options);
  if (notation === 'pointer') return escapePointer(key);
  return escapeDotKey(key, delimiter, notation === 'bracket' ? '[' : '');
}
