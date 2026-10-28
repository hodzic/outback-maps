// Add or replace a map from a GeoPDF saved by Outback ("Save as GeoPDF").
// Usage: npm run add -- <file.pdf> [--id cosumnes] [--name "…"] [--source "…"] [--license "…"] [--url https://…]
// Writes maps/<id>.jpg (the overlay image, byte for byte), maps/<id>.pdf (the GeoPDF), thumbs/<id>.jpg,
// and the catalog entry with the corner coordinates.
import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), opt = {}, files = [];
for (let i = 0; i < args.length; i++) args[i].startsWith('--') ? opt[args[i].slice(2)] = args[++i] : files.push(args[i]);
if (files.length !== 1) { console.error('Usage: npm run add -- <file.pdf> [--id x] [--name "…"] [--source "…"] [--license "…"] [--url …]'); process.exit(1); }

// Outback's GeoPDF: one page, one JPEG filling it, an ISO 32000 viewport with GPTS/LPTS corner points.
export function readGeoPdf(buf){
  const text = buf.toString('latin1');
  const nums = key => { const m = text.match(new RegExp(`/${key}\\s*\\[([-\\d.\\s]+)\\]`)); return m && m[1].trim().split(/\s+/).map(Number); };
  const gpts = nums('GPTS'), lpts = nums('LPTS');
  if (!gpts || !lpts || gpts.length !== lpts.length) throw new Error('No GeoPDF corner points (/GPTS, /LPTS) in this file.');
  const corners = []; for (let j = 0; j < lpts.length / 2; j++) corners.push({ lp: [lpts[2 * j], lpts[2 * j + 1]], gp: [gpts[2 * j], gpts[2 * j + 1]] });
  const near = (u, v) => corners.reduce((b, c) => { const d = (c.lp[0] - u) ** 2 + (c.lp[1] - v) ** 2; return d < b.d ? { d, gp: c.gp } : b; }, { d: Infinity }).gp;
  const im = text.match(/\/Subtype\s*\/Image[^]*?\/Width\s+(\d+)[^]*?\/Height\s+(\d+)[^]*?\/Filter\s*\/DCTDecode[^]*?\/Length\s+(\d+)\s*>>\s*stream\r?\n/);
  if (!im) throw new Error('Not a single-JPEG GeoPDF from Outback (Save as GeoPDF).');
  const at = im.index + im[0].length, len = +im[3];
  return { width: +im[1], height: +im[2], jpeg: buf.subarray(at, at + len), topLeft: near(0, 1), topRight: near(1, 1), bottomLeft: near(0, 0),
    name: (text.match(/\/Title\s*<FEFF([0-9a-f]*)>/i)?.[1].match(/..../g) || []).map(h => String.fromCharCode(parseInt(h, 16))).join('') || null };
}

// 96 × 96 centre crop, like the existing thumbnails
function thumb(jpg){
  const src = jpeg.decode(jpg, { maxMemoryUsageInMB: 1024 }), S = 96, side = Math.min(src.width, src.height);
  const x0 = (src.width - side) / 2, y0 = (src.height - side) / 2, out = Buffer.alloc(S * S * 4), k = side / S;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++){
    const acc = [0, 0, 0]; let n = 0;
    for (let yy = Math.floor(y0 + y * k); yy < Math.floor(y0 + (y + 1) * k); yy++) for (let xx = Math.floor(x0 + x * k); xx < Math.floor(x0 + (x + 1) * k); xx++){
      const i = (yy * src.width + xx) * 4; acc[0] += src.data[i]; acc[1] += src.data[i + 1]; acc[2] += src.data[i + 2]; n++;
    }
    const o = (y * S + x) * 4; out[o] = acc[0] / n; out[o + 1] = acc[1] / n; out[o + 2] = acc[2] / n; out[o + 3] = 255;
  }
  return jpeg.encode({ data: out, width: S, height: S }, 80).data;
}

const pdf = fs.readFileSync(files[0]), g = readGeoPdf(pdf);
// "Lake GeoPDF", "Lake-GeoPDF-2" -> "Lake", as Outback names an imported GeoPDF
const clean = n => n.replace(/[\s_-]*GeoPDF(?:[\s_-]*(?:\(\d+\)|\d+))*\s*$/i, '').trim() || n;
const name = opt.name || clean(g.name || path.basename(files[0], '.pdf'));
const id = opt.id || name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
fs.writeFileSync(path.join(root, 'maps', id + '.jpg'), g.jpeg);
fs.writeFileSync(path.join(root, 'maps', id + '.pdf'), pdf);
fs.writeFileSync(path.join(root, 'thumbs', id + '.jpg'), thumb(g.jpeg));
const catPath = path.join(root, 'catalog.json'), cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));
const old = cat.maps.find(m => m.id === id), today = new Date().toISOString().slice(0, 10);
const entry = { id, name, image: `maps/${id}.jpg`, geopdf: `maps/${id}.pdf`, thumb: `thumbs/${id}.jpg`, size: g.jpeg.length, width: g.width, height: g.height,
  topLeft: g.topLeft, topRight: g.topRight, bottomLeft: g.bottomLeft,
  source: opt.source ?? old?.source ?? '', ...(opt.url ?? old?.url ? { url: opt.url ?? old.url } : {}), ...(opt.license ?? old?.license ? { license: opt.license ?? old.license } : {}),
  added: old?.added || today, ...(old ? { updated: today } : {}) };
cat.maps = old ? cat.maps.map(m => m.id === id ? entry : m) : [...cat.maps, entry];
cat.updated = today;
fs.writeFileSync(catPath, JSON.stringify(cat, null, 1) + '\n');
console.log(`${old ? 'Replaced' : 'Added'} ${id}: ${name}, ${g.width}×${g.height}, ${(g.jpeg.length / 1024).toFixed(0)} KB`);
console.log('  corners', JSON.stringify([g.topLeft, g.topRight, g.bottomLeft]));
