import { unflatten as unflat } from 'flat';
import { nestie } from 'nestie';
import { construct } from 'radashi';
import { describe, test } from 'vitest';
import { flatten, unflatten } from '../dist/index.js';
import { inputs } from './fixtures.ts';

// es-toolkit has no unflatten. Every library reads the same dot paths, produced without escaping.
describe('unflatten', () => {
  for (const [name, input] of Object.entries(inputs)) {
    const paths = flatten(input, { escape: false });
    test(name, async ({ bench }) => {
      await bench.compare(
        bench('flattify', () => void unflatten(paths)),
        bench('flat', () => void unflat(paths)),
        bench('nestie', () => void nestie(paths)),
        bench('radashi', () => void construct(paths))
      );
    });
  }
});
