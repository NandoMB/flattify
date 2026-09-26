import type { Notation } from '../shared/notation.ts';
import type { Split } from '../shared/path-types.ts';
import type { IsAny, IsUnion, Option, Prettify } from '../shared/types.ts';

/** Options of `unflatten`. Each one also changes the inferred type of the result. */
export interface UnflattenOptions {
  /** Splits the keys into paths. Default: `'.'`. */
  delimiter?: string;
  /**
   * `'dot'` (`items.0.id`), `'bracket'` (`items[0].id`, also `items[0][id]` as in form fields) or
   * `'pointer'` (`/items/0/id`, RFC 6901: every key must start with `/`). Default: `'dot'`.
   */
  notation?: Notation;
  /** Builds objects only: `{ 'list.0': 'a' }` becomes `{ list: { 0: 'a' } }` instead of `{ list: ['a'] }`. Default: `false`. */
  object?: boolean;
  /** Lets a later key replace a value in its way (`{ a: 1, 'a.b': 2 }` → `{ a: { b: 2 } }`). Otherwise the later key is skipped. Default: `false`. */
  overwrite?: boolean;
  /** Reads `\` as an escape, so `'a\\.b'` is the single key `'a.b'`, as `flatten` writes it. Default: `true`. */
  escape?: boolean;
  /**
   * Largest index turned into an array element; objects with a larger index key stay objects, so
   * `{ 'a.4294967294': 1 }` cannot allocate a huge sparse array. Default: `1000`.
   */
  arrayLimit?: number;
  /**
   * Returns an array: the top-level keys are its indices, as `flatten` writes them for an array
   * (`{ '0.id': 1, '1.id': 2 }` → `[{ id: 1 }, { id: 2 }]`). Throws a `TypeError` if a top-level key is
   * not an index up to `arrayLimit`. Default: `false`, the result is always an object.
   */
  asArray?: boolean;
  /** Renames each key of the path before it is set; array indices are left alone. The result is typed as `Record<string, unknown>`. */
  transformKey?: (key: string) => string;
}

interface Context {
  delimiter: string;
  notation: Notation;
  escape: boolean;
  object: boolean;
}

type SplitKey<K, C extends Context> = K extends string | number ? Split<`${K}`, C> : never;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Template keys (`` `tags.${number}` ``) come from arrays and records, which always exist once flattened. */
type IsRequiredKey<T, K extends keyof T> = {} extends Record<K, 1> ? true : {} extends Pick<T, K> ? false : true;

type Heads<T, C extends Context> = { [K in keyof T]-?: SplitKey<K, C>[0] }[keyof T];
type RequiredHeads<T, C extends Context> = { [K in keyof T]-?: IsRequiredKey<T, K> extends true ? SplitKey<K, C>[0] : never }[keyof T];

/** The keys below `H`, with `H` and the delimiter removed. */
type Children<T, H, C extends Context> = { [K in keyof T as SplitKey<K, C> extends [infer Head, infer Rest extends string] ? (Same<Head, H> extends true ? Rest : never) : never]: T[K] };
/** The values set at `H` itself. */
type LeafValues<T, H, C extends Context> = { [K in keyof T]-?: SplitKey<K, C> extends [infer Head, never] ? (Same<Head, H> extends true ? T[K] : never) : never }[keyof T];

/** Empty containers kept by `flatten`, already covered by the keys below the same path. */
type EmptyMarker = [] | readonly [] | Record<string, never>;

type Value<T, H, C extends Context> = [keyof Children<T, H, C>] extends [never]
  ? LeafValues<T, H, C>
  : Exclude<LeafValues<T, H, C>, EmptyMarker> | ([Children<T, H, C>] extends [infer Nested] ? ToArray<Build<Nested, C>, C> : never);

type Build<T, C extends Context> = Prettify<{ [H in RequiredHeads<T, C>]: Value<T, H, C> } & { [H in Exclude<Heads<T, C>, RequiredHeads<T, C>>]?: Value<T, H, C> }>;

type ToTuple<T, Acc extends unknown[] = []> = `${Acc['length']}` extends keyof T ? ToTuple<T, [...Acc, T[`${Acc['length']}` & keyof T]]> : Acc;

/** Objects whose keys are all array indices become arrays (tuples for `0..n` literal indices), as at runtime. */
type ToArray<T, C extends Context> = C['object'] extends true
  ? T
  : [keyof T] extends [never]
    ? T
    : [keyof T] extends [`${number}`]
      ? `${number}` extends keyof T
        ? T[keyof T][]
        : ToTuple<T> extends infer Tuple extends unknown[]
          ? Same<keyof T, Extract<keyof Tuple, `${number}`>> extends true ? Tuple : T[keyof T][]
          : never
      : T;

type IsWide<C extends Context> = string extends C['delimiter'] ? true : IsUnion<C['notation']> extends true ? true : boolean extends C['escape'] ? true : boolean extends C['object'] ? true : false;

/**
 * The object returned by `unflatten(T, O)`: the flat keys of `T` split into a nested object, with arrays
 * for index keys. `Unflatten<Flatten<T>>` gives back `T` for plain data.
 *
 * @example
 * ```ts
 * type User = Unflatten<{ 'user.name': string; [x: `user.tags.${number}`]: string }>;
 * // { user: { name: string; tags: string[] } }
 *
 * type Users = Unflatten<{ [x: `${number}.id`]: number }, { asArray: true }>;
 * // { id: number }[]
 * ```
 */
export type Unflatten<T, O extends UnflattenOptions = {}> = Root<
  IsAny<T> extends true
    ? Record<string, any>
    : [Option<O, 'transformKey', never>] extends [never]
      ? UnflattenWith<T, { delimiter: Option<O, 'delimiter', '.'>; notation: Option<O, 'notation', 'dot'>; escape: Option<O, 'escape', true>; object: Option<O, 'object', false> }>
      : Record<string, unknown>,
  Option<O, 'asArray', false>
>;

/** With `asArray`, an array of the top-level values; `never` when a key is known not to be an index, as the call throws. */
type Root<R, AsArray> = AsArray extends true ? (R extends unknown ? RootArray<R> : never) : R;
type RootArray<R> = [keyof R] extends [never]
  ? []
  : string extends keyof R
    ? R[keyof R][]
    : [keyof R] extends [`${number}`]
      ? ToArray<R, { delimiter: '.'; notation: 'dot'; escape: true; object: false }>
      : never;

type UnflattenWith<T, C extends Context> = IsWide<C> extends true ? Record<string, unknown> : T extends unknown ? Build<T, C> : never;
