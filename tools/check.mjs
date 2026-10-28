// Check the catalog: every map has its files, a sane size and placement, and a unique id.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cat = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8')), bad = [], ids = new Set();
const ll = p => Array.isArray(p) && p.length === 2 && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
for (const m of cat.maps){
  const say = s => bad.push(`${m.id}: ${s}`);
  if (!/^[a-z0-9-]+$/.test(m.id || '')) say('id must be lower-case letters, digits and dashes');
  if (ids.has(m.id)) say('duplicate id'); ids.add(m.id);
  if (!m.name) say('no name');
  for (const k of ['image', 'thumb', 'geopdf']) if (m[k] && !fs.existsSync(path.join(root, m[k]))) say(`missing ${m[k]}`);
  if (!m.image || !m.thumb) say('needs image and thumb');
  if (m.image && fs.existsSync(path.join(root, m.image)) && fs.statSync(path.join(root, m.image)).size !== m.size) say('size does not match the image');
  if (!(m.width > 0 && m.height > 0)) say('no width/height');
  if (![m.topLeft, m.topRight, m.bottomLeft].every(ll)) say('corners missing or out of range');
}
const listed = new Set(cat.maps.flatMap(m => [m.image, m.thumb, m.geopdf].filter(Boolean)));
for (const d of ['maps', 'thumbs']) for (const f of fs.readdirSync(path.join(root, d))) if (!listed.has(`${d}/${f}`)) bad.push(`${d}/${f}: not in the catalog`);
if (bad.length){ console.error(bad.join('\n')); process.exit(1); }
console.log(`catalog ok: ${cat.maps.length} maps`);
