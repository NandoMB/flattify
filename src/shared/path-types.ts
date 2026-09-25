import type { Notation } from './notation.ts';
import type { ReplaceAll } from './types.ts';

/** The options that decide how a path is written. */
export interface PathContext {
  delimiter: string;
  notation: Notation;
  escape: boolean;
}

/** Walks a key that contains `\` one character at a time, mirroring `splitPath`. */
type SplitEscaped<K extends string, D extends string, Acc extends string = ''> = K extends `\\${infer Char}${infer Rest}`
  ? SplitEscaped<Rest, D, `${Acc}${Char}`>
  : K extends `${D}${infer Rest}`
    ? [Acc, Rest]
    : K extends `${infer Char}${infer Rest}`
      ? SplitEscaped<Rest, D, `${Acc}${Char}`>
      : [`${Acc}${K}`, never];

/** `[first key, rest of the path]`, or `[key, never]` for the last key of a path. Mirrors `pathFormat().split`. */
export type Split<K extends string, C extends PathContext> = C['notation'] extends 'pointer'
  ? SplitPointer<K>
  : C['notation'] extends 'bracket'
    ? SplitBracket<K, C['delimiter'], C['escape']>
    : C['escape'] extends true
      ? K extends `${infer Head}${C['delimiter']}${infer Rest}`
        ? Head extends `${string}\\${string}` ? SplitEscaped<K, C['delimiter']> : [Head, Rest]
        : K extends `${string}\\${string}` ? SplitEscaped<K, C['delimiter']> : [K, never]
      : K extends `${infer Head}${C['delimiter']}${infer Rest}`
        ? [Head, Rest]
        : [K, never];

type Unpointer<S extends string> = ReplaceAll<ReplaceAll<S, '~1', '/'>, '~0', '~'>;
type SplitPointer<K extends string> = K extends `/${infer Path}` ? (Path extends `${infer Head}/${infer Rest}` ? [Unpointer<Head>, `/${Rest}`] : [Unpointer<Path>, never]) : never;

type SplitBracket<K extends string, D extends string, E extends boolean, Acc extends string = ''> = K extends `[${infer Inner}]${infer Rest}`
  ? Acc extends '' ? [Inner, Rest extends '' ? never : Rest extends `${D}${infer After}` ? After : Rest] : [Acc, K]
  : E extends true
    ? K extends `\\${infer Char}${infer Rest}`
      ? SplitBracket<Rest, D, E, `${Acc}${Char}`>
      : SplitBracketNext<K, D, E, Acc>
    : SplitBracketNext<K, D, E, Acc>;
type SplitBracketNext<K extends string, D extends string, E extends boolean, Acc extends string> = K extends `${D}${infer Rest}`
  ? [Acc, Rest]
  : K extends `${infer Char}${infer Rest}`
    ? SplitBracket<Rest, D, E, `${Acc}${Char}`>
    : [`${Acc}${K}`, never];

/** Every key of a path, in order: `Segments<'a.b[0]', bracket>` is `['a', 'b', '0']`. */
export type Segments<P extends string, C extends PathContext> = Split<P, C> extends [infer Head extends string, infer Rest] ? ([Rest] extends [never] ? [Head] : Rest extends string ? [Head, ...Segments<Rest, C>] : [Head]) : string[];
