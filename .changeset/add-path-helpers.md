---
'flattify': minor
---

Add the `flattify/path` entry to read and write nested values by path, with autocompleted paths and typed values:

- `get(obj, 'items.0.sku')`: the result is typed from `obj` (`string | undefined`)
- `set(obj, 'db.port', 6543)`: the value is checked against the path, and missing objects and arrays are created
- `has`, `del`, `paths` (the paths `flatten` produces), `parsePath`, `stringifyPath` and `escapeKey`
- `Path<T>`, `Get<T, P>` and `SetValue<T, P>` types
- Every helper takes the `delimiter`, `notation` and `escape` options, and is safe against prototype pollution
