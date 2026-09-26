import type { Below, ContainersOf, Context, Join, Kind, TupleEntries, TypeDepthLimit } from '../flatten/types.ts';
import type { Notation } from '../shared/notation.ts';
import type { Segments } from '../shared/path-types.ts';
import type { IsAny, IsUnion, Option } from '../shared/types.ts';

/** How the paths given to the `flattify/path` helpers are written. */
export interface PathOptions {
  /** Separates the keys of a path. Default: `'.'`. */
  delimiter?: string;
  /** `'dot'` (`items.0.id`), `'bracket'` (`items[0].id`) or `'pointer'` (`/items/0/id`, RFC 6901). Default: `'dot'`. */
  notation?: Notation;
  /** Reads `\` as an escape, so `'a\\.b'` is the single key `'a.b'`. Default: `true`. */
  escape?: boolean;
}

/** Options of `set`: how the path is written, and what is created for missing keys. */
export interface SetOptions extends PathOptions {
  /** Creates objects only, never arrays, for missing keys along the path. Default: `false`. */
  object?: boolean;
  /** Largest index that creates an array for a missing key; larger ones create an object. Default: `1000`. */
  arrayLimit?: number;
}

type ContextOf<O> = {
  delimiter: Option<O, 'delimiter', '.'>;
  notation: Option<O, 'notation', 'dot'>;
  escape: Option<O, 'escape', true>;
  maxDepth: undefined;
  safe: false;
  keepEmpty: true;
};

type IsWide<C extends Context> = string extends C['delimiter'] ? true : IsUnion<C['notation']> extends true ? true : boolean extends C['escape'] ? true : false;

type PathsOf<T, P extends string, D extends unknown[], C extends Context> = T extends readonly unknown[]
  ? number extends T['length']
    ? Node<T[number], Join<P, `${number}`, true, D, C>, D, C>
    : Entries<TupleEntries<T>, P, true, D, C>
  : Entries<T, P, false, D, C>;

type Entries<T, P extends string, IsArray extends boolean, D extends unknown[], C extends Context> = { [K in keyof T]-?: K extends string | number ? Node<T[K], Join<P, K, IsArray, D, C>, D, C> : never }[keyof T];

type Node<V, K extends string, D extends unknown[], C extends Context> =
  IsAny<V> extends true ? K | Below<K, C> : K | (D['length'] extends TypeDepthLimit ? Below<K, C> : Nested<ContainersOf<V, C>, K, D, C>);

type Nested<V, K extends string, D extends unknown[], C extends Context> = V extends unknown ? (Kind<V, C> extends 'unknown' ? Below<K, C> : [PathsOf<V, K, [...D, unknown], C>] extends [infer Paths] ? Paths : never) : never;

/**
 * Every path of `T`, to an object, an array or a value: what `get`, `set`, `has` and `del` accept.
 *
 * @example
 * ```ts
 * type P = Path<{ user: { tags: string[] } }>;
 * // 'user' | 'user.tags' | `user.tags.${number}`
 * ```
 */
export type Path<T, O extends PathOptions = {}> = IsAny<T> extends true ? string : IsWide<ContextOf<O>> extends true ? string : T extends unknown ? ([PathsOf<T, '', [], ContextOf<O>>] extends [infer Paths extends string] ? Paths : never) : never;

/** One step of `Walk`. `Get` is `true` when reading, where arrays and records may miss the key. */
type Step<T, K extends string, Get extends boolean> = T extends unknown
  ? IsAny<T> extends true
    ? any
    : unknown extends T
      ? unknown
      : T extends null | undefined
        ? undefined
        : T extends readonly unknown[]
          ? number extends T['length']
            ? K extends `${number}` ? T[number] | (Get extends true ? undefined : never) : undefined
            : K extends keyof T ? T[K] : undefined
          : [keyof T] extends [never]
            ? unknown
            : K extends keyof T
              ? T[K] | (string extends keyof T ? (Get extends true ? undefined : never) : never)
              : K extends `${infer N extends number}`
                ? N extends keyof T ? T[N] : IndexValue<T, Get>
                : IndexValue<T, Get>
  : never;

type IndexValue<T, Get extends boolean> = string extends keyof T ? T[string & keyof T] | (Get extends true ? undefined : never) : undefined;

type Walk<T, S, Get extends boolean> = S extends [infer K extends string, ...infer Rest] ? Walk<Step<T, K, Get>, Rest, Get> : S extends [] ? T : unknown;

/**
 * The value at path `P` of `T`. Array elements and record values may be missing, so they include
 * `undefined`, as with `noUncheckedIndexedAccess`.
 *
 * @example
 * ```ts
 * type City = Get<{ user: { address: { city: string } } }, 'user.address.city'>; // string
 * type Tag = Get<{ tags: string[] }, 'tags.0'>; // string | undefined
 * ```
 */
export type Get<T, P extends string, O extends PathOptions = {}> = IsAny<T> extends true
  ? any
  : string extends P
    ? unknown
    : IsWide<ContextOf<O>> extends true
      ? unknown
      : [Segments<P, ContextOf<O>>] extends [infer S] ? Walk<T, S, true> : never;

/** The type `set` accepts at path `P` of `T`. */
export type SetValue<T, P extends string, O extends PathOptions = {}> = IsAny<T> extends true
  ? any
  : string extends P
    ? unknown
    : IsWide<ContextOf<O>> extends true
      ? unknown
      : [Segments<P, ContextOf<O>>] extends [infer S] ? Walk<T, S, false> : never;
