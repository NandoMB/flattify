import { flatten, unflatten } from './flattify.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default {
  fetch() {
    const checks = [
      ['flatten', same(flatten({ a: { b: [1, { c: 2 }] } }), { 'a.b.0': 1, 'a.b.1.c': 2 })],
      ['flatten options', same(flatten({ a: { b: [1] } }, { delimiter: '_', safe: true }), { a_b: [1] })],
      ['keeps dates', flatten({ at: { d: new Date(0) } })['at.d'] instanceof Date],
      ['unflatten', same(unflatten({ 'a.b.0': 1, 'a.b.1.c': 2 }), { a: { b: [1, { c: 2 }] } })],
      ['unflatten asArray', same(unflatten(flatten([{ id: 1 }, { id: 2 }]), { asArray: true }), [{ id: 1 }, { id: 2 }])],
      ['notations', same(flatten({ a: [{ b: 1 }] }, { notation: 'bracket' }), { 'a[0].b': 1 }) && same(unflatten({ '/a/0/b': 1 }, { notation: 'pointer' }), { a: [{ b: 1 }] })],
      ['unflatten is pollution-safe', (unflatten({ '__proto__.polluted': true, 'constructor.prototype.polluted': true }), {}.polluted === undefined)],
    ];
    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) return new Response(`failed: ${failed.join(', ')}`, { status: 500 });
    return new Response(`${checks.length} checks passed`);
  },
};
