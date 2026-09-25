import { flatten, unflatten } from '../../dist/index.js';
import { get, set } from '../../dist/path.js';

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

const pointer = flatten({ items: [{ id: 1 }] }, { notation: 'pointer' });
const pointerId: number = pointer['/items/0/id'];
const form = unflatten({ 'user[name]': 'Ada' } as { 'user[name]': string }, { notation: 'bracket' });
const formName: string = form.user.name;

const config = { db: { host: 'localhost', port: 5432 } };
const port: number = get(config, 'db.port');
set(config, 'db.port', 6543);
// @ts-expect-error `port` is a number
set(config, 'db.port', '6543');

export { id, city, tag, underscored, nestedCity, tags, firstId, pointerId, formName, port };
