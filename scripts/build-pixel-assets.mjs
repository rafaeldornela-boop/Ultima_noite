import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Dependency-free RGBA PNG encoder for compiling deterministic
 * 2D pixel-art spritesheets, vehicles, and tilesets locally into public/assets/pixel/*.png.
 */
class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  parseHex(hex, alpha = 255) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [
      (num >> 16) & 255,
      (num >> 8) & 255,
      num & 255,
      alpha,
    ];
  }

  setPixel(x, y, hex, alpha = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const [r, g, b, a] = typeof hex === 'string' ? this.parseHex(hex, alpha) : hex;
    const idx = (iy * this.width + ix) * 4;
    if (a === 255 || this.data[idx + 3] === 0) {
      this.data[idx] = r;
      this.data[idx + 1] = g;
      this.data[idx + 2] = b;
      this.data[idx + 3] = a;
    } else {
      const srcA = a / 255;
      const dstA = this.data[idx + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA > 0) {
        this.data[idx] = Math.round((r * srcA + this.data[idx] * dstA * (1 - srcA)) / outA);
        this.data[idx + 1] = Math.round((g * srcA + this.data[idx + 1] * dstA * (1 - srcA)) / outA);
        this.data[idx + 2] = Math.round((b * srcA + this.data[idx + 2] * dstA * (1 - srcA)) / outA);
        this.data[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  fillRect(x, y, w, h, hex, alpha = 255) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        this.setPixel(px, py, hex, alpha);
      }
    }
  }

  strokeRect(x, y, w, h, hex, alpha = 255) {
    for (let px = x; px < x + w; px++) {
      this.setPixel(px, y, hex, alpha);
      this.setPixel(px, y + h - 1, hex, alpha);
    }
    for (let py = y; py < y + h; py++) {
      this.setPixel(x, py, hex, alpha);
      this.setPixel(x + w - 1, py, hex, alpha);
    }
  }

  fillCircle(cx, cy, r, hex, alpha = 255) {
    const r2 = r * r;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (dx * dx + dy * dy <= r2) {
          this.setPixel(Math.round(cx + dx), Math.round(cy + dy), hex, alpha);
        }
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, hex, alpha = 255) {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
          this.setPixel(Math.round(cx + dx), Math.round(cy + dy), hex, alpha);
        }
      }
    }
  }

  drawLine(x0, y0, x1, y1, hex, thickness = 1, alpha = 255) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const px = Math.round(x0 + ((x1 - x0) * i) / steps);
      const py = Math.round(y0 + ((y1 - y0) * i) / steps);
      if (thickness <= 1) {
        this.setPixel(px, py, hex, alpha);
      } else {
        this.fillCircle(px, py, thickness * 0.5, hex, alpha);
      }
    }
  }

  toPngBuffer() {
    const raw = Buffer.alloc(this.height * (this.width * 4 + 1));
    for (let y = 0; y < this.height; y++) {
      const rowStart = y * (this.width * 4 + 1);
      raw[rowStart] = 0;
      Buffer.from(
        this.data.buffer,
        y * this.width * 4,
        this.width * 4
      ).copy(raw, rowStart + 1);
    }

    const compressed = zlib.deflateSync(raw, { level: 9 });

    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }

    function crc32(buf) {
      let c = 0xffffffff;
      for (let i = 0; i < buf.length; i++) {
        c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
      }
      return (c ^ 0xffffffff) >>> 0;
    }

    function makeChunk(type, dataBuf) {
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(dataBuf.length, 0);
      const typeBuf = Buffer.from(type, 'ascii');
      const crcBuf = Buffer.alloc(4);
      const combined = Buffer.concat([typeBuf, dataBuf]);
      crcBuf.writeUInt32BE(crc32(combined), 0);
      return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
    }

    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    return Buffer.concat([
      signature,
      makeChunk('IHDR', ihdr),
      makeChunk('IDAT', compressed),
      makeChunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

function hash2d(x, y, seed = 1) {
  let n = Math.imul(x + seed * 131, 374761393) + Math.imul(y + seed * 97, 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * 1. Survivor Top-Down Pixel Art Spritesheet (16 frames x 48x48 = 768x48)
 */
function buildSurvivorSpritesheet() {
  const frameSize = 48;
  const totalFrames = 16;
  const sheet = new PixelCanvas(frameSize * totalFrames, frameSize);

  for (let f = 0; f < totalFrames; f++) {
    const ox = f * frameSize;
    const cx = ox + 22;
    const cy = 24;

    const isMachete = f >= 8;
    const isWalk = (f >= 2 && f <= 5) || (f >= 10 && f <= 13);
    const walkPhase = isWalk ? (f - 2) % 4 : 0;
    const isFiring = f === 6;
    const isReloading = f === 7;
    const isSlash1 = f === 14;
    const isSlash2 = f === 15;

    const legStride = isWalk ? [4, 0, -4, 0][walkPhase] : 0;
    const shoulderTwist = isWalk ? [1, 0, -1, 0][walkPhase] : 0;
    const recoilOffset = isFiring ? -2 : 0;

    // 1. Boots / Legs stepping
    sheet.fillRect(cx - 2 + legStride, cy - 8, 7, 5, '#171513');
    sheet.fillRect(cx - 1 + legStride, cy - 7, 5, 3, '#2b2520');
    sheet.fillRect(cx - 2 - legStride, cy + 4, 7, 5, '#171513');
    sheet.fillRect(cx - 1 - legStride, cy + 5, 5, 3, '#2b2520');

    // 2. Tactical Backpack & Bedroll
    sheet.fillRect(cx - 12 + recoilOffset, cy - 8, 8, 16, '#141210');
    sheet.fillRect(cx - 11 + recoilOffset, cy - 7, 6, 14, '#3d3326');
    sheet.fillRect(cx - 10 + recoilOffset, cy - 5, 4, 4, '#4f4333');
    sheet.fillRect(cx - 10 + recoilOffset, cy + 1, 4, 4, '#30281e');
    sheet.fillRect(cx - 13 + recoilOffset, cy - 6, 3, 12, '#5c3c28');
    sheet.setPixel(cx - 12 + recoilOffset, cy - 3, '#85583c');
    sheet.setPixel(cx - 12 + recoilOffset, cy + 3, '#85583c');

    // 3. Weathered Olive-Drab Survivor Jacket & Shoulders
    sheet.fillEllipse(cx + recoilOffset, cy, 8, 12, '#141210');
    sheet.fillEllipse(cx + recoilOffset, cy, 7, 11, '#3b4232');
    sheet.fillRect(cx - 3 + shoulderTwist + recoilOffset, cy - 10, 6, 4, '#4c5440');
    sheet.fillRect(cx - 3 - shoulderTwist + recoilOffset, cy + 6, 6, 4, '#2f3628');
    sheet.drawLine(cx - 5 + recoilOffset, cy - 7, cx + 4 + recoilOffset, cy - 4, '#241d17', 2);
    sheet.drawLine(cx - 5 + recoilOffset, cy + 7, cx + 4 + recoilOffset, cy + 4, '#241d17', 2);

    // 4. Arms & Weapon Stance
    if (!isMachete) {
      if (isReloading) {
        sheet.drawLine(cx + 2, cy - 9, cx + 9, cy - 3, '#3b4232', 4);
        sheet.drawLine(cx + 2, cy + 9, cx + 11, cy + 2, '#3b4232', 4);
        sheet.fillCircle(cx + 10, cy - 2, 2.2, '#c89d7c');
        sheet.fillRect(cx + 10, cy - 1, 8, 3, '#26292e');
      } else {
        sheet.drawLine(cx + 1 + recoilOffset, cy - 9, cx + 11 + recoilOffset, cy - 2, '#3b4232', 4);
        sheet.drawLine(cx + 2 + recoilOffset, cy + 9, cx + 12 + recoilOffset, cy + 1, '#4c5440', 4);
        sheet.fillCircle(cx + 12 + recoilOffset, cy, 2.5, '#302822');
        sheet.fillCircle(cx + 13 + recoilOffset, cy, 1.5, '#c89d7c');
        sheet.fillRect(cx + 13 + recoilOffset, cy - 2, 10, 4, '#1a1c20');
        sheet.fillRect(cx + 14 + recoilOffset, cy - 1, 8, 2, '#5c6470');
        sheet.setPixel(cx + 22 + recoilOffset, cy - 1, '#9ca3af');
        if (isFiring) {
          sheet.fillCircle(cx + 24, cy, 4, '#f59e0b', 220);
          sheet.fillCircle(cx + 24, cy, 2, '#fef3c7', 255);
          sheet.drawLine(cx + 22, cy - 5, cx + 26, cy + 5, '#fbbf24', 1);
        }
      }
    } else {
      if (isSlash1) {
        sheet.drawLine(cx + 1, cy - 9, cx + 8, cy - 5, '#3b4232', 4);
        sheet.drawLine(cx + 2, cy + 9, cx + 11, cy + 11, '#4c5440', 4);
        sheet.fillCircle(cx + 12, cy + 11, 2.2, '#c89d7c');
        sheet.drawLine(cx + 13, cy + 11, cx + 23, cy + 3, '#cbd5e1', 3);
        sheet.drawLine(cx + 13, cy + 11, cx + 23, cy + 3, '#f8fafc', 1);
      } else if (isSlash2) {
        sheet.drawLine(cx + 1, cy - 9, cx + 9, cy - 10, '#3b4232', 4);
        sheet.drawLine(cx + 2, cy + 8, cx + 12, cy - 6, '#4c5440', 4);
        sheet.fillCircle(cx + 13, cy - 7, 2.2, '#c89d7c');
        sheet.drawLine(cx + 14, cy - 7, cx + 24, cy - 1, '#cbd5e1', 3);
        sheet.drawLine(cx + 18, cy + 8, cx + 24, cy - 4, '#e2e8f0', 1, 160);
      } else {
        sheet.drawLine(cx + 1, cy - 9, cx + 9, cy - 4, '#3b4232', 4);
        sheet.drawLine(cx + 2, cy + 9, cx + 12, cy + 4, '#4c5440', 4);
        sheet.fillCircle(cx + 12, cy + 4, 2.2, '#c89d7c');
        sheet.fillRect(cx + 11, cy + 2, 3, 3, '#3d281a');
        sheet.drawLine(cx + 14, cy + 3, cx + 24, cy - 2, '#64748b', 3);
        sheet.drawLine(cx + 14, cy + 2, cx + 24, cy - 3, '#e2e8f0', 1);
      }
    }

    // 5. Head, Cap & Scarf
    sheet.fillCircle(cx + 1 + recoilOffset, cy, 6.2, '#141210');
    sheet.fillCircle(cx + 2 + recoilOffset, cy, 5.2, '#c89d7c');
    sheet.fillCircle(cx + recoilOffset, cy, 5.2, '#24201c');
    sheet.fillRect(cx - 2 + recoilOffset, cy - 4, 5, 8, '#2e2924');
    sheet.fillRect(cx + 4 + recoilOffset, cy - 4, 4, 8, '#1f1c18');
    sheet.fillRect(cx - 3 + recoilOffset, cy - 5, 3, 10, '#6e2c1f');
  }

  return sheet.toPngBuffer();
}

/**
 * 2. Zombies Multi-Archetype Pixel Art Spritesheet (8 cols x 3 rows of 48x48 = 384x144)
 */
function buildZombiesSpritesheet() {
  const frameSize = 48;
  const cols = 8;
  const rows = 3;
  const sheet = new PixelCanvas(frameSize * cols, frameSize * rows);

  const archetypes = [
    {
      name: 'lento',
      skinDark: '#434f3e',
      skinLight: '#607058',
      clothMain: '#38342e',
      clothTorn: '#26231f',
      blood: '#6e1914',
      shoulderW: 10,
      torsoW: 7,
      headR: 5.2,
    },
    {
      name: 'corredor',
      skinDark: '#594b3b',
      skinLight: '#786652',
      clothMain: '#54231d',
      clothTorn: '#361512',
      blood: '#8c1d15',
      shoulderW: 9,
      torsoW: 6,
      headR: 4.8,
    },
    {
      name: 'bruto',
      skinDark: '#4a2523',
      skinLight: '#6e3835',
      clothMain: '#24272c',
      clothTorn: '#3c424a',
      blood: '#801313',
      shoulderW: 14,
      torsoW: 10,
      headR: 6.0,
    },
  ];

  for (let row = 0; row < rows; row++) {
    const arch = archetypes[row];
    for (let col = 0; col < cols; col++) {
      const ox = col * frameSize;
      const oy = row * frameSize;
      const cx = ox + 22;
      const cy = oy + 24;

      if (col === 7) {
        sheet.fillEllipse(cx + 1, cy + 1, 13, 9, '#3d0c0a', 210);
        sheet.fillEllipse(cx - 2, cy, 9, 6, '#5e1410', 235);
        sheet.drawLine(cx - 12, cy - 5, cx - 3, cy - 2, arch.clothTorn, 5);
        sheet.drawLine(cx - 13, cy + 6, cx - 3, cy + 3, arch.clothTorn, 5);
        sheet.fillEllipse(cx, cy, arch.torsoW + 2, arch.shoulderW * 0.65, '#141210');
        sheet.fillEllipse(cx, cy, arch.torsoW + 1, arch.shoulderW * 0.55, arch.clothMain);
        sheet.fillRect(cx - 2, cy - 2, 5, 4, arch.blood);
        sheet.setPixel(cx - 1, cy - 1, '#cbd5e1');
        sheet.setPixel(cx + 1, cy + 1, '#cbd5e1');
        sheet.drawLine(cx + 3, cy - 5, cx + 12, cy - 8, arch.skinDark, 4);
        sheet.drawLine(cx + 4, cy + 5, cx + 13, cy + 7, arch.skinDark, 4);
        sheet.fillCircle(cx + 8, cy, arch.headR, '#141210');
        sheet.fillCircle(cx + 8, cy, arch.headR - 1, arch.skinDark);
        continue;
      }

      const isAttack = col === 4 || col === 5;
      const isHurt = col === 6;
      const stride = col < 4 ? [3, 0, -3, 0][col] : 0;
      const sway = col < 4 ? [1, -1, -1, 1][col] : 0;
      const hurtShift = isHurt ? -3 : 0;
      const lungeShift = col === 5 ? 3 : col === 4 ? -1 : 0;

      sheet.fillRect(cx - 3 + stride + hurtShift, cy - 8, 6, 4, '#1a1816');
      sheet.fillRect(cx - 3 - stride + hurtShift, cy + 4, 6, 4, '#1a1816');

      sheet.fillEllipse(
        cx + hurtShift + lungeShift,
        cy + sway,
        arch.torsoW + 1,
        arch.shoulderW + 1,
        '#12100e'
      );
      sheet.fillEllipse(
        cx + hurtShift + lungeShift,
        cy + sway,
        arch.torsoW,
        arch.shoulderW,
        arch.clothMain
      );

      if (arch.name === 'bruto') {
        sheet.fillRect(cx - 4 + hurtShift, cy - 13, 9, 5, '#373d45');
        sheet.strokeRect(cx - 4 + hurtShift, cy - 13, 9, 5, '#17191c');
        sheet.fillRect(cx - 4 + hurtShift, cy + 8, 9, 5, '#373d45');
        sheet.strokeRect(cx - 4 + hurtShift, cy + 8, 9, 5, '#17191c');
        sheet.fillCircle(cx + 2 + hurtShift, cy - 8, 3.5, '#7a1c1c');
      } else {
        sheet.fillRect(cx - 3 + hurtShift, cy - 5, 5, 4, arch.clothTorn);
        sheet.fillRect(cx - 1 + hurtShift, cy + 1, 4, 4, arch.blood);
      }

      const armReach = isAttack ? (col === 5 ? 16 : 11) : 12;
      const armSpread = isAttack && col === 5 ? 3 : 7;

      sheet.drawLine(
        cx + 1 + hurtShift,
        cy - arch.shoulderW + 2,
        cx + armReach + hurtShift + lungeShift,
        cy - armSpread + sway,
        arch.skinDark,
        arch.name === 'bruto' ? 5 : 4
      );
      sheet.drawLine(
        cx + 1 + hurtShift,
        cy + arch.shoulderW - 2,
        cx + armReach + hurtShift + lungeShift,
        cy + armSpread + sway,
        arch.skinLight,
        arch.name === 'bruto' ? 5 : 4
      );

      sheet.fillCircle(
        cx + armReach + hurtShift + lungeShift,
        cy - armSpread + sway,
        2,
        arch.blood
      );
      sheet.fillCircle(
        cx + armReach + hurtShift + lungeShift,
        cy + armSpread + sway,
        2,
        arch.blood
      );

      if (isAttack && col === 5) {
        sheet.drawLine(cx + 17, cy - 8, cx + 22, cy, '#dc2626', 2);
        sheet.drawLine(cx + 22, cy, cx + 17, cy + 8, '#dc2626', 2);
      }

      const headX = cx + 3 + hurtShift + lungeShift;
      const headY = cy + sway;
      sheet.fillCircle(headX, headY, arch.headR + 1, '#12100e');
      sheet.fillCircle(headX, headY, arch.headR, arch.skinLight);
      sheet.fillCircle(headX - 1, headY - 1, arch.headR * 0.55, arch.skinDark);
      sheet.fillRect(headX + 1, headY + 1, 3, 2, arch.blood);

      if (isHurt) {
        sheet.drawLine(cx + 4, cy - 6, cx + 8, cy + 6, '#f5f0e6', 1, 200);
      }
    }
  }

  return sheet.toPngBuffer();
}

/**
 * 3. Urban Ground, Wall & Environmental Decals Tileset (8 cols x 2 rows of 32x32 = 256x64)
 */
function buildUrbanTileset() {
  const tileSize = 32;
  const cols = 8;
  const rows = 2;
  const sheet = new PixelCanvas(tileSize * cols, tileSize * rows);

  // Row 0: Ground & Wall base tiles (0..7)
  for (let t = 0; t < 2; t++) {
    const ox = t * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const n = hash2d(x, y, 10 + t);
        const col = n < 0.25 ? '#121110' : n < 0.75 ? '#161514' : '#1b1918';
        sheet.setPixel(ox + x, y, col);
      }
    }
    if (t === 1) {
      sheet.drawLine(ox + 4, 6, ox + 15, 16, '#0b0a09', 1);
      sheet.drawLine(ox + 15, 16, ox + 26, 22, '#0b0a09', 1);
      sheet.drawLine(ox + 15, 16, ox + 11, 27, '#0e0d0c', 1);
    }
  }

  // Tile 2: Concrete Sidewalk Slab
  {
    const ox = 2 * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const n = hash2d(x, y, 22);
        const col = n < 0.2 ? '#1f1c1a' : n < 0.8 ? '#25211e' : '#2b2723';
        sheet.setPixel(ox + x, y, col);
      }
    }
    sheet.strokeRect(ox, 0, tileSize, tileSize, '#171513');
    sheet.drawLine(ox + 1, 1, ox + 30, 1, '#302b27', 1);
  }

  // Tile 3: Mercearia Floor
  {
    const ox = 3 * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const quad = ((x >> 4) + (y >> 4)) & 1;
        const n = hash2d(x, y, 33);
        const base = quad ? '#29221c' : '#201a16';
        sheet.setPixel(ox + x, y, n < 0.15 ? '#181410' : base);
      }
    }
    sheet.strokeRect(ox, 0, 16, 16, '#181410');
    sheet.strokeRect(ox + 16, 16, 16, 16, '#181410');
  }

  // Tile 4: Farmácia Floor
  {
    const ox = 4 * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const n = hash2d(x, y, 44);
        const col = n < 0.2 ? '#18201e' : n < 0.8 ? '#1e2825' : '#24302c';
        sheet.setPixel(ox + x, y, col);
      }
    }
    sheet.strokeRect(ox, 0, 16, 16, '#141b19');
    sheet.strokeRect(ox + 16, 0, 16, 16, '#141b19');
    sheet.strokeRect(ox, 16, 16, 16, '#141b19');
    sheet.strokeRect(ox + 16, 16, 16, 16, '#141b19');
  }

  // Tile 5: Posto Policial Floor
  {
    const ox = 5 * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const n = hash2d(x, y, 55);
        const col = n < 0.25 ? '#191b1f' : n < 0.8 ? '#1f2228' : '#262930';
        sheet.setPixel(ox + x, y, col);
      }
    }
    sheet.strokeRect(ox, 0, tileSize, tileSize, '#14161a');
  }

  // Tile 6: Overgrown Weeds & Earth
  {
    const ox = 6 * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const n = hash2d(x, y, 66);
        const col = n < 0.35 ? '#1d2419' : n < 0.7 ? '#25301f' : '#1a1715';
        sheet.setPixel(ox + x, y, col);
      }
    }
  }

  // Tile 7: Brick Wall Top
  {
    const ox = 7 * tileSize;
    sheet.fillRect(ox, 0, tileSize, tileSize, '#261e1a');
    for (let by = 0; by < tileSize; by += 8) {
      sheet.drawLine(ox, by, ox + 31, by, '#171210', 1);
      const offset = (by / 8) % 2 === 0 ? 0 : 8;
      for (let bx = offset; bx < tileSize; bx += 16) {
        sheet.drawLine(ox + bx, by, ox + bx, by + 7, '#171210', 1);
        sheet.fillRect(ox + bx + 1, by + 1, 14, 6, '#382a23');
      }
    }
  }

  // Row 1 (y = 32..63): Environmental Decals & Loot Crates (Tiles 8..15)
  const oy = 32;
  // Tile 8: Dried Blood Splatter Decal
  {
    const ox = 0 * tileSize;
    sheet.fillEllipse(ox + 15, oy + 16, 10, 7, '#420d0a', 190);
    sheet.fillEllipse(ox + 18, oy + 14, 6, 5, '#5e1410', 220);
    sheet.fillCircle(ox + 7, oy + 10, 2.5, '#4a0f0c', 180);
    sheet.fillCircle(ox + 25, oy + 22, 2, '#4a0f0c', 180);
  }
  // Tile 9: Shattered Glass & Rubble
  {
    const ox = 1 * tileSize;
    for (let i = 0; i < 22; i++) {
      const rx = ox + 4 + Math.floor(hash2d(i, 1, 91) * 24);
      const ry = oy + 4 + Math.floor(hash2d(i, 2, 91) * 24);
      sheet.fillRect(rx, ry, 2, 2, i % 3 === 0 ? '#64748b' : '#3a342e', 190);
    }
  }
  // Tile 10: Overgrown Moss Patch
  {
    const ox = 2 * tileSize;
    sheet.fillEllipse(ox + 16, oy + 16, 11, 8, '#23301e', 175);
    sheet.fillEllipse(ox + 13, oy + 15, 7, 5, '#2f4028', 195);
  }
  // Tile 11: Manhole Cover
  {
    const ox = 3 * tileSize;
    sheet.fillCircle(ox + 16, oy + 16, 10, '#141312');
    sheet.fillCircle(ox + 16, oy + 16, 8, '#282624');
    sheet.drawLine(ox + 10, oy + 16, ox + 22, oy + 16, '#141312', 1);
    sheet.drawLine(ox + 16, oy + 10, ox + 16, oy + 22, '#141312', 1);
  }
  // Tile 12: Closed Supply Crate (Food / Munition / Medical)
  {
    const ox = 4 * tileSize;
    sheet.fillRect(ox + 2, oy + 4, 28, 24, '#14110e');
    sheet.fillRect(ox + 3, oy + 5, 26, 22, '#3d2e20');
    sheet.strokeRect(ox + 4, oy + 6, 24, 20, '#594430');
    // Metal reinforcement straps & latches
    sheet.fillRect(ox + 7, oy + 4, 3, 24, '#26292e');
    sheet.fillRect(ox + 22, oy + 4, 3, 24, '#26292e');
    sheet.fillRect(ox + 13, oy + 14, 6, 4, '#b87333');
  }
  // Tile 13: Open / Ransacked Supply Crate
  {
    const ox = 5 * tileSize;
    sheet.fillRect(ox + 2, oy + 5, 28, 22, '#12100e');
    sheet.fillRect(ox + 4, oy + 7, 24, 18, '#1c1712');
    sheet.strokeRect(ox + 3, oy + 6, 26, 20, '#36291e');
    sheet.drawLine(ox + 5, oy + 3, ox + 27, oy + 5, '#2b2118', 3);
  }

  return sheet.toPngBuffer();
}

/**
 * 4. Abandoned Vehicles Pixel-Art Atlas (256x128: 4 vehicles of 128x64 each)
 */
function buildVehiclesSheet() {
  const sheet = new PixelCanvas(256, 128);

  function drawCarBase(ox, oy, bodyDark, bodyMid, bodyHighlight, isAmbulance = false, isPolice = false, isPickup = false) {
    // Ground drop shadow under vehicle
    sheet.fillRect(ox + 6, oy + 8, 116, 50, '#090807', 180);

    // 4 Rubber Tires sticking out slightly from wheel wells
    sheet.fillRect(ox + 18, oy + 4, 18, 5, '#121212');
    sheet.fillRect(ox + 88, oy + 4, 18, 5, '#121212');
    sheet.fillRect(ox + 18, oy + 55, 18, 5, '#121212');
    sheet.fillRect(ox + 88, oy + 55, 18, 5, '#121212');

    // Main Chassis Outline & Paint
    sheet.fillRect(ox + 8, oy + 7, 112, 50, '#141210');
    sheet.fillRect(ox + 10, oy + 9, 108, 46, bodyDark);
    sheet.fillRect(ox + 14, oy + 11, 100, 42, bodyMid);

    // Front & Rear Heavy Bumpers
    sheet.fillRect(ox + 7, oy + 10, 4, 44, '#242629');
    sheet.fillRect(ox + 117, oy + 10, 4, 44, '#242629');

    // Headlights (East side) & Taillights (West side)
    sheet.fillRect(ox + 116, oy + 12, 3, 8, '#c7bfa3');
    sheet.fillRect(ox + 116, oy + 44, 3, 8, '#c7bfa3');
    sheet.fillRect(ox + 8, oy + 12, 3, 8, '#6e1914');
    sheet.fillRect(ox + 8, oy + 44, 3, 8, '#6e1914');

    // Engine Hood (East, x: 84..114) with panel seams & rust/char marks
    sheet.strokeRect(ox + 84, oy + 12, 29, 40, bodyDark);
    sheet.drawLine(ox + 86, oy + 20, ox + 111, oy + 20, bodyHighlight, 1);
    sheet.drawLine(ox + 86, oy + 44, ox + 111, oy + 44, bodyHighlight, 1);

    // Shattered Front Windshield (x: 68..83)
    sheet.fillRect(ox + 68, oy + 13, 15, 38, '#14191f');
    sheet.drawLine(ox + 71, oy + 16, ox + 79, oy + 28, '#475569', 1);
    sheet.drawLine(ox + 79, oy + 28, ox + 73, oy + 42, '#475569', 1);
    sheet.drawLine(ox + 79, oy + 28, ox + 82, oy + 22, '#64748b', 1);

    if (isPickup) {
      // Cab Roof (x: 46..68) + Open Cargo Bed (x: 12..45)
      sheet.fillRect(ox + 46, oy + 13, 22, 38, bodyHighlight);
      sheet.fillRect(ox + 13, oy + 13, 32, 38, '#1b1815');
      for (let by = oy + 16; by < oy + 48; by += 6) {
        sheet.drawLine(ox + 15, by, ox + 43, by, '#29231e', 2);
      }
      // Spare tire & wooden crate in pickup bed
      sheet.fillCircle(ox + 24, oy + 25, 7, '#141414');
      sheet.fillCircle(ox + 24, oy + 25, 3, '#383838');
      sheet.fillRect(ox + 28, oy + 32, 13, 14, '#4a3623');
    } else {
      // Full Cabin Roof (x: 30..68) + Rear Window
      sheet.fillRect(ox + 22, oy + 13, 9, 38, '#14191f');
      sheet.fillRect(ox + 31, oy + 13, 37, 38, bodyHighlight);
      sheet.strokeRect(ox + 31, oy + 13, 37, 38, bodyDark);
    }

    if (isAmbulance) {
      // Red emergency stripe & medical cross on roof
      sheet.fillRect(ox + 14, oy + 10, 98, 4, '#8c231b');
      sheet.fillRect(ox + 14, oy + 50, 98, 4, '#8c231b');
      sheet.fillRect(ox + 45, oy + 24, 14, 16, '#8c231b');
      sheet.fillRect(ox + 41, oy + 28, 22, 8, '#8c231b');
      // Lightbar
      sheet.fillRect(ox + 63, oy + 16, 5, 32, '#26292e');
      sheet.fillRect(ox + 64, oy + 17, 3, 12, '#991b1b');
      sheet.fillRect(ox + 64, oy + 35, 3, 12, '#991b1b');
    }

    if (isPolice) {
      // Police tactical stripe & red/blue lightbar
      sheet.fillRect(ox + 34, oy + 15, 30, 34, '#28303d');
      sheet.fillRect(ox + 62, oy + 16, 6, 32, '#1f242d');
      sheet.fillRect(ox + 63, oy + 17, 4, 13, '#991b1b');
      sheet.fillRect(ox + 63, oy + 34, 4, 13, '#1e3a8a');
    }

    // Weathering rust / grime spots
    sheet.fillEllipse(ox + 95, oy + 28, 7, 5, '#3b2319', 160);
    sheet.fillEllipse(ox + 40, oy + 42, 6, 4, '#291d17', 150);
  }

  // 0: Rusted Maroon Sedan (top-left)
  drawCarBase(0, 0, '#2e1b18', '#422622', '#4f2f2a', false, false, false);
  // 1: Burned-out Olive/Charcoal Pickup (top-right)
  drawCarBase(128, 0, '#1f211d', '#2c3029', '#383d34', false, false, true);
  // 2: Abandoned SAMU Ambulance (bottom-left)
  drawCarBase(0, 64, '#59554f', '#78736a', '#8c867b', true, false, false);
  // 3: Abandoned Police Cruiser (bottom-right)
  drawCarBase(128, 64, '#171b24', '#212733', '#2c3444', false, true, false);

  return sheet.toPngBuffer();
}

const outDir = path.resolve(process.cwd(), 'public/assets/pixel');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'survivor_sheet.png'), buildSurvivorSpritesheet());
fs.writeFileSync(path.join(outDir, 'zombies_sheet.png'), buildZombiesSpritesheet());
fs.writeFileSync(path.join(outDir, 'urban_tileset.png'), buildUrbanTileset());
fs.writeFileSync(path.join(outDir, 'vehicles_sheet.png'), buildVehiclesSheet());

console.log('Generated local pixel-art assets in public/assets/pixel/:');
for (const file of fs.readdirSync(outDir)) {
  const stat = fs.statSync(path.join(outDir, file));
  console.log(` - ${file} (${stat.size} bytes)`);
}
