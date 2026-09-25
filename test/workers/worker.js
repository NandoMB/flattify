import * as flattify from './flattify.js';

export default {
  fetch() {
    const checks = [['module loads', typeof flattify === 'object']];
    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) return new Response(`failed: ${failed.join(', ')}`, { status: 500 });
    return new Response(`${checks.length} checks passed`);
  }
};
