import { describe, expect, test } from 'vitest';
import { escapeKey, isIndex, splitPath } from './path.ts';

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
