---
'flattify': minor
---

Add `flatten(input, options?)`, with the resulting keys and values inferred by TypeScript.

- Walks plain objects and arrays only: dates, maps, sets, class instances and other objects are kept as values
- Options: `delimiter`, `maxDepth`, `safe` (keep arrays), `keepEmpty`, `escape`, `circular` (`'throw'` or `'skip'`), `transformKey` and `preserve`
- Iterative walk: deeply nested input cannot overflow the call stack
- Keys that contain the delimiter are escaped (`'a.b'` → `'a\.b'`), and a `__proto__` key never changes the prototype of the result
