import { describe, expect, test } from 'vitest';

describe('flattify', () => {
  test('loads as an ES module', async () => {
    expect(await import('./index.ts')).toBeTypeOf('object');
  });
});
