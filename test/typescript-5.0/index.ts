import { flatten } from '../../dist/index.js';

const flat = flatten({
  id: 42,
  profile: { name: 'Ada', address: { city: 'London' } },
  tags: ['admin'],
});

const id: number = flat.id;
const city: string = flat['profile.address.city'];
const tag: string = flat['tags.0'];
// @ts-expect-error `profile` is flattened away
flat.profile;

const underscored: { profile_name: string } = flatten({ profile: { name: 'Ada' } }, { delimiter: '_' });

export { id, city, tag, underscored };
