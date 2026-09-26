import { flattenObject } from 'es-toolkit';
import { flatten as flat } from 'flat';
import { flattie } from 'flattie';
import { crush } from 'radashi';
import { describe, test } from 'vitest';
import { flatten } from '../dist/index.js';
import { inputs } from './fixtures.ts';

describe('flatten', () => {
  for (const [name, input] of Object.entries(inputs)) {
    test(name, async ({ bench }) => {
      await bench.compare(
        bench('flattify', () => void flatten(input)),
        bench('flat', () => void flat(input)),
        bench('flattie', () => void flattie(input)),
        bench('es-toolkit', () => void flattenObject(input)),
        bench('radashi', () => void crush(input))
      );
    });
  }
});
