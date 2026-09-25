import { escapeKey, escapePointer, splitBracketPath, splitPath, splitPointer } from './path.ts';

/**
 * How paths are written:
 * - `'dot'`: `items.0.id`
 * - `'bracket'`: `items[0].id`, array indices between brackets
 * - `'pointer'`: `/items/0/id`, a JSON Pointer (RFC 6901); `delimiter` and `escape` do not apply
 */
export type Notation = 'dot' | 'bracket' | 'pointer';

export interface PathFormat {
  /** Appends `key` to `path` (`undefined` at the top level). `isIndex` is `true` for array elements. */
  join(path: string | undefined, key: string, isIndex: boolean): string;
  split(path: string): string[];
}

export function validateNotation(notation: string): void {
  if (notation !== 'dot' && notation !== 'bracket' && notation !== 'pointer') throw new TypeError("`notation` must be 'dot', 'bracket' or 'pointer'");
}

export function pathFormat(notation: Notation, delimiter: string, escape: boolean): PathFormat {
  if (notation === 'pointer') {
    return {
      join: (path, key) => `${path ?? ''}/${escapePointer(key)}`,
      split: splitPointer,
    };
  }
  const extra = notation === 'bracket' ? '[' : '';
  return {
    join: (path, key, isIndex) => {
      if (isIndex && notation === 'bracket') return `${path ?? ''}[${key}]`;
      const segment = escape ? escapeKey(key, delimiter, extra) : key;
      return path === undefined ? segment : path + delimiter + segment;
    },
    split: notation === 'bracket' ? (path) => splitBracketPath(path, delimiter, escape) : (path) => splitPath(path, delimiter, escape),
  };
}
