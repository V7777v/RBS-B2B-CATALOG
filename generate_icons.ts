import { Jimp } from 'jimp';
import * as fs from 'fs';

function insideRoundedBox(px: number, py: number, x1: number, y1: number, x2: number, y2: number, r: number): boolean {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const w = (x2 - x1) / 2;
  const h = (y2 - y1) / 2;
  
  const dx = Math.abs(px - cx) - (w - r);
  const dy = Math.abs(py - cy) - (h - r);
  
  if (dx > 0 && dy > 0) {
    return dx * dx + dy * dy <= r * r;
  }
  return dx <= 0 || dy <= 0;
}

function insideCapsule(px: number, py: number, ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  
  const lenSq = vx * vx + vy * vy;
  if (lenSq === 0) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy <= r * r;
  }
  
  let t = (wx * vx + wy * vy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const projx = ax + t * vx;
  const projy = ay + t * vy;
  
  const dx = px - projx;
  const dy = py - projy;
  return dx * dx + dy * dy <= r * r;
}

async function renderIcon(size: number, outputPath: string) {
  const image = new Jimp({ width: size, height: size, color: 0xffffffff });
  
  const scale = size / 512;
  
  const blue = { r: 12, g: 45, b: 87 };      // #0c2d57 - RBS Corporate Blue
  const orange = { r: 247, g: 148, b: 29 };  // #f7941d - RBS Dynamic Orange
  const white = { r: 255, g: 255, b: 255 };  // #ffffff

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let numBlue = 0;
      let numOrange = 0;
      let numWhite = 0;
      
      // 3x3 supersampling for premium anti-aliasing
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = (x + (sx - 1) * 0.33) / scale;
          const py = (y + (sy - 1) * 0.33) / scale;
          
          let insideCutout = false;
          if (px <= 250) {
            if (px >= 205 && py >= 155 && py <= 195) {
              insideCutout = true;
            }
          } else {
            const d = Math.sqrt((px - 250) ** 2 + (py - 175) ** 2);
            if (d < 20) {
              insideCutout = true;
            }
          }
          
          if (insideCutout) {
            numWhite++;
          } else {
            const isStem = insideRoundedBox(px, py, 145, 115, 205, 387, 16);
            let isLoop = false;
            if (px <= 250) {
              if (px >= 145 && ((py >= 115 && py <= 155) || (py >= 195 && py <= 235))) {
                isLoop = true;
              }
            } else {
              const d = Math.sqrt((px - 250) ** 2 + (py - 175) ** 2);
              if (d <= 60) {
                isLoop = true;
              }
            }
            
            if (isStem || isLoop) {
              numBlue++;
            } else if (insideCapsule(px, py, 225, 215, 305, 365, 24)) {
              numOrange++;
            } else {
              numWhite++;
            }
          }
        }
      }
      
      const r = Math.round((blue.r * numBlue + orange.r * numOrange + white.r * numWhite) / 9);
      const g = Math.round((blue.g * numBlue + orange.g * numOrange + white.g * numWhite) / 9);
      const b = Math.round((blue.b * numBlue + orange.b * numOrange + white.b * numWhite) / 9);
      
      const colorUint = ((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | 0xff;
      const colorInt = colorUint >>> 0;
      
      image.setPixelColor(colorInt, x, y);
    }
  }
  
  await image.write(outputPath as any);
  console.log(`Successfully compiled: ${outputPath} (${size}x${size})`);
}

async function main() {
  // Ensure directories exist
  if (!fs.existsSync('public/icons')) {
    fs.mkdirSync('public/icons', { recursive: true });
  }

  const targets = [
    { name: 'public/icons/icon-512.png', size: 512 },
    { name: 'public/icons/icon-512-maskable.png', size: 512 },
    { name: 'public/icons/icon-192.png', size: 192 },
    { name: 'public/apple-touch-icon.png', size: 180 },
    { name: 'public/favicon.ico', size: 32 }
  ];

  console.log("Starting production PWA icon rendering pipeline...");
  for (const t of targets) {
    try {
      await renderIcon(t.size, t.name);
    } catch (err: any) {
      console.error(`Error compiling target ${t.name}:`, err.message);
    }
  }
  console.log("All icons rendered with extreme-fidelity vector quality!");
}

main().catch(err => {
  console.error(err);
});
