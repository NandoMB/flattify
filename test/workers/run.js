// Runs the built ESM bundle inside workerd (the Cloudflare Workers runtime) through Miniflare.
// `worker.js` imports `dist/index.js` and answers with the checks it ran.
import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';

const mf = new Miniflare({
  compatibilityDate: '2026-07-01',
  modules: [
    { type: 'ESModule', path: 'worker.js', contents: readFileSync(new URL('./worker.js', import.meta.url), 'utf8') },
    { type: 'ESModule', path: 'flattify.js', contents: readFileSync(new URL('../../dist/index.js', import.meta.url), 'utf8') }
  ]
});

try {
  const response = await mf.dispatchFetch('http://localhost/');
  const body = await response.text();
  if (!response.ok) throw new Error(`Worker answered ${response.status}: ${body}`);
  console.log(`Cloudflare Workers: ${body}`);
} finally {
  await mf.dispose();
}
