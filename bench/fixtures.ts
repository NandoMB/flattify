/** Inputs shared by the benchmarks: plain JSON-like data, as the libraries compared all support it. */

const user = (id: number) => ({
  id,
  name: `User ${id}`,
  active: id % 2 === 0,
  address: { street: `${id} Main St`, city: 'London', geo: { lat: 51.5, lng: -0.12 } },
  tags: ['admin', 'dev'],
});

/** A small API record: 10 values, 3 levels. */
export const shallow = user(1);

/** One value 12 levels down. */
export const deep = Array.from({ length: 12 }).reduce<Record<string, unknown>>((child, _, i) => ({ [`level${i}`]: child }), { value: 1 });

/** 1,000 keys of 2 levels, like a big configuration or translation file. */
export const wide = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`section${i}`, { title: `Title ${i}`, enabled: true }]));

/** 100 records in an array, like an API list response. */
export const list = { users: Array.from({ length: 100 }, (_, i) => user(i)) };

export const inputs = { shallow, deep, wide, list } as const;
