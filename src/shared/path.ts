/**
 * `true` when joining `key` with the delimiter could be split back differently: the key contains `\`,
 * the delimiter or one of the `extra` characters, or ends like the start of the delimiter so that the two
 * overlap (`'a:' + '::'` → `'a:::'`).
 */
function needsEscape(key: string, delimiter: string, extra: string): boolean {
  if (key.includes('\\') || key.includes(delimiter)) return true;
  for (const char of extra) if (key.includes(char)) return true;
  for (let length = 1; length < delimiter.length; length++) {
    const tail = delimiter.slice(0, length);
    if (key.endsWith(tail) && (tail + delimiter).startsWith(delimiter)) return true;
  }
  return false;
}

/**
 * Escapes a single key so the path can be split back. Keys that are already unambiguous are returned as
 * they are; the others get `\` before every `\`, every first character of the delimiter and every `extra`
 * character (`[` in bracket notation).
 */
export function escapeKey(key: string, delimiter: string, extra = ''): string {
  if (!needsEscape(key, delimiter, extra)) return key;
  const special = `\\${delimiter[0]}${extra}`;
  let escaped = '';
  for (const char of key) escaped += special.includes(char) ? `\\${char}` : char;
  return escaped;
}

/** Splits a path on the delimiter. With `escape`, `\` makes the next character part of the key, reversing `escapeKey`. */
export function splitPath(path: string, delimiter: string, escape: boolean): string[] {
  if (!escape || !path.includes('\\')) return path.split(delimiter);

  const segments: string[] = [];
  let current = '';
  let i = 0;
  while (i < path.length) {
    if (path[i] === '\\' && i + 1 < path.length) {
      current += path[i + 1];
      i += 2;
    } else if (path.startsWith(delimiter, i)) {
      segments.push(current);
      current = '';
      i += delimiter.length;
    } else {
      current += path[i++];
    }
  }
  segments.push(current);
  return segments;
}

/** Canonical array indices (`0`, `1`, `42`, not `01` or `-1`) up to `limit`. */
export function isIndex(segment: string, limit: number): boolean {
  return /^(?:0|[1-9]\d*)$/.test(segment) && Number(segment) <= limit;
}

/**
 * Splits a bracket-notation path: `a.b[0].c` and `a[b][0][c]` (the form-field style) both give
 * `['a', 'b', '0', 'c']`. A `[` without a closing `]` is part of the key.
 */
export function splitBracketPath(path: string, delimiter: string, escape: boolean): string[] {
  const segments: string[] = [];
  let current = '';
  // A key is started by the beginning of the path or a delimiter, so `a.[0]` has an empty key before `[0]`.
  let started = true;
  // Looked up once: searching for `]` at every `[` would be quadratic on hostile input like `a[[[[...`.
  const lastClose = lastUnescapedClose(path, escape);
  let i = 0;
  while (i < path.length) {
    const char = path[i];
    if (escape && char === '\\' && i + 1 < path.length) {
      current += path[i + 1];
      started = true;
      i += 2;
    } else if (char === '[' && i < lastClose) {
      const close = findClose(path, i + 1, escape);
      if (current !== '' || (started && i > 0)) segments.push(current);
      segments.push(unescapeBracket(path.slice(i + 1, close), escape));
      current = '';
      started = false;
      i = close + 1;
      if (path.startsWith(delimiter, i)) {
        started = true;
        i += delimiter.length;
      }
    } else if (path.startsWith(delimiter, i)) {
      segments.push(current);
      current = '';
      started = true;
      i += delimiter.length;
    } else {
      current += char;
      started = true;
      i++;
    }
  }
  if (current !== '' || started) segments.push(current);
  return segments;
}

/** Called only before `lastUnescapedClose`, so a closing `]` is always found. */
function findClose(path: string, from: number, escape: boolean): number {
  let i = from;
  while (path[i] !== ']') i += escape && path[i] === '\\' ? 2 : 1;
  return i;
}

function lastUnescapedClose(path: string, escape: boolean): number {
  if (!escape) return path.lastIndexOf(']');
  let last = -1;
  for (let i = 0; i < path.length; i++) {
    if (path[i] === '\\') i++;
    else if (path[i] === ']') last = i;
  }
  return last;
}

function unescapeBracket(key: string, escape: boolean): string {
  return escape && key.includes('\\') ? key.replace(/\\(.)/g, '$1') : key;
}

/** RFC 6901: `~` is written `~0` and `/` is written `~1`. */
export function escapePointer(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Splits a JSON Pointer (`/a/0/b~1c` → `['a', '0', 'b/c']`). */
export function splitPointer(pointer: string): string[] {
  if (!pointer.startsWith('/')) throw new TypeError(`A JSON Pointer must start with "/", got "${pointer}"`);
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => (segment.includes('~') ? segment.replace(/~1/g, '/').replace(/~0/g, '~') : segment));
}
