/** Flattens intersections so editors show the resulting keys instead of the type expression. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsUnion<T, All = T> = [T] extends [never] ? false : T extends unknown ? ([All] extends [T] ? false : true) : never;

/**
 * Values that are never walked into, mirroring `isPlainObject` at runtime. TypeScript cannot tell a
 * class instance from a plain object, so only built-ins are listed.
 */
export type Leaf =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | null
  | undefined
  | ((...args: never[]) => unknown)
  | Date
  | RegExp
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | PromiseLike<unknown>
  | ArrayBuffer
  | ArrayBufferView;

/** Replaces every `From` in `S`. Non-literal strings are returned as they are. */
export type ReplaceAll<S extends string, From extends string, To extends string> = string extends S ? S : S extends `${infer Head}${From}${infer Tail}` ? `${Head}${To}${ReplaceAll<Tail, From, To>}` : S;

/**
 * Reads option `K` from an options type: `Default` when it is missing or `undefined`. A value only known
 * at runtime (`string`, `boolean`...) comes back as that wide type.
 */
export type Option<O, K extends PropertyKey, Default> = K extends keyof O ? ([Exclude<O[K & keyof O], undefined>] extends [never] ? Default : Exclude<O[K & keyof O], undefined>) : Default;

/**
 * Merges the flattened variants of a union: a key is required only when every variant has it, and its
 * value is the union of the values of the variants that have it.
 */
export type MergeVariants<U> = IsUnion<U> extends true ? Prettify<{ [K in KeysOf<U> as IsRequiredInAll<U, K> extends true ? K : never]: ValueIn<U, K> } & { [K in KeysOf<U> as IsRequiredInAll<U, K> extends true ? never : K]?: ValueIn<U, K> }> : U;

type KeysOf<U> = U extends unknown ? keyof U : never;
type ValueIn<U, K extends PropertyKey> = U extends unknown ? (K extends keyof U ? U[K & keyof U] : never) : never;
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type IsRequiredInAll<U, K extends PropertyKey> = [U extends unknown ? (K extends RequiredKeys<U> ? never : 1) : never] extends [never] ? true : false;
