import { describe, expect, expectTypeOf, test } from 'vitest';
import { flatten, type Flatten } from '../index.ts';

describe('flatten', () => {
  test('Should join nested keys with the delimiter', () => {
    const user = { id: 1, profile: { name: 'Ada', address: { city: 'London' } } };
    expect(flatten(user)).toEqual({ id: 1, 'profile.name': 'Ada', 'profile.address.city': 'London' });
  });

  test('Should flatten arrays to index keys', () => {
    expect(flatten({ tags: ['a', 'b'], items: [{ id: 1 }, { id: 2 }] })).toEqual({ 'tags.0': 'a', 'tags.1': 'b', 'items.0.id': 1, 'items.1.id': 2 });
  });

  test('Should flatten a top-level array', () => {
    expect(flatten([{ id: 1 }, 'x'])).toEqual({ '0.id': 1, '1': 'x' });
  });

  test('Should keep the key order of a depth-first walk', () => {
    expect(Object.keys(flatten({ a: { b: 1, c: { d: 2 } }, e: 3 }))).toEqual(['a.b', 'a.c.d', 'e']);
  });

  test('Should prefix arrays nested in objects (the 1.x bug)', () => {
    expect(flatten({ a: { tags: [1] }, b: { tags: [2] } })).toEqual({ 'a.tags.0': 1, 'b.tags.0': 2 });
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a Date', new Date(0)],
    ['a RegExp', /x/g],
    ['a Map', new Map([['k', 1]])],
    ['a Set', new Set([1])],
    ['a class instance', new (class Point { x = 1 })()],
    ['an Error', new Error('boom')],
    ['a typed array', new Uint8Array([1, 2])],
    ['a function', () => 1],
    ['a Promise', Promise.resolve(1)],
  ])('Should keep %s as a value', (_, value) => {
    const result = flatten({ nested: { value } });
    expect(Object.keys(result)).toEqual(['nested.value']);
    expect(result['nested.value']).toBe(value);
  });

  test('Should walk objects without a prototype', () => {
    const bare = Object.assign(Object.create(null) as object, { a: 1 });
    expect(flatten({ bare })).toEqual({ 'bare.a': 1 });
  });

  test('Should not clone values', () => {
    const date = new Date();
    expect(flatten({ a: { date } })['a.date']).toBe(date);
  });

  test('Should skip array holes', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(flatten({ list: [1, , 3] })).toEqual({ 'list.0': 1, 'list.2': 3 });
  });

  test('Should flatten the same object reached from two keys', () => {
    const shared = { x: 1 };
    expect(flatten({ a: shared, b: shared })).toEqual({ 'a.x': 1, 'b.x': 1 });
  });

  test('Should create `__proto__` keys instead of changing the prototype', () => {
    const result = flatten(JSON.parse('{"__proto__": {"polluted": true}, "a": {"__proto__": 1}}') as object);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(result)).toEqual(['__proto__.polluted', 'a.__proto__']);
  });

  test('Should keep a top-level `__proto__` key as an own property', () => {
    const result = flatten(JSON.parse('{"__proto__": {"isAdmin": true}}') as object, { maxDepth: 1 });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(result, '__proto__')?.value).toEqual({ isAdmin: true });
    expect((result as Record<string, unknown>).isAdmin).toBeUndefined();
  });

  test('Should flatten objects nested 100k levels deep without overflowing the stack', () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 100_000; i++) deep = { n: deep };
    const [key] = Object.keys(flatten(deep));
    expect(key.split('.')).toHaveLength(100_001);
  });

  test.each([
    ['null', null],
    ['a string', 'text'],
    ['a Date', new Date()],
    ['an array when `safe` is on', []],
  ])('Should throw a TypeError when given %s', (_, input) => {
    const options = { safe: Array.isArray(input) };
    expect(() => flatten(input as object, options)).toThrow(new TypeError('flatten() expects a plain object or an array'));
  });
});

describe('flatten options', () => {
  test('delimiter: Should join keys with any string', () => {
    expect(flatten({ a: { b: [1] } }, { delimiter: '_' })).toEqual({ a_b_0: 1 });
    expect(flatten({ a: { b: 1 } }, { delimiter: '::' })).toEqual({ 'a::b': 1 });
  });

  test.each([1, 2, 3])('maxDepth: Should stop walking at depth %i', (maxDepth) => {
    const input = { a: { b: { c: 1 } } };
    const expected = [{ a: { b: { c: 1 } } }, { 'a.b': { c: 1 } }, { 'a.b.c': 1 }][maxDepth - 1];
    expect(flatten(input, { maxDepth })).toEqual(expected);
  });

  test('safe: Should keep arrays as values', () => {
    const tags = ['a'];
    const result = flatten({ user: { tags, list: [{ id: 1 }] } }, { safe: true });
    expect(result).toEqual({ 'user.tags': ['a'], 'user.list': [{ id: 1 }] });
    expect(result['user.tags']).toBe(tags);
  });

  test('keepEmpty: Should keep empty objects and arrays by default', () => {
    expect(flatten({ a: {}, b: [], c: { d: {} } })).toEqual({ a: {}, b: [], 'c.d': {} });
  });

  test('keepEmpty: Should drop empty objects and arrays when off', () => {
    expect(flatten({ a: {}, b: [], c: { d: {} }, e: 1 }, { keepEmpty: false })).toEqual({ e: 1 });
  });

  test('keepEmpty: Should return an empty object for empty input', () => {
    expect(flatten({})).toEqual({});
    expect(flatten([])).toEqual({});
  });

  test('escape: Should escape the delimiter and backslashes inside keys', () => {
    expect(flatten({ 'a.b': { 'c\\d': 1 } })).toEqual({ 'a\\.b.c\\\\d': 1 });
    expect(flatten({ 'a_b': { c: 1 } }, { delimiter: '_' })).toEqual({ 'a\\_b_c': 1 });
  });

  test('escape: Should only escape keys that would be ambiguous with a longer delimiter', () => {
    expect(flatten({ db: { MAX_CONN: 1, MAX_: 2 } }, { delimiter: '__' })).toEqual({ db__MAX_CONN: 1, 'db__MAX\\_': 2 });
  });

  test('notation: Should write array indices between brackets', () => {
    expect(flatten({ items: [{ id: 1, tags: ['a'] }], 'a.b': { 'c[d': 1 } }, { notation: 'bracket' })).toEqual({ 'items[0].id': 1, 'items[0].tags[0]': 'a', 'a\\.b.c\\[d': 1 });
    expect(flatten([{ id: 1 }], { notation: 'bracket' })).toEqual({ '[0].id': 1 });
    expect(flatten({ a: { 0: 'x' } }, { notation: 'bracket' })).toEqual({ 'a.0': 'x' });
  });

  test('notation: Should write JSON Pointers', () => {
    expect(flatten({ items: [{ id: 1 }], 'a/b': { 'm~n': 1, '': 2 } }, { notation: 'pointer' })).toEqual({ '/items/0/id': 1, '/a~1b/m~0n': 1, '/a~1b/': 2 });
    expect(flatten([1], { notation: 'pointer' })).toEqual({ '/0': 1 });
  });

  test('notation: Should ignore delimiter and escape with pointers', () => {
    expect(flatten({ 'a.b': { c: 1 } }, { notation: 'pointer', delimiter: '', escape: false })).toEqual({ '/a.b/c': 1 });
  });

  test('escape: Should leave keys as they are when off', () => {
    expect(flatten({ 'a.b': { c: 1 } }, { escape: false })).toEqual({ 'a.b.c': 1 });
  });

  test('circular: Should throw with the path by default', () => {
    const node: Record<string, unknown> = { name: 'root', child: {} };
    (node.child as Record<string, unknown>).parent = node;
    expect(() => flatten(node)).toThrow(new TypeError('Circular reference at "child.parent"'));
  });

  test('circular: Should skip the key when set to skip', () => {
    const list: unknown[] = [1];
    list.push(list);
    expect(flatten({ list }, { circular: 'skip' })).toEqual({ 'list.0': 1 });
  });

  test('circular: Should not report a cycle past maxDepth, where the object is a value', () => {
    const node: Record<string, unknown> = {};
    node.self = node;
    expect(flatten(node, { maxDepth: 1 })).toEqual({ self: node });
  });

  test('transformKey: Should rename object keys, not array indices', () => {
    const result = flatten({ userName: { tagList: ['x'] } }, { transformKey: (key) => key.toUpperCase() });
    expect(result).toEqual({ 'USERNAME.TAGLIST.0': 'x' });
    expectTypeOf(result).toEqualTypeOf<Record<string, unknown>>();
  });

  test('transformKey: Should escape the renamed key', () => {
    expect(flatten({ a: { b: 1 } }, { transformKey: (key) => `${key}.x` })).toEqual({ 'a\\.x.b\\.x': 1 });
  });

  test('preserve: Should keep matching objects as values', () => {
    const input = { meta: { raw: { a: 1 } }, data: { a: 1 } };
    const result = flatten(input, { preserve: (path) => path === 'meta.raw' });
    expect(result).toEqual({ 'meta.raw': { a: 1 }, 'data.a': 1 });
  });

  test('preserve: Should receive the path and the value', () => {
    const calls: [string, unknown][] = [];
    flatten({ a: { b: [1] }, c: 1 }, { preserve: (path, value) => (calls.push([path, value]), false) });
    expect(calls).toEqual([['a', { b: [1] }], ['a.b', [1]]]);
  });

  test.each([
    [{ delimiter: '' }, new TypeError('`delimiter` must be a non-empty string')],
    [{ delimiter: 1 as unknown as string }, new TypeError('`delimiter` must be a non-empty string')],
    [{ delimiter: '\\' }, new RangeError('`delimiter` cannot contain `\\` while `escape` is enabled: it is the escape character')],
    [{ maxDepth: 0 }, new RangeError('`maxDepth` must be a positive integer or Infinity')],
    [{ maxDepth: 1.5 }, new RangeError('`maxDepth` must be a positive integer or Infinity')],
    [{ circular: 'ignore' as 'skip' }, new TypeError("`circular` must be 'throw' or 'skip'")],
    [{ notation: 'slash' as 'dot' }, new TypeError("`notation` must be 'dot', 'bracket' or 'pointer'")],
  ])('Should reject invalid options %j', (options, error) => {
    expect(() => flatten({ a: 1 }, options)).toThrow(error);
  });

  test('Should accept `\\` in the delimiter when escape is off', () => {
    expect(flatten({ a: { b: 1 } }, { delimiter: '\\', escape: false })).toEqual({ 'a\\b': 1 });
  });
});

describe('Flatten type', () => {
  interface Address {
    street: string;
    city: string;
  }

  test('Should infer the path of every leaf', () => {
    const result = flatten({} as { id: number; profile: { name: string; address: Address } });
    expectTypeOf(result).toEqualTypeOf<{ id: number; 'profile.name': string; 'profile.address.street': string; 'profile.address.city': string }>();
  });

  test('Should type array elements with `${number}` keys and tuples with exact indices', () => {
    expectTypeOf<Flatten<{ tags: string[] }>>().toEqualTypeOf<{ [x: `tags.${number}`]: string; tags?: [] }>();
    expectTypeOf<Flatten<{ items: { id: number }[] }>>().toEqualTypeOf<{ [x: `items.${number}.id`]: number; items?: [] }>();
    expectTypeOf<Flatten<{ point: [number, string] }>>().toEqualTypeOf<{ 'point.0': number; 'point.1': string }>();
    expectTypeOf<Flatten<string[]>>().toEqualTypeOf<{ [x: `${number}`]: string }>();
  });

  test('Should keep built-in objects as values', () => {
    type Values = { date: Date; re: RegExp; map: Map<string, number>; set: Set<number>; bytes: Uint8Array; fn: () => void; promise: Promise<number> };
    expectTypeOf<Flatten<{ v: Values }>>().toEqualTypeOf<{ 'v.date': Date; 'v.re': RegExp; 'v.map': Map<string, number>; 'v.set': Set<number>; 'v.bytes': Uint8Array; 'v.fn': () => void; 'v.promise': Promise<number> }>();
  });

  test('Should make paths optional below optional or nullable objects', () => {
    expectTypeOf<Flatten<{ work?: Address }>>().toEqualTypeOf<{ 'work.street'?: string; 'work.city'?: string }>();
    expectTypeOf<Flatten<{ billing: Address | null }>>().toEqualTypeOf<{ billing?: null; 'billing.street'?: string; 'billing.city'?: string }>();
    expectTypeOf<Flatten<{ nick?: string }>>().toEqualTypeOf<{ nick?: string }>();
  });

  test('Should merge the variants of a union', () => {
    type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; size: number };
    expectTypeOf<Flatten<{ shape: Shape }>>().toEqualTypeOf<{ 'shape.kind': 'circle' | 'square'; 'shape.radius'?: number; 'shape.size'?: number }>();
  });

  test('Should type index signatures with template keys', () => {
    expectTypeOf<Flatten<{ meta: Record<string, boolean> }>>().toEqualTypeOf<{ [x: `meta.${string}`]: boolean; meta?: Record<string, never> }>();
  });

  test('Should type unknown object shapes as unknown', () => {
    expectTypeOf<Flatten<{ data: object }>>().toEqualTypeOf<{ [x: `data.${string}`]: unknown; data?: unknown }>();
    expectTypeOf<Flatten<{ data: unknown }>>().toEqualTypeOf<{ data: unknown }>();
    expectTypeOf<Flatten<{ data: any }>>().toEqualTypeOf<{ data: any }>();
    expectTypeOf<Flatten<any>>().toEqualTypeOf<Record<string, any>>();
  });

  test('Should escape keys like the runtime', () => {
    expectTypeOf<Flatten<{ 'a.b': { 'c\\d': 1 } }>>().toEqualTypeOf<{ 'a\\.b.c\\\\d': 1 }>();
    expectTypeOf<Flatten<{ 'a.b': { c: 1 } }, { escape: false }>>().toEqualTypeOf<{ 'a.b.c': 1 }>();
    expectTypeOf<Flatten<{ db: { MAX_CONN: 1; 'MAX_': 2 } }, { delimiter: '__' }>>().toEqualTypeOf<{ db__MAX_CONN: 1; 'db__MAX\\_': 2 }>();
    expectTypeOf<Flatten<{ a: { ':': 1 } }, { delimiter: '::' }>>().toEqualTypeOf<{ 'a::\\:': 1 }>();
  });

  test('Should follow the options', () => {
    const input = {} as { a: { b: { c: number }; list: number[] } };
    expectTypeOf(flatten(input, { delimiter: '/' })).toEqualTypeOf<{ 'a/b/c': number; [x: `a/list/${number}`]: number; 'a/list'?: [] }>();
    expectTypeOf(flatten(input, { maxDepth: 2 })).toEqualTypeOf<{ 'a.b': { c: number }; 'a.list': number[] }>();
    expectTypeOf(flatten(input, { safe: true })).toEqualTypeOf<{ 'a.b.c': number; 'a.list': number[] }>();
    expectTypeOf(flatten(input, { keepEmpty: false })).toEqualTypeOf<{ 'a.b.c': number; [x: `a.list.${number}`]: number }>();
    expectTypeOf(flatten(input, { circular: 'skip' })).toEqualTypeOf<Flatten<typeof input>>();
  });

  test('Should follow the notation', () => {
    type Input = { items: { id: number }[]; point: [number, number]; 'a/b': { 'c.d': 1 } };
    expectTypeOf<Flatten<Input, { notation: 'bracket' }>>().toEqualTypeOf<{ [x: `items[${number}].id`]: number; items?: []; 'point[0]': number; 'point[1]': number; 'a/b.c\\.d': 1 }>();
    expectTypeOf<Flatten<Input, { notation: 'pointer' }>>().toEqualTypeOf<{ [x: `/items/${number}/id`]: number; '/items'?: []; '/point/0': number; '/point/1': number; '/a~1b/c.d': 1 }>();
    expectTypeOf<Flatten<{ id: number }[], { notation: 'bracket' }>>().toEqualTypeOf<{ [x: `[${number}].id`]: number }>();
    expectTypeOf<Flatten<{ data: object }, { notation: 'pointer' }>>().toEqualTypeOf<{ [x: `/data/${string}`]: unknown; '/data'?: unknown }>();
  });

  test('Should widen the keys to string when an option is only known at runtime', () => {
    const options = { delimiter: '.' } as { delimiter: string };
    expectTypeOf(flatten({ a: { b: 1 } }, options)).toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<Flatten<{ a: 1 }, { safe: boolean }>>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<Flatten<{ a: 1 }, { maxDepth: number }>>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<Flatten<{ a: 1 }, { notation: 'dot' | 'pointer' }>>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf(flatten({ a: 1 }, { preserve: () => false })).toEqualTypeOf<Record<string, unknown>>();
  });

  test('Should stop expanding recursive types', () => {
    interface Tree {
      value: number;
      children: Tree[];
    }
    type Paths = keyof Flatten<Tree>;
    expectTypeOf<'value'>().toExtend<Paths>();
    expectTypeOf<'children.0.value'>().toExtend<Paths>();
    expectTypeOf<'children.0.children.0.children.0.children.0.children.0.value.anything.deeper'>().toExtend<Paths>();
  });
});
