// Runs the built ESM bundle inside workerd (the Cloudflare Workers runtime) through Miniflare.
// `worker.js` imports every entry of `dist/` and answers with the checks it ran.
import { readdirSync, readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';

const dist = new URL('../../dist/', import.meta.url);
const bundle = readdirSync(dist)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({ type: 'ESModule', path: file, contents: readFileSync(new URL(file, dist), 'utf8') }));

const mf = new Miniflare({
  compatibilityDate: '2026-07-01',
  modules: [{ type: 'ESModule', path: 'worker.js', contents: readFileSync(new URL('./worker.js', import.meta.url), 'utf8') }, ...bundle],
});

try {
  const response = await mf.dispatchFetch('http://localhost/');
  const body = await response.text();
  if (!response.ok) throw new Error(`Worker answered ${response.status}: ${body}`);
  console.log(`Cloudflare Workers: ${body}`);
} finally {
  await mf.dispose();
}
