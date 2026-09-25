/**
 * Read and write nested values by path, with autocompleted paths and typed values.
 *
 * @example
 * ```ts
 * import { get, set } from 'flattify/path';
 *
 * const config = { db: { host: 'localhost', port: 5432 } };
 * get(config, 'db.port'); // 5432, typed number
 * set(config, 'db.host', 'db.internal');
 * ```
 *
 * @module
 */

export { del, escapeKey, get, has, parsePath, paths, set, stringifyPath } from './path.ts';
export type { Get, Path, PathOptions, SetOptions, SetValue } from './types.ts';
export type { Notation } from '../shared/notation.ts';
