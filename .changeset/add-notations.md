---
'flattify': minor
---

Add the `notation` option to `flatten` and `unflatten`, with the keys inferred by TypeScript for each one:

- `'dot'` (default): `items.0.id`
- `'bracket'`: `items[0].id`. `unflatten` also reads form-field names such as `user[name]` and `items[0][id]`
- `'pointer'`: `/items/0/id`, a JSON Pointer (RFC 6901) with `~0`/`~1` escaping, as used by JSON Patch and JSON Schema validators
