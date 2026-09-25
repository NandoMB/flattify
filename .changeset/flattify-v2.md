---
'flattify': major
---

flattify 2.0 is a full rewrite in TypeScript: ESM and CommonJS builds, zero dependencies, published on npm and JSR (`@nandomb/flattify`), and tested on Node.js, Bun, Deno, browsers and Cloudflare Workers.

**Breaking:** the default export `flattify(json, isFlattifyArray)` was removed. The migration guide ships with the new `flatten`/`unflatten` API.
