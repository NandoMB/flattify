import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts', path: 'src/path/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2015',
  outExtensions: ({ format }) => (format === 'cjs' ? { js: '.cjs', dts: '.d.cts' } : { js: '.js', dts: '.d.ts' })
});
