---
'flattify': major
---

**Why a major version?**

Flattify 2.0 is a full rewrite in TypeScript. The single default export `flattify(json, isFlattifyArray)` is replaced by named exports, `flatten` and `unflatten`, with different defaults. Code written for 1.x has to be updated (see Migration below).

**Breaking changes**

- **Named exports.** `flattify(...)` is replaced by `flatten(...)`: `import { flatten } from 'flattify'` or `const { flatten } = require('flattify')`.
- **Arrays are flattened by default.** `flatten({ tags: ['a'] })` gives `{ 'tags.0': 'a' }`. The 1.x default, which turned arrays into JSON strings, is gone: pass `{ safe: true }` to keep arrays as arrays.
- **Top-level arrays are flattened as a whole.** `flatten([{ id: 1 }])` gives `{ '0.id': 1 }` instead of flattening each item: use `array.map((item) => flatten(item))` for the 1.x behavior.
- **JSON strings are no longer parsed.** Pass `JSON.parse(json)` instead of the string; anything but a plain object or an array throws a `TypeError`.
- **Keys that contain the delimiter are escaped** (`{ 'a.b': 1 }` gives `{ 'a\.b': 1 }`), so they come back whole. Pass `{ escape: false }` to leave them as they are.
- **TypeScript 5.0+** for the types.

**Migration**

```diff
- const flattify = require('flattify');
- flattify(data, true);
+ const { flatten } = require('flattify');
+ flatten(data);
```

| 1.x | 2.x |
| --- | --- |
| `flattify(obj, true)` | `flatten(obj)` |
| `flattify(obj)` | `flatten(obj, { safe: true })` |
| `flattify(array)` | `array.map((item) => flatten(item))` |
| `flattify(jsonString)` | `flatten(JSON.parse(jsonString))` |

**Fixed**

- Nested arrays kept their path: `{ a: { tags: [1] }, b: { tags: [2] } }` gave `{ tags: '[2]' }` in 1.x, losing `a.tags`. It now gives `{ 'a.tags.0': 1, 'b.tags.0': 2 }`.
- Calls no longer share state: 1.x stored the array option in a module-level variable.
- Inherited properties are no longer read, and circular references no longer overflow the stack.

**New**

- **`unflatten`**, the reverse of `flatten`: `unflatten(flatten(data))` gives back `data`, including dates, class instances, `null`, empty objects and arrays, and keys with dots in them. `asArray` gives back an array given to `flatten`.
- **Type inference:** every path and value of the result is typed (`Flatten<T>`, `Unflatten<T>`), for every option that changes them.
- **Options:** `delimiter`, `maxDepth`, `safe`, `keepEmpty`, `escape`, `circular`, `transformKey` and `preserve` for `flatten`; `delimiter`, `object`, `overwrite`, `arrayLimit`, `asArray`, `escape` and `transformKey` for `unflatten`.
- **Three notations:** `items.0.id` (dot), `items[0].id` (bracket, and `unflatten` reads form fields such as `items[0][id]`) and `/items/0/id` (JSON Pointer, RFC 6901).
- **`flattify/path`:** `get`, `set`, `has`, `del`, `paths`, `parsePath`, `stringifyPath` and `escapeKey`, with autocompleted paths and type-checked values.
- **Safe on untrusted input:** no prototype pollution through `__proto__`, `constructor` or `prototype`, no stack overflow on deep or circular input, and `arrayLimit` against huge sparse arrays. Covered by tests, including fuzzing.
- **Everywhere:** ESM and CommonJS builds with zero dependencies, published on npm and on JSR as [`@nandomb/flattify`](https://jsr.io/@nandomb/flattify), and tested on Node.js 22, 24 and 26, Bun, Deno, Chromium, Firefox, WebKit and Cloudflare Workers.
- **Trusted releases:** published from CI without long-lived tokens, with npm provenance, and only live after a maintainer approves them with 2FA (staged publishing).
