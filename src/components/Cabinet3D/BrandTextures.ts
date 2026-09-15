import * as THREE from 'three';
import { Product3DInstance } from './Cabinet3DTypes';
import { Product3DAssetDef } from './Product3DAssets';

/**
 * High-resolution SVG data URI for 19" rack-mount shelf.
 * Crystal clear, instantly recognizable, beautiful black matte perforated steel with mounting ears.
 */
export const GENERIC_SHELF_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <defs>
    <linearGradient id="shelfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="30%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="earGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#64748b" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <pattern id="ventHoles" x="0" y="0" width="14" height="12" patternUnits="userSpaceOnUse">
      <rect x="2" y="2" width="9" height="3" rx="1.5" fill="#020617" />
    </pattern>
  </defs>

  <!-- Background container glow -->
  <rect x="0" y="0" width="400" height="200" rx="8" fill="#0b1120" />
  
  <!-- Subtle rack frame borders -->
  <rect x="10" y="10" width="380" height="180" rx="6" fill="none" stroke="#1e293b" stroke-width="1.5" />

  <!-- 3D Isometric Shelf Surface -->
  <!-- Top surface -->
  <polygon points="50,45 350,45 375,130 25,130" fill="url(%23shelfGrad)" stroke="#475569" stroke-width="2" />
  
  <!-- Ventilation grid on surface -->
  <polygon points="62,54 338,54 360,122 40,122" fill="url(%23ventHoles)" opacity="0.85" />
  
  <!-- Front downward lip -->
  <polygon points="25,130 375,130 375,148 25,148" fill="#1e293b" stroke="#64748b" stroke-width="2" />
  <rect x="30" y="134" width="340" height="3" fill="#38bdf8" opacity="0.8" />
  
  <!-- Left 19" Mounting Ear with cage-nut screw holes -->
  <polygon points="12,110 25,116 25,155 12,148" fill="url(%23earGrad)" stroke="#64748b" stroke-width="1.5" />
  <circle cx="18" cy="124" r="3" fill="#020617" stroke="#94a3b8" stroke-width="1.2" />
  <circle cx="18" cy="142" r="3" fill="#020617" stroke="#94a3b8" stroke-width="1.2" />

  <!-- Right 19" Mounting Ear with cage-nut screw holes -->
  <polygon points="375,116 388,110 388,148 375,155" fill="url(%23earGrad)" stroke="#64748b" stroke-width="1.5" />
  <circle cx="382" cy="124" r="3" fill="#020617" stroke="#94a3b8" stroke-width="1.2" />
  <circle cx="382" cy="142" r="3" fill="#020617" stroke="#94a3b8" stroke-width="1.2" />

  <!-- Specification badge -->
  <rect x="110" y="160" width="180" height="24" rx="4" fill="#0f172a" stroke="#0284c7" stroke-width="1.5" />
  <text x="200" y="176" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="0.5">מדף ציוד תקני לארון 19״</text>
</svg>`;

/**
 * Creates an ultra-realistic 2U Polman Power Amplifier front faceplate canvas texture
 */
export function createPolmanFaceTexture(item: Product3DInstance, spanHeight: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;

  // 1. Heavy anodized brushed black aluminum background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1c1d22');
  bgGrad.addColorStop(0.5, '#0d0e11');
  bgGrad.addColorStop(1, '#18191e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Brushed hairline texture
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 2. Beveled industrial border with rack ear guides
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 12, w - 32, h - 24);

  // 3. Left & Right Heavy Hexagonal Ventilation Grilles
  const drawHexGrille = (startX: number, startY: number, gW: number, gH: number) => {
    ctx.fillStyle = '#050507';
    ctx.fillRect(startX, startY, gW, gH);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, startY, gW, gH);

    ctx.fillStyle = '#1e293b';
    const hexRadius = 4;
    for (let gx = startX + 12; gx < startX + gW - 10; gx += 14) {
      for (let gy = startY + 10; gy < startY + gH - 8; gy += 12) {
        ctx.beginPath();
        ctx.arc(gx, gy, hexRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  drawHexGrille(32, 40, 180, h - 80);
  drawHexGrille(w - 212, 40, 180, h - 80);

  // 4. Center Brand Emblem - POLMAN PROFESSIONAL
  ctx.save();
  // Chrome silver brand plate
  const plateX = w / 2 - 190;
  const plateY = 32;
  const plateW = 380;
  const plateH = 75;

  const plateGrad = ctx.createLinearGradient(plateX, plateY, plateX, plateY + plateH);
  plateGrad.addColorStop(0, '#27272a');
  plateGrad.addColorStop(0.5, '#18181b');
  plateGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = plateGrad;
  ctx.fillRect(plateX, plateY, plateW, plateH);
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;
  ctx.strokeRect(plateX, plateY, plateW, plateH);

  // Inner chrome accent
  ctx.strokeStyle = '#71717a';
  ctx.lineWidth = 1;
  ctx.strokeRect(plateX + 4, plateY + 4, plateW - 8, plateH - 8);

  // Brand Name "POLMAN"
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '4px';
  ctx.fillText('POLMAN', w / 2, plateY + 28);

  // Subtitle "PROFESSIONAL POWER AMPLIFIER"
  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('PROFESSIONAL POWER AMPLIFIER', w / 2, plateY + 54);
  ctx.restore();

  // Model text (e.g. XL600)
  const modelSku = (item.sku || 'XL600').toUpperCase();
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`MODEL: ${modelSku} • 2-CHANNEL CLASS-H`, w / 2, 132);

  // 5. Dual Channel Controls: CH-A (Left) and CH-B (Right)
  const drawChannelControl = (centerX: number, label: string) => {
    // Channel Box
    const boxW = 140;
    const boxH = 175;
    const boxX = centerX - boxW / 2;
    const boxY = 155;

    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Channel Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, centerX, boxY + 18);

    // Dial Knurled Knob
    const knobY = boxY + 70;
    const knobRadius = 32;

    // Knob outer shadow & ring
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.arc(centerX, knobY, knobRadius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Knob metal body
    const knobGrad = ctx.createRadialGradient(centerX - 8, knobY - 8, 4, centerX, knobY, knobRadius);
    knobGrad.addColorStop(0, '#e4e4e7');
    knobGrad.addColorStop(0.5, '#71717a');
    knobGrad.addColorStop(1, '#27272a');
    ctx.fillStyle = knobGrad;
    ctx.beginPath();
    ctx.arc(centerX, knobY, knobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Knob pointer indicator (approx 75% volume position)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(centerX + 12, knobY - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Calibration ticks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0', centerX - 36, knobY + 20);
    ctx.fillText('10', centerX + 36, knobY + 20);

    // 5-LED VU Meter Bar below knob
    const ledY = boxY + 125;
    const colors = ['#22c55e', '#22c55e', '#22c55e', '#eab308', '#ef4444'];
    const labels = ['-20', '-10', '0', '+3', 'CLIP'];
    colors.forEach((col, idx) => {
      const lx = centerX - 46 + idx * 23;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(lx, ledY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.fillStyle = idx === 4 ? '#ef4444' : '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(labels[idx], lx, ledY + 16);
    });

    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px system-ui';
    ctx.fillText('LEVEL CONTROL', centerX, boxY + boxH - 10);
  };

  drawChannelControl(w / 2 - 130, 'CHANNEL A');
  drawChannelControl(w / 2 + 130, 'CHANNEL B');

  // 6. Central Power Rocker Switch
  const switchX = w / 2 - 24;
  const switchY = 195;
  const switchW = 48;
  const switchH = 75;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(switchX - 6, switchY - 6, switchW + 12, switchH + 12);
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 2;
  ctx.strokeRect(switchX - 6, switchY - 6, switchW + 12, switchH + 12);

  // Red illuminated power switch
  const switchGrad = ctx.createLinearGradient(switchX, switchY, switchX, switchY + switchH);
  switchGrad.addColorStop(0, '#dc2626');
  switchGrad.addColorStop(0.5, '#ef4444');
  switchGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = switchGrad;
  ctx.fillRect(switchX, switchY, switchW, switchH);

  // Switch labels I / O
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('I', w / 2, switchY + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('O', w / 2, switchY + switchH - 14);

  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 11px system-ui';
  ctx.fillText('POWER', w / 2, switchY + switchH + 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates an authentic Hikvision Switch or UPS front faceplate canvas texture
 */
export function createHikvisionFaceTexture(
  item: Product3DInstance,
  spanHeight: number,
  assetDef?: Product3DAssetDef | null
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = item.uSpan > 1 ? 384 : 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;
  const isUps = assetDef?.categoryProfile === 'ups-online' || item.sku.includes('UPS') || item.name.includes('אל-פסק');

  // 1. Chassis Background (Dark Charcoal / Slate industrial steel)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Outer frame & rack ear rivets
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // 2. Official HIKVISION Brand Badge (Left Side)
  const badgeX = 32;
  const badgeY = 24;
  const badgeW = 180;
  const badgeH = 50;

  // Red accent block
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(badgeX, badgeY, 8, badgeH);

  // Dark badge background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(badgeX + 8, badgeY, badgeW - 8, badgeH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

  // "HIKVISION" Text in bold corporate styling
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIKVISION', badgeX + 22, badgeY + badgeH / 2);

  // Model SKU subtitle below badge
  const skuText = item.sku || 'DS-3E SERIES';
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(skuText, badgeX, badgeY + badgeH + 24);

  if (isUps) {
    // -------------------------------------------------------------
    // UPS LAYOUT: LCD Screen, Battery Graph, Power Button
    // -------------------------------------------------------------
    // Center-left LCD display
    const lcdX = 260;
    const lcdY = 28;
    const lcdW = 400;
    const lcdH = h - 56;

    // Bezel
    ctx.fillStyle = '#020617';
    ctx.fillRect(lcdX, lcdY, lcdW, lcdH);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(lcdX, lcdY, lcdW, lcdH);

    // Green/Cyan Backlit Matrix
    const lcdGrad = ctx.createLinearGradient(lcdX, lcdY, lcdX, lcdY + lcdH);
    lcdGrad.addColorStop(0, '#022c22');
    lcdGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = lcdGrad;
    ctx.fillRect(lcdX + 6, lcdY + 6, lcdW - 12, lcdH - 12);

    // LCD Content
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('INPUT: 230V ~ 50Hz', lcdX + 24, lcdY + 45);
    ctx.fillText('OUTPUT: 230V / ONLINE', lcdX + 24, lcdY + 85);

    // Battery bar
    ctx.fillStyle = '#065f46';
    ctx.fillRect(lcdX + 24, lcdY + 115, 240, 26);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(lcdX + 26, lcdY + 117, 230, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('BATTERY: 100% (NORMAL)', lcdX + 32, lcdY + 132);

    // Right Side: Heavy Ventilation & Power Switch
    const ventX = lcdX + lcdW + 40;
    const ventW = w - ventX - 40;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(ventX, 28, ventW, h - 56);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(ventX, 28, ventW, h - 56);

    for (let vy = 42; vy < h - 40; vy += 14) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ventX + 16, vy, ventW - 32, 6);
    }
  } else {
    // -------------------------------------------------------------
    // SWITCH LAYOUT: RJ45 Port Arrays with LEDs and SFP slots
    // -------------------------------------------------------------
    const portBlocks = assetDef?.details?.portBlocks || (item.sku.includes('24') ? 3 : item.sku.includes('48') ? 4 : 2);
    const totalPorts = portBlocks * 8;

    // RJ45 Port Section
    const portsStartX = 280;
    const blockW = Math.min(180, (w - portsStartX - 160) / portBlocks - 16);

    for (let b = 0; b < portBlocks; b++) {
      const bx = portsStartX + b * (blockW + 20);
      const by = 28;
      const bH = h - 56;

      // Port Block Enclosure
      ctx.fillStyle = '#020617';
      ctx.fillRect(bx, by, blockW, bH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, blockW, bH);

      // Render 8 ports (2 rows of 4) inside each block
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          const px = bx + 12 + c * (blockW / 4.4);
          const py = by + 14 + r * (bH / 2.3);
          const portW = blockW / 5.2;
          const portH = bH / 2.8;

          // Metallic RJ45 Shield
          ctx.fillStyle = '#64748b';
          ctx.fillRect(px, py, portW, portH);
          ctx.fillStyle = '#090d16';
          ctx.fillRect(px + 2, py + 2, portW - 4, portH - 4);

          // Golden contact pins
          ctx.fillStyle = '#f59e0b';
          for (let pin = 0; pin < 3; pin++) {
            ctx.fillRect(px + 4 + pin * 4, py + 4, 2, 4);
          }

          // Green Activity LED above port
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(px + portW / 2, py - 6, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Block label (e.g. Ports 1-8)
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PORTS ${b * 8 + 1}-${(b + 1) * 8}`, bx + blockW / 2, by + bH + 16);
    }

    // Right side: SFP / SFP+ Uplink Ports
    const sfpX = w - 130;
    const sfpY = 28;
    const sfpW = 90;
    const sfpH = h - 56;

    ctx.fillStyle = '#020617';
    ctx.fillRect(sfpX, sfpY, sfpW, sfpH);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sfpX, sfpY, sfpW, sfpH);

    // Dual SFP Cages
    for (let s = 0; s < 2; s++) {
      const sy = sfpY + 14 + s * (sfpH / 2.2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sfpX + 14, sy, sfpW - 28, sfpH / 2.6);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(sfpX + 16, sy + 2, sfpW - 32, sfpH / 2.6 - 4);
      // Silver latch
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sfpX + 24, sy + sfpH / 2.6 - 8, sfpW - 48, 4);
      // Blue SFP LED
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(sfpX + sfpW / 2, sy - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SFP/SFP+', sfpX + sfpW / 2, sfpY + sfpH + 16);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
