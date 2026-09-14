import * as THREE from 'three';
import { CabinetDimensions3D } from './Cabinet3DTypes';
import { CabinetMatrixData } from '../../utils/cabinetData';
import {
  SCALE_MM_TO_UNITS,
  U_HEIGHT_UNITS,
  RACK_19_WIDTH_UNITS,
  USABLE_OPENING_WIDTH,
  BuildCabinetFrameOptions,
} from './CabinetModelBuilder';

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

// Procedural texture generators for authentic physical appearance
function createPerforatedMeshTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark RAL9005 steel background
    ctx.fillStyle = '#151719';
    ctx.fillRect(0, 0, 256, 256);

    // Honeycomb / hexagonal high-airflow perforations (>75% open area)
    ctx.fillStyle = '#050607';
    const hexRadius = 7;
    const xSpacing = hexRadius * 2.5;
    const ySpacing = hexRadius * 2.16;

    for (let y = 0; y < 256 + ySpacing; y += ySpacing) {
      const row = Math.floor(y / ySpacing);
      const xOffset = (row % 2) * (xSpacing / 2);
      for (let x = -xSpacing; x < 256 + xSpacing; x += xSpacing) {
        const cx = x + xOffset;
        const cy = y;

        // Draw hexagon hole
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = cx + hexRadius * Math.cos(angle);
          const hy = cy + hexRadius * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();

        // Subtle metallic rim highlight on hole edge
        ctx.strokeStyle = '#2d333b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 48);
  return texture;
}

// Page 8: Diagonal ventilation slots texture for Fixed Shelf PN 117914
export function createDiagonalVentSlotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
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
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 5);
  return texture;
}

// Page 4: 400mm width cable tray pattern texture
function createCableTrayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
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
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
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
  options?: BuildCabinetFrameOptions & { doorState?: 'open' | 'closed' | 'transparent' }
): {
  group: THREE.Group;
  uCenters: number[];
  innerDepthUnits: number;
  doorsGroup?: THREE.Group;
  setDoorMode?: (mode: 'open' | 'closed' | 'transparent') => void;
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

  const perfTexture = createPerforatedMeshTexture();
  const perfDoorMat = new THREE.MeshStandardMaterial({
    map: perfTexture,
    color: 0x181a1e,
    roughness: 0.35,
    metalness: 0.75,
    transparent: true,
    opacity: 0.40, // Semi-transparent by default so user sees internal 44U equipment clearly!
  });

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

    // Swivel base mounting flange (bolted to cabinet plinth)
    const flangeGeom = new THREE.BoxGeometry(0.36, 0.05, 0.36);
    const flangeMesh = new THREE.Mesh(flangeGeom, chromeMat);
    flangeMesh.position.set(0, 0.28, 0);
    casterGroup.add(flangeMesh);

    // Swivel fork
    const forkGeom = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    const forkMesh = new THREE.Mesh(forkGeom, chromeMat);
    forkMesh.position.set(0, 0.14, 0);
    casterGroup.add(forkMesh);

    // Dual black rubber wheels
    [-0.08, 0.08].forEach(wheelX => {
      const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.10, 20);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheelMesh = new THREE.Mesh(wheelGeom, materials.rubberMat);
      wheelMesh.position.set(wheelX, 0, 0);
      wheelMesh.castShadow = true;
      casterGroup.add(wheelMesh);
    });
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
    footGroup.add(stemMesh);

    // Heavy rubber base pad
    const padGeom = new THREE.CylinderGeometry(0.26, 0.30, 0.12, 20);
    const padMesh = new THREE.Mesh(padGeom, materials.rubberMat);
    padMesh.position.set(0, -0.04, 0);
    footGroup.add(padMesh);

    group.add(footGroup);
  });

  // =========================================================================
  // 2. CORNER UPRIGHT POSTS & REINFORCING CASTING BRACKETS (Page 7)
  // =========================================================================
  const postHeight = frameHeightUnits - roofHeight - baseHeight;
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
  const uTextureCache = new Map<number, THREE.CanvasTexture>();
  const getUTexture = (uNum: number) => {
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

  // Central Raised Fan Hood (390 mm wide, Page 3 top view)
  const fanHoodWidth = 3.90;
  const fanHoodDepth = 5.60;
  const fanHoodGeom = new THREE.BoxGeometry(fanHoodWidth, 0.06, fanHoodDepth);
  const fanHoodMesh = new THREE.Mesh(fanHoodGeom, ral9005Mat);
  fanHoodMesh.position.set(0, halfH + 0.03, 0);
  fanHoodMesh.castShadow = true;
  group.add(fanHoodMesh);

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

  // Upper Header Brand Plate (Boost RackMount PN 447510T)
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 1024;
  badgeCanvas.height = 256;
  const bCtx = badgeCanvas.getContext('2d');
  if (bCtx) {
    bCtx.fillStyle = '#0a0f1d';
    bCtx.fillRect(0, 0, 1024, 256);
    bCtx.strokeStyle = '#0284c7';
    bCtx.lineWidth = 6;
    bCtx.strokeRect(6, 6, 1012, 244);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = '900 76px sans-serif';
    bCtx.fillText('BOOST RACKMOUNT', 40, 95);
    bCtx.fillStyle = '#38bdf8';
    bCtx.font = '700 52px monospace';
    bCtx.fillText('PN 447510T • 44U 75x100', 40, 165);
    bCtx.fillStyle = '#94a3b8';
    bCtx.font = '600 28px sans-serif';
    bCtx.fillText('ANSI/EIA RS-310-D • DIN 41494 • COLD ROLLED STEEL', 40, 220);
  }
  const badgeTex = new THREE.CanvasTexture(badgeCanvas);
  const badgeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, roofHeight * 0.85, 0.02),
    new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.3, metalness: 0.8 })
  );
  badgeMesh.position.set(0, halfH - roofHeight / 2, halfD + 0.015);
  group.add(badgeMesh);

  // =========================================================================
  // 7. FRONT DOUBLE PERFORATED DOORS WITH SPRING LOCK (Page 1 point 1, Pages 2 & 3)
  // Split French doors with 2 symmetrical leaves (~365mm each) & Spring lock
  // =========================================================================
  const doorsRootGroup = new THREE.Group();
  doorsRootGroup.name = 'front-double-doors-group';

  const doorLeafWidth = (widthUnits - 0.20) / 2; // ~3.65 units
  const doorLeafHeight = postHeight * 0.99;
  const doorThick = 0.06;

  // Door leaf geometry helper
  const createDoorLeaf = (isLeft: boolean) => {
    const leafGroup = new THREE.Group();
    leafGroup.name = isLeft ? 'front-left-door-leaf' : 'front-right-door-leaf';

    // Pivot point at the outer corner
    const hingeX = isLeft ? -halfW + 0.08 : halfW - 0.08;
    leafGroup.position.set(hingeX, -halfH + baseHeight + doorLeafHeight / 2, halfD + 0.04);

    // Door frame inner offset from hinge
    const centerOffset = isLeft ? doorLeafWidth / 2 : -doorLeafWidth / 2;

    // Outer steel border frame (1.5mm cold rolled steel)
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(doorLeafWidth, doorLeafHeight, doorThick),
      ral9005Mat
    );
    frameMesh.position.set(centerOffset, 0, 0);
    leafGroup.add(frameMesh);

    // Inset perforated mesh window (hexagonal high-airflow ventilation)
    const meshWindowGeom = new THREE.BoxGeometry(doorLeafWidth - 0.50, doorLeafHeight - 0.80, doorThick + 0.01);
    const meshWindow = new THREE.Mesh(meshWindowGeom, perfDoorMat);
    meshWindow.position.set(centerOffset, 0, 0.005);
    leafGroup.add(meshWindow);

    // Spring Lock Handle on meeting stile (Page 1 point 1 & Page 3)
    if (isLeft) {
      // Flush spring-loaded handle assembly mounted on left leaf meeting edge
      const handleBaseGeom = new THREE.BoxGeometry(0.16, 1.40, 0.08);
      const handleBase = new THREE.Mesh(handleBaseGeom, chromeMat);
      handleBase.position.set(doorLeafWidth - 0.16, 0, 0.04);
      leafGroup.add(handleBase);

      // Swing lever
      const leverGeom = new THREE.BoxGeometry(0.10, 0.85, 0.06);
      const lever = new THREE.Mesh(leverGeom, materials.accentMat);
      lever.position.set(doorLeafWidth - 0.16, -0.15, 0.08);
      leafGroup.add(lever);

      // Keyhole cylinder
      const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), chromeMat);
      keyhole.position.set(doorLeafWidth - 0.16, 0.40, 0.085);
      keyhole.rotateX(Math.PI / 2);
      leafGroup.add(keyhole);
    } else {
      // Right leaf meeting stile lip / rubber sealing bumper
      const lipGeom = new THREE.BoxGeometry(0.08, doorLeafHeight, 0.04);
      const lip = new THREE.Mesh(lipGeom, materials.rubberMat);
      lip.position.set(-doorLeafWidth + 0.04, 0, 0.02);
      leafGroup.add(lip);
    }

    // Top and Bottom Pivot Hinges
    [-doorLeafHeight / 2 + 0.15, doorLeafHeight / 2 - 0.15].forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), chromeMat);
      hinge.position.set(0, hy, 0);
      leafGroup.add(hinge);
    });

    return leafGroup;
  };

  const leftDoorLeaf = createDoorLeaf(true);
  const rightDoorLeaf = createDoorLeaf(false);
  doorsRootGroup.add(leftDoorLeaf);
  doorsRootGroup.add(rightDoorLeaf);
  group.add(doorsRootGroup);

  // Door animation/state handler
  const setDoorMode = (mode: 'open' | 'closed' | 'transparent') => {
    if (mode === 'open') {
      leftDoorLeaf.rotation.y = -Math.PI * 0.58; // Open 105 degrees outwards
      rightDoorLeaf.rotation.y = Math.PI * 0.58;
      perfDoorMat.opacity = 0.90;
      perfDoorMat.transparent = false;
    } else if (mode === 'closed') {
      leftDoorLeaf.rotation.y = 0;
      rightDoorLeaf.rotation.y = 0;
      perfDoorMat.opacity = 0.95;
      perfDoorMat.transparent = false;
    } else {
      // 'transparent' (default for comfortable equipment viewing & addition)
      leftDoorLeaf.rotation.y = 0;
      rightDoorLeaf.rotation.y = 0;
      perfDoorMat.opacity = 0.38;
      perfDoorMat.transparent = true;
    }
  };

  // Initialize initial door state
  setDoorMode(options?.doorState || 'transparent');

  // =========================================================================
  // 8. REAR DOUBLE PERFORATED DOORS (Page 1 point 2, Pages 2 & 3)
  // Split French doors with perforated mesh and spring lock on the back
  // =========================================================================
  const rearDoorsGroup = new THREE.Group();
  rearDoorsGroup.name = 'rear-double-doors';

  [-doorLeafWidth / 2 - 0.02, doorLeafWidth / 2 + 0.02].forEach(rx => {
    const rDoorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(doorLeafWidth, doorLeafHeight, doorThick),
      ral9005Mat
    );
    rDoorFrame.position.set(rx, -halfH + baseHeight + doorLeafHeight / 2, -halfD - 0.04);
    rearDoorsGroup.add(rDoorFrame);

    const rMesh = new THREE.Mesh(
      new THREE.BoxGeometry(doorLeafWidth - 0.50, doorLeafHeight - 0.80, doorThick + 0.01),
      perfDoorMat
    );
    rMesh.position.set(rx, -halfH + baseHeight + doorLeafHeight / 2, -halfD - 0.04);
    rearDoorsGroup.add(rMesh);
  });
  group.add(rearDoorsGroup);

  // =========================================================================
  // 9. DETACHABLE SIDE PANELS WITH ROUND LOCKS (Page 1 point 9, Pages 2 & 3)
  // =========================================================================
  const sideWidth = depthUnits - 0.40;
  const sidePanelGeom = new THREE.BoxGeometry(0.04, postHeight * 0.98, sideWidth);

  [-halfW + 0.02, halfW - 0.02].forEach((sx, idx) => {
    const sPanel = new THREE.Mesh(sidePanelGeom, ral9005Mat);
    sPanel.position.set(sx, -halfH + baseHeight + postHeight / 2, 0);
    sPanel.receiveShadow = true;
    group.add(sPanel);

    // Small Round Lock with keyhole at top center (Page 1 point 9 & Page 3 side view)
    const lockCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), chromeMat);
    lockCylinder.rotateZ(Math.PI / 2);
    lockCylinder.position.set(sx + (sx > 0 ? 0.02 : -0.02), halfH - roofHeight - 0.45, 0);
    group.add(lockCylinder);

    // Recessed finger release latches
    [-sideWidth * 0.35, sideWidth * 0.35].forEach(lz => {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.15), materials.metalMat);
      latch.position.set(sx, halfH - roofHeight - 0.80, lz);
      group.add(latch);
    });
  });

  // =========================================================================
  // 10. GROUNDING COPPER BUSBAR & BONDING WIRES (Page 1 point 8)
  // =========================================================================
  const copperRodGeom = new THREE.CylinderGeometry(0.04, 0.04, 4.5, 12);
  copperRodGeom.rotateZ(Math.PI / 2);
  const copperRod = new THREE.Mesh(copperRodGeom, copperMat);
  copperRod.position.set(0, -halfH + baseHeight + 0.15, -halfD + 1.2);
  group.add(copperRod);

  // Grounding wires running to chassis & door posts
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 }); // Safety green/yellow
  [-1.8, 1.8].forEach(wx => {
    const wireGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8);
    const wire = new THREE.Mesh(wireGeom, wireMat);
    wire.position.set(wx, -halfH + baseHeight + 0.45, -halfD + 1.0);
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

  return {
    group,
    uCenters,
    innerDepthUnits,
    doorsGroup: doorsRootGroup,
    setDoorMode,
  };
}
