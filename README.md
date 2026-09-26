# [flattify](https://github.com/NandoMB/flattify)

[![npm version](https://img.shields.io/npm/v/flattify.svg)](https://www.npmjs.com/package/flattify)
[![JSR](https://jsr.io/badges/@nandomb/flattify)](https://jsr.io/@nandomb/flattify)
[![JSR Score](https://jsr.io/badges/@nandomb/flattify/score)](https://jsr.io/@nandomb/flattify)
[![CI](https://github.com/NandoMB/flattify/actions/workflows/main.yml/badge.svg)](https://github.com/NandoMB/flattify/actions/workflows/main.yml)
[![npm downloads](https://img.shields.io/npm/dm/flattify.svg)](https://www.npmjs.com/package/flattify)
[![license](https://img.shields.io/npm/l/flattify.svg)](./LICENSE)
[![Socket Badge](https://badge.socket.dev/npm/package/flattify)](https://socket.dev/npm/package/flattify)

Turn nested objects into flat `path → value` pairs **and back, without losing anything on the way**, with every path and value **inferred by TypeScript**.

- **Your data comes back exactly as it went:** dates, class instances, `null`, empty objects, keys with dots in them, key order. [Nothing is dropped or changed](#data-integrity)
- **Safe on untrusted input:** no prototype pollution, no stack overflow on deep or circular objects, no huge arrays from hostile indices
- **Typed end to end:** hover the result to see every path; `get` and `set` autocomplete paths and check values
- **Three notations:** `a.b.0`, `a.b[0]` (as in HTML forms) and `/a/b/0` (JSON Pointer)
- **Checked, not claimed:** 100% test coverage, thousands of random round trips per run, and every [comparison](#why-flattify) with other libraries verified in CI
- Zero dependencies, ESM and CommonJS, on [npm](https://www.npmjs.com/package/flattify) and [JSR](https://jsr.io/@nandomb/flattify). Runs on Node.js, Bun, Deno, browsers and Cloudflare Workers

> Upgrading from flattify 1.x? See [Migrating](#migrating).

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Data integrity](#data-integrity)
- [Why flattify?](#why-flattify)
- [Use cases](#use-cases)
- [API](#api): [`flatten`](#flatteninput-options), [`unflatten`](#unflatteninput-options), [notations](#notations), [`flattify/path`](#flattifypath)
- [Types](#types)
- [Limitations](#limitations)
- [Compatibility](#compatibility)
- [Migrating](#migrating)
- [Security](#security)

## Installation

```sh
npm add flattify    # or: pnpm add flattify / yarn add flattify
```
###### Deno, Bun and Node.js from JSR
```sh
deno add jsr:@nandomb/flattify
npx jsr add @nandomb/flattify    # or: bunx jsr add @nandomb/flattify
```

## Quick start

```ts
import { flatten, unflatten } from 'flattify';
// CommonJS: const { flatten, unflatten } = require('flattify');

const order = {
  id: 1042,
  customer: { name: 'Ada Lovelace' },
  items: [
    { sku: 'BOOK-1', qty: 2 },
    { sku: 'PEN-7', qty: 1 },
  ],
  shipping: { method: null },
  'utm.source': 'newsletter',
};

const flat = flatten(order);
// {
//   'id': 1042,
//   'customer.name': 'Ada Lovelace',
//   'items.0.sku': 'BOOK-1',
//   'items.0.qty': 2,
//   'items.1.sku': 'PEN-7',
//   'items.1.qty': 1,
//   'shipping.method': null,
//   'utm\\.source': 'newsletter',   // escaped, so the dot survives the way back
// }

const back = unflatten(flat); // equals `order` again
```

Both results are typed, so the editor knows every path:

```ts
flat['items.0.sku'];      // string
flat['customer.phone'];   // ❌ Property 'customer.phone' does not exist
back.items[0].sku;        // string
```

`flatten` and `unflatten` are a round trip, like serializing and deserializing, except that both sides stay JavaScript objects: only the shape changes. A lot of data already arrives flat, too: form fields, query strings, environment variables, CSV columns. `unflatten` turns it into the object your code wants, safely.

## Data integrity

Most libraries lose something on the way: a `Date` becomes `{}`, `null` disappears, an empty list vanishes, `'utm.source'` is split in two. flattify keeps all of it:

```ts
const input = {
  createdAt: new Date(),
  price: new Money(1990),   // a class instance
  discount: null,
  coupon: undefined,
  items: [],
  meta: {},
  'utm.source': 'newsletter',
  sizes: ['S', , 'L'],      // an array with a hole
};

const back = unflatten(flatten(input));

back.createdAt === input.createdAt;  // true: the same Date, not {} or a copy
back.price instanceof Money;         // true
back.discount;                       // null
'coupon' in back;                    // true
back.items;                          // []
back['utm.source'];                  // 'newsletter', still one key
1 in back.sizes;                     // false: the hole is still a hole
```

- **Values are never converted:** only plain objects and arrays are walked. `Date`, `Map`, `Set`, `RegExp`, typed arrays, functions and class instances are kept as they are, by reference
- **Nothing is dropped:** `null`, `undefined`, empty objects and empty arrays are kept
- **Keys stay whole:** a key that contains the delimiter is escaped (`'utm\\.source'`); keys without it are never changed
- **Order is kept:** keys come out depth first, in the order of the input, and come back in the same order
- **Your input is never modified:** `unflatten` copies the objects it finds in its input before adding keys to them
- **No surprise arrays:** only indices such as `0` or `42` build arrays, up to [`arrayLimit`](#unflatteninput-options); `'01'` or `'1e3'` stay object keys
- **Circular data is reported** with its path, instead of freezing or crashing the process; **any depth** is handled, even 100,000 levels

Each guarantee is covered by the test suite, and the round trip is checked on thousands of random objects on every run ([fast-check](https://fast-check.dev)), for every notation.

## Why flattify?

Every row is checked by [`bench/claims.spec.ts`](./bench/claims.spec.ts) against flat 6.0.1, flattie 1.1.1, nestie 1.0.3, es-toolkit 1.52.0 and radashi 12.9.6, on every change in CI (`pnpm claims`).

| | flattify | [flat](https://www.npmjs.com/package/flat) | [flattie](https://www.npmjs.com/package/flattie) / [nestie](https://www.npmjs.com/package/nestie) | [es-toolkit](https://www.npmjs.com/package/es-toolkit) | [radashi](https://www.npmjs.com/package/radashi) |
| --- | --- | --- | --- | --- | --- |
| Keys with the delimiter survive the round trip | ✅ | ❌ | ❌ | – | ❌ |
| Keeps `Date` and `Map` as values | ✅ | ✅ | ❌ dropped | ✅ | ✅ |
| Keeps class instances as values | ✅ | ❌ | ❌ | ✅ | ❌ |
| Keeps `null` values | ✅ | ✅ | ❌ dropped | ✅ | ✅ |
| Keeps empty objects and arrays | ✅ | ✅ | ❌ dropped | ✅ | ❌ dropped |
| Circular references | ✅ clear error | ❌ stack overflow | ❌ stack overflow | ❌ stack overflow | ❌ stack overflow |
| Deeply nested input (100k levels) | ✅ | ❌ stack overflow | ❌ stack overflow | ❌ stack overflow | ❌ stack overflow |
| Limit on array indices when unflattening | ✅ | ❌ | ❌ | – | ❌ |
| Paths and values inferred by TypeScript | ✅ | ❌ you pass the type | ❌ | ❌ `Record<string, any>` | ❌ `Record<string, …>` |
| `unflatten` | ✅ | ✅ | ✅ | ❌ | ✅ |
| Bracket notation and JSON Pointer | ✅ | ❌ | ❌ | ❌ | ❌ |
| `get` / `set` with autocompleted paths | ✅ | ❌ | ❌ | ❌ | ❌ |
| ESM and CommonJS | ✅ | ❌ v6 is ESM only | ✅ | ✅ | ✅ |
| Size (min + gzip) | 2.4 kB | 0.7 kB | 0.35 kB | 0.34 kB | 0.8 kB |

flattify is bigger because it does more: the checks above, three notations, escaping and clear error messages. `flattify/path` is a separate import, so it only counts when you use it.

## Use cases

**HTML forms:** field names such as `address[city]` or `items[0][qty]` become a nested object. Keys like `__proto__[isAdmin]` sent by a malicious client are ignored.

```ts
const body = unflatten(Object.fromEntries(new FormData(form)), { notation: 'bracket' });
// { name: 'Ada', address: { city: 'London' }, items: [{ sku: 'BOOK-1', qty: '2' }] }
```

**Query strings**, both ways:

```ts
const flat = flatten({ status: 'open', tags: ['a', 'b'] }, { notation: 'bracket' });
const query = new URLSearchParams(Object.entries(flat).map(([k, v]) => [k, String(v)]));
// status=open&tags[0]=a&tags[1]=b (with the brackets percent-encoded)

unflatten(Object.fromEntries(new URLSearchParams(location.search)), { notation: 'bracket' });
// { status: 'open', tags: ['a', 'b'] }
```

**Environment variables:** with `'__'` as delimiter, `APP__DB__MAX_CONN` is `app.db.max_conn`.

```ts
const env = unflatten(process.env, { delimiter: '__', transformKey: (key) => key.toLowerCase() });
env.app; // { db: { host: 'localhost', max_conn: '10' } }
```

**API lists → CSV or spreadsheets:** one row per record, and the keys are the headers.

```ts
const rows = users.map((user) => flatten(user));
// [{ id: 1, name: 'Ada', 'address.city': 'London' }, ...]

// Or flatten the whole list into one object, and get the list back:
const same = unflatten(flatten(users), { asArray: true });
```

**Partial updates in MongoDB:** `$set` with flat paths changes only the given fields.

```ts
await users.updateOne({ _id }, { $set: flatten({ profile: { name: 'Ada' } }) });
// $set: { 'profile.name': 'Ada' }: the other profile fields are kept
```

**JSON Schema errors:** validators such as Ajv point to errors with JSON Pointers, which `get` reads directly.

```ts
get(data, error.instancePath, { notation: 'pointer' }); // e.g. '/items/0/qty'
```

Also: translation files (`messages['home.title']`, typed), structured logs for Datadog or Elasticsearch, and finding what changed between two objects by comparing their flat forms.

## API

### `flatten(input, options?)`

Takes a plain object or an array, and returns a new flat object. Values are not cloned.

| Option | Default | |
| --- | --- | --- |
| `delimiter` | `'.'` | Joins the keys: `{ delimiter: '__' }` → `db__host` |
| `notation` | `'dot'` | `'dot'`, `'bracket'` or `'pointer'`, see [notations](#notations) |
| `maxDepth` | `Infinity` | Levels to walk into; deeper objects are kept as values. `1` keeps the top-level keys only |
| `safe` | `false` | Keeps arrays as values: `{ 'user.tags': ['a', 'b'] }` instead of `user.tags.0`, `user.tags.1` |
| `keepEmpty` | `true` | Keeps empty objects and arrays; `false` drops them |
| `escape` | `true` | Escapes keys that contain the delimiter (`'utm\\.source'`); `false` leaves them as they are |
| `circular` | `'throw'` | On a circular reference, throws a `TypeError` with its path, or `'skip'` leaves the key out |
| `transformKey` | | Renames each object key: `(key) => key.toUpperCase()`. Keys are then typed as `string` |
| `preserve` | | `(path, value) => boolean`: `true` keeps that object or array as a value |

With a longer delimiter, only keys that would really be ambiguous are escaped: with `'__'`, `MAX_CONN` stays as it is, but `MAX_` (which would merge with the delimiter) is escaped.

### `unflatten(input, options?)`

Takes a flat object, and returns a new nested object. Keys that are array indices build arrays, whatever their order; the top level is always an object, unless `asArray` is set.

| Option | Default | |
| --- | --- | --- |
| `delimiter` | `'.'` | Splits the keys into paths |
| `notation` | `'dot'` | `'dot'`, `'bracket'` or `'pointer'`, see [notations](#notations) |
| `asArray` | `false` | Returns an array: `{ '0.id': 1, '1.id': 2 }` → `[{ id: 1 }, { id: 2 }]`. A top-level key that is not an index throws |
| `object` | `false` | Never builds arrays: `{ 'list.0': 'a' }` → `{ list: { 0: 'a' } }` |
| `overwrite` | `false` | When a path goes through a value (`{ a: 1, 'a.b': 2 }`), replaces it (`{ a: { b: 2 } }`) instead of skipping the path |
| `arrayLimit` | `1000` | Larger indices build object keys, so `'a.4294967294'` can't allocate a huge array |
| `escape` | `true` | Reads `\` as an escape, as `flatten` writes it |
| `transformKey` | | Renames each key of the path (not array indices) |

### Notations

Every function takes `notation`, and the inferred types follow it:

| `notation` | Path | Useful for |
| --- | --- | --- |
| `'dot'` (default) | `items.0.sku` | Config, translations, MongoDB, logs |
| `'bracket'` | `items[0].sku` | HTML forms and query strings. `unflatten` also reads `items[0][sku]` |
| `'pointer'` | `/items/0/sku` | [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901): JSON Patch, JSON Schema errors. `~` and `/` are written `~0` and `~1` |

### `flattify/path`

Read and write one value by path, with the path autocompleted and the value typed:

```ts
import { get, set, has, del, paths } from 'flattify/path';

get(order, 'items.0.sku');       // 'BOOK-1', typed string | undefined

set(config, 'db.port', 6543);    // ✅
set(config, 'db.port', '6543');  // ❌ type error: string is not number
set(config, 'db.prot', 6543);    // ❌ type error: no such path
```

| Function | |
| --- | --- |
| `get(obj, path)` | The value at `path`, or `undefined` when a key is missing |
| `set(obj, path, value)` | Sets the value, creating missing objects and arrays; returns `obj` |
| `has(obj, path)` | `true` when every key of the path exists |
| `del(obj, path)` | Deletes the key; `true` when it existed |
| `paths(obj)` | The paths `flatten` produces |
| `parsePath(path)` / `stringifyPath(keys)` | `'a\\.b.c'` ↔ `['a.b', 'c']` |
| `escapeKey(key)` | Escapes one key: `` `user.${escapeKey(field)}` `` |

All of them take `delimiter`, `notation` and `escape` as a last argument, and are safe with untrusted paths.

## Types

Paths and values are computed at the type level, for every option that changes them:

```ts
flatten({ user: { tags: ['admin'] } });
// { [x: `user.tags.${number}`]: string; 'user.tags'?: [] }

flatten({ a: { b: 1 } }, { notation: 'pointer' });
// { '/a/b': number }
```

Arrays give `` `${number}` `` keys and tuples exact indices; optional or nullable objects give optional paths; unions are merged; `Date`, `Map` and other built-ins stay as values. `Unflatten<Flatten<T>>` gives back `T` for plain data. When an option is only known at runtime (a `string` delimiter, `transformKey`, `preserve`), keys are typed as `string` rather than guessed.

Exported types: `Flatten<T, Options>`, `Unflatten<T, Options>`, and from `flattify/path`, `Path<T>`, `Get<T, Path>` and `SetValue<T, Path>`.

## Limitations

- **Some round trips can't be exact:** an object with only index keys (`{ '0': 'a' }`) comes back as an array; an array given to `flatten` comes back as an object unless `unflatten` gets `{ asArray: true }`; `transformKey` needs its reverse on the way back.
- **Symbol keys are ignored**, as by `JSON.stringify`.
- **Types:** TypeScript can't tell a class instance from a plain object, so class instances are typed as if they were flattened. Paths are typed down to 10 levels, and as `unknown` below.
- **Bracket notation:** an empty top-level key holding an array (`{ '': [1] }`) can't be told apart from the array itself.

## Compatibility

| | |
| --- | --- |
| Runtimes | Node.js, Bun, Deno, browsers (ES2015), Cloudflare Workers |
| Modules | ESM and CommonJS |
| TypeScript | 5.0+, any `moduleResolution` |

CI runs the tests on Node.js 22, 24 and 26, Bun, Deno, Chromium, Firefox, WebKit and workerd (the Cloudflare Workers runtime), and checks the package with [publint](https://publint.dev) and [Are the Types Wrong?](https://arethetypeswrong.github.io).

## Migrating

### From `flat`

Same option names (`delimiter`, `maxDepth`, `safe`, `object`, `overwrite`, `transformKey`), with safer defaults:

| | `flat` | flattify |
| --- | --- | --- |
| Result type | you pass it: `flatten<T, R>()` | inferred |
| Keys with the delimiter | split in two on the way back | escaped; `{ escape: false }` for the old behavior |
| `maxDepth: 0` | no limit | `RangeError`: leave it out for no limit |
| `unflatten({ a: { 'b.c': 1 } })` | `{ a: { b: { c: 1 } } }` | values are kept as they are |
| `unflatten` of a non-object | returned as it is | `TypeError` |
| Class instances | flattened | kept as values |
| Circular references | stack overflow | `TypeError`, or `circular: 'skip'` |

### From flattify 1.x

2.0 is a rewrite with named exports:

| 1.x | 2.x |
| --- | --- |
| `flattify(obj, true)` | `flatten(obj)` |
| `flattify(obj)` (arrays turned into JSON strings) | `flatten(obj, { safe: true })` (arrays kept as arrays) |
| `flattify(array)` (each item flattened) | `array.map((item) => flatten(item))` |
| `flattify(jsonString)` | `flatten(JSON.parse(jsonString))` |

It also fixes nested arrays losing their path: `{ a: { tags: [1] } }` gave `{ tags: '[1]' }`, and now gives `{ 'a.tags.0': 1 }`.

## Security

- **No prototype pollution:** `unflatten` and `set` only create own properties; paths through `__proto__` are skipped, in every notation. (`flat` had this flaw as [CVE-2020-36632](https://nvd.nist.gov/vuln/detail/CVE-2020-36632), fixed in 5.0.1.)
- **No stack overflow:** objects are walked with an explicit stack instead of recursion, so any depth is handled, and circular references throw a clear error.
- **No huge arrays:** `arrayLimit` bounds the indices `unflatten` turns into arrays.
- **No slowdown on hostile paths:** the bracket parser stays linear on input like `a[[[[...`.

All of this is tested, and `unflatten` is fuzzed with random paths made of `__proto__`, `constructor` and `prototype`. Releases are published from GitHub Actions with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) and [staged](https://docs.npmjs.com/staged-publishing/) for approval with 2FA.

Found a vulnerability? Please report it privately, see [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © 2016 Fernando Machado Bernardino
