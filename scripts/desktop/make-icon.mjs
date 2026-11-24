/**
 * Draws the application icon (cyan rounded square with a white "P", like public/favicon.svg)
 * and writes build-resources/icon.png (256 px) and build-resources/icon.ico — no dependency needed.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const SIZE = 256;
const SS = 4; // supersampling for smooth edges
const g = 64 / SIZE; // icon drawn on a 64-unit grid

const inRoundRect = (x, y) => {
  const r = 14;
  const cx = Math.min(Math.max(x, r), 64 - r);
  const cy = Math.min(Math.max(y, r), 64 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= 0 && y >= 0 && x <= 64 && y <= 64;
};
// "P": stem + bowl (outer D shape minus the counter)
const inP = (x, y) => {
  const stem = x >= 22 && x <= 30 && y >= 13.5 && y <= 50;
  const outer = (x >= 22 && x <= 35.5 && y >= 13.5 && y <= 38.5) || (x >= 35.5 && (x - 35.5) ** 2 + (y - 26) ** 2 <= 12.5 ** 2);
  const hole = (x >= 30 && x <= 35 && y >= 21 && y <= 31) || (x >= 35 && (x - 35) ** 2 + (y - 26) ** 2 <= 5 ** 2);
  return stem || (outer && !hole);
};

const px = Buffer.alloc(SIZE * SIZE * 4);
for (let j = 0; j < SIZE; j++) {
  for (let i = 0; i < SIZE; i++) {
    let bg = 0;
    let fg = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = (i + (sx + 0.5) / SS) * g;
        const y = (j + (sy + 0.5) / SS) * g;
        if (inRoundRect(x, y)) {
          bg++;
          if (inP(x, y)) fg++;
        }
      }
    }
    const n = SS * SS;
    const a = bg / n;
    const w = bg ? fg / bg : 0;
    // Diagonal gradient #06B6D4 → #0EA5E9
    const t = (i + (SIZE - j)) / (2 * SIZE);
    const base = [6 + (14 - 6) * t, 182 + (165 - 182) * t, 212 + (233 - 212) * t];
    const o = (j * SIZE + i) * 4;
    px[o] = Math.round(base[0] * (1 - w) + 255 * w);
    px[o + 1] = Math.round(base[1] * (1 - w) + 255 * w);
    px[o + 2] = Math.round(base[2] * (1 - w) + 255 * w);
    px[o + 3] = Math.round(a * 255);
  }
}

// --- PNG encoder ---
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

// --- ICO (one 256 px PNG image, supported since Windows Vista) ---
const header = Buffer.from([0, 0, 1, 0, 1, 0]);
const entry = Buffer.alloc(16);
entry[0] = 0; // 256
entry[1] = 0;
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);

const out = path.resolve('build-resources');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), png);
fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([header, entry, png]));
console.log(`Icône créée : ${path.join(out, 'icon.png')} et icon.ico`);
