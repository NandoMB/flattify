import type { Notation } from '../shared/notation.ts';
import type { IsAny, IsUnion, Leaf, MergeVariants, Option, Prettify, ReplaceAll, UnionToIntersection } from '../shared/types.ts';

export interface FlattenOptions {
  /** Joins the keys of a path. Default: `'.'`. */
  delimiter?: string;
  /** `'dot'` (`items.0.id`), `'bracket'` (`items[0].id`) or `'pointer'` (`/items/0/id`, RFC 6901). Default: `'dot'`. */
  notation?: Notation;
  /** Levels to walk into; deeper objects are kept as values. `1` keeps the top-level keys only. Default: `Infinity`. */
  maxDepth?: number;
  /** Keeps arrays as values instead of flattening them to index keys. Default: `false`. */
  safe?: boolean;
  /** Keeps empty objects and arrays as values, so `unflatten` restores them. Default: `true`. */
  keepEmpty?: boolean;
  /** Escapes `\` and the delimiter inside keys (`'a.b'` → `'a\\.b'`), so `unflatten` restores them. Default: `true`. */
  escape?: boolean;
  /** What to do when an object contains itself: throw a `TypeError` or skip the key. Default: `'throw'`. */
  circular?: 'throw' | 'skip';
  /** Renames each object key before it is joined; array indices are left alone. Keys are typed as `string`. */
  transformKey?: (key: string) => string;
  /** Return `true` to keep an object or array as a value at `path` instead of walking into it. Keys are typed as `string`. */
  preserve?: (path: string, value: unknown) => boolean;
}

/** Nesting levels TypeScript expands before typing deeper paths as `unknown`. */
type TypeDepthLimit = 10;

interface Context {
  delimiter: string;
  notation: Notation;
  maxDepth: number | undefined;
  safe: boolean;
  keepEmpty: boolean;
  escape: boolean;
}

type Kind<V, C extends Context> = V extends Leaf ? 'leaf' : V extends readonly unknown[] ? (C['safe'] extends true ? 'leaf' : 'array') : V extends object ? ([keyof V] extends [never] ? 'unknown' : 'object') : 'leaf';

type LeavesOf<V, C extends Context> = V extends unknown ? (Kind<V, C> extends 'leaf' ? V : never) : never;
type ContainersOf<V, C extends Context> = V extends unknown ? (Kind<V, C> extends 'leaf' ? never : V) : never;

/** Mirrors `escapeKey`: see `src/shared/path.ts`. `X` is `'['` in bracket notation. */
type EscapeKey<K extends string, D extends string, X extends string> = NeedsEscape<K, D, X> extends true
  ? D extends `${infer First}${string}`
    ? ReplaceAll<ReplaceAll<ReplaceAll<K, '\\', '\\\\'>, First, `\\${First}`>, X, `\\${X}`>
    : K
  : K;
type NeedsEscape<K extends string, D extends string, X extends string> = K extends `${string}\\${string}` | `${string}${D}${string}` | `${string}${X}${string}` ? true : [Overlaps<D>] extends [never] ? false : K extends `${string}${Overlaps<D>}` ? true : false;
/** Proper prefixes of the delimiter that overlap with it: `':'` for `'::'`, as `':' + '::'` starts with `'::'`. */
type Overlaps<D extends string> = Prefixes<D> extends infer P ? (P extends string ? (`${P}${D}` extends `${D}${string}` ? P : never) : never) : never;
type Prefixes<D extends string, Acc extends string = ''> = D extends `${infer Char}${infer Rest}` ? (Rest extends '' ? never : `${Acc}${Char}` | Prefixes<Rest, `${Acc}${Char}`>) : never;
/** Mirrors `pathFormat().join`: appends key `K` to path `P` (the top level is at depth `[]`). */
type Join<P extends string, K extends string | number, IsIndex extends boolean, D extends unknown[], C extends Context> = C['notation'] extends 'pointer'
  ? `${P}/${K extends string ? ReplaceAll<ReplaceAll<K, '~', '~0'>, '/', '~1'> : K}`
  : C['notation'] extends 'bracket'
    ? IsIndex extends true
      ? `${P}[${K}]`
      : JoinKey<P, K extends string ? (C['escape'] extends true ? EscapeKey<K, C['delimiter'], '['> : K) : `${K}`, D, C>
    : JoinKey<P, K extends string ? (C['escape'] extends true ? EscapeKey<K, C['delimiter'], never> : K) : `${K}`, D, C>;
type JoinKey<P extends string, K extends string, D extends unknown[], C extends Context> = D extends [] ? K : `${P}${C['delimiter']}${K}`;

/** Any path below `K`, for values whose shape is unknown. */
type Below<K extends string, C extends Context> = C['notation'] extends 'pointer' ? `${K}/${string}` : C['notation'] extends 'bracket' ? `${K}${C['delimiter']}${string}` | `${K}[${string}` : `${K}${C['delimiter']}${string}`;

/** `?` is skipped for template keys (`` `tags.${number}.name` ``): they are index signatures, where it would only add `undefined`. */
type Field<K extends string, V, Optional extends boolean> = [V] extends [never] ? {} : Optional extends true ? ({} extends Record<K, 1> ? { [_ in K]: V } : { [_ in K]?: V }) : { [_ in K]: V };

/** `true` when the container at depth `D` (the top-level one is `[]`) is walked into its children. */
type CanDescend<D extends unknown[], C extends Context> = C['maxDepth'] extends number ? ([...D, unknown]['length'] extends C['maxDepth'] ? false : true) : true;

/** An empty container flattens to itself when `keepEmpty` is on: the key is required if it is always empty. */
type EmptyField<V, K extends string, C extends Context> = C['keepEmpty'] extends true
  ? V extends readonly unknown[]
    ? V extends readonly [] ? { [_ in K]: [] } : [] extends V ? Field<K, [], true> : {}
    : {} extends V ? Field<K, Record<string, never>, true> : {}
  : {};

type Nested<V, K extends string, D extends unknown[], C extends Context> = V extends unknown
  ? Kind<V, C> extends 'unknown'
    ? { [_ in K | Below<K, C>]?: unknown }
    : Prettify<FlatContainer<V, K, [...D, unknown], C> & EmptyField<V, K, C>>
  : never;

/** The flattened keys contributed by one property: `K` itself for leaf values, the paths below it for containers. */
type Property<V, K extends string, Optional extends boolean, D extends unknown[], C extends Context> =
  IsAny<V> extends true
    ? { [_ in K]: any }
    : CanDescend<D, C> extends false
      ? Field<K, V, Optional>
      : D['length'] extends TypeDepthLimit
        ? { [_ in K | Below<K, C>]?: unknown }
        : [ContainersOf<V, C>] extends [never]
          ? Field<K, LeavesOf<V, C>, Optional>
          : Mixed<Exclude<LeavesOf<V, C>, Optional extends true ? undefined : never>, NestedMerged<ContainersOf<V, C>, K, D, C>, K, Optional>;

/**
 * The `infer` hides the recursive type from the constraint of `MergeVariants`: TypeScript 5.0 reports
 * a circular constraint otherwise.
 */
type NestedMerged<V, K extends string, D extends unknown[], C extends Context> = [Nested<V, K, D, C>] extends [infer N] ? MergeVariants<N> : never;

/**
 * A property holding a container, possibly alongside leaf values (`Address | null`). The paths below it
 * are only certain when the property is required and always holds a container.
 */
type Mixed<L, N, K extends string, Optional extends boolean> = Field<K, L, true> & ([L] extends [never] ? (Optional extends true ? Partial<N> : N) : Partial<N>);

type ObjectEntries<T, P extends string, IsArray extends boolean, D extends unknown[], C extends Context> = UnionToIntersection<
  { [K in keyof T]-?: K extends string | number ? Property<T[K], Join<P, K, IsArray, D, C>, IsOptional<T, K>, D, C> : {} }[keyof T]
>;

/** Index signatures (`[key: string]: V`) are left required: `?` would add `undefined` to their values. */
type IsOptional<T, K extends keyof T> = string extends K ? false : number extends K ? false : {} extends Pick<T, K> ? true : false;

type TupleEntries<T extends readonly unknown[]> = { [K in keyof T as K extends `${number}` ? K : never]: T[K] };

type FlatContainer<T, P extends string, D extends unknown[], C extends Context> = T extends readonly unknown[]
  ? number extends T['length']
    ? Property<T[number], Join<P, `${number}`, true, D, C>, false, D, C>
    : ObjectEntries<TupleEntries<T>, P, true, D, C>
  : ObjectEntries<T, P, false, D, C>;

type IsWide<C extends Context> = string extends C['delimiter'] ? true : IsUnion<C['notation']> extends true ? true : number extends C['maxDepth'] ? true : boolean extends C['safe'] ? true : boolean extends C['keepEmpty'] ? true : boolean extends C['escape'] ? true : false;

/**
 * The object returned by `flatten(T, O)`: one key per path, typed with the value found there.
 *
 * Options only known at runtime (a `string` delimiter, `transformKey`, `preserve`...) make the keys
 * `string`, as the paths can no longer be computed.
 *
 * @example
 * ```ts
 * type User = Flatten<{ name: string; tags: string[] }>;
 * // { name: string; [x: `tags.${number}`]: string; tags?: [] }
 * ```
 */
export type Flatten<T, O extends FlattenOptions = {}> =
  IsAny<T> extends true
    ? Record<string, any>
    : [Option<O, 'transformKey', never> | Option<O, 'preserve', never>] extends [never]
      ? FlattenWith<T, {
          delimiter: Option<O, 'delimiter', '.'>;
          notation: Option<O, 'notation', 'dot'>;
          maxDepth: Option<O, 'maxDepth', undefined>;
          safe: Option<O, 'safe', false>;
          keepEmpty: Option<O, 'keepEmpty', true>;
          escape: Option<O, 'escape', true>;
        }>
      : Record<string, unknown>;

type FlattenWith<T, C extends Context> = IsWide<C> extends true ? Record<string, unknown> : T extends unknown ? Prettify<FlatContainer<T, '', [], C>> : never;
