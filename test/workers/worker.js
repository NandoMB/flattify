import { flatten } from './flattify.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default {
  fetch() {
    const checks = [
      ['flatten', same(flatten({ a: { b: [1, { c: 2 }] } }), { 'a.b.0': 1, 'a.b.1.c': 2 })],
      ['flatten options', same(flatten({ a: { b: [1] } }, { delimiter: '_', safe: true }), { a_b: [1] })],
      ['keeps dates', flatten({ at: { d: new Date(0) } })['at.d'] instanceof Date],
    ];
    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) return new Response(`failed: ${failed.join(', ')}`, { status: 500 });
    return new Response(`${checks.length} checks passed`);
  },
};
