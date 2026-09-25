import { describe, expect, test } from 'vitest';
import { escapeKey, escapePointer, isIndex, splitBracketPath, splitPath, splitPointer } from './path.ts';

describe('escapeKey', () => {
  test.each([
    ['plain', 'plain'],
    ['a.b', 'a\\.b'],
    ['a\\b', 'a\\\\b'],
    ['a\\.b', 'a\\\\\\.b'],
  ])('Should escape %j as %j', (key, expected) => {
    expect(escapeKey(key, '.')).toBe(expected);
  });

  test.each([
    ['MAX_CONN', '__', 'MAX_CONN'],
    ['a__b', '__', 'a\\_\\_b'],
    ['MAX_', '__', 'MAX\\_'],
    [':', '::', '\\:'],
    ['a:b', '::', 'a:b'],
    ['xab', 'ab', 'x\\ab'],
    ['xa', 'ab', 'xa'],
    ['ab', 'aba', '\\ab'],
    ['xab', 'aba', 'x\\ab'],
  ])('Should escape %j for the %j delimiter as %j', (key, delimiter, expected) => {
    expect(escapeKey(key, delimiter)).toBe(expected);
    expect(splitPath(`${escapeKey(key, delimiter)}${delimiter}next`, delimiter, true)).toEqual([key, 'next']);
  });
});

describe('splitPath', () => {
  test.each([
    ['a.b.c', '.', ['a', 'b', 'c']],
    ['a', '.', ['a']],
    ['', '.', ['']],
    ['a..b', '.', ['a', '', 'b']],
    ['a\\.b.c', '.', ['a.b', 'c']],
    ['a\\\\.b', '.', ['a\\', 'b']],
    ['a\\x', '.', ['ax']],
    ['a\\', '.', ['a\\']],
    ['a\\::b::c', '::', ['a::b', 'c']],
    ['\\:::::x', '::', [':', '', 'x']],
  ])('Should split %j on %j', (path, delimiter, expected) => {
    expect(splitPath(path, delimiter, true)).toEqual(expected);
  });

  test.each(['.', '::', '__', 'ab', 'aba'])('Should reverse escapeKey for the %j delimiter', (delimiter) => {
    const keys = ['a.b', 'c\\d', '\\', '..', 'plain', '', ':', '::', ':::', '_', 'a_', 'ab', 'aba', 'xab', 'b'];
    expect(splitPath(keys.map((key) => escapeKey(key, delimiter)).join(delimiter), delimiter, true)).toEqual(keys);
  });

  test('Should split on every delimiter when escape is off', () => {
    expect(splitPath('a\\.b', '.', false)).toEqual(['a\\', 'b']);
  });
});

describe('isIndex', () => {
  test.each([
    ['0', true],
    ['42', true],
    ['1000', true],
    ['1001', false],
    ['01', false],
    ['-1', false],
    ['1.5', false],
    ['1e3', false],
    ['', false],
    ['a', false],
  ])('Should tell whether %j is an index up to 1000', (segment, expected) => {
    expect(isIndex(segment, 1000)).toBe(expected);
  });
});

describe('splitBracketPath', () => {
  test.each([
    ['a.b[0].c', ['a', 'b', '0', 'c']],
    ['a[b][0][c]', ['a', 'b', '0', 'c']],
    ['[0].id', ['0', 'id']],
    ['[0][1]', ['0', '1']],
    ['a[0]', ['a', '0']],
    ['a.[0]', ['a', '', '0']],
    ['a[0]b', ['a', '0', 'b']],
    ['a[]', ['a', '']],
    ['a', ['a']],
    ['', ['']],
    ['a.', ['a', '']],
    ['a[0', ['a[0']],
    ['a]b', ['a]b']],
    ['a\\[0]', ['a[0]']],
    ['a\\.b[0]', ['a.b', '0']],
    ['a[x\\]y]', ['a', 'x]y']],
    ['a[x\\]', ['a[x]']],
  ])('Should split %j', (path, expected) => {
    expect(splitBracketPath(path, '.', true)).toEqual(expected);
  });

  test('Should use any delimiter', () => {
    expect(splitBracketPath('a::b[0]::c', '::', true)).toEqual(['a', 'b', '0', 'c']);
  });

  test('Should read `\\` as a character when escape is off', () => {
    expect(splitBracketPath('a\\[0]', '.', false)).toEqual(['a\\', '0']);
    expect(splitBracketPath('a[x\\]', '.', false)).toEqual(['a', 'x\\']);
  });

  test('Should stay linear on hostile input', () => {
    const path = `${'['.repeat(200_000)}]`;
    const start = performance.now();
    splitBracketPath(path, '.', true);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe('JSON Pointer', () => {
  test.each([
    ['a/b', 'a~1b'],
    ['m~n', 'm~0n'],
    ['~1', '~01'],
    ['plain', 'plain'],
  ])('Should escape %j as %j', (key, expected) => {
    expect(escapePointer(key)).toBe(expected);
  });

  test.each([
    ['/a/0/b', ['a', '0', 'b']],
    ['/a~1b/m~0n', ['a/b', 'm~n']],
    ['/~01', ['~1']],
    ['/', ['']],
    ['//', ['', '']],
  ])('Should split %j', (pointer, expected) => {
    expect(splitPointer(pointer)).toEqual(expected);
  });

  test.each(['', 'a/b', '#/a'])('Should reject %j, which does not start with "/"', (pointer) => {
    expect(() => splitPointer(pointer)).toThrow(new TypeError(`A JSON Pointer must start with "/", got "${pointer}"`));
  });
});
