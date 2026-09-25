import { afterEach, describe, expect, expectTypeOf, test } from 'vitest';
import { flatten } from '../index.ts';
import { del, escapeKey, get, has, parsePath, paths, set, stringifyPath, type Get, type Path, type SetValue } from './index.ts';

interface Order {
  id: number;
  items: { sku: string; qty: number }[];
  customer?: { name: string };
  meta: Record<string, string>;
  point: [number, string];
  at: Date;
}

const order = (): Order => ({ id: 1, items: [{ sku: 'A1', qty: 2 }], customer: { name: 'Ada' }, meta: { source: 'web' }, point: [1, 'x'], at: new Date(0) });

afterEach(() => {
  delete (Object.prototype as Record<string, unknown>).polluted;
});

describe('get', () => {
  test('Should read nested values', () => {
    const o = order();
    expect(get(o, 'items.0.sku')).toBe('A1');
    expect(get(o, 'customer.name')).toBe('Ada');
    expect(get(o, 'items')).toBe(o.items);
    expect(get(o, 'point.1')).toBe('x');
  });

  test('Should return undefined for missing keys', () => {
    const o = order();
    expect(get(o, 'items.5.sku')).toBeUndefined();
    expect(get({ a: null } as { a: { b: number } | null }, 'a.b')).toBeUndefined();
    expect(get(o, 'id.toFixed' as string)).toBeUndefined();
  });

  test('Should read own keys only on plain objects and arrays', () => {
    expect(get({}, 'constructor' as string)).toBeUndefined();
    expect(get({}, 'toString' as string)).toBeUndefined();
    expect(get({ a: [] }, 'a.length' as string)).toBe(0);
    expect(get({ constructor: 'x' }, 'constructor')).toBe('x');
  });

  test('Should read inherited properties of other objects, except the prototype chain keys', () => {
    class User {
      constructor(public first: string) {}
      get display(): string {
        return this.first.toUpperCase();
      }
    }
    const data = { user: new User('ada') };
    expect(get(data, 'user.display' as string)).toBe('ADA');
    expect(get(data, 'user.constructor' as string)).toBeUndefined();
    expect(get(data, 'user.__proto__' as string)).toBeUndefined();
    expect(get(data, 'user.missing' as string)).toBeUndefined();
  });

  test('Should follow the notation and the escapes', () => {
    const o = order();
    expect(get(o, '/items/0/qty', { notation: 'pointer' })).toBe(2);
    expect(get(o, 'items[0].qty', { notation: 'bracket' })).toBe(2);
    expect(get({ 'a.b': { c: 1 } }, 'a\\.b.c')).toBe(1);
    expect(get({ a: { b: 1 } }, 'a_b', { delimiter: '_' })).toBe(1);
  });

  test('Should throw on a non-object input or invalid options', () => {
    expect(() => get(null as unknown as object, 'a')).toThrow(new TypeError('get() expects an object or an array'));
    expect(() => get({}, 'a', { notation: 'x' as 'dot' })).toThrow(TypeError);
    expect(() => get({}, 'a', { delimiter: '' })).toThrow(TypeError);
  });
});

describe('has', () => {
  test('Should tell whether every key of the path exists', () => {
    expect(has({ a: { b: undefined } }, 'a.b')).toBe(true);
    expect(has({ a: {} }, 'a.b')).toBe(false);
    expect(has({ a: 1 }, 'a.b')).toBe(false);
    expect(has({ list: ['x'] }, 'list.0')).toBe(true);
    expect(has({}, 'toString')).toBe(false);
    expect(has({ a: { b: 1 } }, '/a/b', { notation: 'pointer' })).toBe(true);
  });

  test('Should throw on a non-object input', () => {
    expect(() => has(1 as unknown as object, 'a')).toThrow(new TypeError('has() expects an object or an array'));
  });
});

describe('set', () => {
  test('Should set nested values and return the same object', () => {
    const o = order();
    expect(set(o, 'items.0.qty', 5)).toBe(o);
    expect(o.items[0].qty).toBe(5);
  });

  test('Should create missing objects and arrays', () => {
    const target: Record<string, unknown> = {};
    set(target, 'a.b.0.c', 1);
    expect(target).toEqual({ a: { b: [{ c: 1 }] } });
    set(target, 'x.0', 1, { object: true });
    expect(target.x).toEqual({ 0: 1 });
    set(target, 'y.5000', 1);
    expect(target.y).toEqual({ 5000: 1 });
    set(target, 'z.3', 1, { arrayLimit: 2 });
    expect(target.z).toEqual({ 3: 1 });
  });

  test('Should replace values that are in the way', () => {
    const target: Record<string, unknown> = { a: 1 };
    set(target, 'a.b', 2);
    expect(target).toEqual({ a: { b: 2 } });
  });

  test('Should write into class instances along the path', () => {
    class Box {
      content = { size: 1 };
    }
    const target = { box: new Box() };
    set(target, 'box.content.size', 2);
    expect(target.box).toBeInstanceOf(Box);
    expect(target.box.content.size).toBe(2);
  });

  test('Should follow the notation', () => {
    const target: Record<string, unknown> = {};
    set(target, '/a~1b/0', 'x', { notation: 'pointer' });
    set(target, 'c[0].d', 'y', { notation: 'bracket' });
    expect(target).toEqual({ 'a/b': ['x'], c: [{ d: 'y' }] });
  });

  test.each(['__proto__.polluted', 'a.__proto__.polluted', 'constructor.prototype.polluted', '__proto__'])('Should not pollute Object.prototype through %j', (path) => {
    const target: Record<string, unknown> = {};
    set(target, path, true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
  });

  test('Should create constructor and prototype as own data keys', () => {
    const target: Record<string, unknown> = {};
    set(target, 'constructor.prototype.x', 1);
    expect(target).toEqual({ constructor: { prototype: { x: 1 } } });
    expect(Object.prototype.constructor).toBe(Object);
  });

  test('Should throw on a non-object input or an invalid arrayLimit', () => {
    expect(() => set('x' as unknown as Record<string, unknown>, 'a', 1)).toThrow(new TypeError('set() expects an object or an array'));
    expect(() => set({} as Record<string, unknown>, 'a', 1, { arrayLimit: -1 })).toThrow(new RangeError('`arrayLimit` must be a non-negative integer or Infinity'));
    expect(() => set({} as Record<string, unknown>, 'a', 1, { arrayLimit: Infinity })).not.toThrow();
  });
});

describe('del', () => {
  test('Should delete the key and tell whether it existed', () => {
    const user = { name: 'Ada', auth: { password: 'secret' } };
    expect(del(user, 'auth.password')).toBe(true);
    expect(user).toEqual({ name: 'Ada', auth: {} });
    expect(del(user, 'auth.password')).toBe(false);
    expect(del(user, 'missing.key')).toBe(false);
    expect(del(user, 'name.length')).toBe(false);
    expect(del(user, 'name.x.y')).toBe(false);
  });

  test('Should leave a hole in arrays', () => {
    const target = { list: ['a', 'b'] };
    expect(del(target, 'list.0')).toBe(true);
    expect(0 in target.list).toBe(false);
    expect(target.list).toHaveLength(2);
  });

  test('Should not delete inherited keys', () => {
    expect(del({}, 'toString')).toBe(false);
    expect(Object.prototype.toString).toBeTypeOf('function');
  });

  test('Should throw on a non-object input', () => {
    expect(() => del(undefined as unknown as object, 'a')).toThrow(new TypeError('del() expects an object or an array'));
  });
});

describe('paths', () => {
  test('Should list the paths flatten produces', () => {
    const o = order();
    expect(paths(o)).toEqual(Object.keys(flatten(o)));
    expect(paths({ a: { b: [1] } }, { notation: 'pointer' })).toEqual(['/a/b/0']);
  });
});

describe('parsePath and stringifyPath', () => {
  test.each([
    ['user.tags.0', {}, ['user', 'tags', '0']],
    ['a\\.b.c', {}, ['a.b', 'c']],
    ['items[0][id]', { notation: 'bracket' }, ['items', '0', 'id']],
    ['/a~1b/c', { notation: 'pointer' }, ['a/b', 'c']],
  ] as const)('Should parse %j', (path, options, expected) => {
    expect(parsePath(path, options)).toEqual(expected);
  });

  test.each([
    [['user', 'first.name'], {}, 'user.first\\.name'],
    [['items', 0, 'id'], { notation: 'bracket' }, 'items[0].id'],
    [['a/b', 'c'], { notation: 'pointer' }, '/a~1b/c'],
    [[], {}, ''],
  ] as const)('Should stringify %j', (keys, options, expected) => {
    expect(stringifyPath(keys, options)).toBe(expected);
    if (keys.length > 0) expect(parsePath(expected, options)).toEqual(keys.map(String));
  });
});

test('Should use the default options when none are given', () => {
  expect(stringifyPath(['a.b', 'c'])).toBe('a\\.b.c');
  expect(escapeKey('a.b')).toBe('a\\.b');
});

describe('escapeKey', () => {
  test.each([
    ['first.name', {}, 'first\\.name'],
    ['a[0]', { notation: 'bracket' }, 'a\\[0]'],
    ['a/b~c', { notation: 'pointer' }, 'a~1b~0c'],
    ['a_b', { delimiter: '_' }, 'a\\_b'],
  ] as const)('Should escape %j', (key, options, expected) => {
    expect(escapeKey(key, options)).toBe(expected);
  });
});

describe('path types', () => {
  test('Path: Should list every path, to containers and values', () => {
    type Expected = 'id' | 'items' | `items.${number}` | `items.${number}.sku` | `items.${number}.qty` | 'customer' | 'customer.name' | 'meta' | `meta.${string}` | 'point' | 'point.0' | 'point.1' | 'at';
    expectTypeOf<Path<Order>>().toEqualTypeOf<Expected>();
    expectTypeOf<Path<{ a: { b: 1 }[] }, { notation: 'bracket' }>>().toEqualTypeOf<'a' | `a[${number}]` | `a[${number}].b`>();
    expectTypeOf<Path<{ a: { b: 1 } }, { notation: 'pointer' }>>().toEqualTypeOf<'/a' | '/a/b'>();
    expectTypeOf<Path<any>>().toEqualTypeOf<string>();
    expectTypeOf<Path<{ a: 1 }, { delimiter: string }>>().toEqualTypeOf<string>();
  });

  test('Get: Should type the value at the path', () => {
    const o = order();
    expectTypeOf(get(o, 'id')).toEqualTypeOf<number>();
    expectTypeOf(get(o, 'items.0.sku')).toEqualTypeOf<string | undefined>();
    expectTypeOf(get(o, 'customer.name')).toEqualTypeOf<string | undefined>();
    expectTypeOf(get(o, 'meta.source')).toEqualTypeOf<string | undefined>();
    expectTypeOf(get(o, 'point.1')).toEqualTypeOf<string>();
    expectTypeOf(get(o, 'at')).toEqualTypeOf<Date>();
    expectTypeOf(get(o, '/items/0/qty', { notation: 'pointer' })).toEqualTypeOf<number | undefined>();
    expectTypeOf(get(o, 'dynamic' as string)).toEqualTypeOf<unknown>();
    expectTypeOf<Get<{ list: number[] }, 'list'>>().toEqualTypeOf<number[]>();
    expectTypeOf<Get<{ a: { 0: 'x' } }, 'a.0'>>().toEqualTypeOf<'x'>();
    expectTypeOf<Get<{ a: 1 }, 'a.b'>>().toEqualTypeOf<undefined>();
    expectTypeOf<Get<any, 'a'>>().toEqualTypeOf<any>();
    expectTypeOf<Get<Record<string, unknown>, 'a.b.c'>>().toEqualTypeOf<unknown>();
    expectTypeOf<Get<{ data: object }, 'data.x'>>().toEqualTypeOf<unknown>();
  });

  test('set: Should check the value against the path', () => {
    const o = order();
    set(o, 'items.0.qty', 3);
    // @ts-expect-error qty is a number
    expect(() => set(o, 'items.0.qty', '3')).not.toThrow();
    // @ts-expect-error there is no price
    expect(() => set(o, 'items.0.price', 3)).not.toThrow();
    expectTypeOf<SetValue<Order, 'items.0'>>().toEqualTypeOf<{ sku: string; qty: number }>();
    expectTypeOf<SetValue<Order, 'meta.x'>>().toEqualTypeOf<string>();
  });

  test('parsePath: Should type the keys', () => {
    expectTypeOf(parsePath('a.b\\.c')).toEqualTypeOf<['a', 'b.c']>();
    expectTypeOf(parsePath('items[0][id]', { notation: 'bracket' })).toEqualTypeOf<['items', '0', 'id']>();
    expectTypeOf(parsePath('a' as string)).toEqualTypeOf<string[]>();
  });

  test('paths: Should type the paths', () => {
    expectTypeOf(paths({ a: { b: 1 } })).toEqualTypeOf<'a.b'[]>();
  });
});
