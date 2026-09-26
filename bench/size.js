// Size of each library's flatten/unflatten functions, bundled and minified as an app would ship them,
// then gzipped: `pnpm size`. The README table comes from this output.
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const entries = {
  'flattify: flatten + unflatten': "export { flatten, unflatten } from './dist/index.js'",
  'flattify: flatten': "export { flatten } from './dist/index.js'",
  'flattify/path: get + set': "export { get, set } from './dist/path.js'",
  'flat: flatten + unflatten': "export { flatten, unflatten } from 'flat'",
  'flattie + nestie': "export { flattie } from 'flattie'; export { nestie } from 'nestie'",
  'es-toolkit: flattenObject': "export { flattenObject } from 'es-toolkit'",
  'radashi: crush + construct': "export { crush, construct } from 'radashi'",
};

console.log('| Import | min + gzip |\n| --- | --- |');
for (const [name, contents] of Object.entries(entries)) {
  const { outputFiles } = await build({
    stdin: { contents, resolveDir: process.cwd(), sourcefile: 'entry.js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    write: false,
  });
  const bytes = gzipSync(outputFiles[0].contents, { level: 9 }).length;
  console.log(`| ${name} | ${(bytes / 1000).toFixed(2)} kB |`);
}
