import fc from 'fast-check';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { flatten, unflatten, type Flatten, type Unflatten } from './index.ts';

// Objects whose keys are all array indices come back as arrays: the flat form cannot tell them apart.
const hasIndexKeysOnly = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0 && Object.keys(value).every((key) => /^(?:0|[1-9]\d*)$/.test(key));

const someNested = (value: unknown, predicate: (value: unknown) => boolean): boolean =>
  predicate(value) || (typeof value === 'object' && value !== null && Object.values(value).some((child) => someNested(child, predicate)));

const key = fc.oneof(fc.string(), fc.stringMatching(/^[ab_:.\\[\]/~01]{0,4}$/)).filter((k) => k !== '__proto__');
const json = fc.letrec((tie) => ({
  value: fc.oneof({ depthSize: 'small' }, fc.string(), fc.integer(), fc.double({ noNaN: true }), fc.boolean(), fc.constant(null), tie('array'), tie('object')),
  array: fc.array(tie('value'), { maxLength: 4 }),
  object: fc.dictionary(key, tie('value'), { maxKeys: 4 }),
})).object.filter((value) => !Object.values(value).some((child) => someNested(child, hasIndexKeysOnly)));

describe('unflatten(flatten(x))', () => {
  test('Should give back any JSON object', () => {
    fc.assert(
      fc.property(json, (value) => {
        expect(unflatten(flatten(value))).toEqual(value);
      }),
      { numRuns: 2000 }
    );
  });

  test.each(['_', '__', '/', '::', 'ab', '.'])('Should give back any JSON object with the %j delimiter', (delimiter) => {
    fc.assert(
      fc.property(json, (value) => {
        expect(unflatten(flatten(value, { delimiter }), { delimiter })).toEqual(value);
      }),
      { numRuns: 300 }
    );
  });

  test.each([
    ['bracket', '.'],
    ['bracket', '__'],
    ['bracket', '::'],
    ['pointer', '.'],
  ] as const)('Should give back any JSON object with the %s notation and the %j delimiter', (notation, delimiter) => {
    // In bracket notation, a top-level empty key holding an array (`''` + `[0]`) reads back as the array itself.
    const input = notation === 'bracket' ? json.filter((value) => !Array.isArray(value[''])) : json;
    fc.assert(
      fc.property(input, (value) => {
        expect(unflatten(flatten(value, { notation, delimiter }), { notation, delimiter })).toEqual(value);
      }),
      { numRuns: 2000 }
    );
  });

  test('Should give back any array of JSON objects with asArray', () => {
    fc.assert(
      fc.property(fc.array(json.filter((row) => !hasIndexKeysOnly(row)), { maxLength: 5 }), (rows) => {
        expect(unflatten(flatten(rows), { asArray: true })).toEqual(rows);
      }),
      { numRuns: 1000 }
    );
  });

  test('Should never pollute Object.prototype, whatever the input', () => {
    const segment = fc.constantFrom('__proto__', 'constructor', 'prototype', 'toString', 'valueOf', '0', '1', 'a', '');
    const path = fc.array(segment, { minLength: 1, maxLength: 5 }).map((segments) => segments.join('.'));
    const prototypeKeys = Object.getOwnPropertyNames(Object.prototype);
    fc.assert(
      fc.property(fc.dictionary(path, fc.anything(), { maxKeys: 8 }), fc.boolean(), (input, overwrite) => {
        const result = unflatten(input, { overwrite });
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(prototypeKeys);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Object.prototype.toString.call([])).toBe('[object Array]');
      }),
      { numRuns: 2000 }
    );
  });
});

describe('Unflatten<Flatten<T>>', () => {
  test('Should give back plain data types', () => {
    interface User {
      id: number;
      name: string;
      tags: string[];
      address: { street: string; city: string };
      point: [number, number];
      meta: Record<string, boolean>;
      createdAt: Date;
      'odd.key': { value: 1 };
      orders: { id: number; items: { sku: string; qty: number }[] }[];
    }
    expectTypeOf<Unflatten<Flatten<User>>>().toEqualTypeOf<{
      id: number;
      name: string;
      tags: string[];
      address: { street: string; city: string };
      point: [number, number];
      meta: { [x: string]: boolean };
      createdAt: Date;
      'odd.key': { value: 1 };
      orders: { id: number; items: { sku: string; qty: number }[] }[];
    }>();
  });

  test('Should give back arrays with asArray', () => {
    type Row = { id: number; address: { city: string }; tags: string[] };
    expectTypeOf<Unflatten<Flatten<Row[]>, { asArray: true }>>().toEqualTypeOf<Row[]>();
  });

  test('Should give back plain data types with every notation', () => {
    type Order = { id: number; items: { sku: string; qty: number }[]; 'a/b.c': { 'd[e~f': 1 } };
    expectTypeOf<Unflatten<Flatten<Order, { notation: 'bracket' }>, { notation: 'bracket' }>>().toEqualTypeOf<Order>();
    expectTypeOf<Unflatten<Flatten<Order, { notation: 'pointer' }>, { notation: 'pointer' }>>().toEqualTypeOf<Order>();
  });

  test('Should follow the delimiter on both sides', () => {
    type Config = { db: { host: string; port: number } };
    expectTypeOf<Unflatten<Flatten<Config, { delimiter: '__' }>, { delimiter: '__' }>>().toEqualTypeOf<Config>();
  });
});
