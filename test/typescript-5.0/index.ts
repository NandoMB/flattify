import { flatten, unflatten } from '../../dist/index.js';

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

const nested = unflatten(flat);
const nestedCity: string = nested.profile.address.city;
const tags: string[] = nested.tags;

const rows = unflatten(flatten([{ id: 1 }, { id: 2 }]), { asArray: true });
const firstId: number = rows[0].id;

export { id, city, tag, underscored, nestedCity, tags, firstId };
