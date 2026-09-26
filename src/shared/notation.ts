import { escapePointer, keyEscaper, splitBracketPath, splitPath, splitPointer } from './path.ts';

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

const formats = new Map<string, PathFormat>();

/** The path format for these options, built once and reused: most calls use the same few options. */
export function pathFormat(notation: Notation, delimiter: string, escape: boolean): PathFormat {
  const cacheKey = `${notation}${escape ? 1 : 0}${delimiter}`;
  let format = formats.get(cacheKey);
  if (format === undefined) {
    // Bounded, in case delimiters are generated dynamically.
    if (formats.size >= 64) formats.clear();
    format = createPathFormat(notation, delimiter, escape);
    formats.set(cacheKey, format);
  }
  return format;
}

function createPathFormat(notation: Notation, delimiter: string, escape: boolean): PathFormat {
  if (notation === 'pointer') {
    return {
      join: (path, key) => `${path ?? ''}/${escapePointer(key)}`,
      split: splitPointer,
    };
  }
  const bracket = notation === 'bracket';
  const escapeKey = escape ? keyEscaper(delimiter, bracket ? '[' : '') : undefined;
  return {
    join: (path, key, isIndex) => {
      if (bracket && isIndex) return `${path ?? ''}[${key}]`;
      const segment = escapeKey ? escapeKey(key) : key;
      return path === undefined ? segment : path + delimiter + segment;
    },
    split: notation === 'bracket' ? (path) => splitBracketPath(path, delimiter, escape) : (path) => splitPath(path, delimiter, escape),
  };
}
