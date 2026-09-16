import * as THREE from 'three';
import { CabinetDimensions3D, DoorLeafState, DoorState } from './Cabinet3DTypes';
import { CabinetMatrixData, parseAccessoryCount, normalizeSku } from '../../utils/cabinetData';
import { build447510TCabinetGroup } from './CabinetModel447510T';
import { buildBoost42UCabinetGroup } from './CabinetModelBoost42U';

export const SCALE_MM_TO_UNITS = 0.01; // 1 unit = 100mm (0.1 meter)
export const U_HEIGHT_UNITS = 0.4445; // 44.45mm in 3D units
export const RACK_19_WIDTH_UNITS = 4.826; // 482.6mm standard 19-inch mounting width
export const USABLE_OPENING_WIDTH = 4.50; // 450mm inner aperture

export interface BuildCabinetFrameOptions {
  additionalFansCount?: number;
  hasSelectedWheels?: boolean;
  hasSelectedFeet?: boolean;
  doorState?: DoorState;
}

export interface CabinetDoorsInfo {
  hasFrontDoor: boolean;
  hasRearDoor: boolean;
  frontDoorType: 'glass' | 'perforated' | 'solid';
  rearDoorType: 'perforated' | 'solid' | 'glass';
  isDoubleFront: boolean;
  isDoubleRear: boolean;
  frontDoorName: string;
  rearDoorName: string;
  isFrontDoorIllustrative: boolean;
  isRearDoorIllustrative: boolean;
}

/**
 * Resolves reliable door specification according to verified cabinet matrix and manufacturer data.
 * Distinguishes between exists, none, and unknown. Empty rearDoor is NEVER treated as approval to invent a door.
 */
export function resolveCabinetDoorsInfo(
  dims: CabinetDimensions3D,
  cabinetData: CabinetMatrixData | null,
  product?: any
): CabinetDoorsInfo {
  const is447510T = Boolean(dims.isSpecific447510T || isCabinet447510T(product, cabinetData));
  const isBoost42U = Boolean(dims.isSpecificBoost42U || isCabinetBoost42U(product, cabinetData));

  if (is447510T) {
    return {
      hasFrontDoor: true,
      hasRearDoor: true,
      frontDoorType: 'perforated',
      rearDoorType: 'perforated',
      isDoubleFront: true,
      isDoubleRear: true,
      frontDoorName: 'דלת קדמית כפולה מחוררת 75% עם מנעול קפיצי',
      rearDoorName: 'דלת אחורית כפולה מחוררת 75% עם מנעול קפיצי',
      isFrontDoorIllustrative: false,
      isRearDoorIllustrative: false,
    };
  }

  if (isBoost42U) {
    return {
      hasFrontDoor: true,
      hasRearDoor: true,
      frontDoorType: 'glass',
      rearDoorType: 'solid',
      isDoubleFront: false,
      isDoubleRear: false,
      frontDoorName: 'דלת קדמית זכוכית מחוסמת 5 מ״מ עם מנעול ידית',
      rearDoorName: 'דלת אחורית מפלדה SPCC מלאה עם מנעול עגול',
      isFrontDoorIllustrative: false,
      isRearDoorIllustrative: false,
    };
  }

  const nameLower = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
  const isOpenRack = /מסד פתוח|open frame|two-post|2-post|מסד 2 עמודים/i.test(nameLower);

  const frontDoorRaw = String(cabinetData?.frontDoor || '').trim();
  const rearDoorRaw = String(cabinetData?.rearDoor || '').trim();

  // Front Door Resolution
  let hasFrontDoor = true;
  let frontDoorType: 'glass' | 'perforated' | 'solid' = 'glass';
  let isDoubleFront = false;
  let isFrontDoorIllustrative = false;

  if (isOpenRack || /ללא|none|no|אין|x|-/i.test(frontDoorRaw)) {
    hasFrontDoor = false;
  } else if (frontDoorRaw) {
    if (/רשת|מחורר|perforated|mesh/i.test(frontDoorRaw)) {
      frontDoorType = 'perforated';
    } else if (/פח|מלא|solid|steel/i.test(frontDoorRaw)) {
      frontDoorType = 'solid';
    } else {
      frontDoorType = 'glass';
    }
    if (/כפול|double|split|french/i.test(frontDoorRaw)) {
      isDoubleFront = true;
    }
  } else {
    // Empty / unknown front door in matrix: provide illustrative glass door
    isFrontDoorIllustrative = true;
    frontDoorType = 'glass';
  }

  // Rear Door Resolution:
  // "קיום דלת, סוגה ומספר כנפיה נקבעים ממקור אמין. הבחֵן בין יש, אין ולא ידוע. rearDoor ריק אינו אישור ליצור דלת. אין פקד פעיל לדלת שאינה קיימת."
  let hasRearDoor = false;
  let rearDoorType: 'perforated' | 'solid' | 'glass' = 'solid';
  let isDoubleRear = false;
  let isRearDoorIllustrative = false;

  if (isOpenRack || /ללא|none|no|אין|x|-/i.test(rearDoorRaw)) {
    hasRearDoor = false;
  } else if (rearDoorRaw) {
    hasRearDoor = true;
    if (/רשת|מחורר|perforated|mesh/i.test(rearDoorRaw)) {
      rearDoorType = 'perforated';
    } else if (/זכוכית|glass/i.test(rearDoorRaw)) {
      rearDoorType = 'glass';
    } else {
      rearDoorType = 'solid';
    }
    if (/כפול|double|split|french/i.test(rearDoorRaw)) {
      isDoubleRear = true;
    }
  } else {
    // Empty rearDoor is NOT an approval to create a rear door
    hasRearDoor = false;
  }

  const frontDoorName = frontDoorRaw
    ? (isFrontDoorIllustrative ? `${frontDoorRaw} (המחשה)` : frontDoorRaw)
    : 'דלת קדמית זכוכית (המחשה)';

  const rearDoorName = hasRearDoor
    ? (isRearDoorIllustrative ? `${rearDoorRaw} (המחשה)` : rearDoorRaw)
    : 'ללא דלת אחורית';

  return {
    hasFrontDoor,
    hasRearDoor,
    frontDoorType,
    rearDoorType,
    isDoubleFront,
    isDoubleRear,
    frontDoorName,
    rearDoorName,
    isFrontDoorIllustrative,
    isRearDoorIllustrative,
  };
}

/**
 * Checks specifically for SKU 447510T (Boost 44U 75x100 Floor Standing Rack)
 */
export function isCabinet447510T(product: any, cabinetData?: CabinetMatrixData | null): boolean {
  const normProductSku = normalizeSku(product?.sku);
  const normProductPn = normalizeSku(product?.pn);
  const normCabinetSku = normalizeSku(cabinetData?.sku);
  const normCabinetModel = normalizeSku(cabinetData?.model);
  const nameUpper = String(product?.name || '').toUpperCase();
  const descUpper = String(product?.description || '').toUpperCase();

  if (
    normProductSku === '447510T' ||
    normProductPn === '447510T' ||
    normCabinetSku === '447510T' ||
    normCabinetModel === '447510T'
  ) {
    return true;
  }
  if (nameUpper.includes('447510T') || descUpper.includes('447510T')) {
    return true;
  }
  return false;
}

/**
 * Checks specifically for Boost RackMount 42U Floor Standing Cabinet specification
 */
export function isCabinetBoost42U(product: any, cabinetData?: CabinetMatrixData | null): boolean {
  const normProductSku = normalizeSku(product?.sku);
  const normProductPn = normalizeSku(product?.pn);
  const normCabinetSku = normalizeSku(cabinetData?.sku);
  const normCabinetModel = normalizeSku(cabinetData?.model);
  const nameUpper = String(product?.name || '').toUpperCase();
  const descUpper = String(product?.description || '').toUpperCase();

  const boost42Skus = ['BOOST-42U', 'BOOST42U', '42U-BOOST', '42UBOOST', '426080', '426010', '428010'];
  if (
    boost42Skus.includes(normProductSku) ||
    boost42Skus.includes(normProductPn) ||
    boost42Skus.includes(normCabinetSku) ||
    boost42Skus.includes(normCabinetModel)
  ) {
    return true;
  }
  if (
    (nameUpper.includes('42U') || descUpper.includes('42U') || cabinetData?.u === 42 || product?.u === 42) &&
    (nameUpper.includes('BOOST') || descUpper.includes('BOOST') || String(product?.brand || '').toUpperCase().includes('BOOST') || String(cabinetData?.model || '').toUpperCase().includes('BOOST'))
  ) {
    return true;
  }
  return false;
}

/**
 * Derives verified cabinet dimensions or provides clear schematic fallback
 */
export function resolveCabinetDimensions(
  product: any,
  cabinetData: CabinetMatrixData | null,
  totalU: number
): CabinetDimensions3D {
  // Check specifically for SKU 447510T (from manufacturer technical drawing)
  if (isCabinet447510T(product, cabinetData)) {
    return {
      totalU: totalU > 0 ? totalU : 44,
      widthMm: 750,
      depthMm: 1000,
      heightMm: 2061, // 2060.7mm frame height, 2148.3mm with casters & feet
      isSchematicDimensions: false,
      isSchematicCapacity: false,
      isSpecific447510T: true,
    };
  }

  // Check specifically for Boost 42U specification (from manufacturer technical blueprint)
  if (isCabinetBoost42U(product, cabinetData)) {
    const w = cabinetData?.width || product?.width || 600;
    const d = cabinetData?.depth || product?.depth || 1000;
    return {
      totalU: totalU > 0 ? totalU : 42,
      widthMm: w,
      depthMm: d,
      heightMm: 2055, // ~2000mm frame + 55mm casters/feet
      isSchematicDimensions: false,
      isSchematicCapacity: false,
      isSpecificBoost42U: true,
    };
  }

  let widthMm = cabinetData?.width || null;
  let depthMm = cabinetData?.depth || null;
  let isSchematic = false;
  let isSchematicCap = false;

  // Extract from name if sheet missing
  if (!depthMm && product?.name) {
    const m = (product.name as string).match(/עומק[:\s]*([0-9]{2,4})/);
    if (m) {
      let d = parseInt(m[1], 10);
      if (d < 150) d *= 10;
      depthMm = d;
    }
  }

  if (!widthMm) {
    widthMm = 600; // Standard 19" rack outer width
    isSchematic = true;
  }

  if (!depthMm) {
    depthMm = 600; // Standard medium rack depth
    isSchematic = true;
  }

  const resolvedU = totalU > 0 ? totalU : (cabinetData?.u || 0);
  if (resolvedU <= 0) {
    isSchematicCap = true;
  }

  // Outer height in mm: U capacity * 44.45mm + roof + base margins
  const heightMm = Math.round(resolvedU * 44.45 + 100);

  return {
    totalU: resolvedU,
    widthMm,
    depthMm,
    heightMm,
    isSchematicDimensions: isSchematic,
    isSchematicCapacity: isSchematicCap,
  };
}

export function createCabinetMaterials() {
  return {
    frameMat: new THREE.MeshStandardMaterial({
      color: 0x161e2e,
      roughness: 0.28,
      metalness: 0.75,
    }),
    railMat: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.20,
      metalness: 0.90,
    }),
    panelMat: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.40,
      metalness: 0.60,
    }),
    metalMat: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.22,
      metalness: 0.85,
    }),
    accentMat: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.4,
    }),
    rubberMat: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
      metalness: 0.1,
    }),
    shelfMat: new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.24,
      metalness: 0.82,
    }),
    includedShelfMat: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.22,
      metalness: 0.88,
    }),
  };
}

/**
 * Builds the 3D parametric open-cabinet frame
 */
export function buildCabinetFrameGroup(
  dims: CabinetDimensions3D,
  cabinetData: CabinetMatrixData | null,
  materialsInput?: {
    frameMat: THREE.Material;
    railMat: THREE.Material;
    panelMat: THREE.Material;
    metalMat: THREE.Material;
    accentMat: THREE.Material;
    rubberMat: THREE.Material;
    shelfMat?: THREE.Material;
    includedShelfMat?: THREE.Material;
  },
  options?: BuildCabinetFrameOptions
): {
  group: THREE.Group;
  uCenters: number[]; // Y positions for each U unit center from bottom (U1) to top (Un)
  innerDepthUnits: number;
  stagingTrayGroup?: THREE.Group;
  stagingAccessoriesGroup?: THREE.Group;
  hasStagingContent?: boolean;
  doorsGroup?: THREE.Group;
  setDoorMode?: (side: 'front' | 'rear', state: DoorLeafState) => void;
  setRearCutaway?: (active: boolean) => void;
  doorsInfo?: CabinetDoorsInfo;
} {
  const materials = materialsInput || createCabinetMaterials();

  // If this is specifically SKU 447510T, route to dedicated manufacturer schematic simulation!
  if (dims.isSpecific447510T || isCabinet447510T(null, cabinetData)) {
    return build447510TCabinetGroup(
      dims,
      cabinetData,
      materials as any,
      options
    );
  }

  // If this is specifically Boost RackMount 42U specification, route to dedicated 42U simulation!
  if (dims.isSpecificBoost42U || isCabinetBoost42U(null, cabinetData)) {
    return buildBoost42UCabinetGroup(
      dims,
      cabinetData,
      materials as any,
      options
    );
  }

  const group = new THREE.Group();
  group.name = 'cabinet-frame-root';

  const widthUnits = dims.widthMm * SCALE_MM_TO_UNITS;
  const depthUnits = dims.depthMm * SCALE_MM_TO_UNITS;
  const totalU = Math.max(1, dims.totalU);
  const railHeightUnits = totalU * U_HEIGHT_UNITS;
  const wallThick = 0.12; // 12mm sheet metal profile
  const roofHeight = 0.35; // 35mm
  const baseHeight = 0.40; // 40mm

  // Total frame height
  const frameHeightUnits = railHeightUnits + roofHeight + baseHeight;
  const halfW = widthUnits / 2;
  const halfD = depthUnits / 2;
  const halfH = frameHeightUnits / 2;

  // Rail offset inside cabinet
  const frontRailZ = halfD - 0.55; // 55mm recess from front face
  const rearRailZ = -halfD + 0.65; // 65mm recess from rear face
  const innerDepthUnits = Math.abs(frontRailZ - rearRailZ);

  // Y coordinate of bottom of U1:
  const u1BottomY = -halfH + baseHeight;
  const uCenters: number[] = [];
  for (let u = 1; u <= totalU; u++) {
    const centerY = u1BottomY + (u - 0.5) * U_HEIGHT_UNITS;
    uCenters.push(centerY);
  }

  // 1. BASE PLINTH (Bottom panel)
  const baseGeom = new THREE.BoxGeometry(widthUnits, baseHeight, depthUnits);
  const baseMesh = new THREE.Mesh(baseGeom, materials.frameMat);
  baseMesh.position.set(0, -halfH + baseHeight / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Bottom cable entry cutout plate
  const baseCutoutGeom = new THREE.BoxGeometry(widthUnits * 0.4, 0.02, depthUnits * 0.3);
  const baseCutoutMesh = new THREE.Mesh(baseCutoutGeom, materials.accentMat);
  baseCutoutMesh.position.set(0, -halfH + baseHeight + 0.01, 0);
  group.add(baseCutoutMesh);

  // 2. ROOF CANOPY (Top panel)
  const roofGeom = new THREE.BoxGeometry(widthUnits, roofHeight, depthUnits);
  const roofMesh = new THREE.Mesh(roofGeom, materials.frameMat);
  roofMesh.position.set(0, halfH - roofHeight / 2, 0);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // 2.1. UPPER BEAM BRAND BADGE - "BOOST RACKMOUNT" LOGO
  const badgeWidth = Math.min(widthUnits * 0.62, 3.6);
  const badgeHeight = roofHeight * 0.74;
  const badgeDepth = 0.02;

  // High-resolution Canvas Texture for BOOST RACKMOUNT logo
  let logoTexture: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 1024;
    logoCanvas.height = 256;
    const logoCtx = logoCanvas.getContext('2d');
    if (logoCtx) {
      // Brushed metallic / carbon plate background
      const bgGrad = logoCtx.createLinearGradient(0, 0, 1024, 256);
      bgGrad.addColorStop(0, '#070b14');
      bgGrad.addColorStop(0.5, '#162032');
      bgGrad.addColorStop(1, '#070b14');
      logoCtx.fillStyle = bgGrad;
      logoCtx.fillRect(0, 0, 1024, 256);

      // Subtle carbon grid lines pattern
      logoCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      logoCtx.lineWidth = 1;
      for (let x = 0; x < 1024; x += 16) {
        logoCtx.beginPath();
        logoCtx.moveTo(x, 0);
        logoCtx.lineTo(x, 256);
        logoCtx.stroke();
      }

      // Outer high-contrast metallic frame
      logoCtx.strokeStyle = '#0284c7';
      logoCtx.lineWidth = 6;
      logoCtx.strokeRect(6, 6, 1012, 244);

      // Inner bright cyan border accent
      logoCtx.strokeStyle = '#38bdf8';
      logoCtx.lineWidth = 2;
      logoCtx.strokeRect(12, 12, 1000, 232);

      // Corner industrial hex rivets
      const rivetPositions = [
        [24, 24], [1000, 24],
        [24, 232], [1000, 232]
      ];
      rivetPositions.forEach(([rx, ry]) => {
        logoCtx.fillStyle = '#64748b';
        logoCtx.beginPath();
        logoCtx.arc(rx, ry, 6, 0, Math.PI * 2);
        logoCtx.fill();
        logoCtx.strokeStyle = '#cbd5e1';
        logoCtx.lineWidth = 1.5;
        logoCtx.stroke();
      });

      // Brand Icon Glyph (Stylized 19" Rack Emblem with Lightning Boost)
      logoCtx.save();
      logoCtx.translate(90, 128);
      // Outer rack icon rectangle
      logoCtx.strokeStyle = '#38bdf8';
      logoCtx.lineWidth = 4;
      logoCtx.strokeRect(-36, -45, 72, 90);
      // Rack rail slots
      logoCtx.fillStyle = '#38bdf8';
      for (let slotY = -35; slotY <= 35; slotY += 14) {
        logoCtx.fillRect(-30, slotY, 6, 6);
        logoCtx.fillRect(24, slotY, 6, 6);
      }
      // Energy / Boost Lightning Arrow in center
      logoCtx.fillStyle = '#f59e0b';
      logoCtx.beginPath();
      logoCtx.moveTo(4, -30);
      logoCtx.lineTo(-12, 6);
      logoCtx.lineTo(0, 6);
      logoCtx.lineTo(-4, 30);
      logoCtx.lineTo(14, -6);
      logoCtx.lineTo(2, -6);
      logoCtx.closePath();
      logoCtx.fill();
      logoCtx.restore();

      // Main Brand Typography: "BOOST RACKMOUNT"
      // "BOOST"
      logoCtx.fillStyle = '#ffffff';
      logoCtx.font = '900 84px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      logoCtx.textAlign = 'left';
      logoCtx.textBaseline = 'middle';
      logoCtx.shadowColor = 'rgba(56, 189, 248, 0.6)';
      logoCtx.shadowBlur = 12;
      logoCtx.fillText('BOOST', 160, 112);

      // "RACKMOUNT"
      logoCtx.fillStyle = '#38bdf8';
      logoCtx.font = '800 70px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      logoCtx.shadowColor = 'rgba(56, 189, 248, 0.4)';
      logoCtx.shadowBlur = 8;
      logoCtx.fillText('RACKMOUNT', 475, 114);

      // Subtitle / Enterprise Specification Badge
      logoCtx.shadowBlur = 0;
      logoCtx.fillStyle = '#94a3b8';
      logoCtx.font = '700 24px monospace';
      logoCtx.letterSpacing = '6px';
      logoCtx.fillText('ENTERPRISE RACK SYSTEMS • 19" ENCLOSURE', 165, 186);
    }

    logoTexture = new THREE.CanvasTexture(logoCanvas);
    logoTexture.minFilter = THREE.LinearFilter;
    logoTexture.magFilter = THREE.LinearFilter;
  }

  const badgeGeom = new THREE.BoxGeometry(badgeWidth, badgeHeight, badgeDepth);
  const badgeFaceMat = new THREE.MeshStandardMaterial({
    map: logoTexture,
    roughness: 0.25,
    metalness: 0.85,
  });
  const badgeEdgeMat = materials.metalMat;
  // Apply logo map only to front face (material index 4 in Three.js BoxGeometry)
  const badgeMaterials = [
    badgeEdgeMat, // right
    badgeEdgeMat, // left
    badgeEdgeMat, // top
    badgeEdgeMat, // bottom
    badgeFaceMat, // front (+Z)
    badgeEdgeMat, // back (-Z)
  ];

  const brandBadgeMesh = new THREE.Mesh(badgeGeom, badgeMaterials);
  brandBadgeMesh.position.set(0, halfH - roofHeight / 2, halfD + badgeDepth / 2 + 0.005);
  brandBadgeMesh.name = 'boost-rackmount-header-badge';
  // Pure aesthetic cabinet frame badge - not an interactive product mesh
  (brandBadgeMesh as any).userData = {
    isCabinetStructure: true,
  };
  group.add(brandBadgeMesh);

  // =========================================================================
  // 2.2 ROOF & INTERIOR CEILING VENTILATION TRAY & 120MM FAN ARRAY
  // Fans penetrate through the roof so they are fully visible from both
  // top exterior view AND bottom interior view (looking up into the cabinet)
  // =========================================================================
  const roofTopY = halfH; // Exact exterior top surface of cabinet roof
  const roofCeilingY = halfH - roofHeight; // Exact interior ceiling surface

  // Steel Ventilation Enclosure Base Tray on Top of the Roof
  const ventCanopyWidth = widthUnits * 0.74;
  const ventCanopyDepth = depthUnits * 0.72;
  const ventCanopyGeom = new THREE.BoxGeometry(ventCanopyWidth, 0.035, ventCanopyDepth);
  const ventCanopyMesh = new THREE.Mesh(ventCanopyGeom, materials.panelMat);
  ventCanopyMesh.position.set(0, roofTopY + 0.0175, 0);
  ventCanopyMesh.castShadow = true;
  group.add(ventCanopyMesh);

  // Beveled outer metallic border trim around ventilation tray
  const ventTrimGeom = new THREE.BoxGeometry(ventCanopyWidth + 0.06, 0.02, ventCanopyDepth + 0.06);
  const ventTrimMesh = new THREE.Mesh(ventTrimGeom, materials.railMat);
  ventTrimMesh.position.set(0, roofTopY + 0.01, 0);
  group.add(ventTrimMesh);

  // Rear Cable Entry Brush Port on Roof
  const cableBrushGeom = new THREE.BoxGeometry(Math.min(widthUnits * 0.45, 2.6), 0.03, 0.35);
  const cableBrushMesh = new THREE.Mesh(cableBrushGeom, materials.rubberMat);
  cableBrushMesh.position.set(0, roofTopY + 0.02, -depthUnits * 0.30);
  group.add(cableBrushMesh);

  // Underside Interior Ceiling Ventilation Panel (visible from inside cabinet)
  const ceilingPanelGeom = new THREE.BoxGeometry(ventCanopyWidth, 0.03, ventCanopyDepth);
  const ceilingPanelMesh = new THREE.Mesh(ceilingPanelGeom, materials.panelMat);
  ceilingPanelMesh.position.set(0, roofCeilingY - 0.015, 0);
  group.add(ceilingPanelMesh);

  // 120mm High-Flow Fan Specs (SCALE_MM_TO_UNITS = 0.01 -> 120mm = 1.20 units)
  const fanOuterSize = 1.22; // 122mm outer square housing
  const fanRadius = 0.54;    // 108mm circular intake aperture
  const fanThickness = 0.16; // Penetrating through full roof depth

  const builtInFansCount = parseAccessoryCount(cabinetData?.fans);
  const totalActiveFans = builtInFansCount + (options?.additionalFansCount || 0);

  // Determine standard fan bay layout (4 bays for deep racks >= 600mm, 2 for compact/shallow racks)
  const isDeepRack = depthUnits >= 6.0;
  const bayXOffset = Math.min(widthUnits * 0.22, 0.85);
  const bayZOffset = isDeepRack ? Math.min(depthUnits * 0.18, 0.85) : 0;

  const fanBays: { id: number; label: string; x: number; z: number }[] = isDeepRack
    ? [
        { id: 1, label: 'BAY 1 (קדמי שמאל)', x: -bayXOffset, z: -bayZOffset },
        { id: 2, label: 'BAY 2 (קדמי ימין)', x: bayXOffset, z: -bayZOffset },
        { id: 3, label: 'BAY 3 (אחורי שמאל)', x: -bayXOffset, z: bayZOffset },
        { id: 4, label: 'BAY 4 (אחורי ימין)', x: bayXOffset, z: bayZOffset },
      ]
    : [
        { id: 1, label: 'BAY 1 (שמאל)', x: -bayXOffset, z: 0 },
        { id: 2, label: 'BAY 2 (ימין)', x: bayXOffset, z: 0 },
      ];

  fanBays.forEach((bay, bayIdx) => {
    const isInstalled = bayIdx < totalActiveFans;
    const isBuiltIn = bayIdx < builtInFansCount;
    const bayGroup = new THREE.Group();
    bayGroup.name = `roof-fan-bay-${bay.id}`;
    // Center the fan unit right between roof top and interior ceiling
    const fanMidY = (roofTopY + roofCeilingY) / 2;
    bayGroup.position.set(bay.x, fanMidY, bay.z);

    // 1. TOP EXTERIOR BEZEL (Roof View)
    const topBezelGeom = new THREE.TorusGeometry(fanRadius, 0.025, 8, 32);
    topBezelGeom.rotateX(Math.PI / 2);
    const topBezel = new THREE.Mesh(topBezelGeom, materials.railMat);
    topBezel.position.set(0, (roofTopY - fanMidY) + 0.015, 0);
    bayGroup.add(topBezel);

    // 2. BOTTOM INTERIOR BEZEL (Ceiling / Inside Cabinet View)
    const bottomBezelGeom = new THREE.TorusGeometry(fanRadius, 0.028, 8, 32);
    bottomBezelGeom.rotateX(Math.PI / 2);
    const bottomBezel = new THREE.Mesh(bottomBezelGeom, materials.railMat);
    bottomBezel.position.set(0, (roofCeilingY - fanMidY) - 0.015, 0);
    bayGroup.add(bottomBezel);

    // 3. Four Corner Through-Mounting Hex Screws / Bolts
    const screwDist = fanOuterSize * 0.40;
    const screwGeom = new THREE.CylinderGeometry(0.03, 0.03, fanThickness + 0.08, 8);
    [
      [-screwDist, -screwDist],
      [screwDist, -screwDist],
      [-screwDist, screwDist],
      [screwDist, screwDist],
    ].forEach(([sx, sz]) => {
      const screwMesh = new THREE.Mesh(screwGeom, materials.metalMat);
      screwMesh.position.set(sx, 0, sz);
      bayGroup.add(screwMesh);

      // Bottom chrome nuts (visible from inside)
      const nutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 6);
      const nutMesh = new THREE.Mesh(nutGeom, materials.metalMat);
      nutMesh.position.set(sx, (roofCeilingY - fanMidY) - 0.03, sz);
      bayGroup.add(nutMesh);
    });

    if (isInstalled) {
      // ==========================================================
      // REALISTIC DUAL-SIDED 120MM ACTIVE TURBINE FAN UNIT
      // ==========================================================
      // Outer square fan frame penetrating roof
      const fanHousingGeom = new THREE.BoxGeometry(fanOuterSize, fanThickness, fanOuterSize);
      const fanHousing = new THREE.Mesh(fanHousingGeom, materials.accentMat);
      fanHousing.position.set(0, 0, 0);
      bayGroup.add(fanHousing);

      // Central Motor Hub (extends through center)
      const hubRadius = 0.20;
      const hubHeight = fanThickness + 0.04;
      const hubGeom = new THREE.CylinderGeometry(hubRadius, hubRadius, hubHeight, 24);
      const hubMesh = new THREE.Mesh(hubGeom, materials.metalMat);
      hubMesh.position.set(0, 0, 0);
      bayGroup.add(hubMesh);

      // Top & Bottom Center Metallic Emblem Caps
      const capGeom = new THREE.CylinderGeometry(hubRadius * 0.55, hubRadius * 0.55, 0.02, 16);
      const topCap = new THREE.Mesh(capGeom, materials.railMat);
      topCap.position.set(0, hubHeight / 2 + 0.01, 0);
      bayGroup.add(topCap);

      const bottomCap = new THREE.Mesh(capGeom, materials.railMat);
      bottomCap.position.set(0, -hubHeight / 2 - 0.01, 0);
      bayGroup.add(bottomCap);

      // 7 High-Curvature Aerodynamic Rotor Blades
      const bladeGeom = new THREE.BoxGeometry(fanRadius * 0.65, fanThickness * 0.6, 0.12);
      for (let b = 0; b < 7; b++) {
        const bladeAngle = (b * Math.PI * 2) / 7;
        const bladeMesh = new THREE.Mesh(bladeGeom, materials.frameMat);
        bladeMesh.position.set(
          Math.cos(bladeAngle) * (fanRadius * 0.55),
          0,
          Math.sin(bladeAngle) * (fanRadius * 0.55)
        );
        bladeMesh.rotation.y = -bladeAngle + 0.35;
        bladeMesh.rotation.z = 0.25; // 25 degree aerodynamic pitch
        bayGroup.add(bladeMesh);
      }

      // 1. Top Chrome Wire Finger-Guard Grille (Exterior)
      const topGuardY = (roofTopY - fanMidY) + 0.025;
      [fanRadius * 0.40, fanRadius * 0.70, fanRadius * 0.95].forEach(ringR => {
        const guardRing = new THREE.TorusGeometry(ringR, 0.012, 6, 28);
        guardRing.rotateX(Math.PI / 2);
        const guardRingMesh = new THREE.Mesh(guardRing, materials.metalMat);
        guardRingMesh.position.set(0, topGuardY, 0);
        bayGroup.add(guardRingMesh);
      });

      const spokeGeom = new THREE.BoxGeometry(fanRadius * 1.95, 0.012, 0.012);
      const topSpoke1 = new THREE.Mesh(spokeGeom, materials.metalMat);
      topSpoke1.position.set(0, topGuardY + 0.005, 0);
      topSpoke1.rotation.y = Math.PI / 4;
      bayGroup.add(topSpoke1);

      const topSpoke2 = new THREE.Mesh(spokeGeom, materials.metalMat);
      topSpoke2.position.set(0, topGuardY + 0.005, 0);
      topSpoke2.rotation.y = -Math.PI / 4;
      bayGroup.add(topSpoke2);

      // 2. Bottom Chrome Wire Finger-Guard Grille (Interior Ceiling - Highly Visible from Inside!)
      const bottomGuardY = (roofCeilingY - fanMidY) - 0.025;
      [fanRadius * 0.40, fanRadius * 0.70, fanRadius * 0.95].forEach(ringR => {
        const guardRing = new THREE.TorusGeometry(ringR, 0.014, 6, 28);
        guardRing.rotateX(Math.PI / 2);
        const guardRingMesh = new THREE.Mesh(guardRing, materials.metalMat);
        guardRingMesh.position.set(0, bottomGuardY, 0);
        bayGroup.add(guardRingMesh);
      });

      const bottomSpoke1 = new THREE.Mesh(spokeGeom, materials.metalMat);
      bottomSpoke1.position.set(0, bottomGuardY - 0.005, 0);
      bottomSpoke1.rotation.y = Math.PI / 4;
      bayGroup.add(bottomSpoke1);

      const bottomSpoke2 = new THREE.Mesh(spokeGeom, materials.metalMat);
      bottomSpoke2.position.set(0, bottomGuardY - 0.005, 0);
      bottomSpoke2.rotation.y = -Math.PI / 4;
      bayGroup.add(bottomSpoke2);

      (bayGroup as any).userData = {
        isProductMesh: true,
        item: {
          instanceId: `roof-fan-${bay.id}`,
          sku: isBuiltIn ? 'BUILTIN-FAN' : 'OPTIONAL-FAN',
          name: isBuiltIn
            ? `מאוורר גג תעשייתי 120 מ״מ (${builtInFansCount} יח׳ כלולות בגג הארון)`
            : `מאוורר גג תעשייתי 120 מ״מ (ציוד אופציונלי נוסף)`,
          description: 'מאוורר איוורור תעשייתי עליון 120 מ״מ מותקן בגג הארון לשאיבת חום ויצירת סירקולציית אוויר מיטבית.',
          price: 0,
          isIncluded: isBuiltIn,
          type: 'fan',
        },
      };
    } else {
      // EMPTY FAN BAY READY FOR MOUNTING (Top & Bottom aperture discs)
      const meshDiscGeom = new THREE.CylinderGeometry(fanRadius * 0.98, fanRadius * 0.98, 0.02, 24);
      const meshDisc = new THREE.Mesh(meshDiscGeom, materials.frameMat);
      meshDisc.position.set(0, 0, 0);
      bayGroup.add(meshDisc);

      (bayGroup as any).userData = {
        isProductMesh: true,
        item: {
          instanceId: `roof-fan-bay-${bay.id}`,
          sku: `FAN-BAY-${bay.id}`,
          name: `מפרץ איוורור גג (${bay.label}) - פנוי להתקנה`,
          description: 'פתח איוורור עליון ייעודי בגג הארון הכולל הכנה לברגי עיגון עבור מאוורר 120 מ״מ.',
          price: 0,
          isIncluded: true,
          type: 'active',
        },
      };
    }

    group.add(bayGroup);
  });

  // 3. FOUR CORNER POSTS (Uprights)
  const postHeight = frameHeightUnits - roofHeight - baseHeight;
  const postGeom = new THREE.BoxGeometry(wallThick, postHeight, wallThick);
  const postPositions = [
    [-halfW + wallThick / 2, -halfD + wallThick / 2], // Rear-Left
    [halfW - wallThick / 2, -halfD + wallThick / 2],  // Rear-Right
    [-halfW + wallThick / 2, halfD - wallThick / 2],  // Front-Left
    [halfW - wallThick / 2, halfD - wallThick / 2],   // Front-Right
  ];

  postPositions.forEach(([px, pz]) => {
    const postMesh = new THREE.Mesh(postGeom, materials.frameMat);
    postMesh.position.set(px, -halfH + baseHeight + postHeight / 2, pz);
    postMesh.castShadow = true;
    group.add(postMesh);
  });

// 4. SIDE PANELS (Solid / vented side walls with subtle gap to see inside)
  const sideWidth = depthUnits - wallThick * 2;
  const sideGeom = new THREE.BoxGeometry(0.04, postHeight * 0.98, sideWidth);
  const sideMat = (materials.panelMat as THREE.MeshStandardMaterial).clone();

  // Left side panel
  const leftSide = new THREE.Mesh(sideGeom, sideMat);
  leftSide.position.set(-halfW + 0.02, -halfH + baseHeight + postHeight / 2, 0);
  leftSide.receiveShadow = true;
  (leftSide as any).userData = { isCabinetStructure: true, isSidePanel: true };
  group.add(leftSide);

  // Right side panel
  const rightSide = new THREE.Mesh(sideGeom, sideMat);
  rightSide.position.set(halfW - 0.02, -halfH + baseHeight + postHeight / 2, 0);
  rightSide.receiveShadow = true;
  (rightSide as any).userData = { isCabinetStructure: true, isSidePanel: true };
  group.add(rightSide);

  // 5. 19-INCH VERTICAL RAILS (Front Left, Front Right, Rear Left, Rear Right)
  const railPostGeom = new THREE.BoxGeometry(0.18, railHeightUnits, 0.18);
  const railX = RACK_19_WIDTH_UNITS / 2;

  // Front Rails
  const frontLeftRail = new THREE.Mesh(railPostGeom, materials.railMat);
  frontLeftRail.position.set(-railX, -halfH + baseHeight + railHeightUnits / 2, frontRailZ);
  frontLeftRail.name = 'front-left-rail';
  group.add(frontLeftRail);

  const frontRightRail = new THREE.Mesh(railPostGeom, materials.railMat);
  frontRightRail.position.set(railX, -halfH + baseHeight + railHeightUnits / 2, frontRailZ);
  frontRightRail.name = 'front-right-rail';
  group.add(frontRightRail);

  // Rear Rails (if rack has enough depth for dual-post / 4-post structure)
  if (depthUnits >= 3.5) {
    const rearLeftRail = new THREE.Mesh(railPostGeom, materials.railMat);
    rearLeftRail.position.set(-railX, -halfH + baseHeight + railHeightUnits / 2, rearRailZ);
    group.add(rearLeftRail);

    const rearRightRail = new THREE.Mesh(railPostGeom, materials.railMat);
    rearRightRail.position.set(railX, -halfH + baseHeight + railHeightUnits / 2, rearRailZ);
    group.add(rearRightRail);

    // Horizontal Depth Braces connecting front and rear rails (top, mid, bottom)
    const braceZDist = Math.abs(frontRailZ - rearRailZ);
    const braceGeom = new THREE.BoxGeometry(0.08, 0.10, braceZDist);
    const braceMidZ = (frontRailZ + rearRailZ) / 2;
    [-railX, railX].forEach(bx => {
      [0.08, 0.5, 0.92].forEach(fraction => {
        const braceMesh = new THREE.Mesh(braceGeom, materials.metalMat);
        braceMesh.position.set(bx, -halfH + baseHeight + railHeightUnits * fraction, braceMidZ);
        group.add(braceMesh);
      });
    });
  }

  // 6. U MARKER TICKS & READABLE U NUMBERING ON FRONT RAILS
  // Placed on outer rail edge to prevent occlusion by installed equipment
  const tickGeom = new THREE.BoxGeometry(0.08, 0.015, 0.02);
  const labelPlaneGeom = new THREE.PlaneGeometry(0.32, U_HEIGHT_UNITS * 0.55);

  // Cached canvas textures for U numbers (1..totalU)
  const uTextureCache = new Map<number, THREE.CanvasTexture | THREE.Texture>();
  const getUTexture = (uNum: number) => {
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }
    let tex = uTextureCache.get(uNum);
    if (!tex) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a'; // slate-900 high contrast badge
        ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#38bdf8'; // sky blue border
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 124, 60);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 34px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`U${uNum}`, 64, 34);
      }
      tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      uTextureCache.set(uNum, tex);
    }
    return tex;
  };

  for (let u = 1; u <= totalU; u++) {
    const yTick = u1BottomY + u * U_HEIGHT_UNITS; // Boundary between U_u and U_{u+1}
    const yCenter = uCenters[u - 1]; // Center of this U slot

    // Rail boundary tick line
    [-railX, railX].forEach(rx => {
      const tick = new THREE.Mesh(tickGeom, materials.accentMat);
      tick.position.set(rx, yTick, frontRailZ + 0.095);
      group.add(tick);
    });

    // Outer-edge readable U badges (left and right)
    const uTex = getUTexture(u);
    const uLabelMat = new THREE.MeshBasicMaterial({
      map: uTex,
      transparent: false,
      toneMapped: false,
    });

    // Left rail outer label
    const leftLabelMesh = new THREE.Mesh(labelPlaneGeom, uLabelMat);
    leftLabelMesh.position.set(-railX - 0.22, yCenter, frontRailZ + 0.096);
    group.add(leftLabelMesh);

    // Right rail outer label
    const rightLabelMesh = new THREE.Mesh(labelPlaneGeom, uLabelMat);
    rightLabelMesh.position.set(railX + 0.22, yCenter, frontRailZ + 0.096);
    group.add(rightLabelMesh);
  }

  // 7. BASE WHEELS (Casters), LEVELING FEET, and WALL MOUNT BRACKETS
  const builtInWheelsCount = parseAccessoryCount(cabinetData?.wheels);
  const builtInFeetCount = parseAccessoryCount(cabinetData?.levelingFeet);
  const hasWheels = builtInWheelsCount > 0 || Boolean(options?.hasSelectedWheels);
  const hasFeet = builtInFeetCount > 0 || Boolean(options?.hasSelectedFeet);
  const isWheelsBuiltIn = builtInWheelsCount > 0;
  const isFeetBuiltIn = builtInFeetCount > 0;

  const cornerOffsets = [
    [-halfW + 0.4, -halfD + 0.4],
    [halfW - 0.4, -halfD + 0.4],
    [-halfW + 0.4, halfD - 0.4],
    [halfW - 0.4, halfD - 0.4],
  ];

  // Helper to build a wheel group
  const createWheelGroup = (idx: number, x: number, y: number, z: number, isStaging = false) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.name = `caster-wheel-${idx + 1}`;
    (wheelGroup as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `builtin-wheel-${idx + 1}`,
        sku: isWheelsBuiltIn ? 'BUILTIN-WHEELS' : 'OPTIONAL-WHEELS',
        name: isWheelsBuiltIn
          ? `גלגלי נסיעה כבדים (${builtInWheelsCount || 4} יח׳ כלולות בארון)`
          : `גלגלי נסיעה כבדים (ציוד אופציונלי)`,
        description: isStaging
          ? 'ערכת גלגלים כלולה בתכולת הארון (במגש ציוד נלווה).'
          : 'גלגלי נסיעה מסיביים מותקנים בבסיס הארון להסעה ושינוע נוח.',
        price: 0,
        isIncluded: isWheelsBuiltIn,
        type: 'active',
      },
    };
    wheelGroup.position.set(x, y, z);

    const forkGeom = new THREE.BoxGeometry(0.18, 0.20, 0.18);
    const fork = new THREE.Mesh(forkGeom, materials.metalMat);
    fork.position.set(0, 0.10, 0);
    wheelGroup.add(fork);

    const wheelGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeom, materials.rubberMat);
    wheel.position.set(0, 0, 0);
    wheel.castShadow = true;
    wheelGroup.add(wheel);

    return wheelGroup;
  };

  // Helper to build a leveling foot group
  const createFootGroup = (idx: number, x: number, y: number, z: number, isStaging = false) => {
    const footGroup = new THREE.Group();
    footGroup.name = `leveling-foot-${idx + 1}`;
    (footGroup as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `builtin-foot-${idx + 1}`,
        sku: isFeetBuiltIn ? 'BUILTIN-FEET' : 'OPTIONAL-FEET',
        name: isFeetBuiltIn
          ? `רגליות פילוס מתכווננות (${builtInFeetCount || 4} יח׳ כלולות בארון)`
          : `רגליות פילוס מתכווננות (ציוד אופציונלי)`,
        description: isStaging
          ? 'ערכת רגליות פילוס כלולה בתכולת הארון (במגש ציוד נלווה).'
          : 'רגליות פילוס ואיזון מותקנות בבסיס הארון ליציבות מרבית ומניעת רעידות.',
        price: 0,
        isIncluded: isFeetBuiltIn,
        type: 'active',
      },
    };
    footGroup.position.set(x, y, z);

    const footGeom = new THREE.CylinderGeometry(0.20, 0.24, 0.10, 16);
    const pad = new THREE.Mesh(footGeom, materials.rubberMat);
    footGroup.add(pad);

    const stemGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
    const stem = new THREE.Mesh(stemGeom, materials.metalMat);
    stem.position.set(0, 0.10, 0);
    footGroup.add(stem);

    return footGroup;
  };

  if (hasWheels && hasFeet) {
    // Both are included/selected: mount wheels on base corners, and mount leveling feet directly beside them on the base
    cornerOffsets.forEach(([cx, cz], idx) => {
      const wheelGroup = createWheelGroup(idx, cx, -halfH - 0.22, cz, false);
      group.add(wheelGroup);

      // Leveling feet mounted directly beside the wheel base bracket
      const footGroup = createFootGroup(idx, cx * 0.78, -halfH - 0.14, cz * 0.78, false);
      group.add(footGroup);
    });
  } else if (hasWheels) {
    // Only wheels included/selected: mount on base corners
    cornerOffsets.forEach(([cx, cz], idx) => {
      const wheelGroup = createWheelGroup(idx, cx, -halfH - 0.22, cz, false);
      group.add(wheelGroup);
    });
  } else if (hasFeet) {
    // Only feet included/selected: mount on base corners
    cornerOffsets.forEach(([fx, fz], idx) => {
      const footGroup = createFootGroup(idx, fx, -halfH - 0.10, fz, false);
      group.add(footGroup);
    });
  } else {
    // Neither wheels nor feet -> Wall mount brackets on rear upright posts
    const bracketGeom = new THREE.BoxGeometry(0.12, 0.35, 0.14);
    [-halfW + 0.1, halfW - 0.1].forEach(bx => {
      [-halfH + baseHeight + 0.4, halfH - roofHeight - 0.4].forEach(by => {
        const bracket = new THREE.Mesh(bracketGeom, materials.metalMat);
        bracket.position.set(bx, by, -halfD - 0.06);
        bracket.name = 'wall-mount-bracket';
        (bracket as any).userData = {
          isProductMesh: true,
          item: {
            instanceId: 'builtin-wall-bracket',
            sku: 'WALL-BRACKET',
            name: 'אוזני תלייה לקיר (כלול בארון)',
            description: 'מבנה עגינה אחורי מחוזק לתליית ארון תקשורת על קיר.',
            price: 0,
            isIncluded: true,
            type: 'active',
          },
        };
        group.add(bracket);
      });
    });
  }

  // Helper to enable/disable raycast on group meshes
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

  // =========================================================================
  // DOORS (FRONT & REAR) - Resolved strictly from reliable source
  // =========================================================================
  const doorsInfo = resolveCabinetDoorsInfo(dims, cabinetData);
  const doorWidth = widthUnits - 0.20;
  const doorHeight = railHeightUnits + 0.10;
  const doorCenterY = (-roofHeight + baseHeight) / 2;
  const doorThick = 0.05;

  // Helper to generate a repeating perforated hexagonal honeycomb mesh texture
  const createPerforatedTexture = () => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#020617';
    const radius = 5.5;
    const rowH = 16;
    const colW = 16;

    for (let y = 0; y < 128; y += rowH) {
      const isOdd = Math.floor(y / rowH) % 2 === 1;
      for (let x = 0; x < 128; x += colW) {
        const cx = x + (isOdd ? colW / 2 : 0);
        const cy = y + rowH / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 30);
    return tex;
  };

  const perfTex = createPerforatedTexture();

  // Helper to construct door leaf material based on door type (perforated / glass / solid)
  const createDoorMaterial = (doorType: 'perforated' | 'glass' | 'solid') => {
    if (doorType === 'perforated') {
      return new THREE.MeshStandardMaterial({
        color: 0x334155,
        map: perfTex || undefined,
        roughness: 0.6,
        metalness: 0.65,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      });
    }
    if (doorType === 'glass') {
      return new THREE.MeshStandardMaterial({
        color: 0x93c5fd, // Clear tempered glass with blue-gray tint
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
    }
    // Solid steel door
    return new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.4,
      transparent: true,
      opacity: 0.90,
      side: THREE.DoubleSide,
    });
  };

  // Front Door
  const frontDoorGroup = new THREE.Group();
  frontDoorGroup.name = 'generic-front-door-group';

  const frontDoorItem = {
    instanceId: 'generic-front-door',
    sku: 'DOOR-FRONT',
    name: doorsInfo.frontDoorName,
    description: cabinetData?.frontDoor || (doorsInfo.frontDoorType === 'perforated' ? 'דלת קדמית רשת מחוררת 75% לאוורור מיטבי' : 'דלת קדמית זכוכית מחוסמת 5 מ״מ'),
    price: 0,
    isIncluded: true,
    type: 'door',
  };

  const frontDoorMat = createDoorMaterial(doorsInfo.frontDoorType);
  const frontDoorFrameMat = (materials.frameMat as THREE.MeshStandardMaterial).clone();
  frontDoorFrameMat.transparent = true;
  frontDoorFrameMat.opacity = 0.55;

  if (doorsInfo.hasFrontDoor) {
    const frontHingeX = -halfW + 0.10;
    frontDoorGroup.position.set(frontHingeX, doorCenterY, halfD + 0.03);

    // Real hollow frame with genuine opening
    const frameBorderW = 0.20;
    const frameBorderH = 0.22;
    const doorOpeningW = Math.max(0.2, doorWidth - 2 * frameBorderW);
    const doorOpeningH = Math.max(0.2, doorHeight - 2 * frameBorderH);

    // Top rail
    const frontTopBeam = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, frameBorderH, doorThick), frontDoorFrameMat);
    frontTopBeam.position.set(doorWidth / 2, doorHeight / 2 - frameBorderH / 2, 0);
    (frontTopBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontTopBeam);

    // Bottom rail
    const frontBtmBeam = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, frameBorderH, doorThick), frontDoorFrameMat);
    frontBtmBeam.position.set(doorWidth / 2, -doorHeight / 2 + frameBorderH / 2, 0);
    (frontBtmBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontBtmBeam);

    // Left stile (hinge side)
    const frontLeftBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, doorOpeningH, doorThick), frontDoorFrameMat);
    frontLeftBeam.position.set(frameBorderW / 2, 0, 0);
    (frontLeftBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontLeftBeam);

    // Right stile (handle side)
    const frontRightBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, doorOpeningH, doorThick), frontDoorFrameMat);
    frontRightBeam.position.set(doorWidth - frameBorderW / 2, 0, 0);
    (frontRightBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontRightBeam);

    // Center window/mesh situated cleanly inside the opening
    const frontDoorWindow = new THREE.Mesh(
      new THREE.BoxGeometry(doorOpeningW + 0.02, doorOpeningH + 0.02, doorThick * 0.4),
      frontDoorMat
    );
    frontDoorWindow.position.set(doorWidth / 2, 0, 0.002);
    (frontDoorWindow as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontDoorWindow);

    // If glass door, add solid ceramic silkscreen border trim on glass inner perimeter
    if (doorsInfo.frontDoorType === 'glass') {
      const ceramicMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const borderThickness = 0.06;
      // Top/bottom ceramic border
      [-doorOpeningH / 2 + borderThickness / 2, doorOpeningH / 2 - borderThickness / 2].forEach(by => {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(doorOpeningW, borderThickness, doorThick * 0.42), ceramicMat);
        cBeam.position.set(doorWidth / 2, by, 0.003);
        frontDoorGroup.add(cBeam);
      });
      // Left/right ceramic border
      [-doorOpeningW / 2 + borderThickness / 2, doorOpeningW / 2 - borderThickness / 2].forEach(bx => {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, doorOpeningH, doorThick * 0.42), ceramicMat);
        cBeam.position.set(doorWidth / 2 + bx, 0, 0.003);
        frontDoorGroup.add(cBeam);
      });
    }

    // Lock handle on right side
    const frontLockHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.90, 0.06),
      materials.metalMat
    );
    frontLockHandle.position.set(doorWidth - 0.18, 0, 0.035);
    (frontLockHandle as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontLockHandle);

    // Hinges on left
    [-doorHeight / 2 + 0.2, doorHeight / 2 - 0.2].forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), materials.metalMat);
      hinge.position.set(0, hy, 0);
      (hinge as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorGroup.add(hinge);
    });

    (frontDoorGroup as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    group.add(frontDoorGroup);
  }

  // Rear Door (Check doorsInfo if rear door is present; otherwise rear remains open without any blocking mesh)
  const hasRearDoor = doorsInfo.hasRearDoor;
  const rearDoorGroup = new THREE.Group();
  rearDoorGroup.name = 'generic-rear-door-group';

  const rearDoorItem = {
    instanceId: 'generic-rear-door',
    sku: 'DOOR-REAR',
    name: doorsInfo.rearDoorName,
    description: cabinetData?.rearDoor || (doorsInfo.rearDoorType === 'perforated' ? 'דלת אחורית רשת מחוררת 75%' : 'דלת אחורית מפלדה SPCC מלאה'),
    price: 0,
    isIncluded: true,
    type: 'door',
  };

  const rearDoorMat = createDoorMaterial(doorsInfo.rearDoorType);
  const rearDoorFrameMat = (materials.frameMat as THREE.MeshStandardMaterial).clone();
  rearDoorFrameMat.transparent = true;
  rearDoorFrameMat.opacity = 0.55;

  if (hasRearDoor) {
    const rearHingeX = -halfW + 0.10;
    rearDoorGroup.position.set(rearHingeX, doorCenterY, -halfD - 0.03);

    // 4-piece frame with genuine opening
    const frameBorderW = 0.20;
    const frameBorderH = 0.22;
    const doorOpeningW = Math.max(0.2, doorWidth - 2 * frameBorderW);
    const doorOpeningH = Math.max(0.2, doorHeight - 2 * frameBorderH);

    const rearTopBeam = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, frameBorderH, doorThick), rearDoorFrameMat);
    rearTopBeam.position.set(doorWidth / 2, doorHeight / 2 - frameBorderH / 2, 0);
    (rearTopBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorGroup.add(rearTopBeam);

    const rearBtmBeam = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, frameBorderH, doorThick), rearDoorFrameMat);
    rearBtmBeam.position.set(doorWidth / 2, -doorHeight / 2 + frameBorderH / 2, 0);
    (rearBtmBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorGroup.add(rearBtmBeam);

    const rearLeftBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, doorOpeningH, doorThick), rearDoorFrameMat);
    rearLeftBeam.position.set(frameBorderW / 2, 0, 0);
    (rearLeftBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorGroup.add(rearLeftBeam);

    const rearRightBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, doorOpeningH, doorThick), rearDoorFrameMat);
    rearRightBeam.position.set(doorWidth - frameBorderW / 2, 0, 0);
    (rearRightBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorGroup.add(rearRightBeam);

    const rearDoorWindow = new THREE.Mesh(
      new THREE.BoxGeometry(doorOpeningW + 0.02, doorOpeningH + 0.02, doorThick * 0.4),
      rearDoorMat
    );
    rearDoorWindow.position.set(doorWidth / 2, 0, -0.002);
    (rearDoorWindow as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorGroup.add(rearDoorWindow);

    if (doorsInfo.rearDoorType === 'glass') {
      const ceramicMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const borderThickness = 0.06;
      [-doorOpeningH / 2 + borderThickness / 2, doorOpeningH / 2 - borderThickness / 2].forEach(by => {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(doorOpeningW, borderThickness, doorThick * 0.42), ceramicMat);
        cBeam.position.set(doorWidth / 2, by, -0.003);
        rearDoorGroup.add(cBeam);
      });
      [-doorOpeningW / 2 + borderThickness / 2, doorOpeningW / 2 - borderThickness / 2].forEach(bx => {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, doorOpeningH, doorThick * 0.42), ceramicMat);
        cBeam.position.set(doorWidth / 2 + bx, 0, -0.003);
        rearDoorGroup.add(cBeam);
      });
    }

    const rearLockHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.90, 0.06),
      materials.metalMat
    );
    rearLockHandle.position.set(doorWidth - 0.18, 0, -0.035);
    (rearLockHandle as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorGroup.add(rearLockHandle);

    [-doorHeight / 2 + 0.2, doorHeight / 2 - 0.2].forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), materials.metalMat);
      hinge.position.set(0, hy, 0);
      (hinge as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      rearDoorGroup.add(hinge);
    });

    (rearDoorGroup as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    group.add(rearDoorGroup);
  }

  // Door state & Cutaway handling
  let currentRearDoorState: DoorLeafState = options?.doorState?.rear || 'transparent';
  let isCutawayActive = false;

  const updateRearDoorOpacity = () => {
    if (!hasRearDoor || currentRearDoorState === 'removed') return;
    if (isCutawayActive && (currentRearDoorState === 'closed' || currentRearDoorState === 'transparent')) {
      rearDoorMat.opacity = 0.15;
      rearDoorMat.transparent = true;
      rearDoorFrameMat.opacity = 0.18;
      rearDoorFrameMat.transparent = true;
    } else {
      if (currentRearDoorState === 'closed') {
        rearDoorMat.opacity = 0.95;
        rearDoorMat.transparent = false;
        rearDoorFrameMat.opacity = 0.95;
        rearDoorFrameMat.transparent = false;
      } else if (currentRearDoorState === 'transparent') {
        rearDoorMat.opacity = 0.38;
        rearDoorMat.transparent = true;
        rearDoorFrameMat.opacity = 0.42;
        rearDoorFrameMat.transparent = true;
      } else if (currentRearDoorState === 'open') {
        rearDoorMat.opacity = 0.90;
        rearDoorMat.transparent = false;
        rearDoorFrameMat.opacity = 0.95;
        rearDoorFrameMat.transparent = false;
      }
    }
  };

  const setRearCutaway = (active: boolean) => {
    isCutawayActive = active;
    updateRearDoorOpacity();
  };

  const setDoorMode = (side: 'front' | 'rear', state: DoorLeafState) => {
    if (side === 'front') {
      if (!doorsInfo.hasFrontDoor) return;
      if (state === 'removed') {
        frontDoorGroup.visible = false;
        setHierarchyRaycast(frontDoorGroup, false);
      } else {
        frontDoorGroup.visible = true;
        setHierarchyRaycast(frontDoorGroup, true);
        if (state === 'open') {
          frontDoorGroup.rotation.y = -Math.PI * 0.58; // swing outward to front
          frontDoorMat.opacity = 0.90;
          frontDoorMat.transparent = false;
          frontDoorFrameMat.opacity = 0.95;
          frontDoorFrameMat.transparent = false;
        } else if (state === 'closed') {
          frontDoorGroup.rotation.y = 0;
          frontDoorMat.opacity = 0.95;
          frontDoorMat.transparent = false;
          frontDoorFrameMat.opacity = 0.95;
          frontDoorFrameMat.transparent = false;
        } else {
          // transparent
          frontDoorGroup.rotation.y = 0;
          frontDoorMat.opacity = 0.38;
          frontDoorMat.transparent = true;
          frontDoorFrameMat.opacity = 0.42;
          frontDoorFrameMat.transparent = true;
        }
      }
    } else {
      // rear
      if (!hasRearDoor) return;
      currentRearDoorState = state;
      if (state === 'removed') {
        rearDoorGroup.visible = false;
        setHierarchyRaycast(rearDoorGroup, false);
      } else {
        rearDoorGroup.visible = true;
        setHierarchyRaycast(rearDoorGroup, true);
        if (state === 'open') {
          rearDoorGroup.rotation.y = Math.PI * 0.58; // swing outward to rear
        } else {
          rearDoorGroup.rotation.y = 0;
        }
        updateRearDoorOpacity();
      }
    }
  };

  const initialFront = options?.doorState?.front || 'transparent';
  const initialRear = options?.doorState?.rear || 'transparent';
  if (doorsInfo.hasFrontDoor) {
    setDoorMode('front', initialFront);
  }
  if (doorsInfo.hasRearDoor) {
    setDoorMode('rear', initialRear);
  }

  const dummyStagingGroup = new THREE.Group();
  dummyStagingGroup.name = 'staging-tray-disabled';
  dummyStagingGroup.visible = false;

  return {
    group,
    uCenters,
    innerDepthUnits,
    stagingTrayGroup: dummyStagingGroup,
    stagingAccessoriesGroup: dummyStagingGroup,
    hasStagingContent: false,
    doorsGroup: frontDoorGroup,
    setDoorMode,
    setRearCutaway,
    doorsInfo,
  };
}
