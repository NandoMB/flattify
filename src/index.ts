/**
 * Flatten and unflatten nested objects, with the resulting keys inferred by TypeScript.
 *
 * @example
 * ```ts
 * import { flatten } from 'flattify';
 *
 * const flat = flatten({ user: { name: 'Ada', tags: ['admin'] } });
 * // { 'user.name': 'Ada', 'user.tags.0': 'admin' }
 * ```
 *
 * @module
 */

export * from './flatten/index.ts';
export type { Prettify } from './shared/types.ts';
