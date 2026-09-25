export function validate(delimiter: string, escape: boolean): void {
  if (typeof delimiter !== 'string' || delimiter === '') throw new TypeError('`delimiter` must be a non-empty string');
  if (escape && delimiter.includes('\\')) throw new RangeError('`delimiter` cannot contain `\\` while `escape` is enabled: it is the escape character');
}
