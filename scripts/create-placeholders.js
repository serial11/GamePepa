// scripts/create-placeholders.js
// Run with: node scripts/create-placeholders.js
import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

function makePNG(filename, r, g, b) {
  const W = 48, H = 48;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    for (let x = 0; x < W; x++) {
      const i = y * (1 + W * 3) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const compressed = deflateSync(raw);

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) {
      c ^= b;
      for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = crc32(Buffer.concat([t, data]));
    const c = Buffer.alloc(4); c.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, t, data, c]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
  writeFileSync(filename, png);
  console.log("Created", filename);
}

makePNG("assets/peppa/player.png", 255, 105, 180);
makePNG("assets/peppa/enemy.png",  139,  69,  19);
makePNG("assets/peppa/bullet.png", 255, 255,   0);
