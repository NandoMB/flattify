import { afterEach, describe, expect, expectTypeOf, test } from 'vitest';
import { unflatten, type Unflatten } from '../index.ts';

describe('unflatten', () => {
  test('Should split keys into nested objects', () => {
    expect(unflatten({ id: 1, 'profile.name': 'Ada', 'profile.address.city': 'London' })).toEqual({ id: 1, profile: { name: 'Ada', address: { city: 'London' } } });
  });

  test('Should build arrays from index keys', () => {
    expect(unflatten({ 'tags.0': 'a', 'tags.1': 'b', 'items.0.id': 1, 'items.1.id': 2 })).toEqual({ tags: ['a', 'b'], items: [{ id: 1 }, { id: 2 }] });
  });

  test('Should build arrays whatever the key order', () => {
    const result = unflatten({ 'list.2': 'c', 'list.0': 'a', 'list.1': 'b' });
    expect(result.list).toEqual(['a', 'b', 'c']);
  });

  test('Should leave holes for missing indices', () => {
    const result = unflatten({ 'list.0': 'a', 'list.2': 'c' });
    expect(result.list).toHaveLength(3);
    expect(1 in (result.list as unknown[])).toBe(false);
  });

  test('Should keep an object when its keys mix indices and names', () => {
    expect(unflatten({ 'a.0': 1, 'a.x': 2 })).toEqual({ a: { 0: 1, x: 2 } });
    expect(unflatten({ 'a.01': 1 })).toEqual({ a: { '01': 1 } });
  });

  test('Should keep the top level an object, even with index keys', () => {
    const result = unflatten({ '0': 'a', '1.x': 1 });
    expect(Array.isArray(result)).toBe(false);
    expect(result).toEqual({ 0: 'a', 1: { x: 1 } });
  });

  test('Should unescape keys written by flatten', () => {
    expect(unflatten({ 'a\\.b.c\\\\d': 1 })).toEqual({ 'a.b': { 'c\\d': 1 } });
  });

  test('Should keep empty objects and arrays as values', () => {
    expect(unflatten({ a: {}, b: [], 'c.d': {} })).toEqual({ a: {}, b: [], c: { d: {} } });
  });

  test('Should not let an empty value replace keys already set below it', () => {
    expect(unflatten({ 'a.b': 1, a: {} })).toEqual({ a: { b: 1 } });
    expect(unflatten({ 'a.0': 1, a: [] }, { overwrite: true })).toEqual({ a: [1] });
  });

  test('Should add keys to a copy of objects and arrays found in the input', () => {
    const list: unknown[] = [];
    const meta = { a: 1 };
    const input = { list, 'list.0': 'x', meta, 'meta.b': 2 };
    expect(unflatten(input)).toEqual({ list: ['x'], meta: { a: 1, b: 2 } });
    expect(list).toEqual([]);
    expect(meta).toEqual({ a: 1 });
  });

  test('Should tell empty values apart even when Object.prototype was polluted by other code', () => {
    const proto = Object.prototype as Record<string, unknown>;
    proto.polluted = true;
    try {
      expect(Object.keys(unflatten({ 'a.b': 1, a: {} }, { overwrite: true }).a as object)).toEqual(['b']);
    } finally {
      delete proto.polluted;
    }
  });

  test('Should never modify objects nested in values of the input', () => {
    const inner = { y: 1 };
    const list = [{ id: 1 }];
    const input = { a: { x: inner }, 'a.x.z': 2, b: list, 'b.0.name': 'x' };
    expect(unflatten(input)).toEqual({ a: { x: { y: 1, z: 2 } }, b: [{ id: 1, name: 'x' }] });
    expect(inner).toEqual({ y: 1 });
    expect(list).toEqual([{ id: 1 }]);
  });

  test('Should keep values by reference', () => {
    const date = new Date();
    const nested = { deep: true };
    const result = unflatten({ 'a.date': date, 'a.nested': nested });
    expect((result.a as Record<string, unknown>).date).toBe(date);
    expect((result.a as Record<string, unknown>).nested).toBe(nested);
  });

  test('Should keep the last value of a key given twice', () => {
    expect(unflatten({ a: 1, 'a\\': 2, 'b.c': 1 })).toEqual({ a: 1, 'a\\': 2, b: { c: 1 } });
  });

  test('Should skip a key whose path goes through a value', () => {
    expect(unflatten({ a: 1, 'a.b': 2 })).toEqual({ a: 1 });
    expect(unflatten({ a: null, 'a.b': 2 })).toEqual({ a: null });
  });

  test('Should keep an object already built when a value comes later', () => {
    expect(unflatten({ 'a.b': 2, a: 1 })).toEqual({ a: { b: 2 } });
  });

  test('Should accept objects without a prototype', () => {
    const input = Object.assign(Object.create(null) as object, { 'a.b': 1 });
    expect(unflatten(input)).toEqual({ a: { b: 1 } });
  });

  test.each([
    ['null', null],
    ['an array', ['a']],
    ['a Date', new Date()],
  ])('Should throw a TypeError when given %s', (_, input) => {
    expect(() => unflatten(input as object)).toThrow(new TypeError('unflatten() expects a plain object'));
  });
});

describe('unflatten security', () => {
  afterEach(() => {
    for (const key of ['polluted', 'isAdmin']) delete (Object.prototype as Record<string, unknown>)[key];
  });

  test.each([
    '__proto__.polluted',
    'a.__proto__.polluted',
    '__proto__',
    'constructor.prototype.polluted',
    'a.constructor.prototype.polluted',
    'toString.polluted',
    'a.b\\.c.__proto__.polluted',
  ])('Should not pollute Object.prototype through %j', (key) => {
    const result = unflatten({ [key]: true });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  test('Should skip paths with a __proto__ segment, also from JSON input', () => {
    const input = JSON.parse('{"__proto__": {"isAdmin": true}, "__proto__.isAdmin": true, "name": "x"}') as object;
    const result = unflatten(input);
    expect(result).toEqual({ name: 'x' });
    expect((result as Record<string, unknown>).isAdmin).toBeUndefined();
    expect(Object.keys(result)).toEqual(['name']);
  });

  test('Should create constructor and prototype as plain data keys', () => {
    const result = unflatten({ 'constructor.name': 'x', 'a.prototype': 1, 'toString': 'y' });
    expect(result).toEqual({ constructor: { name: 'x' }, a: { prototype: 1 }, toString: 'y' });
    expect(Object.prototype.toString).toBeTypeOf('function');
  });

  test('Should not allocate a huge array for a huge index', () => {
    const result = unflatten({ 'a.4294967294': 'x' });
    expect(result).toEqual({ a: { 4294967294: 'x' } });
  });

  test('arrayLimit: Should turn larger indices into object keys', () => {
    expect(unflatten({ 'a.0': 1, 'a.3': 2 }, { arrayLimit: 2 })).toEqual({ a: { 0: 1, 3: 2 } });
    expect(unflatten({ 'a.0': 1, 'a.2': 2 }, { arrayLimit: 2 })).toEqual({ a: [1, undefined, 2] });
    expect(unflatten({ 'a.0': 1 }, { arrayLimit: 0 })).toEqual({ a: [1] });
  });
});

describe('unflatten options', () => {
  test('delimiter: Should split keys on any string', () => {
    expect(unflatten({ a_b_0: 1 }, { delimiter: '_' })).toEqual({ a: { b: [1] } });
    expect(unflatten({ DB__HOST: 'localhost', DB__PORT: '5432' }, { delimiter: '__' })).toEqual({ DB: { HOST: 'localhost', PORT: '5432' } });
  });

  test('notation: Should read bracket paths, including form-field names', () => {
    expect(unflatten({ 'items[0].id': 1, 'items[1].id': 2, 'a\\.b.c\\[d': 1 }, { notation: 'bracket' })).toEqual({ items: [{ id: 1 }, { id: 2 }], 'a.b': { 'c[d': 1 } });
    expect(unflatten({ 'user[name]': 'Ada', 'user[tags][0]': 'x', 'user[tags][1]': 'y' }, { notation: 'bracket' })).toEqual({ user: { name: 'Ada', tags: ['x', 'y'] } });
    expect(unflatten({ '[0].id': 1, '[1].id': 2 }, { notation: 'bracket', asArray: true })).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('notation: Should read JSON Pointers', () => {
    expect(unflatten({ '/items/0/id': 1, '/a~1b/m~0n': 2, '/a~1b/': 3 }, { notation: 'pointer' })).toEqual({ items: [{ id: 1 }], 'a/b': { 'm~n': 2, '': 3 } });
  });

  test('notation: Should reject keys that are not JSON Pointers', () => {
    expect(() => unflatten({ 'a/b': 1 }, { notation: 'pointer' })).toThrow(new TypeError('A JSON Pointer must start with "/", got "a/b"'));
    expect(() => unflatten({ '': 1 }, { notation: 'pointer' })).toThrow(new TypeError('The JSON Pointer "" (the whole document) cannot be a key of a flat object'));
  });

  test('notation: Should not pollute Object.prototype with any notation', () => {
    unflatten({ '__proto__[polluted]': true, 'constructor[prototype][polluted]': true }, { notation: 'bracket' });
    unflatten({ '/__proto__/polluted': true, '/constructor/prototype/polluted': true }, { notation: 'pointer' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test('object: Should never build arrays', () => {
    expect(unflatten({ 'list.0': 'a', 'list.1': 'b' }, { object: true })).toEqual({ list: { 0: 'a', 1: 'b' } });
  });

  test('overwrite: Should let later keys replace values in their way', () => {
    expect(unflatten({ a: 1, 'a.b': 2 }, { overwrite: true })).toEqual({ a: { b: 2 } });
    expect(unflatten({ 'a.b': 2, a: 1 }, { overwrite: true })).toEqual({ a: 1 });
  });

  test('escape: Should split on every delimiter when off', () => {
    expect(unflatten({ 'a\\.b': 1 }, { escape: false })).toEqual({ 'a\\': { b: 1 } });
    expect(unflatten({ 'a\\b': 1 }, { delimiter: '\\', escape: false })).toEqual({ a: { b: 1 } });
  });

  test('asArray: Should return the array given to flatten', () => {
    const rows = unflatten({ '0.id': 1, '0.address.city': 'London', '1.id': 2, '1.tags.0': 'x' }, { asArray: true });
    expect(rows).toEqual([{ id: 1, address: { city: 'London' } }, { id: 2, tags: ['x'] }]);
    expect(Array.isArray(rows)).toBe(true);
  });

  test('asArray: Should place values by index, whatever the key order', () => {
    expect(unflatten({ '1': 'b', '0': 'a' }, { asArray: true })).toEqual(['a', 'b']);
    const sparse = unflatten({ '0': 'a', '2': 'c' }, { asArray: true });
    expect(sparse).toHaveLength(3);
    expect(1 in sparse).toBe(false);
  });

  test('asArray: Should return an empty array for empty input', () => {
    expect(unflatten({}, { asArray: true })).toEqual([]);
  });

  test('asArray: Should keep nested objects with object', () => {
    expect(unflatten({ '0.list.0': 'a' }, { asArray: true, object: true })).toEqual([{ list: { 0: 'a' } }]);
  });

  test.each([
    [{ '0.id': 1, name: 'x' }, 'name'],
    [{ '01': 1 }, '01'],
    [{ '1001': 1 }, '1001'],
  ])('asArray: Should throw when %j has a top-level key that is not an index', (input, key) => {
    expect(() => unflatten(input, { asArray: true })).toThrow(new TypeError(`\`asArray\` expects every top-level key to be an array index up to \`arrayLimit\`, got "${key}"`));
  });

  test('transformKey: Should rename keys, not array indices', () => {
    const result = unflatten({ 'USER_NAME.TAGS.0': 'x' }, { transformKey: (key) => key.toLowerCase() });
    expect(result).toEqual({ user_name: { tags: ['x'] } });
    expectTypeOf(result).toEqualTypeOf<Record<string, unknown>>();
  });

  test.each([
    [{ delimiter: '' }, new TypeError('`delimiter` must be a non-empty string')],
    [{ delimiter: 1 as unknown as string }, new TypeError('`delimiter` must be a non-empty string')],
    [{ delimiter: '\\' }, new RangeError('`delimiter` cannot contain `\\` while `escape` is enabled: it is the escape character')],
    [{ arrayLimit: -1 }, new RangeError('`arrayLimit` must be a non-negative integer or Infinity')],
    [{ notation: 'slash' as 'dot' }, new TypeError("`notation` must be 'dot', 'bracket' or 'pointer'")],
    [{ arrayLimit: 1.5 }, new RangeError('`arrayLimit` must be a non-negative integer or Infinity')],
  ])('Should reject invalid options %j', (options, error) => {
    expect(() => unflatten({ a: 1 }, options)).toThrow(error);
  });

  test('Should accept an arrayLimit of Infinity', () => {
    expect(unflatten({ 'a.2000': 1 }, { arrayLimit: Infinity }).a).toHaveLength(2001);
  });
});

describe('Unflatten type', () => {
  test('Should nest the keys', () => {
    const result = unflatten({} as { id: number; 'profile.name': string; 'profile.address.city': string });
    expectTypeOf(result).toEqualTypeOf<{ id: number; profile: { name: string; address: { city: string } } }>();
  });

  test('Should build arrays and tuples from index keys', () => {
    expectTypeOf<Unflatten<{ [x: `tags.${number}`]: string }>>().toEqualTypeOf<{ tags: string[] }>();
    expectTypeOf<Unflatten<{ [x: `items.${number}.id`]: number }>>().toEqualTypeOf<{ items: { id: number }[] }>();
    expectTypeOf<Unflatten<{ 'point.0': number; 'point.1': string }>>().toEqualTypeOf<{ point: [number, string] }>();
    expectTypeOf<Unflatten<{ 'list.0': 1; 'list.2': 2 }>>().toEqualTypeOf<{ list: (1 | 2)[] }>();
  });

  test('Should keep keys optional when every path below them is', () => {
    expectTypeOf<Unflatten<{ 'work.city'?: string; name: string }>>().toEqualTypeOf<{ work?: { city?: string }; name: string }>();
  });

  test('Should unescape keys', () => {
    expectTypeOf<Unflatten<{ 'a\\.b.c': 1; 'd\\\\e': 2 }>>().toEqualTypeOf<{ 'a.b': { c: 1 }; 'd\\e': 2 }>();
    expectTypeOf<Unflatten<{ 'a\\.b.c': 1 }, { escape: false }>>().toEqualTypeOf<{ 'a\\': { b: { c: 1 } } }>();
    expectTypeOf<Unflatten<{ 'db__MAX\\_': 2; db__MAX_CONN: 1 }, { delimiter: '__' }>>().toEqualTypeOf<{ db: { MAX_: 2; MAX_CONN: 1 } }>();
  });

  test('Should follow the options', () => {
    expectTypeOf<Unflatten<{ a_b: 1; a_c: 2 }, { delimiter: '_' }>>().toEqualTypeOf<{ a: { b: 1; c: 2 } }>();
    expectTypeOf<Unflatten<{ 'list.0': 'a' }, { object: true }>>().toEqualTypeOf<{ list: { 0: 'a' } }>();
    expectTypeOf<Unflatten<{ 'a.b': 1 }, { overwrite: true; arrayLimit: 10 }>>().toEqualTypeOf<{ a: { b: 1 } }>();
  });

  test('asArray: Should type the result as an array', () => {
    const rows = unflatten({} as { [x: `${number}.id`]: number; [x: `${number}.name`]: string }, { asArray: true });
    expectTypeOf(rows).toEqualTypeOf<{ id: number; name: string }[]>();
    expectTypeOf<Unflatten<{ '0.id': 1; '1.id': 2 }, { asArray: true }>>().toEqualTypeOf<[{ id: 1 }, { id: 2 }]>();
    expectTypeOf<Unflatten<{}, { asArray: true }>>().toEqualTypeOf<[]>();
    expectTypeOf<Unflatten<Record<string, unknown>, { asArray: true }>>().toEqualTypeOf<unknown[]>();
    expectTypeOf<Unflatten<{ '0': 1; name: 'x' }, { asArray: true }>>().toEqualTypeOf<never>();
    expectTypeOf<Unflatten<{ '0': 1 }, { asArray: boolean }>>().toEqualTypeOf<{ 0: 1 } | [1]>();
  });

  test('Should follow the notation', () => {
    expectTypeOf<Unflatten<{ [x: `items[${number}].id`]: number; 'point[0]': 1; 'a\\.b': 2 }, { notation: 'bracket' }>>().toEqualTypeOf<{ items: { id: number }[]; point: [1]; 'a.b': 2 }>();
    expectTypeOf<Unflatten<{ 'user[name]': string; 'user[tags][0]': string }, { notation: 'bracket' }>>().toEqualTypeOf<{ user: { name: string; tags: [string] } }>();
    expectTypeOf<Unflatten<{ [x: `/items/${number}/id`]: number; '/a~1b/m~0n': 1 }, { notation: 'pointer' }>>().toEqualTypeOf<{ items: { id: number }[]; 'a/b': { 'm~n': 1 } }>();
  });

  test('Should widen to Record<string, unknown> when the keys are unknown', () => {
    expectTypeOf<Unflatten<Record<string, unknown>>>().toEqualTypeOf<{ [x: string]: unknown }>();
    expectTypeOf<Unflatten<{ a: 1 }, { delimiter: string }>>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<Unflatten<any>>().toEqualTypeOf<Record<string, any>>();
  });
});
