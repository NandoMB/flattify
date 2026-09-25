---
'flattify': minor
---

Add `unflatten(input, options?)`, the reverse of `flatten`, with the nested result inferred by TypeScript (`Unflatten<Flatten<T>>` gives back `T` for plain data).

- Safe on untrusted input: keys are only created as own properties, so no path reaches `Object.prototype`, and paths with a `__proto__` segment are skipped
- `arrayLimit` (default `1000`) keeps huge indices such as `'a.4294967294'` from allocating sparse arrays
- `asArray` returns the array given to `flatten`: `unflatten({ '0.id': 1, '1.id': 2 }, { asArray: true })` → `[{ id: 1 }, { id: 2 }]`, typed as an array. Without it the result is always an object
- Options: `delimiter`, `object`, `overwrite`, `escape`, `arrayLimit`, `asArray` and `transformKey`
- Objects and arrays in the input are copied before keys are added to them, never modified

`flatten` now escapes keys only when they would be ambiguous, so multi-character delimiters round-trip: with `'__'`, `MAX_CONN` stays as it is while `MAX_` is escaped.
