import { assign, isContainer } from '../shared/guards.ts';
import type { Flatten, FlattenOptions } from './types.ts';

interface Frame {
  value: Record<string, unknown>;
  keys: string[];
  index: number;
  isArray: boolean;
  path: string | undefined;
  depth: number;
}

/** Escapes `\` and the delimiter inside a single key so `unflatten` can split the path back. */
export function escapeKey(key: string, delimiter: string): string {
  if (!key.includes('\\') && !key.includes(delimiter)) return key;
  return key.split('\\').join('\\\\').split(delimiter).join(`\\${delimiter}`);
}

function validate(delimiter: string, maxDepth: number, escape: boolean, circular: string): void {
  if (typeof delimiter !== 'string' || delimiter === '') throw new TypeError('`delimiter` must be a non-empty string');
  if (escape && delimiter.includes('\\')) throw new RangeError('`delimiter` cannot contain `\\` while `escape` is enabled: it is the escape character');
  if (maxDepth !== Infinity && (!Number.isInteger(maxDepth) || maxDepth < 1)) throw new RangeError('`maxDepth` must be a positive integer or Infinity');
  if (circular !== 'throw' && circular !== 'skip') throw new TypeError("`circular` must be 'throw' or 'skip'");
}

/**
 * Flattens a nested object (or array) into a single-level object whose keys are the paths to each value.
 *
 * Only plain objects and arrays are walked: dates, maps, sets, class instances and any other object are
 * kept as values. The walk uses an explicit stack, so deeply nested input cannot overflow the call stack.
 *
 * @example
 * ```ts
 * import { flatten } from 'flattify';
 *
 * const flat = flatten({ user: { name: 'Ada', tags: ['admin', 'dev'] } });
 * // { 'user.name': 'Ada', 'user.tags.0': 'admin', 'user.tags.1': 'dev' }
 *
 * flatten({ user: { name: 'Ada' } }, { delimiter: '_' });
 * // { user_name: 'Ada' }
 * ```
 *
 * @param input The plain object or array to flatten.
 * @param options See {@link FlattenOptions}.
 * @returns A new object; values are not cloned.
 * @throws {TypeError} If `input` is not a plain object or array, or on a circular reference when `circular` is `'throw'`.
 */
export function flatten<T extends object>(input: T): Flatten<T>;
export function flatten<T extends object, const O extends FlattenOptions>(input: T, options: O): Flatten<T, O>;
export function flatten(input: object, options: FlattenOptions = {}): Record<string, unknown> {
  const { delimiter = '.', maxDepth = Infinity, safe = false, keepEmpty = true, escape = true, circular = 'throw', transformKey, preserve } = options;
  validate(delimiter, maxDepth, escape, circular);
  if (!isContainer(input, safe)) throw new TypeError('flatten() expects a plain object or an array');

  const result: Record<string, unknown> = {};
  // Containers on the current path, to tell a circular reference from the same object reused twice.
  const ancestors = new Set<object>([input]);
  const stack: Frame[] = [{ value: input, keys: Object.keys(input), index: 0, isArray: Array.isArray(input), path: undefined, depth: 1 }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.index === frame.keys.length) {
      stack.pop();
      ancestors.delete(frame.value);
      continue;
    }

    const key = frame.keys[frame.index++];
    const value = frame.value[key];
    let segment = transformKey && !frame.isArray ? transformKey(key) : key;
    if (escape) segment = escapeKey(segment, delimiter);
    const path = frame.path === undefined ? segment : frame.path + delimiter + segment;

    if (isContainer(value, safe) && frame.depth < maxDepth && !(preserve && preserve(path, value))) {
      if (ancestors.has(value)) {
        if (circular === 'throw') throw new TypeError(`Circular reference at "${path}"`);
        continue;
      }
      const keys = Object.keys(value);
      if (keys.length === 0) {
        if (keepEmpty) assign(result, path, value);
        continue;
      }
      ancestors.add(value);
      stack.push({ value, keys, index: 0, isArray: Array.isArray(value), path, depth: frame.depth + 1 });
      continue;
    }

    assign(result, path, value);
  }

  return result;
}
