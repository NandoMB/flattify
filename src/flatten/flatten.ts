import { assign, isContainer } from '../shared/guards.ts';
import { pathFormat, validateNotation } from '../shared/notation.ts';
import { validate } from '../shared/validate.ts';
import type { Flatten, FlattenOptions } from './types.ts';

/** An object or array being walked: its keys, the next one to visit, and its path. */
interface Frame {
  value: Record<string, unknown>;
  keys: string[];
  index: number;
  isArray: boolean;
  path: string | undefined;
  depth: number;
}

function frame(value: Record<string, unknown>, path: string | undefined, depth: number): Frame {
  return { value, keys: Object.keys(value), index: 0, isArray: Array.isArray(value), path, depth };
}

function validateWalk(maxDepth: number, circular: string): void {
  if (maxDepth !== Infinity && (!Number.isInteger(maxDepth) || maxDepth < 1)) throw new RangeError('`maxDepth` must be a positive integer or Infinity');
  if (circular !== 'throw' && circular !== 'skip') throw new TypeError("`circular` must be 'throw' or 'skip'");
}

/**
 * Flattens a nested object (or array) into a single-level object whose keys are the paths to each value.
 *
 * Only plain objects and arrays are walked: dates, maps, sets, class instances and any other object are
 * kept as values. The walk uses an explicit stack instead of recursion, so deeply nested input cannot
 * overflow the call stack.
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
 *
 * flatten({ items: [{ id: 1 }] }, { notation: 'bracket' });
 * // { 'items[0].id': 1 }
 *
 * flatten({ items: [{ id: 1 }] }, { notation: 'pointer' });
 * // { '/items/0/id': 1 }
 * ```
 *
 * @param input The plain object or array to flatten.
 * @param options See {@link FlattenOptions}.
 * @returns A new object; values are not cloned.
 * @throws {TypeError} If `input` is not a plain object or array, or on a circular reference when `circular` is `'throw'`.
 */
export function flatten<T extends object>(input: T): Flatten<T>;
/**
 * Flattens `input` with options: the keys of the result follow `delimiter`, `notation`, `maxDepth`...
 *
 * @example
 * ```ts
 * flatten({ db: { host: 'localhost' } }, { delimiter: '__' });
 * // { db__host: 'localhost' }
 * ```
 */
export function flatten<T extends object, const O extends FlattenOptions>(input: T, options: O): Flatten<T, O>;
export function flatten(input: object, options: FlattenOptions = {}): Record<string, unknown> {
  const { delimiter = '.', notation = 'dot', maxDepth = Infinity, safe = false, keepEmpty = true, escape = true, circular = 'throw', transformKey, preserve } = options;
  validateNotation(notation);
  if (notation !== 'pointer') validate(delimiter, escape);
  validateWalk(maxDepth, circular);
  if (!isContainer(input, safe)) throw new TypeError('flatten() expects a plain object or an array');
  const { join } = pathFormat(notation, delimiter, escape);

  const result: Record<string, unknown> = {};
  // Containers on the current path, to tell a circular reference from the same object reused twice.
  const ancestors = new Set<object>([input]);
  const stack: Frame[] = [frame(input, undefined, 1)];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    if (current.index === current.keys.length) {
      stack.pop();
      ancestors.delete(current.value);
      continue;
    }

    const key = current.keys[current.index++];
    const value = current.value[key];
    const path = join(current.path, transformKey && !current.isArray ? transformKey(key) : key, current.isArray);

    if (isContainer(value, safe) && current.depth < maxDepth && !(preserve && preserve(path, value))) {
      if (ancestors.has(value)) {
        if (circular === 'throw') throw new TypeError(`Circular reference at "${path}"`);
        continue;
      }
      const child = frame(value, path, current.depth + 1);
      if (child.keys.length === 0) {
        // An empty object or array is a value of its own.
        if (keepEmpty) assign(result, path, value);
        continue;
      }
      ancestors.add(value);
      stack.push(child);
      continue;
    }

    assign(result, path, value);
  }

  return result;
}
