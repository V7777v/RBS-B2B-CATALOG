import * as THREE from 'three';

/**
 * Creates an authentic high-resolution Three.js texture of the Boost RackMount logo
 * as specified in the manufacturer identity and user-provided image:
 * - Bold black "Boost" with oversized capital "B"
 * - Vibrant lime green "RackMount" underneath
 * - The distinctive dynamic emblem above "ost":
 *   - Angled orange/vermilion right triangle (#ea4d1d)
 *   - Upward sweeping vibrant lime green wing (#5fe000)
 */
let cachedBoostLogoTexture: THREE.CanvasTexture | null = null;

export function createBoostRackMountLogoTexture(): THREE.CanvasTexture | null {
  if (cachedBoostLogoTexture) return cachedBoostLogoTexture;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 410; // ~2.5:1 ratio matching the brand badge proportion
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background: Sleek brushed aluminum/metallic plate with dark anodized border
  // Provides clean contrast for both the black "Boost" and lime "RackMount"
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 410);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(0.3, '#f1f5f9');
  bgGrad.addColorStop(0.7, '#e2e8f0');
  bgGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 410);

  // Subtle brushed metal horizontal micro-lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  for (let y = 6; y < 410; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Dark gunmetal outer border & chamfered edge
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 400);

  // Inner polished silver stroke
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 992, 378);

  // Industrial corner mounting screws
  const screwPositions = [
    [32, 32], [992, 32],
    [32, 378], [992, 378]
  ];
  screwPositions.forEach(([sx, sy]) => {
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Screw slot
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 5);
    ctx.lineTo(sx + 5, sy + 5);
    ctx.stroke();
  });

  // --- LOGO VECTOR DRAWING ---
  // Coordinates tuned precisely to user's uploaded RackMount_logo_400px.jpg
  ctx.save();
  ctx.translate(65, 30);

  // 1. Capital "B" - Extra tall, ultra-bold, black
  ctx.fillStyle = '#050505';
  ctx.font = '900 240px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('B', 0, 248);

  // 2. Lowercase "oost" - Bold, black, sitting aligned with B
  ctx.font = '900 160px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  ctx.fillText('oost', 165, 248);

  // 3. Dynamic Boost Icon (Orange triangle + Vibrant Lime Swoosh) above "ost"
  ctx.save();
  ctx.translate(560, 20);

  // Orange/Vermilion angled triangle
  ctx.fillStyle = '#ea4d1d';
  ctx.beginPath();
  ctx.moveTo(40, 150);  // Bottom-left
  ctx.lineTo(170, 150); // Bottom-right
  ctx.lineTo(82, 45);   // Top apex
  ctx.closePath();
  ctx.fill();

  // Vibrant Lime Green curved swoosh/wing
  ctx.fillStyle = '#5ee000';
  ctx.beginPath();
  // Starts near bottom-right of the triangle
  ctx.moveTo(150, 152);
  // Outer sweeping curve up to top right tip
  ctx.quadraticCurveTo(240, 100, 245, -15);
  // Sharp outer tip
  ctx.lineTo(240, -18);
  // Inner swooping curve arching smoothly over the triangle
  ctx.quadraticCurveTo(195, 35, 108, 60);
  ctx.quadraticCurveTo(155, 120, 150, 152);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // 4. "RackMount" text in Vibrant Lime Green
  ctx.fillStyle = '#5ee000';
  ctx.font = '800 112px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  ctx.letterSpacing = '-1px';
  ctx.fillText('RackMount', 168, 335);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  cachedBoostLogoTexture = texture;
  return texture;
}

/**
 * Helper to build the Boost brand badge mesh attached as a child of the FRAME group.
 * 1. Child of frame group — must not move when door opens.
 * 2. Place on front face of top header bar: z = headerFrontZ + 0.01.
 * 3. Horizontal: right-aligned — badge right edge at (innerWidth/2 - 0.12).
 *    badgeX = (innerWidth / 2 - 0.12) - badgeWidth / 2.
 *    Vertical: centered on header bar height: headerCenterY.
 * 4. Size: badge height = 70% of header bar height (headerHeight * 0.70),
 *    badge width = badgeHeight * 2.5 (preserving 2.5:1 ratio).
 *    Small nameplate look, not a poster.
 * 5. renderOrder = 12, depthTest = true, no transparency on the plate itself.
 */
export function createBoostHeaderBadgeMesh(
  innerWidth: number,
  headerHeight: number,
  headerCenterY: number,
  headerFrontZ: number,
  edgeMat: THREE.Material
): THREE.Mesh {
  const badgeHeight = headerHeight * 0.70;
  const badgeWidth = badgeHeight * 2.5; // Preserves 2.5:1 ratio (roughly 14-16% of cabinet width)
  const badgeDepth = 0.015;

  const logoTexture = createBoostRackMountLogoTexture();
  const badgeFaceMat = new THREE.MeshStandardMaterial({
    map: logoTexture,
    roughness: 0.35,
    metalness: 0.40,
    depthTest: true,
    transparent: false,
  });

  const safeEdgeMat = (edgeMat as THREE.Material).clone();
  safeEdgeMat.depthTest = true;
  (safeEdgeMat as any).transparent = false;

  const materials = [
    safeEdgeMat, // right
    safeEdgeMat, // left
    safeEdgeMat, // top
    safeEdgeMat, // bottom
    badgeFaceMat, // front face (+Z)
    safeEdgeMat, // back
  ];

  const geom = new THREE.BoxGeometry(badgeWidth, badgeHeight, badgeDepth);
  const mesh = new THREE.Mesh(geom, materials);
  mesh.name = 'boost-rackmount-header-badge';
  mesh.renderOrder = 12;

  // Horizontal: right-aligned — badge right edge at (innerWidth / 2 - 0.12)
  const badgeX = (innerWidth / 2 - 0.12) - badgeWidth / 2;
  // Vertical: centered on header bar height
  const badgeY = headerCenterY;
  // z = header front surface + 0.01
  const badgeZ = headerFrontZ + badgeDepth / 2 + 0.01;

  mesh.position.set(badgeX, badgeY, badgeZ);
  (mesh as any).userData = { isCabinetStructure: true, isBadge: true };

  return mesh;
}


