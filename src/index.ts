/**
 * Flatten and unflatten nested objects, with the resulting keys inferred by TypeScript.
 *
 * @example
 * ```ts
 * import { flatten, unflatten } from 'flattify';
 *
 * const flat = flatten({ user: { name: 'Ada', tags: ['admin'] } });
 * // { 'user.name': 'Ada', 'user.tags.0': 'admin' }
 *
 * unflatten(flat);
 * // { user: { name: 'Ada', tags: ['admin'] } }
 * ```
 *
 * @module
 */

export * from './flatten/index.ts';
export * from './unflatten/index.ts';
export type { Notation } from './shared/notation.ts';
export type { Prettify } from './shared/types.ts';
