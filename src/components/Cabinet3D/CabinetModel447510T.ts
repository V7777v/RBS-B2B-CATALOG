import * as THREE from 'three';
import { CabinetDimensions3D, DoorLeafState, DoorState } from './Cabinet3DTypes';
import { CabinetMatrixData } from '../../utils/cabinetData';
import {
  SCALE_MM_TO_UNITS,
  U_HEIGHT_UNITS,
  RACK_19_WIDTH_UNITS,
  USABLE_OPENING_WIDTH,
  BuildCabinetFrameOptions,
  CabinetDoorsInfo,
  resolveCabinetDoorsInfo,
} from './CabinetModelBuilder';
import { createBoostHeaderBadgeMesh } from './BoostRackMountLogo';
import { createPerforationTexture } from './BrandTextures';

/**
 * High-fidelity 3D simulation specifically for SKU 447510T (Boost 44U 75x100 Floor Standing Rack)
 * Built strictly according to the manufacturer technical blueprints (Pages 1-8):
 * - PN: 447510T (Boost-RackMount)
 * - 44U 750mm Width x 1000mm Depth
 * - Frame Height: 2060.7mm, Total Height: 2148.3mm (with casters & leveling feet)
 * - Front Door: Perforated double door (French doors) with Spring lock
 * - Rear Door: Perforated double door (French doors) with Spring lock
 * - 4 Fans unit in one plate with one cable on top canopy
 * - 4 Heavy-duty casters + 4 leveling feet (bottom view)
 * - 2pcs Fixed Shelf 470*650*48 (PN 117914) with diagonal ventilation slots (Page 8)
 * - 2x 400mm width cable trays (400.2 x 1958.9 x 10.6 mm, Page 4)
 * - Horizontal depth struts 1860 x 67.5 mm (Page 5)
 * - 19" vertical rails 1948.9 x 69 x 51.5 mm L-angle with EIA-310 cage holes & U numbers (Page 6)
 * - Structural folded corner brackets 80x75x57 mm (Page 7)
 * - Main grounding copper rod & connecting wires (Page 1 point 8)
 * - Connecting box with 3 holes to install 12 socket PDU (Page 1 point 11)
 * - Detachable side panels with small round keylocks (Page 1 point 9 & Page 3)
 */

let cachedVentSlotTexture: THREE.CanvasTexture | null = null;

// Page 8: Diagonal ventilation slots texture for Fixed Shelf PN 117914
export function createDiagonalVentSlotTexture(): THREE.CanvasTexture | null {
  if (cachedVentSlotTexture) return cachedVentSlotTexture;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#334155'; // Dark industrial steel
  ctx.fillRect(0, 0, 512, 512);

  // Diagonal slots (slanted pill capsules at 45 degrees as shown in Page 8)
  ctx.fillStyle = '#0f172a'; // Deep cutout
  ctx.strokeStyle = '#64748b'; // Chamfer edge
  ctx.lineWidth = 2;

  const slotLen = 32;
  const slotThick = 9;
  const colStep = 48;
  const rowStep = 42;

  for (let y = 16; y < 512; y += rowStep) {
    const colShift = (Math.floor(y / rowStep) % 2) * 24;
    for (let x = 16; x < 512; x += colStep) {
      ctx.save();
      ctx.translate(x + colShift, y);
      ctx.rotate(-Math.PI / 4); // 45 degree angle

      // Rounded pill capsule
      ctx.beginPath();
      const r = slotThick / 2;
      const hl = slotLen / 2;
      ctx.arc(-hl + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.lineTo(hl - r, -r);
      ctx.arc(hl - r, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 5);
  cachedVentSlotTexture = texture;
  return texture;
}

let cachedCableTrayTexture: THREE.CanvasTexture | null = null;

// Page 4: 400mm width cable tray pattern texture
function createCableTrayTexture(): THREE.CanvasTexture | null {
  if (cachedCableTrayTexture) return cachedCableTrayTexture;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Galvanized / coated steel tray surface
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 1024);

  // Stamped cable-tie bridges (rectangular punchouts in 3 columns)
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;

  const cols = [48, 128, 208];
  for (let y = 30; y < 1024; y += 45) {
    cols.forEach(cx => {
      // Horizontal slot
      ctx.fillRect(cx - 24, y - 6, 48, 12);
      ctx.strokeRect(cx - 24, y - 6, 48, 12);

      // Center circular mounting hole between rows
      ctx.beginPath();
      ctx.arc(cx, y + 22, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  cachedCableTrayTexture = texture;
  return texture;
}

export function build447510TCabinetGroup(
  dims: CabinetDimensions3D,
  cabinetData: CabinetMatrixData | null,
  materials: {
    frameMat: THREE.Material;
    railMat: THREE.Material;
    panelMat: THREE.Material;
    metalMat: THREE.Material;
    accentMat: THREE.Material;
    rubberMat: THREE.Material;
    shelfMat: THREE.Material;
    includedShelfMat: THREE.Material;
  },
  options?: BuildCabinetFrameOptions & { doorState?: DoorState }
): {
  group: THREE.Group;
  uCenters: number[];
  innerDepthUnits: number;
  doorsGroup?: THREE.Group;
  setDoorMode?: (side: 'front' | 'rear', state: DoorLeafState) => void;
  setRearCutaway?: (active: boolean) => void;
  setSidePanel?: (side: 'left' | 'right', state: 'closed' | 'removed') => void;
  doorsInfo?: CabinetDoorsInfo;
} {
  const group = new THREE.Group();
  group.name = 'cabinet-447510T-root';

  // EXACT DIMENSIONS FROM TECHNICAL SPECIFICATION PDF (Pages 1 & 3):
  // 44U, Width: 750mm, Depth: 1000mm, Frame Height: 2060.7mm, Total Height: 2148.3mm
  const widthUnits = 7.50; // 750 mm (Wider than standard 600mm rack)
  const depthUnits = 10.00; // 1000 mm
  const totalU = 44;
  const railHeightUnits = totalU * U_HEIGHT_UNITS; // 44 * 0.4445 = 19.558 units (matches 1948.9mm rail)
  const roofHeight = 0.45; // 45mm top canopy
  const baseHeight = 0.45; // 45mm base plinth
  const frameHeightUnits = 20.607; // 2060.7mm frame height

  const halfW = widthUnits / 2; // 3.75
  const halfD = depthUnits / 2; // 5.00
  const halfH = frameHeightUnits / 2; // 10.3035

  // 19" Rail positions (centered within 750mm chassis):
  // Inner opening = 450mm, Rail spacing = 482.6mm (4.826 units)
  // Side cabling clearance on each side = (750 - 482.6) / 2 = 133.7mm (1.337 units)!
  const railX = RACK_19_WIDTH_UNITS / 2; // 2.413 units
  const frontRailZ = halfD - 0.75; // 75mm front recess
  const rearRailZ = -halfD + 0.85; // 85mm rear recess
  const innerDepthUnits = Math.abs(frontRailZ - rearRailZ);

  // Bottom of U1
  const u1BottomY = -halfH + baseHeight;
  const uCenters: number[] = [];
  for (let u = 1; u <= totalU; u++) {
    const centerY = u1BottomY + (u - 0.5) * U_HEIGHT_UNITS;
    uCenters.push(centerY);
  }

  // Custom PBR Materials for 447510T (Black RAL9005 Powder Coated Cold Rolled Steel)
  const ral9005Mat = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.38,
    metalness: 0.72,
  });

  const railSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.25,
    metalness: 0.85,
  });

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xc27838,
    roughness: 0.22,
    metalness: 0.95,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.98,
  });

  const postHeight = frameHeightUnits - roofHeight - baseHeight;
  const doorLeafWidth = (widthUnits - 0.20) / 2; // ~3.65 units
  const doorLeafHeight = postHeight * 0.99;

  const frontPerfTexture = createPerforationTexture();
  if (frontPerfTexture) {
    frontPerfTexture.repeat.set(doorLeafWidth * 3.5, doorLeafHeight * 3.5);
  }

  const rearPerfTexture = createPerforationTexture();
  if (rearPerfTexture) {
    rearPerfTexture.repeat.set(doorLeafWidth * 3.5, doorLeafHeight * 3.5);
  }

  const frontPerfDoorMat = new THREE.MeshStandardMaterial({
    map: frontPerfTexture || null,
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.75,
    transparent: false,
    opacity: 1.0,
  });

  const rearPerfDoorMat = new THREE.MeshStandardMaterial({
    map: rearPerfTexture || null,
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.75,
    transparent: false,
    opacity: 1.0,
  });

  const frontDoorFrameMat = (ral9005Mat as THREE.MeshStandardMaterial).clone();
  frontDoorFrameMat.transparent = true;
  frontDoorFrameMat.opacity = 0.42;

  const rearDoorFrameMat = (ral9005Mat as THREE.MeshStandardMaterial).clone();
  rearDoorFrameMat.transparent = true;
  rearDoorFrameMat.opacity = 0.42;

  // =========================================================================
  // 1. BASE PLINTH & CASTERS + LEVELING FEET (Page 3 Bottom View & Page 1)
  // =========================================================================
  const baseGeom = new THREE.BoxGeometry(widthUnits, baseHeight, depthUnits);
  const baseMesh = new THREE.Mesh(baseGeom, ral9005Mat);
  baseMesh.position.set(0, -halfH + baseHeight / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Large central rectangular cable entry cutout (425mm wide, Page 3 bottom view)
  const baseCutoutGeom = new THREE.BoxGeometry(4.25, 0.02, 3.50);
  const baseCutoutMesh = new THREE.Mesh(baseCutoutGeom, materials.accentMat);
  baseCutoutMesh.position.set(0, -halfH + baseHeight + 0.01, 0);
  group.add(baseCutoutMesh);

  // 4 Heavy-Duty Casters and 4 Leveling Feet (Page 1 point 4, Page 3 bottom view)
  const cornerOffsets = [
    [-halfW + 0.55, -halfD + 0.55], // Rear Left
    [halfW - 0.55, -halfD + 0.55],  // Rear Right
    [-halfW + 0.55, halfD - 0.55],  // Front Left
    [halfW - 0.55, halfD - 0.55],   // Front Right
  ];

  cornerOffsets.forEach(([cx, cz], idx) => {
    // A. Dual Caster Wheel (Heavy load industrial rated)
    const casterGroup = new THREE.Group();
    casterGroup.name = `caster-wheel-${idx + 1}`;
    casterGroup.position.set(cx, -halfH - 0.35, cz);

    const castersItem = {
      instanceId: `casters-feet-set-447510T`,
      sku: 'CASTERS-FEET-SET',
      name: '4 גלגלים כבדים + 4 רגליות פילוס (כלול בארון)',
      description: 'מערכת שינוע וייצוב הכוללת 4 גלגלי נשיאה כבדים כפולים עם מעצור ו-4 רגליות פילוס M12 מתכווננות להעמסה סטטית עד 1000 ק״ג.',
      price: 0,
      isIncluded: true,
      type: 'hardware',
    };

    // Swivel base mounting flange (bolted to cabinet plinth)
    const flangeGeom = new THREE.BoxGeometry(0.36, 0.05, 0.36);
    const flangeMesh = new THREE.Mesh(flangeGeom, chromeMat);
    flangeMesh.position.set(0, 0.28, 0);
    (flangeMesh as any).userData = { isProductMesh: true, item: castersItem };
    casterGroup.add(flangeMesh);

    // Swivel fork
    const forkGeom = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    const forkMesh = new THREE.Mesh(forkGeom, chromeMat);
    forkMesh.position.set(0, 0.14, 0);
    (forkMesh as any).userData = { isProductMesh: true, item: castersItem };
    casterGroup.add(forkMesh);

    // Dual black rubber wheels
    [-0.08, 0.08].forEach(wheelX => {
      const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.10, 20);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheelMesh = new THREE.Mesh(wheelGeom, materials.rubberMat);
      wheelMesh.position.set(wheelX, 0, 0);
      wheelMesh.castShadow = true;
      (wheelMesh as any).userData = { isProductMesh: true, item: castersItem };
      casterGroup.add(wheelMesh);
    });
    (casterGroup as any).userData = { isProductMesh: true, item: castersItem };
    group.add(casterGroup);

    // B. Threaded Leveling Foot (Page 3 bottom view, mounted adjacent to caster)
    const footGroup = new THREE.Group();
    footGroup.name = `leveling-foot-${idx + 1}`;
    // Positioned inward towards center
    const footX = cx > 0 ? cx - 0.45 : cx + 0.45;
    const footZ = cz > 0 ? cz - 0.45 : cz + 0.45;
    footGroup.position.set(footX, -halfH - 0.18, footZ);

    // Threaded M12 steel stem
    const stemGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 12);
    const stemMesh = new THREE.Mesh(stemGeom, chromeMat);
    stemMesh.position.set(0, 0.12, 0);
    (stemMesh as any).userData = { isProductMesh: true, item: castersItem };
    footGroup.add(stemMesh);

    // Heavy rubber base pad
    const padGeom = new THREE.CylinderGeometry(0.26, 0.30, 0.12, 20);
    const padMesh = new THREE.Mesh(padGeom, materials.rubberMat);
    padMesh.position.set(0, -0.04, 0);
    (padMesh as any).userData = { isProductMesh: true, item: castersItem };
    footGroup.add(padMesh);
    (footGroup as any).userData = { isProductMesh: true, item: castersItem };

    group.add(footGroup);
  });

  // =========================================================================
  // 2. CORNER UPRIGHT POSTS & REINFORCING CASTING BRACKETS (Page 7)
  // =========================================================================
  const postThick = 0.18;
  const postPositions = [
    [-halfW + postThick / 2, -halfD + postThick / 2],
    [halfW - postThick / 2, -halfD + postThick / 2],
    [-halfW + postThick / 2, halfD - postThick / 2],
    [halfW - postThick / 2, halfD - postThick / 2],
  ];

  const postGeom = new THREE.BoxGeometry(postThick, postHeight, postThick);
  postPositions.forEach(([px, pz]) => {
    const postMesh = new THREE.Mesh(postGeom, ral9005Mat);
    postMesh.position.set(px, -halfH + baseHeight + postHeight / 2, pz);
    postMesh.castShadow = true;
    group.add(postMesh);
  });

  // Heavy-duty folded corner joining brackets 80x75x57mm (Page 7)
  // Positioned at top and bottom of all 4 corners
  [-halfW + 0.45, halfW - 0.45].forEach(bx => {
    [-halfD + 0.45, halfD - 0.45].forEach(bz => {
      // Bottom corner bracket
      const bBottom = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.50, 0.60), materials.metalMat);
      bBottom.position.set(bx, -halfH + baseHeight + 0.25, bz);
      group.add(bBottom);

      // Top corner bracket
      const bTop = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.50, 0.60), materials.metalMat);
      bTop.position.set(bx, halfH - roofHeight - 0.25, bz);
      group.add(bTop);
    });
  });

  // =========================================================================
  // 3. HORIZONTAL DEPTH REDUCER STRUTS (Page 5: 1860 x 67.5 mm)
  // Structural crossbars connecting front and rear columns on left and right sides
  // =========================================================================
  const strutLength = depthUnits - 0.8;
  const strutGeom = new THREE.BoxGeometry(0.08, 0.675, strutLength); // 67.5mm scaled height
  const strutFractions = [0.08, 0.35, 0.65, 0.92]; // 4 height tiers

  [-halfW + 0.12, halfW - 0.12].forEach(sx => {
    strutFractions.forEach(frac => {
      const strutMesh = new THREE.Mesh(strutGeom, materials.metalMat);
      strutMesh.position.set(sx, -halfH + baseHeight + postHeight * frac, 0);
      group.add(strutMesh);
    });
  });

  // =========================================================================
  // 4. TWO 400MM WIDTH VERTICAL CABLE TRAYS (Page 1 point 7, Page 4: 400.2 x 1958.9 mm)
  // Positioned along the spacious side corridors (133.7mm width on each side)
  // =========================================================================
  const trayTexture = createCableTrayTexture();
  const trayMat = new THREE.MeshStandardMaterial({
    map: trayTexture,
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.75,
  });

  // 400.2mm width (4.00 units depth-wise), 1958.9mm height (19.589 units)
  const trayGeom = new THREE.BoxGeometry(0.06, 19.589, 4.00);

  // Left side vertical cable tray
  const leftTray = new THREE.Mesh(trayGeom, trayMat);
  leftTray.position.set(-halfW + 0.45, -halfH + baseHeight + 19.589 / 2, 0);
  leftTray.name = 'cable-tray-400mm-left';
  (leftTray as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'cable-tray-400-left',
      sku: 'TRAY-400-L',
      name: 'תעלת כבילה אנכית רחבה 400 מ״מ (צד שמאל - כלול בארון)',
      description: 'מגש כבילה מסיבי ברוחב 400.2 מ״מ עם גשרי עיגון תקניים לארגון וקשירת צמות כבלים עבות.',
      price: 0,
      isIncluded: true,
      type: 'panel',
    },
  };
  group.add(leftTray);

  // Right side vertical cable tray
  const rightTray = new THREE.Mesh(trayGeom, trayMat);
  rightTray.position.set(halfW - 0.45, -halfH + baseHeight + 19.589 / 2, 0);
  rightTray.name = 'cable-tray-400mm-right';
  (rightTray as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'cable-tray-400-right',
      sku: 'TRAY-400-R',
      name: 'תעלת כבילה אנכית רחבה 400 מ״מ (צד ימין - כלול בארון)',
      description: 'מגש כבילה מסיבי ברוחב 400.2 מ״מ עם גשרי עיגון תקניים לארגון וקשירת צמות כבלים עבות.',
      price: 0,
      isIncluded: true,
      type: 'panel',
    },
  };
  group.add(rightTray);

  // =========================================================================
  // 5. 19" VERTICAL MOUNTING RAILS (Page 6: 1948.9 x 69 x 51.5 mm L-angle)
  // With silkscreened white U markings 1..44 and oval cable pass-throughs
  // =========================================================================
  const railLength = 19.489; // 1948.9 mm
  const railGeom = new THREE.BoxGeometry(0.16, railLength, 0.16);

  // Front-Left, Front-Right, Rear-Left, Rear-Right 19" rails
  const frontLeftRail = new THREE.Mesh(railGeom, railSteelMat);
  frontLeftRail.position.set(-railX, -halfH + baseHeight + railLength / 2, frontRailZ);
  group.add(frontLeftRail);

  const frontRightRail = new THREE.Mesh(railGeom, railSteelMat);
  frontRightRail.position.set(railX, -halfH + baseHeight + railLength / 2, frontRailZ);
  group.add(frontRightRail);

  const rearLeftRail = new THREE.Mesh(railGeom, railSteelMat);
  rearLeftRail.position.set(-railX, -halfH + baseHeight + railLength / 2, rearRailZ);
  group.add(rearLeftRail);

  const rearRightRail = new THREE.Mesh(railGeom, railSteelMat);
  rearRightRail.position.set(railX, -halfH + baseHeight + railLength / 2, rearRailZ);
  group.add(rearRightRail);

  // Oval cable cutouts along depth flange of rails (Page 6)
  const ovalCutoutGeom = new THREE.BoxGeometry(0.02, 0.28, 0.40);
  [-railX, railX].forEach(rx => {
    [frontRailZ - 0.25, rearRailZ + 0.25].forEach(rz => {
      [2, 6, 11, 16, 21, 26, 31, 36, 41].forEach(uTier => {
        const ovalMesh = new THREE.Mesh(ovalCutoutGeom, materials.panelMat);
        ovalMesh.position.set(rx + (rx > 0 ? -0.06 : 0.06), uCenters[uTier - 1], rz);
        group.add(ovalMesh);
      });
    });
  });

  // U-NUMBER LABELS (1..44U) on front rails
  const uTextureCache = new Map<number, THREE.CanvasTexture | THREE.Texture>();
  const getUTexture = (uNum: number) => {
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }
    let tex = uTextureCache.get(uNum);
    if (!tex) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const cx = c.getContext('2d');
      if (cx) {
        cx.fillStyle = '#0f172a';
        cx.fillRect(0, 0, 128, 64);
        cx.strokeStyle = '#38bdf8';
        cx.lineWidth = 3;
        cx.strokeRect(2, 2, 124, 60);
        cx.fillStyle = '#ffffff';
        cx.font = 'bold 36px monospace';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(`U${uNum}`, 64, 34);
      }
      tex = new THREE.CanvasTexture(c);
      uTextureCache.set(uNum, tex);
    }
    return tex;
  };

  const labelGeom = new THREE.PlaneGeometry(0.32, U_HEIGHT_UNITS * 0.55);
  for (let u = 1; u <= totalU; u++) {
    const yCenter = uCenters[u - 1];
    const uTex = getUTexture(u);
    const uLabelMat = new THREE.MeshBasicMaterial({ map: uTex, toneMapped: false });

    const leftLbl = new THREE.Mesh(labelGeom, uLabelMat);
    leftLbl.position.set(-railX - 0.22, yCenter, frontRailZ + 0.085);
    group.add(leftLbl);

    const rightLbl = new THREE.Mesh(labelGeom, uLabelMat);
    rightLbl.position.set(railX + 0.22, yCenter, frontRailZ + 0.085);
    group.add(rightLbl);
  }

  // =========================================================================
  // 6. ROOF CANOPY & 4-FAN UNIT & CABLE ENTRY PORTS (Page 3 Top View & Page 1 point 3)
  // =========================================================================
  const roofGeom = new THREE.BoxGeometry(widthUnits, roofHeight, depthUnits);
  const roofMesh = new THREE.Mesh(roofGeom, ral9005Mat);
  roofMesh.position.set(0, halfH - roofHeight / 2, 0);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Boost brand nameplate badge on the front face of the top header bar (FRAME group child)
  // Right-aligned: right edge at (innerWidth/2 - 0.12); centered on header bar height; z = header front surface + 0.01
  const headerBadgeMesh = createBoostHeaderBadgeMesh(
    widthUnits - postThick * 2,
    roofHeight,
    halfH - roofHeight / 2,
    halfD,
    ral9005Mat
  );
  group.add(headerBadgeMesh);

  // Central Raised Fan Hood (390 mm wide, Page 3 top view)
  const fanHoodWidth = 3.90;
  const fanHoodDepth = 5.60;
  const fanHoodGeom = new THREE.BoxGeometry(fanHoodWidth, 0.06, fanHoodDepth);
  const fanHoodMesh = new THREE.Mesh(fanHoodGeom, ral9005Mat);
  fanHoodMesh.position.set(0, halfH + 0.03, 0);
  fanHoodMesh.castShadow = true;
  const fanUnitItem = {
    instanceId: 'roof-fan-bay-447510T',
    sku: 'ROOF-FAN-4',
    name: 'יחידת 4 מאווררי גג בפלטה אחת עם כבל (כלול בארון)',
    description: 'יחידת איוורור גג הכוללת 4 מאווררים מובנים בפלטה אינטגרלית אחת עם כבל הזנה ותקע ישראלי תקני (ללא תפיסת מקום ב-U).',
    price: 0,
    isIncluded: true,
    type: 'fan',
  };
  (fanHoodMesh as any).userData = { isProductMesh: true, item: fanUnitItem };
  group.add(fanHoodMesh);

  // Power cable running from roof fan unit with standard Israeli 3-pin plug (Page 1 point 3)
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
  const cableGeom = new THREE.CylinderGeometry(0.03, 0.03, 5.2, 8);
  const powerCable = new THREE.Mesh(cableGeom, cableMat);
  powerCable.position.set(1.4, halfH - 2.6, -halfD + 0.6);
  (powerCable as any).userData = { isProductMesh: true, item: fanUnitItem };
  group.add(powerCable);

  // Israeli standard 3-pin electrical plug
  const plugGeom = new THREE.BoxGeometry(0.18, 0.32, 0.12);
  const plugMesh = new THREE.Mesh(plugGeom, materials.metalMat);
  plugMesh.position.set(1.4, halfH - 5.2, -halfD + 0.6);
  (plugMesh as any).userData = { isProductMesh: true, item: fanUnitItem };
  group.add(plugMesh);

  // Horizontal cooling louvers/slots on fan hood
  const louverGeom = new THREE.BoxGeometry(fanHoodWidth * 0.75, 0.015, 0.08);
  for (let lz = -fanHoodDepth * 0.38; lz <= fanHoodDepth * 0.38; lz += 0.22) {
    const lMesh = new THREE.Mesh(louverGeom, materials.panelMat);
    lMesh.position.set(0, halfH + 0.061, lz);
    group.add(lMesh);
  }

  // 4 Fans unit in one plate with one cable (Page 1 point 3)
  const fanBayPositions = [
    [-0.95, -1.25], // Front Left
    [0.95, -1.25],  // Front Right
    [-0.95, 1.25],  // Rear Left
    [0.95, 1.25],   // Rear Right
  ];

  fanBayPositions.forEach(([fx, fz], fIdx) => {
    const fanBay = new THREE.Group();
    fanBay.name = `boost-roof-fan-${fIdx + 1}`;
    fanBay.position.set(fx, halfH + 0.02, fz);

    // Bezel
    const bezelGeom = new THREE.TorusGeometry(0.52, 0.03, 8, 28);
    bezelGeom.rotateX(Math.PI / 2);
    const bezelMesh = new THREE.Mesh(bezelGeom, chromeMat);
    fanBay.add(bezelMesh);

    // 7 Aerodynamic rotor blades
    const hubGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
    const hub = new THREE.Mesh(hubGeom, materials.metalMat);
    fanBay.add(hub);

    for (let b = 0; b < 7; b++) {
      const angle = (b * Math.PI * 2) / 7;
      const bladeGeom = new THREE.BoxGeometry(0.32, 0.04, 0.10);
      const blade = new THREE.Mesh(bladeGeom, materials.accentMat);
      blade.position.set(Math.cos(angle) * 0.30, 0, Math.sin(angle) * 0.30);
      blade.rotation.y = -angle + 0.3;
      fanBay.add(blade);
    }

    // Chrome wire finger guard
    [0.24, 0.46].forEach(r => {
      const ringGeom = new THREE.TorusGeometry(r, 0.012, 6, 24);
      ringGeom.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeom, chromeMat);
      fanBay.add(ring);
    });

    (fanBay as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `builtin-roof-fan-${fIdx + 1}`,
        sku: 'BUILTIN-FAN-447510T',
        name: `מאוורר גג תעשייתי 120 מ״מ (${fIdx + 1}/4 כלול בארון)`,
        description: 'יחידת 4 מאווררים מובנית בפלטה אחת עם כבל הזנה ייעודי לפי מפרט יצרן 447510T.',
        price: 0,
        isIncluded: true,
        type: 'fan',
      },
    };
    group.add(fanBay);
  });

  // 8 Side Cable Entry Ports with nylon brushes (Page 3 top view: 4 on left, 4 on right)
  const portGeom = new THREE.BoxGeometry(0.60, 0.02, 1.20);
  const brushMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 });
  const portZPositions = [-3.2, -1.1, 1.1, 3.2];

  [-halfW + 0.65, halfW - 0.65].forEach(px => {
    portZPositions.forEach(pz => {
      const port = new THREE.Mesh(portGeom, brushMat);
      port.position.set(px, halfH + 0.005, pz);
      group.add(port);

      // Port metallic frame
      const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.025, 1.26), materials.metalMat);
      pFrame.position.set(px, halfH + 0.002, pz);
      group.add(pFrame);
    });
  });

  // Rear Cable Entry Cutout (425 mm wide, Page 3 top view)
  const rearCutoutGeom = new THREE.BoxGeometry(4.25, 0.02, 0.65);
  const rearCutout = new THREE.Mesh(rearCutoutGeom, brushMat);
  rearCutout.position.set(0, halfH + 0.005, -halfD + 0.70);
  group.add(rearCutout);

  // =========================================================================
  // 7. FRONT DOUBLE PERFORATED DOORS WITH SPRING LOCK (Page 1 point 1, Pages 2 & 3)
  // Split French doors with 2 symmetrical leaves (~365mm each) & Spring lock
  // =========================================================================
  const doorsRootGroup = new THREE.Group();
  doorsRootGroup.name = 'front-double-doors-group';

  const doorThick = 0.06;

  // Raycast toggler helper for removed/active doors
  const setHierarchyRaycast = (obj: THREE.Object3D, enabled: boolean) => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        if (!enabled) {
          child.raycast = () => {};
        } else {
          child.raycast = THREE.Mesh.prototype.raycast;
        }
      }
    });
  };

  // Front door leaf geometry helper
  const createDoorLeaf = (isLeft: boolean) => {
    const leafGroup = new THREE.Group();
    leafGroup.name = isLeft ? 'front-left-door-leaf' : 'front-right-door-leaf';

    // Pivot point at the outer corner
    const hingeX = isLeft ? -halfW + 0.08 : halfW - 0.08;
    leafGroup.position.set(hingeX, -halfH + baseHeight + doorLeafHeight / 2, halfD + 0.04);

    // Door frame inner offset from hinge
    const centerOffset = isLeft ? doorLeafWidth / 2 : -doorLeafWidth / 2;

    // Outer steel border frame (1.5mm cold rolled steel)
    const frontDoorItem = {
      instanceId: isLeft ? 'front-door-left-447510T' : 'front-door-right-447510T',
      sku: 'DOOR-FRONT-PERF-SPRING',
      name: 'דלת קדמית כפולה מחוררת עם מנעול קפיצי (כלול בארון)',
      description: 'דלת קדמית כפולה מחוררת (Spring Lock) נשלפת עם מעל 75% מעבר אוויר לתקני קירור שרתים מתקדמים.',
      price: 0,
      isIncluded: true,
      type: 'door',
    };

    // Hollow 4-piece perimeter frame with genuine open center aperture
    const frameBorderSide = 0.18;
    const frameBorderTop = 0.22;
    const frameBorderBtm = 0.22;
    const openingW = Math.max(0.2, doorLeafWidth - 2 * frameBorderSide);
    const openingH = Math.max(0.2, doorLeafHeight - frameBorderTop - frameBorderBtm);

    // Top beam
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, frameBorderTop, doorThick), frontDoorFrameMat);
    topBeam.position.set(centerOffset, doorLeafHeight / 2 - frameBorderTop / 2, 0);
    (topBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    leafGroup.add(topBeam);

    // Bottom beam
    const btmBeam = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, frameBorderBtm, doorThick), frontDoorFrameMat);
    btmBeam.position.set(centerOffset, -doorLeafHeight / 2 + frameBorderBtm / 2, 0);
    (btmBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    leafGroup.add(btmBeam);

    // Hinge-side stile
    const hingeStileX = isLeft ? frameBorderSide / 2 : -frameBorderSide / 2;
    const hingeStile = new THREE.Mesh(new THREE.BoxGeometry(frameBorderSide, openingH, doorThick), frontDoorFrameMat);
    hingeStile.position.set(hingeStileX, 0, 0);
    (hingeStile as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    leafGroup.add(hingeStile);

    // Meeting-side stile
    const meetingStileX = isLeft ? doorLeafWidth - frameBorderSide / 2 : -doorLeafWidth + frameBorderSide / 2;
    const meetingStile = new THREE.Mesh(new THREE.BoxGeometry(frameBorderSide, openingH, doorThick), frontDoorFrameMat);
    meetingStile.position.set(meetingStileX, 0, 0);
    (meetingStile as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    leafGroup.add(meetingStile);

    // Inset perforated mesh window (hexagonal high-airflow ventilation) situated inside opening
    const meshWindowGeom = new THREE.BoxGeometry(openingW + 0.02, openingH + 0.02, doorThick * 0.4);
    const meshWindow = new THREE.Mesh(meshWindowGeom, frontPerfDoorMat);
    meshWindow.position.set(centerOffset, 0, 0.005);
    (meshWindow as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    leafGroup.add(meshWindow);

    // Spring Lock Handle on meeting stile (Page 1 point 1 & Page 3)
    if (isLeft) {
      // Flush spring-loaded handle assembly mounted on left leaf meeting edge
      const handleBaseGeom = new THREE.BoxGeometry(0.16, 1.40, 0.08);
      const handleBase = new THREE.Mesh(handleBaseGeom, chromeMat);
      handleBase.position.set(doorLeafWidth - 0.16, 0, 0.04);
      (handleBase as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      leafGroup.add(handleBase);

      // Swing lever
      const leverGeom = new THREE.BoxGeometry(0.10, 0.85, 0.06);
      const lever = new THREE.Mesh(leverGeom, materials.accentMat);
      lever.position.set(doorLeafWidth - 0.16, -0.15, 0.08);
      (lever as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      leafGroup.add(lever);

      // Keyhole cylinder
      const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), chromeMat);
      keyhole.position.set(doorLeafWidth - 0.16, 0.40, 0.085);
      keyhole.rotateX(Math.PI / 2);
      (keyhole as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      leafGroup.add(keyhole);
    } else {
      // Right leaf meeting stile lip / rubber sealing bumper
      const lipGeom = new THREE.BoxGeometry(0.08, doorLeafHeight, 0.04);
      const lip = new THREE.Mesh(lipGeom, materials.rubberMat);
      lip.position.set(-doorLeafWidth + 0.04, 0, 0.02);
      (lip as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      leafGroup.add(lip);
    }

    // Top and Bottom Pivot Hinges
    [-doorLeafHeight / 2 + 0.15, doorLeafHeight / 2 - 0.15].forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), chromeMat);
      hinge.position.set(0, hy, 0);
      (hinge as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      leafGroup.add(hinge);
    });

    (leafGroup as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };

    return leafGroup;
  };

  const leftDoorLeaf = createDoorLeaf(true);
  const rightDoorLeaf = createDoorLeaf(false);
  doorsRootGroup.add(leftDoorLeaf);
  doorsRootGroup.add(rightDoorLeaf);
  group.add(doorsRootGroup);

  // =========================================================================
  // 8. REAR DOUBLE PERFORATED DOORS (Page 1 point 2, Pages 2 & 3)
  // Split French doors with perforated mesh and spring lock on the back
  // =========================================================================
  const rearDoorsGroup = new THREE.Group();
  rearDoorsGroup.name = 'rear-double-doors-group';

  const createRearDoorLeaf = (isLeft: boolean) => {
    const leafGroup = new THREE.Group();
    leafGroup.name = isLeft ? 'rear-left-door-leaf' : 'rear-right-door-leaf';

    // Pivot point at the outer rear corner
    const hingeX = isLeft ? -halfW + 0.08 : halfW - 0.08;
    leafGroup.position.set(hingeX, -halfH + baseHeight + doorLeafHeight / 2, -halfD - 0.04);

    const centerOffset = isLeft ? doorLeafWidth / 2 : -doorLeafWidth / 2;

    const rearDoorItem = {
      instanceId: isLeft ? 'rear-door-left-447510T' : 'rear-door-right-447510T',
      sku: 'DOOR-REAR-PERF-SPRING',
      name: 'דלת אחורית כפולה מחוררת עם מנעול קפיצי (כלול בארון)',
      description: 'דלת אחורית כפולה מחוררת (Split French Doors) עם מנעול קפיצי ומעבר אוויר חופשי של 75% לפליטת חום יעילה.',
      price: 0,
      isIncluded: true,
      type: 'door',
    };

    // Hollow 4-piece perimeter frame with genuine open center aperture
    const frameBorderSide = 0.18;
    const frameBorderTop = 0.22;
    const frameBorderBtm = 0.22;
    const openingW = Math.max(0.2, doorLeafWidth - 2 * frameBorderSide);
    const openingH = Math.max(0.2, doorLeafHeight - frameBorderTop - frameBorderBtm);

    const rTopBeam = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, frameBorderTop, doorThick), rearDoorFrameMat);
    rTopBeam.position.set(centerOffset, doorLeafHeight / 2 - frameBorderTop / 2, 0);
    (rTopBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    leafGroup.add(rTopBeam);

    const rBtmBeam = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, frameBorderBtm, doorThick), rearDoorFrameMat);
    rBtmBeam.position.set(centerOffset, -doorLeafHeight / 2 + frameBorderBtm / 2, 0);
    (rBtmBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    leafGroup.add(rBtmBeam);

    const rHingeStileX = isLeft ? frameBorderSide / 2 : -frameBorderSide / 2;
    const rHingeStile = new THREE.Mesh(new THREE.BoxGeometry(frameBorderSide, openingH, doorThick), rearDoorFrameMat);
    rHingeStile.position.set(rHingeStileX, 0, 0);
    (rHingeStile as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    leafGroup.add(rHingeStile);

    const rMeetingStileX = isLeft ? doorLeafWidth - frameBorderSide / 2 : -doorLeafWidth + frameBorderSide / 2;
    const rMeetingStile = new THREE.Mesh(new THREE.BoxGeometry(frameBorderSide, openingH, doorThick), rearDoorFrameMat);
    rMeetingStile.position.set(rMeetingStileX, 0, 0);
    (rMeetingStile as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    leafGroup.add(rMeetingStile);

    const rMesh = new THREE.Mesh(
      new THREE.BoxGeometry(openingW + 0.02, openingH + 0.02, doorThick * 0.4),
      rearPerfDoorMat
    );
    rMesh.position.set(centerOffset, 0, -0.005);
    (rMesh as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    leafGroup.add(rMesh);

    // Spring Lock handle on meeting stile
    if (isLeft) {
      const handleBaseGeom = new THREE.BoxGeometry(0.16, 1.40, 0.08);
      const handleBase = new THREE.Mesh(handleBaseGeom, chromeMat);
      handleBase.position.set(doorLeafWidth - 0.16, 0, -0.04);
      (handleBase as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      leafGroup.add(handleBase);
    } else {
      const lipGeom = new THREE.BoxGeometry(0.08, doorLeafHeight, 0.04);
      const lip = new THREE.Mesh(lipGeom, materials.rubberMat);
      lip.position.set(-doorLeafWidth + 0.04, 0, -0.02);
      (lip as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      leafGroup.add(lip);
    }

    // Hinges
    [-doorLeafHeight / 2 + 0.15, doorLeafHeight / 2 - 0.15].forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), chromeMat);
      hinge.position.set(0, hy, 0);
      (hinge as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      leafGroup.add(hinge);
    });

    (leafGroup as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    return leafGroup;
  };

  const leftRearDoorLeaf = createRearDoorLeaf(true);
  const rightRearDoorLeaf = createRearDoorLeaf(false);
  rearDoorsGroup.add(leftRearDoorLeaf);
  rearDoorsGroup.add(rightRearDoorLeaf);
  group.add(rearDoorsGroup);

  // Door state tracking & cutaway management
  let currentRearDoorState: DoorLeafState = options?.doorState?.rear || 'closed';
  let isCutawayActive = false;

  const updateRearDoorOpacity = () => {
    if (currentRearDoorState === 'removed') return;
    if (isCutawayActive && (currentRearDoorState === 'closed' || currentRearDoorState === 'transparent')) {
      rearPerfDoorMat.opacity = 0.15;
      rearPerfDoorMat.transparent = true;
      rearDoorFrameMat.opacity = 0.18;
      rearDoorFrameMat.transparent = true;
    } else {
      if (currentRearDoorState === 'closed') {
        rearPerfDoorMat.opacity = 1.0;
        rearPerfDoorMat.transparent = false;
        rearDoorFrameMat.opacity = 0.95;
        rearDoorFrameMat.transparent = false;
      } else if (currentRearDoorState === 'transparent') {
        rearPerfDoorMat.opacity = 0.3;
        rearPerfDoorMat.transparent = true;
        rearDoorFrameMat.opacity = 0.42;
        rearDoorFrameMat.transparent = true;
      } else if (currentRearDoorState === 'open') {
        rearPerfDoorMat.opacity = 1.0;
        rearPerfDoorMat.transparent = false;
        rearDoorFrameMat.opacity = 0.95;
        rearDoorFrameMat.transparent = false;
      }
    }
  };

  const setRearCutaway = (active: boolean) => {
    isCutawayActive = active;
    updateRearDoorOpacity();
  };

  // Door animation/state handler for front and rear leaves
  const setDoorMode = (side: 'front' | 'rear', state: DoorLeafState) => {
    if (side === 'front') {
      if (state === 'removed') {
        doorsRootGroup.visible = false;
        setHierarchyRaycast(doorsRootGroup, false);
      } else {
        doorsRootGroup.visible = true;
        setHierarchyRaycast(doorsRootGroup, true);
        if (state === 'open') {
          leftDoorLeaf.rotation.y = -Math.PI * 0.58; // Open 105 degrees outwards
          rightDoorLeaf.rotation.y = Math.PI * 0.58;
          frontPerfDoorMat.opacity = 1.0;
          frontPerfDoorMat.transparent = false;
          frontDoorFrameMat.opacity = 0.95;
          frontDoorFrameMat.transparent = false;
        } else if (state === 'closed') {
          leftDoorLeaf.rotation.y = 0;
          rightDoorLeaf.rotation.y = 0;
          frontPerfDoorMat.opacity = 1.0;
          frontPerfDoorMat.transparent = false;
          frontDoorFrameMat.opacity = 0.95;
          frontDoorFrameMat.transparent = false;
        } else {
          // 'transparent'
          leftDoorLeaf.rotation.y = 0;
          rightDoorLeaf.rotation.y = 0;
          frontPerfDoorMat.opacity = 0.3;
          frontPerfDoorMat.transparent = true;
          frontDoorFrameMat.opacity = 0.42;
          frontDoorFrameMat.transparent = true;
        }
      }
    } else {
      // 'rear'
      currentRearDoorState = state;
      if (state === 'removed') {
        rearDoorsGroup.visible = false;
        setHierarchyRaycast(rearDoorsGroup, false);
      } else {
        rearDoorsGroup.visible = true;
        setHierarchyRaycast(rearDoorsGroup, true);
        if (state === 'open') {
          // Opposite rotation direction to front to swing 105° outward behind
          leftRearDoorLeaf.rotation.y = Math.PI * 0.58;
          rightRearDoorLeaf.rotation.y = -Math.PI * 0.58;
        } else {
          leftRearDoorLeaf.rotation.y = 0;
          rightRearDoorLeaf.rotation.y = 0;
        }
        updateRearDoorOpacity();
      }
    }
  };

  // Initialize initial door states
  const initialFrontState = options?.doorState?.front || 'transparent';
  const initialRearState = options?.doorState?.rear || 'closed';
  setDoorMode('front', initialFrontState);
  setDoorMode('rear', initialRearState);

  // =========================================================================
  // 9. DETACHABLE SIDE PANELS WITH ROUND LOCKS (Page 1 point 9, Pages 2 & 3)
  // =========================================================================
  const sideWidth = depthUnits - 0.40;
  const sidePanelGeom = new THREE.BoxGeometry(0.04, postHeight * 0.98, sideWidth);

  const leftSideGroup = new THREE.Group();
  leftSideGroup.name = 'side-panel-left';
  (leftSideGroup as any).userData = { isSidePanel: true, side: 'left' };
  const rightSideGroup = new THREE.Group();
  rightSideGroup.name = 'side-panel-right';
  (rightSideGroup as any).userData = { isSidePanel: true, side: 'right' };

  // Ghost groups for removed side panels
  const leftGhostGroup = new THREE.Group();
  leftGhostGroup.name = 'side-panel-ghost-left';
  leftGhostGroup.visible = false;
  (leftGhostGroup as any).userData = { isSidePanelGhost: true, side: 'left' };

  const rightGhostGroup = new THREE.Group();
  rightGhostGroup.name = 'side-panel-ghost-right';
  rightGhostGroup.visible = false;
  (rightGhostGroup as any).userData = { isSidePanelGhost: true, side: 'right' };

  [-halfW + 0.02, halfW - 0.02].forEach((sx, idx) => {
    const isLeft = idx === 0;
    const targetGroup = isLeft ? leftSideGroup : rightSideGroup;
    const targetGhostGroup = isLeft ? leftGhostGroup : rightGhostGroup;
    const sideName: 'left' | 'right' = isLeft ? 'left' : 'right';
    const panelCenterY = -halfH + baseHeight + postHeight / 2;

    const sidePanelItem = {
      instanceId: `side-panel-${isLeft ? 'left' : 'right'}-447510T`,
      sku: 'SIDE-PANELS-LOCK',
      name: 'דלתות צד פריקות עם מנעול עגול (כלול בארון)',
      description: 'זוג דלתות צד מפלדה פריקות עם מנעול עגול (Round Lock) וצילינדר מפתח עליון לפתיחה קלה ותחזוקה מהירה של ציוד התקשורת.',
      price: 0,
      isIncluded: true,
      type: 'door',
    };

    const sPanel = new THREE.Mesh(sidePanelGeom, ral9005Mat);
    sPanel.position.set(sx, panelCenterY, 0);
    sPanel.receiveShadow = true;
    (sPanel as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
    targetGroup.add(sPanel);

    // Small Round Lock with keyhole at top center (Page 1 point 9 & Page 3 side view)
    const lockCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), chromeMat);
    lockCylinder.rotateZ(Math.PI / 2);
    lockCylinder.position.set(sx + (sx > 0 ? 0.02 : -0.02), halfH - roofHeight - 0.45, 0);
    (lockCylinder as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
    targetGroup.add(lockCylinder);

    // Recessed finger release latches
    [-sideWidth * 0.35, sideWidth * 0.35].forEach(lz => {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.15), materials.metalMat);
      latch.position.set(sx, halfH - roofHeight - 0.80, lz);
      (latch as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
      targetGroup.add(latch);
    });

    // Ghost: LineSegments (EdgesGeometry of the same box, LineDashedMaterial)
    const ghostEdgesGeom = new THREE.EdgesGeometry(sidePanelGeom);
    const ghostDashedMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const ghostLines = new THREE.LineSegments(ghostEdgesGeom, ghostDashedMat);
    ghostLines.computeLineDistances();
    ghostLines.position.set(sx, panelCenterY, 0);
    (ghostLines as any).userData = { isSidePanelGhost: true, side: sideName };
    targetGhostGroup.add(ghostLines);

    // Invisible thin box helper mesh to ensure reliable raycasting
    const ghostRaycastHelper = new THREE.Mesh(
      sidePanelGeom,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ghostRaycastHelper.position.set(sx, panelCenterY, 0);
    (ghostRaycastHelper as any).userData = { isSidePanelGhost: true, side: sideName };
    targetGhostGroup.add(ghostRaycastHelper);
  });

  group.add(leftSideGroup);
  group.add(rightSideGroup);
  group.add(leftGhostGroup);
  group.add(rightGhostGroup);

  const setSidePanel = (side: 'left' | 'right', state: 'closed' | 'removed') => {
    const target = side === 'left' ? leftSideGroup : rightSideGroup;
    const ghost = side === 'left' ? leftGhostGroup : rightGhostGroup;
    if (state === 'removed') {
      target.visible = false;
      setHierarchyRaycast(target, false);
      ghost.visible = true;
      setHierarchyRaycast(ghost, true);
    } else {
      target.visible = true;
      setHierarchyRaycast(target, true);
      ghost.visible = false;
      setHierarchyRaycast(ghost, false);
    }
  };

  // =========================================================================
  // 10. GROUNDING COPPER BUSBAR & BONDING WIRES (Page 1 point 8)
  // =========================================================================
  const groundBarItem = {
    instanceId: 'grounding-busbar-447510T',
    sku: 'GROUND-BAR-CU',
    name: 'פס הארקה ראשי מנחושת וכבלים (כלול בארון)',
    description: 'פס הארקה ראשי מנחושת טהורה בבסיס הארון כולל מחברי הארקה וכבלי הארקה תקניים צהוב-ירוק מחוברים לשלד ולדלתות.',
    price: 0,
    isIncluded: true,
    type: 'hardware',
  };

  const copperRodGeom = new THREE.CylinderGeometry(0.04, 0.04, 4.5, 12);
  copperRodGeom.rotateZ(Math.PI / 2);
  const copperRod = new THREE.Mesh(copperRodGeom, copperMat);
  copperRod.position.set(0, -halfH + baseHeight + 0.15, -halfD + 1.2);
  (copperRod as any).userData = { isProductMesh: true, item: groundBarItem };
  group.add(copperRod);

  // Grounding wires running to chassis & door posts
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 }); // Safety green/yellow
  [-1.8, 1.8].forEach(wx => {
    const wireGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8);
    const wire = new THREE.Mesh(wireGeom, wireMat);
    wire.position.set(wx, -halfH + baseHeight + 0.45, -halfD + 1.0);
    (wire as any).userData = { isProductMesh: true, item: groundBarItem };
    group.add(wire);
  });

  // =========================================================================
  // 11. CONNECTING BOX FOR 12-SOCKET PDU (Page 1 point 11)
  // Vertical bracket with 3 mounting holes for 12 socket PDU
  // =========================================================================
  const pduBoxGeom = new THREE.BoxGeometry(0.20, 3.20, 0.15);
  const pduBox = new THREE.Mesh(pduBoxGeom, materials.metalMat);
  pduBox.position.set(railX + 0.45, 0, rearRailZ + 0.20);
  pduBox.name = 'pdu-connecting-box';
  (pduBox as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'pdu-connecting-box-447510T',
      sku: 'PDU-BOX-12',
      name: 'קופסת חיבור ייעודית לפס 12 שקעים PDU (כלול בארון)',
      description: 'קופסת חיבור מודולרית עם 3 פתחים להתקנה נוחה של פסי שקעים PDU בתקן Boost-RackMount.',
      price: 0,
      isIncluded: true,
      type: 'pdu',
    },
  };
  group.add(pduBox);

  // =========================================================================
  // 12. 50 SETS CAGE NUTS & SCREWS ACCESSORY KIT BOX (Page 1 point 10)
  // Tool/hardware kit box placed visibly on the interior bottom plinth tray
  // =========================================================================
  const cageNutsGroup = new THREE.Group();
  cageNutsGroup.name = 'cage-nuts-50-kit-box';
  cageNutsGroup.position.set(-1.2, -halfH + baseHeight + 0.26, 0.4);

  const boxGeom = new THREE.BoxGeometry(1.5, 0.42, 1.1);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Industrial amber/kraft cardboard
    roughness: 0.85,
    metalness: 0.05,
  });
  const boxMesh = new THREE.Mesh(boxGeom, boxMat);
  boxMesh.castShadow = true;
  cageNutsGroup.add(boxMesh);

  // Printed label on box lid
  let kitLabelTex: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const kitLabelCanvas = document.createElement('canvas');
    kitLabelCanvas.width = 512;
    kitLabelCanvas.height = 256;
    const kCtx = kitLabelCanvas.getContext('2d');
    if (kCtx) {
      kCtx.fillStyle = '#ffffff';
      kCtx.fillRect(0, 0, 512, 256);
      kCtx.fillStyle = '#0c2d57';
      kCtx.fillRect(10, 10, 492, 236);
      kCtx.fillStyle = '#ffffff';
      kCtx.font = 'bold 36px sans-serif';
      kCtx.textAlign = 'center';
      kCtx.fillText('50x M6 CAGE NUTS KIT', 256, 75);
      kCtx.fillStyle = '#f59e0b';
      kCtx.font = 'bold 28px sans-serif';
      kCtx.fillText('SCREWS & WASHERS', 256, 125);
      kCtx.fillStyle = '#94a3b8';
      kCtx.font = '22px monospace';
      kCtx.fillText('BOOST 447510T INCLUDED', 256, 185);
    }
    kitLabelTex = new THREE.CanvasTexture(kitLabelCanvas);
  }
  const kitLabelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.9),
    new THREE.MeshBasicMaterial({ map: kitLabelTex })
  );
  kitLabelMesh.position.set(0, 0.215, 0);
  kitLabelMesh.rotateX(-Math.PI / 2);
  cageNutsGroup.add(kitLabelMesh);

  const cageNutsItem = {
    instanceId: 'cage-nuts-50-kit-447510T',
    sku: 'CAGE-NUTS-50',
    name: '50 סטים ברגים ודיסקיות Cage Nuts (כלול בארון)',
    description: 'ערכת התקנה מקורית של 50 ברגי פלדה M6, אומים תופסים למסד (Cage Nuts) ודיסקיות פלסטיק שחורות להגנה על ציוד הרשת.',
    price: 0,
    isIncluded: true,
    type: 'hardware',
  };
  (boxMesh as any).userData = { isProductMesh: true, item: cageNutsItem };
  (kitLabelMesh as any).userData = { isProductMesh: true, item: cageNutsItem };
  (cageNutsGroup as any).userData = { isProductMesh: true, item: cageNutsItem };
  group.add(cageNutsGroup);

  const doorsInfo = resolveCabinetDoorsInfo(dims, cabinetData);

  return {
    group,
    uCenters,
    innerDepthUnits,
    doorsGroup: doorsRootGroup,
    setDoorMode,
    setRearCutaway,
    setSidePanel,
    doorsInfo,
  };
}
