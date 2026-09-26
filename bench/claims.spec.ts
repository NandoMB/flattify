/**
 * Every claim the README makes about other libraries, checked against the versions installed from
 * package.json: `pnpm claims`. When an update changes a behavior, this fails and the README is fixed.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as esToolkit from 'es-toolkit';
import { get as esToolkitGet } from 'es-toolkit/compat';
import { flatten as flat, unflatten as flatUnflatten } from 'flat';
import { flattie } from 'flattie';
import { nestie } from 'nestie';
import { construct, crush, get as radashiGet } from 'radashi';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { flatten, unflatten } from '../dist/index.js';

type Flatten = (input: object) => Record<string, unknown>;
type Unflatten = (input: Record<string, unknown>) => Record<string, unknown>;

const flatteners: Record<string, Flatten> = {
  flattify: flatten,
  flat: (input) => flat(input),
  flattie: (input) => flattie(input),
  'es-toolkit': (input) => esToolkit.flattenObject(input),
  radashi: (input) => crush(input),
};
const unflatteners: Record<string, Unflatten> = {
  flattify: unflatten,
  flat: (input) => flatUnflatten(input),
  nestie: (input) => nestie(input) as Record<string, unknown>,
  radashi: (input) => construct(input) as Record<string, unknown>,
};
const roundTrips: Record<string, (input: object) => unknown> = {
  flattify: (input) => unflatten(flatten(input)),
  flat: (input) => flatUnflatten(flat(input)),
  'flattie/nestie': (input) => nestie(flattie(input)),
  radashi: (input) => construct(crush(input)),
};

const require = createRequire(import.meta.url);
// Read from disk: `flat` does not export its package.json.
const packageJson = (name: string) => JSON.parse(readFileSync(join(dirname(require.resolve(name)), 'package.json'), 'utf8')) as { type?: string; exports?: unknown };

class Point {
  x = 1;
}

describe('Why flattify?', () => {
  test('Paths and values inferred by TypeScript: the other libraries type the result loosely or not at all', () => {
    expectTypeOf(flatten({ a: { b: 1 } })).toEqualTypeOf<{ 'a.b': number }>();
    // flat: `flatten<T, R>(target: T): R`, you pass the result type
    expectTypeOf(flat({ a: { b: 1 } })).toEqualTypeOf<unknown>();
    expectTypeOf(flattie({ a: { b: 1 } })).toEqualTypeOf<Record<string, any>>();
    expectTypeOf(esToolkit.flattenObject({ a: { b: 1 } })).toEqualTypeOf<Record<string, any>>();
    // radashi: the keys are `string`, not the paths
    expectTypeOf<keyof ReturnType<typeof crush<{ a: { b: number } }>>>().toEqualTypeOf<string>();
  });

  test('unflatten: es-toolkit has none', () => {
    expect('unflattenObject' in esToolkit).toBe(false);
  });

  test('ESM and CommonJS: flat 6 is ESM only', () => {
    expect(packageJson('flat').type).toBe('module');
    expect(JSON.stringify(packageJson('flat').exports)).not.toContain('require');
  });

  test.each(Object.entries(roundTrips))('Keys with the delimiter survive the round trip: %s', (name, roundTrip) => {
    expect(JSON.stringify(roundTrip({ 'a.b': 1 })) === JSON.stringify({ 'a.b': 1 })).toBe(name === 'flattify');
  });

  test.each(Object.entries(flatteners))('Keeps Date and Map as values: %s', (name, flattenWith) => {
    const date = new Date(0);
    const map = new Map([[1, 2]]);
    const result = flattenWith({ a: { date, map } });
    expect(result['a.date'] === date && result['a.map'] === map).toBe(name !== 'flattie');
  });

  test.each(Object.entries(flatteners))('Keeps class instances as values: %s', (name, flattenWith) => {
    const point = new Point();
    expect(flattenWith({ a: { point } })['a.point'] === point).toBe(name === 'flattify' || name === 'es-toolkit');
  });

  test.each(Object.entries(flatteners))('Keeps null values: %s', (name, flattenWith) => {
    expect('a.b' in flattenWith({ a: { b: null } })).toBe(name !== 'flattie');
  });

  test.each(Object.entries(flatteners))('Keeps empty objects and arrays: %s', (name, flattenWith) => {
    const result = flattenWith({ a: {}, b: [] });
    expect('a' in result && 'b' in result).toBe(name === 'flattify' || name === 'flat' || name === 'es-toolkit');
  });

  test.each(Object.entries(flatteners))('Circular references: %s', (name, flattenWith) => {
    const node: Record<string, unknown> = {};
    node.self = node;
    expect(() => flattenWith(node)).toThrow(name === 'flattify' ? new TypeError('Circular reference at "self"') : RangeError);
  });

  test.each(Object.entries(flatteners))('Deeply nested input (100k levels): %s', (name, flattenWith) => {
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let i = 0; i < 100_000; i++) deep = { n: deep };
    if (name === 'flattify') expect(() => flattenWith(deep)).not.toThrow();
    else expect(() => flattenWith(deep)).toThrow(RangeError);
  });

  test.each(Object.entries(unflatteners))('Limit on array indices when unflattening: %s', (name, unflattenWith) => {
    const result = unflattenWith({ 'a.5000': 1 });
    expect(Array.isArray(result.a)).toBe(name !== 'flattify');
  });

  test('Bracket notation and JSON Pointer: the other libraries write `a.0` and have no such option', () => {
    const options = { notation: 'bracket' } as never;
    expect(flatten({ a: [1] }, { notation: 'bracket' })).toEqual({ 'a[0]': 1 });
    expect(flat({ a: [1] }, options)).toEqual({ 'a.0': 1 });
    expect(flattie({ a: [1] })).toEqual({ 'a.0': 1 });
    expect(esToolkit.flattenObject({ a: [1] }, options)).toEqual({ 'a.0': 1 });
    expect(crush({ a: [1] })).toEqual({ 'a.0': 1 });
  });

  test('get / set with autocompleted paths: the other libraries take any string', () => {
    expectTypeOf(radashiGet).parameter(1).toEqualTypeOf<string>();
    // es-toolkit: a path that does not exist compiles, so the editor has no paths to suggest
    expect(esToolkitGet({ a: { b: 1 } }, 'not.a.path')).toBeUndefined();
    expect('get' in { flat, flattie }).toBe(false);
  });
});

describe('Migrating from flat', () => {
  test('Key with the delimiter: split in two on the way back', () => {
    expect(flat({ 'a.b': 1 })).toEqual({ 'a.b': 1 });
    expect(flatUnflatten({ 'a.b': 1 })).toEqual({ a: { b: 1 } });
  });

  test('maxDepth: 0 means no limit', () => {
    expect(flat({ a: { b: { c: 1 } } }, { maxDepth: 0 })).toEqual({ 'a.b.c': 1 });
  });

  test('unflatten walks into values that are objects', () => {
    expect(flatUnflatten({ a: { 'b.c': 1 } })).toEqual({ a: { b: { c: 1 } } });
  });

  test('unflatten returns anything but an object as it is', () => {
    expect(flatUnflatten('text' as never)).toBe('text');
    expect(flatUnflatten(null as never)).toBe(null);
  });

  test('Class instances are flattened', () => {
    expect(flat({ a: new Point() })).toEqual({ 'a.x': 1 });
  });

  test("Array indices: any number, such as '01' or '1e3'", () => {
    expect(flatUnflatten({ 'a.01': 1 })).toEqual({ a: [undefined, 1] });
    expect((flatUnflatten({ 'a.1e3': 1 }) as { a: unknown[] }).a).toHaveLength(1001);
  });
});
