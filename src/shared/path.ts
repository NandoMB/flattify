/**
 * `true` when joining `key` with the delimiter could be split back differently: the key contains `\` or
 * the delimiter, or ends like the start of the delimiter so that the two overlap (`'a:' + '::'` → `'a:::'`).
 */
function needsEscape(key: string, delimiter: string): boolean {
  if (key.includes('\\') || key.includes(delimiter)) return true;
  for (let length = 1; length < delimiter.length; length++) {
    const tail = delimiter.slice(0, length);
    if (key.endsWith(tail) && (tail + delimiter).startsWith(delimiter)) return true;
  }
  return false;
}

/**
 * Escapes a single key so the path can be split back. Keys that are already unambiguous are returned as
 * they are; the others get `\` before every `\` and every first character of the delimiter.
 */
export function escapeKey(key: string, delimiter: string): string {
  if (!needsEscape(key, delimiter)) return key;
  const first = delimiter[0];
  let escaped = '';
  for (const char of key) escaped += char === '\\' || char === first ? `\\${char}` : char;
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
