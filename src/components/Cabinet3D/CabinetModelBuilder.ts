import * as THREE from 'three';
import { CabinetDimensions3D, DoorLeafState, DoorState } from './Cabinet3DTypes';
import { CabinetMatrixData, parseAccessoryCount, normalizeSku } from '../../utils/cabinetData';
import { build447510TCabinetGroup } from './CabinetModel447510T';
import { buildBoost42UCabinetGroup } from './CabinetModelBoost42U';
import { build221221CabinetGroup } from './CabinetModel221221';
import { createBoostHeaderBadgeMesh } from './BoostRackMountLogo';
import { createPerforationTexture } from './BrandTextures';

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
  const is221221 = Boolean(dims.isSpecific221221 || isCabinet221221(product, cabinetData));

  if (is221221) {
    return {
      hasFrontDoor: true,
      hasRearDoor: false,
      frontDoorType: 'glass',
      rearDoorType: 'solid',
      isDoubleFront: false,
      isDoubleRear: false,
      frontDoorName: 'דלת קדמית זכוכית מחוסמת 4.0 מ״מ עם מנעול עגול',
      rearDoorName: 'ללא דלת אחורית (גב לתליית קיר)',
      isFrontDoorIllustrative: false,
      isRearDoorIllustrative: false,
    };
  }

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
    // Empty / unknown front door in matrix: provide illustrative door based on product description
    isFrontDoorIllustrative = true;
    if (/רשת|מחורר|perforated|mesh/i.test(nameLower)) {
      frontDoorType = 'perforated';
    } else if (/פח|מלא|solid|steel/i.test(nameLower)) {
      frontDoorType = 'solid';
    } else {
      frontDoorType = 'glass';
    }
  }

  // Rear Door Resolution:
  // "קיום דלת, סוגה ומספר כנפיה נקבעים ממקור אמין. הבחֵן בין יש, אין ולא ידוע. rearDoor ריק אינו אישור ליצור דלת. אין פקד פעיל לדלת שאינה קיימת."
  // Note: In the Google Sheet matrix, wall-mounted cabinets specify "פח אטום" or "פתוח" under Rear,
  // which corresponds to "3. Fixed back panel (for wall mounting)" in the official PDF schematics — NOT a hinged door!
  let hasRearDoor = false;
  let rearDoorType: 'perforated' | 'solid' | 'glass' = 'solid';
  let isDoubleRear = false;
  let isRearDoorIllustrative = false;

  const isFixedWallBack = /פח\s*אטום|גב\s*קבוע|לתלייה|לתליית\s*קיר|fixed\s*back|פתוח/i.test(rearDoorRaw);

  if (isOpenRack || isFixedWallBack || /^(?:ללא|none|no|אין|x|-)$/i.test(rearDoorRaw)) {
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
    : `דלת קדמית ${frontDoorType === 'perforated' ? 'רשת מחוררת' : frontDoorType === 'solid' ? 'פח מלאה' : 'זכוכית'} (המחשה)`;

  const rearDoorName = hasRearDoor
    ? (isRearDoorIllustrative ? `${rearDoorRaw} (המחשה)` : rearDoorRaw)
    : isFixedWallBack
      ? (/פתוח/i.test(rearDoorRaw) ? 'גב פתוח להתקנת קיר' : 'פח אחורי אטום קבוע (גב לתליית קיר)')
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
 * Checks specifically for SKU 447510T (44U 75x100) and SKU 447580T (44U 75x80) Boost Double-Perforated Floor Standing Racks
 */
export function isCabinet447510T(product: any, cabinetData?: CabinetMatrixData | null): boolean {
  const normProductSku = normalizeSku(product?.sku);
  const normProductPn = normalizeSku(product?.pn);
  const normCabinetSku = normalizeSku(cabinetData?.sku);
  const normCabinetModel = normalizeSku(cabinetData?.model);
  const nameUpper = String(product?.name || '').toUpperCase();
  const descUpper = String(product?.description || '').toUpperCase();

  const validSkus = ['447510T', '447510', '447580T', '447580', 'TBH'];
  if (
    validSkus.includes(normProductSku) ||
    validSkus.includes(normProductPn) ||
    validSkus.includes(normCabinetSku) ||
    validSkus.includes(normCabinetModel)
  ) {
    return true;
  }
  if (
    nameUpper.includes('447510') ||
    descUpper.includes('447510') ||
    nameUpper.includes('447580') ||
    descUpper.includes('447580')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks specifically for Boost RackMount 42U Glass-Front + Solid-Rear Floor Standing Cabinet specification
 */
export function isCabinetBoost42U(product: any, cabinetData?: CabinetMatrixData | null): boolean {
  const normProductSku = normalizeSku(product?.sku);
  const normProductPn = normalizeSku(product?.pn);
  const normCabinetSku = normalizeSku(cabinetData?.sku);
  const normCabinetModel = normalizeSku(cabinetData?.model);
  const nameUpper = String(product?.name || '').toUpperCase();
  const descUpper = String(product?.description || '').toUpperCase();

  // Do NOT route perforated-door 42U cabinets (e.g. 2177, 2066, or 206810 with perforated rear door) to the glass/solid-rear 42U model
  const doorSummary = `${product?.name || ''} ${cabinetData?.frontDoor || ''} ${cabinetData?.rearDoor || ''}`;
  if (/מחורר|רשת|perforated|mesh/i.test(doorSummary)) {
    return false;
  }

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
 * Checks specifically for SKU 221221 (Boost RackMount 4U Wall Cabinet 550x400x200mm)
 */
export function isCabinet221221(product: any, cabinetData?: CabinetMatrixData | null): boolean {
  const normProductSku = normalizeSku(product?.sku);
  const normProductPn = normalizeSku(product?.pn);
  const normCabinetSku = normalizeSku(cabinetData?.sku);
  const normCabinetModel = normalizeSku(cabinetData?.model);
  const nameUpper = String(product?.name || '').toUpperCase();
  const descUpper = String(product?.description || '').toUpperCase();

  if (
    normProductSku === '221221' ||
    normProductPn === '221221' ||
    normCabinetSku === '221221' ||
    normCabinetModel === '221221'
  ) {
    return true;
  }
  if (nameUpper.includes('221221') || descUpper.includes('221221')) {
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
  // Check specifically for SKU 221221 (from manufacturer technical drawing: 4U 550x400x200)
  if (isCabinet221221(product, cabinetData)) {
    return {
      totalU: 4,
      widthMm: 550,
      depthMm: 400,
      heightMm: 200,
      isSchematicDimensions: false,
      isSchematicCapacity: false,
      removableSides: false,
      isSpecific221221: true,
    };
  }

  // Check specifically for SKU 447510T (750x1000) and SKU 447580T (750x800) from manufacturer technical drawing
  if (isCabinet447510T(product, cabinetData)) {
    const skuCombined = `${normalizeSku(product?.sku)} ${normalizeSku(cabinetData?.sku)} ${String(product?.name || '')}`;
    const is800Depth = skuCombined.includes('447580') || skuCombined.includes('TBH') || cabinetData?.depth === 800;
    return {
      totalU: totalU > 0 ? totalU : 44,
      widthMm: cabinetData?.width || 750,
      depthMm: is800Depth ? 800 : 1000,
      heightMm: 2061, // 2060.7mm frame height, 2148.3mm with casters & feet
      isSchematicDimensions: false,
      isSchematicCapacity: false,
      removableSides: true,
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
      removableSides: true,
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

  const resolvedRemovableSides = cabinetData?.removableSides !== undefined
    ? cabinetData.removableSides
    : resolvedU >= 22;

  return {
    totalU: resolvedU,
    widthMm,
    depthMm,
    heightMm,
    isSchematicDimensions: isSchematic,
    isSchematicCapacity: isSchematicCap,
    removableSides: resolvedRemovableSides,
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
  setSidePanel?: (side: 'left' | 'right', state: 'closed' | 'removed') => void;
  doorsInfo?: CabinetDoorsInfo;
} {
  const materials = materialsInput || createCabinetMaterials();

  // If this is specifically SKU 221221 (Boost 4U Wall Cabinet), route to dedicated 221221 simulation!
  if (dims.isSpecific221221 || isCabinet221221(null, cabinetData)) {
    return build221221CabinetGroup(
      dims,
      cabinetData,
      materials as any,
      options
    );
  }

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

  // Bottom cable entry cutout plate (Center interior)
  const baseCutoutGeom = new THREE.BoxGeometry(widthUnits * 0.4, 0.02, depthUnits * 0.3);
  const baseCutoutMesh = new THREE.Mesh(baseCutoutGeom, materials.accentMat);
  baseCutoutMesh.position.set(0, -halfH + baseHeight + 0.01, 0);
  group.add(baseCutoutMesh);

  // Cable entry cutout on BASE rear edge: 0.9 x 0.25 units with brush-strip look (thin grey lines)
  const baseCableBrushGroup = new THREE.Group();
  baseCableBrushGroup.name = 'base-rear-cable-entry';
  const baseBrushPlateGeom = new THREE.BoxGeometry(0.90, 0.02, 0.25);
  const baseBrushPlateMesh = new THREE.Mesh(baseBrushPlateGeom, materials.rubberMat);
  baseBrushPlateMesh.position.set(0, 0, 0);
  baseCableBrushGroup.add(baseBrushPlateMesh);
  // Brush strip lines (thin grey lines)
  const baseBrushBristleGeom = new THREE.BoxGeometry(0.84, 0.024, 0.012);
  [-0.08, -0.04, 0, 0.04, 0.08].forEach(bz => {
    const bristleMesh = new THREE.Mesh(baseBrushBristleGeom, materials.railMat);
    bristleMesh.position.set(0, 0.002, bz);
    baseCableBrushGroup.add(bristleMesh);
  });
  baseCableBrushGroup.position.set(0, -halfH + baseHeight + 0.01, -halfD + 0.18);
  group.add(baseCableBrushGroup);

  // 2. ROOF CANOPY (Top panel)
  const roofGeom = new THREE.BoxGeometry(widthUnits, roofHeight, depthUnits);
  const roofMesh = new THREE.Mesh(roofGeom, materials.frameMat);
  roofMesh.position.set(0, halfH - roofHeight / 2, 0);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Boost brand nameplate badge on the front face of the top header bar (FRAME group child)
  // Right-aligned: right edge at (innerWidth/2 - 0.12); centered on header bar height; z = header front surface + 0.01
  const headerBadgeMesh = createBoostHeaderBadgeMesh(
    widthUnits - wallThick * 2,
    roofHeight,
    halfH - roofHeight / 2,
    halfD,
    materials.frameMat
  );
  group.add(headerBadgeMesh);

  // =========================================================================
  // 2.2 ROOF TOP COVER (Item 1) & INTERIOR CEILING FAN TRAY (Item 4)
  // Reconstructed 1-to-1 with BoostRack PDF Schematics (e.g., PN1274 Pages 1, 2, 3):
  // - Exterior Top Cover is flat matte-black SPCC steel with a FLUSH rectangular
  //   perforated mesh ventilation grille in the center (NO protruding silver stove rings!)
  //   and a bolted rectangular cable-entry knockout cover plate at the rear edge.
  // - Underneath the roof grille (inside the ceiling), the modular fan tray holds
  //   the exact number of 120mm fans specified in the datasheet (2PCS for 600x600 / 2-fan models,
  //   4PCS for 4-fan models, or empty fan cutouts for wall cabinets with 0 built-in fans).
  // =========================================================================
  const roofTopY = halfH; // Exact exterior top surface of cabinet roof
  const roofCeilingY = halfH - roofHeight; // Exact interior ceiling surface

  const builtInFansCount = parseAccessoryCount(cabinetData?.fans);
  const totalActiveFans = builtInFansCount + (options?.additionalFansCount || 0);
  const isFourFanTray = totalActiveFans > 2 || builtInFansCount > 2;

  // Flush Rectangular Perforated Ventilation Grille on Top of Roof (Page 2 #1 & Page 3 Top View)
  const ventGrilleWidth = Math.min(widthUnits * 0.56, 3.30);
  const ventGrilleDepth = isFourFanTray
    ? Math.min(depthUnits * 0.48, 3.20)
    : Math.min(depthUnits * 0.30, 1.75);

  // Subtle recessed dark bezel border around the flush roof ventilation screen
  const ventBorderGeom = new THREE.BoxGeometry(ventGrilleWidth + 0.08, 0.008, ventGrilleDepth + 0.08);
  const ventBorderMesh = new THREE.Mesh(ventBorderGeom, materials.panelMat);
  ventBorderMesh.position.set(0, roofTopY + 0.004, 0.15);
  group.add(ventBorderMesh);

  // Flush fine perforated mesh screen on top of the roof
  const roofPerfTex = createPerforationTexture();
  if (roofPerfTex) {
    roofPerfTex.repeat.set(ventGrilleWidth * 4.5, ventGrilleDepth * 4.5);
  }
  const roofGrilleMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    map: roofPerfTex || null,
    roughness: 0.55,
    metalness: 0.55,
  });
  const ventGrilleGeom = new THREE.BoxGeometry(ventGrilleWidth, 0.012, ventGrilleDepth);
  const ventGrilleMesh = new THREE.Mesh(ventGrilleGeom, roofGrilleMat);
  ventGrilleMesh.position.set(0, roofTopY + 0.006, 0.15);
  (ventGrilleMesh as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'roof-top-cover-vent-grille',
      sku: 'TOP-COVER-VENT',
      name: 'גג עליון עם רשת אוורור מחוררת שקועה (Top Cover)',
      description: 'מכסה גג עליון מפלדת SPCC עם רשת אוורור מלבנית שקועה לפיזור חום מעל יחידת המאווררים (סעיף 1 במפרט הטכני).',
      price: 0,
      isIncluded: true,
      type: 'active',
    },
  };
  group.add(ventGrilleMesh);

  // Bolted Rectangular Cable Entry Knockout Plate on ROOF rear edge (Page 2 #1 & Page 3 Top View)
  const roofCableBrushGroup = new THREE.Group();
  roofCableBrushGroup.name = 'roof-rear-cable-entry';
  const roofKnockoutW = Math.min(widthUnits * 0.48, 2.60);
  const roofKnockoutD = 0.52;
  const roofBrushPlateGeom = new THREE.BoxGeometry(roofKnockoutW, 0.016, roofKnockoutD);
  const roofBrushPlateMesh = new THREE.Mesh(roofBrushPlateGeom, materials.panelMat);
  roofBrushPlateMesh.position.set(0, 0, 0);
  roofCableBrushGroup.add(roofBrushPlateMesh);

  // Knockout perimeter seam & 4 M4 fixing screws
  const knockoutSeamEdges = new THREE.EdgesGeometry(roofBrushPlateGeom);
  const knockoutSeamLines = new THREE.LineSegments(
    knockoutSeamEdges,
    new THREE.LineBasicMaterial({ color: 0x475569 })
  );
  roofCableBrushGroup.add(knockoutSeamLines);

  const m4ScrewGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.022, 10);
  [
    [-roofKnockoutW * 0.44, -roofKnockoutD * 0.36],
    [roofKnockoutW * 0.44, -roofKnockoutD * 0.36],
    [-roofKnockoutW * 0.44, roofKnockoutD * 0.36],
    [roofKnockoutW * 0.44, roofKnockoutD * 0.36],
  ].forEach(([kx, kz]) => {
    const screw = new THREE.Mesh(m4ScrewGeom, materials.metalMat);
    screw.position.set(kx, 0.005, kz);
    roofCableBrushGroup.add(screw);
  });

  roofCableBrushGroup.position.set(0, roofTopY + 0.008, -halfD + 0.42);
  (roofCableBrushGroup as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'roof-cable-knockout-plate',
      sku: 'TOP-CABLE-ENTRY',
      name: 'פתח כניסת כבלים עליון מתפרק בגג הארון',
      description: 'פלטת כיסוי מלבנית מתפרקת בחלקו האחורי של גג הארון להשחלת צמות כבלים מהתקרה.',
      price: 0,
      isIncluded: true,
      type: 'hardware',
    },
  };
  group.add(roofCableBrushGroup);

  // Underside Interior Ceiling Fan Unit Tray (Item 4 in Exploded View, mounted inside ceiling below the roof mesh)
  const ceilingTrayWidth = ventGrilleWidth + 0.24;
  const ceilingTrayDepth = ventGrilleDepth + 0.24;
  const ceilingPanelGeom = new THREE.BoxGeometry(ceilingTrayWidth, 0.04, ceilingTrayDepth);
  const ceilingPanelMesh = new THREE.Mesh(ceilingPanelGeom, materials.panelMat);
  ceilingPanelMesh.position.set(0, roofCeilingY - 0.02, 0.15);
  group.add(ceilingPanelMesh);

  // 120mm High-Flow Fan Specs: visible on BOTH exterior roof top (roofTopY) and interior ceiling (roofCeilingY)
  const fanOuterSize = 1.18; // 118mm outer square housing
  const fanRadius = 0.50;    // 100mm circular turbine aperture
  const fanMidY = (roofTopY + roofCeilingY) / 2;
  const topRelY = roofTopY - fanMidY;       // Exact exterior roof surface relative to bayGroup
  const btmRelY = roofCeilingY - fanMidY;   // Exact interior ceiling surface relative to bayGroup
  const fullSpanH = roofTopY - roofCeilingY;

  const bayXOffset = Math.min(widthUnits * 0.145, 0.72);
  const bayZOffset = isFourFanTray ? Math.min(depthUnits * 0.12, 0.72) : 0;

  const fanBays: { id: number; label: string; x: number; z: number }[] = isFourFanTray
    ? [
        { id: 1, label: 'BAY 1 (קדמי שמאל)', x: -bayXOffset, z: 0.15 + bayZOffset },
        { id: 2, label: 'BAY 2 (קדמי ימין)', x: bayXOffset, z: 0.15 + bayZOffset },
        { id: 3, label: 'BAY 3 (אחורי שמאל)', x: -bayXOffset, z: 0.15 - bayZOffset },
        { id: 4, label: 'BAY 4 (אחורי ימין)', x: bayXOffset, z: 0.15 - bayZOffset },
      ]
    : [
        { id: 1, label: 'BAY 1 (שמאל)', x: -bayXOffset, z: 0.15 },
        { id: 2, label: 'BAY 2 (ימין)', x: bayXOffset, z: 0.15 },
      ];

  const darkWellMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.85,
    metalness: 0.2,
  });

  fanBays.forEach((bay, bayIdx) => {
    const isInstalled = bayIdx < totalActiveFans;
    const isBuiltIn = bayIdx < builtInFansCount;
    const bayGroup = new THREE.Group();
    bayGroup.name = `roof-fan-bay-${bay.id}`;
    bayGroup.position.set(bay.x, fanMidY, bay.z);

    const screwDist = fanOuterSize * 0.40;

    if (isInstalled) {
      // ==========================================================
      // INSTALLED 120MM ACTIVE TURBINE FAN UNIT (Item 4: 2PCS / 4PCS Fans)
      // Clearly visible from TOP exterior roof AND BOTTOM interior ceiling!
      // ==========================================================
      // 1. Square 120x120mm fan frame housing penetrating roof & appearing flush on top
      const fanHousingGeom = new THREE.BoxGeometry(fanOuterSize, fullSpanH + 0.032, fanOuterSize);
      const fanHousing = new THREE.Mesh(fanHousingGeom, materials.panelMat);
      fanHousing.position.set(0, 0.004, 0);
      bayGroup.add(fanHousing);

      const housingEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(fanOuterSize, 0.01, fanOuterSize)),
        new THREE.LineBasicMaterial({ color: 0x475569 })
      );
      housingEdges.position.set(0, topRelY + 0.021, 0);
      bayGroup.add(housingEdges);

      // 2. Dark circular turbine well on top & bottom so blades stand out with high contrast
      const wellGeom = new THREE.CylinderGeometry(fanRadius, fanRadius, fullSpanH + 0.036, 32);
      const wellMesh = new THREE.Mesh(wellGeom, darkWellMat);
      wellMesh.position.set(0, 0.004, 0);
      bayGroup.add(wellMesh);

      // 3. Top & Bottom circular intake bezels
      const topBezelGeom = new THREE.TorusGeometry(fanRadius, 0.018, 8, 32);
      topBezelGeom.rotateX(Math.PI / 2);
      const topBezel = new THREE.Mesh(topBezelGeom, materials.accentMat);
      topBezel.position.set(0, topRelY + 0.024, 0);
      bayGroup.add(topBezel);

      const bottomBezel = new THREE.Mesh(topBezelGeom, materials.railMat);
      bottomBezel.position.set(0, btmRelY - 0.016, 0);
      bayGroup.add(bottomBezel);

      // 4. Four corner hex mounting bolts (visible on top of roof & bottom ceiling)
      const screwGeom = new THREE.CylinderGeometry(0.024, 0.024, fullSpanH + 0.05, 8);
      [
        [-screwDist, -screwDist],
        [screwDist, -screwDist],
        [-screwDist, screwDist],
        [screwDist, screwDist],
      ].forEach(([sx, sz]) => {
        const screwMesh = new THREE.Mesh(screwGeom, materials.metalMat);
        screwMesh.position.set(sx, 0.004, sz);
        bayGroup.add(screwMesh);
      });

      // 5. Central Motor Hub & Chrome Emblem Cap (extending to top of roof)
      const hubRadius = 0.17;
      const hubHeight = fullSpanH + 0.044;
      const hubGeom = new THREE.CylinderGeometry(hubRadius, hubRadius, hubHeight, 24);
      const hubMesh = new THREE.Mesh(hubGeom, materials.metalMat);
      hubMesh.position.set(0, 0.004, 0);
      bayGroup.add(hubMesh);

      const capGeom = new THREE.CylinderGeometry(hubRadius * 0.58, hubRadius * 0.58, 0.01, 16);
      const topCap = new THREE.Mesh(capGeom, materials.railMat);
      topCap.position.set(0, topRelY + 0.028, 0);
      bayGroup.add(topCap);

      // 6. 7 Aerodynamic Rotor Blades (Visible at Top Exterior AND Bottom Interior)
      const bladeGeom = new THREE.BoxGeometry(fanRadius * 0.60, 0.022, 0.11);
      for (let b = 0; b < 7; b++) {
        const bladeAngle = (b * Math.PI * 2) / 7;
        const bx = Math.cos(bladeAngle) * (fanRadius * 0.54);
        const bz = Math.sin(bladeAngle) * (fanRadius * 0.54);

        // Top exterior rotor blade
        const topBlade = new THREE.Mesh(bladeGeom, materials.metalMat);
        topBlade.position.set(bx, topRelY + 0.020, bz);
        topBlade.rotation.y = -bladeAngle + 0.35;
        topBlade.rotation.z = 0.28;
        bayGroup.add(topBlade);

        // Bottom interior rotor blade
        const btmBlade = new THREE.Mesh(bladeGeom, materials.metalMat);
        btmBlade.position.set(bx, btmRelY - 0.010, bz);
        btmBlade.rotation.y = -bladeAngle + 0.35;
        btmBlade.rotation.z = 0.28;
        bayGroup.add(btmBlade);
      }

      // 7. Top & Bottom Protective Wire Finger-Guard Grilles (3 concentric rings + X spokes)
      const spokeGeom = new THREE.BoxGeometry(fanRadius * 1.92, 0.010, 0.010);
      [topRelY + 0.030, btmRelY - 0.020].forEach(guardY => {
        [fanRadius * 0.38, fanRadius * 0.66, fanRadius * 0.92].forEach(ringR => {
          const guardRing = new THREE.TorusGeometry(ringR, 0.009, 6, 28);
          guardRing.rotateX(Math.PI / 2);
          const guardRingMesh = new THREE.Mesh(guardRing, materials.metalMat);
          guardRingMesh.position.set(0, guardY, 0);
          bayGroup.add(guardRingMesh);
        });

        const spoke1 = new THREE.Mesh(spokeGeom, materials.metalMat);
        spoke1.position.set(0, guardY + 0.002, 0);
        spoke1.rotation.y = Math.PI / 4;
        bayGroup.add(spoke1);

        const spoke2 = new THREE.Mesh(spokeGeom, materials.metalMat);
        spoke2.position.set(0, guardY + 0.002, 0);
        spoke2.rotation.y = -Math.PI / 4;
        bayGroup.add(spoke2);
      });

      (bayGroup as any).userData = {
        isProductMesh: true,
        item: {
          instanceId: `roof-fan-${bay.id}`,
          sku: isBuiltIn ? 'BUILTIN-FAN' : 'OPTIONAL-FAN',
          name: isBuiltIn
            ? `מאוורר גג 120 מ״מ מובנה (#${bay.id} מתוך ${builtInFansCount} יח׳ כלולות במפרט)`
            : `מאוורר גג 120 מ״מ (ציוד אופציונלי נוסף)`,
          description: 'מאוורר איוורור תעשייתי עליון 120 מ״מ מותקן בגג הארון לשאיבת חום ויצירת סירקולציית אוויר (סעיף 4 במפרט הטכני).',
          price: 0,
          isIncluded: isBuiltIn,
          type: 'fan',
        },
      };
    } else {
      // ==========================================================
      // EMPTY MARKED FAN BAY (For cabinets without included fans, e.g. wall cabinets)
      // Clearly marked on the exterior roof with square outline, 4 screw holes & circular knockout grille
      // ==========================================================
      // 1. Marked 120x120mm square mounting station outline on top of roof
      const bayOutlineEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(fanOuterSize, 0.008, fanOuterSize)),
        new THREE.LineBasicMaterial({ color: 0x64748b })
      );
      bayOutlineEdges.position.set(0, topRelY + 0.012, 0);
      bayGroup.add(bayOutlineEdges);

      // 2. Circular 120mm fan cutout knockout ring on top of roof & bottom ceiling
      const knockoutRingGeom = new THREE.TorusGeometry(fanRadius, 0.014, 8, 32);
      knockoutRingGeom.rotateX(Math.PI / 2);
      const topKnockoutRing = new THREE.Mesh(knockoutRingGeom, materials.metalMat);
      topKnockoutRing.position.set(0, topRelY + 0.014, 0);
      bayGroup.add(topKnockoutRing);

      const btmKnockoutRing = new THREE.Mesh(knockoutRingGeom, materials.metalMat);
      btmKnockoutRing.position.set(0, btmRelY - 0.012, 0);
      bayGroup.add(btmKnockoutRing);

      // 3. Stamped perforated knockout disc with cross-bridges on top of roof
      const meshDiscGeom = new THREE.CylinderGeometry(fanRadius * 0.96, fanRadius * 0.96, 0.012, 28);
      const meshDisc = new THREE.Mesh(meshDiscGeom, roofGrilleMat);
      meshDisc.position.set(0, topRelY + 0.010, 0);
      bayGroup.add(meshDisc);

      // Crossed sheet-metal knockout tabs indicating fan placement
      const crossTabGeom = new THREE.BoxGeometry(fanRadius * 1.90, 0.008, 0.04);
      const crossTab1 = new THREE.Mesh(crossTabGeom, materials.panelMat);
      crossTab1.position.set(0, topRelY + 0.015, 0);
      bayGroup.add(crossTab1);

      const crossTab2 = new THREE.Mesh(crossTabGeom, materials.panelMat);
      crossTab2.position.set(0, topRelY + 0.015, 0);
      crossTab2.rotation.y = Math.PI / 2;
      bayGroup.add(crossTab2);

      // Center circular knockout stamp ring
      const centerStampGeom = new THREE.TorusGeometry(0.15, 0.010, 6, 20);
      centerStampGeom.rotateX(Math.PI / 2);
      const centerStamp = new THREE.Mesh(centerStampGeom, materials.metalMat);
      centerStamp.position.set(0, topRelY + 0.016, 0);
      bayGroup.add(centerStamp);

      // 4. Four corner pre-drilled screw mounting bosses on top of roof
      const bossGeom = new THREE.CylinderGeometry(0.026, 0.026, 0.014, 10);
      [
        [-screwDist, -screwDist],
        [screwDist, -screwDist],
        [-screwDist, screwDist],
        [screwDist, screwDist],
      ].forEach(([sx, sz]) => {
        const bossMesh = new THREE.Mesh(bossGeom, materials.metalMat);
        bossMesh.position.set(sx, topRelY + 0.012, sz);
        bayGroup.add(bossMesh);
      });

      (bayGroup as any).userData = {
        isProductMesh: true,
        item: {
          instanceId: `roof-fan-bay-${bay.id}`,
          sku: `FAN-BAY-${bay.id}`,
          name: `הכנה למאוורר גג 120 מ״מ (${bay.label}) - מקום מסומן להתקנה`,
          description: 'פתח אוורור ייעודי מסומן בגג הארון עם חורי עיגון מוכנים להתקנת מאוורר 120 מ״מ אופציונלי.',
          price: 0,
          isIncluded: true,
          type: 'active',
        },
      };
    }

    group.add(bayGroup);
  });

  // 3. FOUR CORNER POSTS (Uprights) & FRONT/REAR WELDED STRUCTURAL FRAMES
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

  // 4. SIDE PANELS (Item 2 in PN1274 Schematic: Detachable side panel with 2 top horizontal slide latches + 1 top-center round lock)
  const sideWidth = depthUnits - wallThick * 2;
  const sidePanelHeight = postHeight * 0.98;
  const sideGeom = new THREE.BoxGeometry(0.04, sidePanelHeight, sideWidth);
  const sideMat = (materials.panelMat as THREE.MeshStandardMaterial).clone();
  const chromeMat = materials.railMat || new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.15 });

  const leftSideGroup = new THREE.Group();
  leftSideGroup.name = 'side-panel-left';
  (leftSideGroup as any).userData = { isSidePanel: true, side: 'left' };

  const rightSideGroup = new THREE.Group();
  rightSideGroup.name = 'side-panel-right';
  (rightSideGroup as any).userData = { isSidePanel: true, side: 'right' };

  // Ghost groups for removed side panels (EdgesGeometry dashed lines)
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
    const sideLabelHe = isLeft ? 'שמאל' : 'ימין';
    const panelCenterY = -halfH + baseHeight + postHeight / 2;
    const topHardwareY = halfH - roofHeight - 0.34;
    const outX = sx + (isLeft ? -0.022 : 0.022);

    const sidePanelItem = {
      instanceId: `side-panel-${sideName}`,
      sku: 'SIDE-PANEL-SPCC',
      name: `דופן צד פריקה עם זוג תפסי הזזה ומנעול (צד ${sideLabelHe})`,
      description: 'דופן צדדית מפלדת SPCC ניתנת לפירוק מהיר באמצעות 2 תפסי הזזה עליונים ומנעול מרכזי לתחזוקה וגישה נוחה לחיווט (סעיף 2 במפרט הטכני).',
      price: 0,
      isIncluded: true,
      type: 'panel',
    };

    // Main steel panel mesh
    const sideMesh = new THREE.Mesh(sideGeom, sideMat);
    sideMesh.position.set(sx, panelCenterY, 0);
    sideMesh.receiveShadow = true;
    (sideMesh as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
    targetGroup.add(sideMesh);

    // Top-Center Small Round Key Lock Cylinder (shown between the 2 slide latches on Page 1, 2, 3 of PN1274)
    const lockCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), chromeMat);
    lockCylinder.rotateZ(Math.PI / 2);
    lockCylinder.position.set(outX, topHardwareY, 0);
    (lockCylinder as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
    targetGroup.add(lockCylinder);

    // 2 Horizontal Quick-Release Plastic/Steel Slide Latches on Left & Right of top edge (Page 1, 2, 3 of PN1274)
    const latchOffsetZ = Math.min(sideWidth * 0.30, 1.35);
    [-latchOffsetZ, latchOffsetZ].forEach(lz => {
      // Recessed latch housing bezel
      const latchBezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.14, 0.32),
        materials.rubberMat
      );
      latchBezel.position.set(outX, topHardwareY, lz);
      (latchBezel as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
      targetGroup.add(latchBezel);

      // Sliding finger tab inside the latch bezel
      const latchSlider = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, 0.09, 0.14),
        materials.accentMat
      );
      latchSlider.position.set(outX + (isLeft ? -0.005 : 0.005), topHardwareY, lz + 0.04);
      (latchSlider as any).userData = { isProductMesh: true, item: sidePanelItem, isSidePanel: true, side: sideName };
      targetGroup.add(latchSlider);
    });

    // Ghost: LineSegments (EdgesGeometry of the same box, LineDashedMaterial)
    const ghostEdgesGeom = new THREE.EdgesGeometry(sideGeom);
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
      sideGeom,
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

  // 5. 19-INCH VERTICAL MOUNTING PROFILES (Item 7: 4PCS Mounting profile) & HORIZONTAL MOUNTING ANGLES
  const railPostGeom = new THREE.BoxGeometry(0.18, railHeightUnits, 0.18);
  const railX = RACK_19_WIDTH_UNITS / 2;

  const mountingProfileItem = {
    instanceId: 'mounting-profiles-19-inch',
    sku: 'MOUNTING-PROFILE-19',
    name: 'פרופילי התקנה אנכיים 19 אינץ׳ (4 יח׳ כלולות במפרט)',
    description: '4 עמודי מסילות אנכיים בתקן 19" מפלדת SPCC 2.0 מ״מ עם חורי אום-כלוב מרובעים וסימון יחידות U (סעיף 7 במפרט הטכני).',
    price: 0,
    isIncluded: true,
    type: 'active',
  };

  // Front Rails
  const frontLeftRail = new THREE.Mesh(railPostGeom, materials.railMat);
  frontLeftRail.position.set(-railX, -halfH + baseHeight + railHeightUnits / 2, frontRailZ);
  frontLeftRail.name = 'front-left-rail';
  (frontLeftRail as any).userData = { isProductMesh: true, item: mountingProfileItem };
  group.add(frontLeftRail);

  const frontRightRail = new THREE.Mesh(railPostGeom, materials.railMat);
  frontRightRail.position.set(railX, -halfH + baseHeight + railHeightUnits / 2, frontRailZ);
  frontRightRail.name = 'front-right-rail';
  (frontRightRail as any).userData = { isProductMesh: true, item: mountingProfileItem };
  group.add(frontRightRail);

  // Rear Rails & Slotted Horizontal Depth Mounting Angles (Page 2 Exploded View)
  if (depthUnits >= 3.2) {
    const rearLeftRail = new THREE.Mesh(railPostGeom, materials.railMat);
    rearLeftRail.position.set(-railX, -halfH + baseHeight + railHeightUnits / 2, rearRailZ);
    (rearLeftRail as any).userData = { isProductMesh: true, item: mountingProfileItem };
    group.add(rearLeftRail);

    const rearRightRail = new THREE.Mesh(railPostGeom, materials.railMat);
    rearRightRail.position.set(railX, -halfH + baseHeight + railHeightUnits / 2, rearRailZ);
    (rearRightRail as any).userData = { isProductMesh: true, item: mountingProfileItem };
    group.add(rearRightRail);

    // Horizontal Slotted Depth Mounting Angles connecting the front and rear frames
    // Floor-standing cabinets (totalU >= 20) have 3 mounting angles per side (top, middle, bottom);
    // wall-mounted cabinets have 2 mounting angles per side (top, bottom).
    const braceZDist = Math.max(1.2, depthUnits - wallThick * 2);
    const braceGeom = new THREE.BoxGeometry(0.08, 0.12, braceZDist);
    const angleLevels = totalU >= 20 ? [0.08, 0.50, 0.92] : [0.12, 0.88];
    const slotCount = Math.max(3, Math.floor(braceZDist / 1.1));

    [-railX - 0.11, railX + 0.11].forEach((bx, sideIdx) => {
      const sideLabel = sideIdx === 0 ? 'שמאל' : 'ימין';
      angleLevels.forEach((fraction, lIdx) => {
        const braceY = -halfH + baseHeight + railHeightUnits * fraction;
        const braceMesh = new THREE.Mesh(braceGeom, materials.metalMat);
        braceMesh.position.set(bx, braceY, 0);
        (braceMesh as any).userData = {
          isProductMesh: true,
          item: {
            instanceId: `mounting-angle-${sideIdx}-${lIdx}`,
            sku: 'MOUNTING-ANGLE-SPCC',
            name: `קורת עומק מחורצת לכיוונון מסילות 19" (צד ${sideLabel})`,
            description: 'קורת רוחב/עומק אופקית מפלדת SPCC עם חריצים מוארכים המאפשרים הזזה וכיוונון עומק של עמודי ה-19 אינץ׳.',
            price: 0,
            isIncluded: true,
            type: 'active',
          },
        };
        group.add(braceMesh);

        // Elongated depth-adjustment slots along the horizontal mounting angle
        for (let s = 0; s < slotCount; s++) {
          const sz = -braceZDist * 0.36 + (s / Math.max(1, slotCount - 1)) * (braceZDist * 0.72);
          const slotMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.086, 0.032, 0.34),
            materials.accentMat
          );
          slotMesh.position.set(bx, braceY, sz);
          group.add(slotMesh);
        }
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
  // DOORS (FRONT & REAR) - Reconstructed 1-to-1 with BoostRack PDF Schematics
  // - Single-door models (all 600mm floor & wall racks, e.g. 1274, 114802, 2177, 2066, 114809):
  //   1-piece full-width front door + 1-piece full-width detachable/hinged rear door (or fixed back panel on wall racks).
  // - Double-door models (447510T / 447580T): 2-leaf split French doors.
  // =========================================================================
  const doorsInfo = resolveCabinetDoorsInfo(dims, cabinetData);
  const doorWidth = widthUnits - 0.20;
  const doorHeight = railHeightUnits + 0.10;
  const doorCenterY = (-roofHeight + baseHeight) / 2;
  const doorThick = 0.05;
  const isFloorCabinet = hasWheels || hasFeet || totalU >= 20;

  // Helper to construct door leaf material based on door type (perforated / glass / solid)
  const createDoorMaterial = (doorType: 'perforated' | 'glass' | 'solid', leafWidthUnits: number, leafHeightUnits: number) => {
    if (doorType === 'perforated') {
      const perfTexture = createPerforationTexture();
      if (perfTexture) {
        perfTexture.repeat.set(leafWidthUnits * 3.8, leafHeightUnits * 3.8);
      }
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: perfTexture || null,
        roughness: 0.45,
        metalness: 0.65,
        transparent: false,
        opacity: 1.0,
        side: THREE.DoubleSide,
      });
    }
    if (doorType === 'glass') {
      return new THREE.MeshStandardMaterial({
        color: 0x93c5fd, // Clear tempered glass with subtle tint
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
    }
    // Solid steel door (RAL 9005 matte black SPCC)
    return new THREE.MeshStandardMaterial({
      color: 0x161e2e,
      roughness: 0.38,
      metalness: 0.65,
      transparent: false,
      opacity: 1.0,
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
    description:
      cabinetData?.frontDoor ||
      (doorsInfo.frontDoorType === 'perforated'
        ? 'דלת קדמית יחידה מחוררת (Single Perforated Door) עם מסגרת פלדת SPCC ומנעול (סעיף 6 במפרט הטכני).'
        : 'דלת קדמית זכוכית מחוסמת (Toughened Glass Door) עם מסגרת פלדת SPCC ומנעול (סעיף 6 במפרט הטכני).'),
    price: 0,
    isIncluded: true,
    type: 'door',
  };

  const frontDoorMat = createDoorMaterial(doorsInfo.frontDoorType, doorWidth, doorHeight);
  const frontDoorFrameMat = (materials.frameMat as THREE.MeshStandardMaterial).clone();
  frontDoorFrameMat.transparent = false;
  frontDoorFrameMat.opacity = 1.0;

  if (doorsInfo.hasFrontDoor) {
    const frontHingeX = -halfW + 0.10;
    frontDoorGroup.position.set(frontHingeX, doorCenterY, halfD + 0.03);

    // Solid SPCC perimeter frame with genuine center opening
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

    // Right stile (handle/lock side)
    const frontRightBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, doorOpeningH, doorThick), frontDoorFrameMat);
    frontRightBeam.position.set(doorWidth - frameBorderW / 2, 0, 0);
    (frontRightBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontRightBeam);

    // Center window / single continuous perforated mesh inside the frame opening
    const frontDoorWindow = new THREE.Mesh(
      new THREE.BoxGeometry(doorOpeningW + 0.02, doorOpeningH + 0.02, doorThick * 0.45),
      frontDoorMat
    );
    frontDoorWindow.position.set(doorWidth / 2, 0, 0.002);
    (frontDoorWindow as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorGroup.add(frontDoorWindow);

    // If glass door, add solid ceramic silkscreen border trim on glass inner perimeter
    if (doorsInfo.frontDoorType === 'glass') {
      const ceramicMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const borderThickness = 0.06;
      [-doorOpeningH / 2 + borderThickness / 2, doorOpeningH / 2 - borderThickness / 2].forEach(by => {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(doorOpeningW, borderThickness, doorThick * 0.48), ceramicMat);
        cBeam.position.set(doorWidth / 2, by, 0.003);
        (cBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
        frontDoorGroup.add(cBeam);
      });
      [-doorOpeningW / 2 + borderThickness / 2, doorOpeningW / 2 - borderThickness / 2].forEach(bx => {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, doorOpeningH, doorThick * 0.48), ceramicMat);
        cBeam.position.set(doorWidth / 2 + bx, 0, 0.003);
        (cBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
        frontDoorGroup.add(cBeam);
      });
    }

    // Lock hardware on right stile:
    // Floor-standing models have a vertical swing-handle lock ("with handle lock");
    // Wall-mounted models have a compact round key lock ("with lock").
    if (isFloorCabinet) {
      const frontHandleBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.88, 0.045),
        materials.rubberMat
      );
      frontHandleBase.position.set(doorWidth - frameBorderW / 2, 0, 0.03);
      (frontHandleBase as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorGroup.add(frontHandleBase);

      const frontHandleLever = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.56, 0.055),
        materials.metalMat
      );
      frontHandleLever.position.set(doorWidth - frameBorderW / 2, -0.08, 0.052);
      (frontHandleLever as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorGroup.add(frontHandleLever);

      const frontLockCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.06, 14),
        chromeMat
      );
      frontLockCyl.rotateX(Math.PI / 2);
      frontLockCyl.position.set(doorWidth - frameBorderW / 2, 0.26, 0.048);
      (frontLockCyl as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorGroup.add(frontLockCyl);
    } else {
      const roundLockCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.06, 16),
        chromeMat
      );
      roundLockCyl.rotateX(Math.PI / 2);
      roundLockCyl.position.set(doorWidth - frameBorderW / 2, 0, 0.035);
      (roundLockCyl as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorGroup.add(roundLockCyl);
    }

    // 3 Hinges on left stile for floor racks, 2 for wall racks
    const frontHingeYs = isFloorCabinet
      ? [-doorHeight * 0.38, 0, doorHeight * 0.38]
      : [-doorHeight * 0.34, doorHeight * 0.34];
    frontHingeYs.forEach(hy => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), materials.metalMat);
      hinge.position.set(0, hy, 0);
      (hinge as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorGroup.add(hinge);
    });

    (frontDoorGroup as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    group.add(frontDoorGroup);
  }

  // =========================================================================
  // REAR DOOR OR FIXED WALL-MOUNT BACK PANEL (Item 3 in PN1274 / PN114809 Schematics)
  // =========================================================================
  const hasRearDoor = doorsInfo.hasRearDoor;
  const isRearPerforated = doorsInfo.rearDoorType === 'perforated';
  const isDoubleRear = doorsInfo.isDoubleRear;

  const rearDoorGroup = new THREE.Group();
  rearDoorGroup.name = 'generic-rear-door-group';

  const rearSingleLeafRoot = new THREE.Group();
  rearSingleLeafRoot.name = 'generic-rear-single-leaf';

  const rearLeftLeafRoot = new THREE.Group();
  rearLeftLeafRoot.name = 'generic-rear-left-leaf';

  const rearRightLeafRoot = new THREE.Group();
  rearRightLeafRoot.name = 'generic-rear-right-leaf';

  const rearDoorItem = {
    instanceId: 'generic-rear-door',
    sku: 'DOOR-REAR',
    name: doorsInfo.rearDoorName,
    description:
      cabinetData?.rearDoor ||
      (isRearPerforated
        ? isDoubleRear
          ? 'דלת אחורית כפולה מחוררת 75% עם מנעול'
          : 'דלת אחורית אחידה יחידה מתפרקת מחוררת עם ידית נעילה (3. Back door single perforated door with handle lock).'
        : 'דלת אחורית אחידה יחידה מפלדת SPCC מלאה עם מנעול.'),
    price: 0,
    isIncluded: true,
    type: 'door',
  };

  const innerWidth = doorWidth;
  const leafWidth = isDoubleRear ? innerWidth / 2 - 0.02 : innerWidth;
  const rearDoorMat = isRearPerforated ? createDoorMaterial('perforated', leafWidth, doorHeight) : null;
  const rearDoorFrameMat = (materials.frameMat as THREE.MeshStandardMaterial).clone();
  rearDoorFrameMat.transparent = false;
  rearDoorFrameMat.opacity = 1.0;

  const rearSolidMat = (materials.frameMat as THREE.MeshStandardMaterial).clone();
  rearSolidMat.transparent = false;
  rearSolidMat.opacity = 1.0;

  if (hasRearDoor) {
    const rearZ = -halfD - 0.03;

    if (!isDoubleRear) {
      // =====================================================================
      // SINGLE ONE-PIECE DETACHABLE / HINGED REAR DOOR (1-to-1 with PN1274 #3)
      // "3. Back door single perforated door with handle lock" (or single solid steel door)
      // Full-width single door leaf, NO central split!
      // =====================================================================
      rearSingleLeafRoot.position.set(-innerWidth / 2, doorCenterY, rearZ);

      const frameBorderW = 0.20;
      const frameBorderH = 0.22;
      const singleOpeningW = Math.max(0.2, innerWidth - 2 * frameBorderW);
      const singleOpeningH = Math.max(0.2, doorHeight - 2 * frameBorderH);

      if (isRearPerforated && rearDoorMat) {
        // Solid matte-black SPCC outer perimeter frame (4 beams) + 1 continuous single perforated mesh panel
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(innerWidth, frameBorderH, doorThick), rearDoorFrameMat);
        topBeam.position.set(innerWidth / 2, doorHeight / 2 - frameBorderH / 2, 0);
        (topBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(topBeam);

        const btmBeam = new THREE.Mesh(new THREE.BoxGeometry(innerWidth, frameBorderH, doorThick), rearDoorFrameMat);
        btmBeam.position.set(innerWidth / 2, -doorHeight / 2 + frameBorderH / 2, 0);
        (btmBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(btmBeam);

        const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, singleOpeningH, doorThick), rearDoorFrameMat);
        leftBeam.position.set(frameBorderW / 2, 0, 0);
        (leftBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(leftBeam);

        const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorderW, singleOpeningH, doorThick), rearDoorFrameMat);
        rightBeam.position.set(innerWidth - frameBorderW / 2, 0, 0);
        (rightBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(rightBeam);

        // One-piece full-width perforated mesh sheet in the center
        const singleMeshPanel = new THREE.Mesh(
          new THREE.BoxGeometry(singleOpeningW + 0.02, singleOpeningH + 0.02, doorThick * 0.45),
          rearDoorMat
        );
        singleMeshPanel.position.set(innerWidth / 2, 0, -0.002);
        (singleMeshPanel as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(singleMeshPanel);
      } else {
        // Single one-piece full-width solid steel rear door (e.g. 1174, 117480, 2178, 2068)
        const solidRearPlate = new THREE.Mesh(
          new THREE.BoxGeometry(innerWidth, doorHeight, doorThick),
          rearSolidMat
        );
        solidRearPlate.position.set(innerWidth / 2, 0, 0);
        (solidRearPlate as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(solidRearPlate);
      }

      // 3 Hinges on the left outer edge of the single rear door
      [-doorHeight * 0.38, 0, doorHeight * 0.38].forEach(hy => {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), materials.metalMat);
        hinge.position.set(0, hy, 0);
        (hinge as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearSingleLeafRoot.add(hinge);
      });

      // Vertical swing-handle lock on the right stile of the single rear door (Item 3 in PN1274)
      const rearHandleGroup = new THREE.Group();
      rearHandleGroup.name = 'rear-single-swing-handle';

      const handleEscutcheon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.88, 0.045), materials.rubberMat);
      handleEscutcheon.position.set(0, 0, -0.03);
      rearHandleGroup.add(handleEscutcheon);

      const handleLeverMesh = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.56, 0.055), materials.metalMat);
      handleLeverMesh.position.set(0, -0.08, -0.052);
      rearHandleGroup.add(handleLeverMesh);

      const lockCylinderMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 14), chromeMat);
      lockCylinderMesh.rotateX(Math.PI / 2);
      lockCylinderMesh.position.set(0, 0.26, -0.048);
      rearHandleGroup.add(lockCylinderMesh);

      rearHandleGroup.position.set(innerWidth - frameBorderW / 2, 0, 0);
      (rearHandleGroup as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      rearSingleLeafRoot.add(rearHandleGroup);

      (rearSingleLeafRoot as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      rearDoorGroup.add(rearSingleLeafRoot);
    } else {
      // =====================================================================
      // DOUBLE SPLIT REAR DOOR (Two leaves hinged on outer edges, opening outward)
      // Used ONLY when doorsInfo.isDoubleRear === true
      // =====================================================================
      rearLeftLeafRoot.position.set(-innerWidth / 2, doorCenterY, rearZ);
      rearRightLeafRoot.position.set(innerWidth / 2, doorCenterY, rearZ);

      const frameBorder = 0.22;
      const centerW = Math.max(0.1, leafWidth - 2 * frameBorder);
      const centerH = Math.max(0.1, doorHeight - 2 * frameBorder);

      if (isRearPerforated && rearDoorMat) {
        // Left Perforated Leaf
        const leftTopBeam = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, frameBorder, doorThick), rearDoorFrameMat);
        leftTopBeam.position.set(leafWidth / 2, doorHeight / 2 - frameBorder / 2, 0);
        (leftTopBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftTopBeam);

        const leftBtmBeam = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, frameBorder, doorThick), rearDoorFrameMat);
        leftBtmBeam.position.set(leafWidth / 2, -doorHeight / 2 + frameBorder / 2, 0);
        (leftBtmBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftBtmBeam);

        const leftOuterBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, centerH, doorThick), rearDoorFrameMat);
        leftOuterBeam.position.set(frameBorder / 2, 0, 0);
        (leftOuterBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftOuterBeam);

        const leftInnerBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, centerH, doorThick), rearDoorFrameMat);
        leftInnerBeam.position.set(leafWidth - frameBorder / 2, 0, 0);
        (leftInnerBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftInnerBeam);

        const leftMeshPanel = new THREE.Mesh(new THREE.BoxGeometry(centerW + 0.01, centerH + 0.01, doorThick * 0.45), rearDoorMat);
        leftMeshPanel.position.set(leafWidth / 2, 0, -0.002);
        (leftMeshPanel as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftMeshPanel);

        // Right Perforated Leaf
        const rightTopBeam = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, frameBorder, doorThick), rearDoorFrameMat);
        rightTopBeam.position.set(-leafWidth / 2, doorHeight / 2 - frameBorder / 2, 0);
        (rightTopBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightTopBeam);

        const rightBtmBeam = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, frameBorder, doorThick), rearDoorFrameMat);
        rightBtmBeam.position.set(-leafWidth / 2, -doorHeight / 2 + frameBorder / 2, 0);
        (rightBtmBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightBtmBeam);

        const rightOuterBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, centerH, doorThick), rearDoorFrameMat);
        rightOuterBeam.position.set(-frameBorder / 2, 0, 0);
        (rightOuterBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightOuterBeam);

        const rightInnerBeam = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, centerH, doorThick), rearDoorFrameMat);
        rightInnerBeam.position.set(-leafWidth + frameBorder / 2, 0, 0);
        (rightInnerBeam as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightInnerBeam);

        const rightMeshPanel = new THREE.Mesh(new THREE.BoxGeometry(centerW + 0.01, centerH + 0.01, doorThick * 0.45), rearDoorMat);
        rightMeshPanel.position.set(-leafWidth / 2, 0, -0.002);
        (rightMeshPanel as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightMeshPanel);
      } else {
        // Solid dual leaves
        const leftSolid = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, doorHeight, doorThick), rearSolidMat);
        leftSolid.position.set(leafWidth / 2, 0, 0);
        (leftSolid as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftSolid);

        const rightSolid = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, doorHeight, doorThick), rearSolidMat);
        rightSolid.position.set(-leafWidth / 2, 0, 0);
        (rightSolid as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightSolid);
      }

      // 3 Hinges per leaf
      [-doorHeight * 0.38, 0, doorHeight * 0.38].forEach(hy => {
        const leftHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), materials.metalMat);
        leftHinge.position.set(0, hy, 0);
        (leftHinge as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearLeftLeafRoot.add(leftHinge);

        const rightHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), materials.metalMat);
        rightHinge.position.set(0, hy, 0);
        (rightHinge as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
        rearRightLeafRoot.add(rightHinge);
      });

      // Right leaf swing handle
      const rightHandleGroup = new THREE.Group();
      rightHandleGroup.name = 'rear-right-swing-handle';
      const handleBarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.90, 0.05), materials.metalMat);
      handleBarMesh.position.set(0, 0, -0.03);
      rightHandleGroup.add(handleBarMesh);
      rightHandleGroup.position.set(-leafWidth + 0.14, 0, 0);
      (rightHandleGroup as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      rearRightLeafRoot.add(rightHandleGroup);

      (rearLeftLeafRoot as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
      (rearRightLeafRoot as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };

      rearDoorGroup.add(rearLeftLeafRoot);
      rearDoorGroup.add(rearRightLeafRoot);
    }

    (rearDoorGroup as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    group.add(rearDoorGroup);
  } else {
    // =====================================================================
    // FIXED SOLID BACK PANEL FOR WALL MOUNTING (Item 3 in PN114809: "Fixed back panel (for wall mounting)")
    // No hinges or door handle — fixed structural back plate with wall mounting slots
    // =====================================================================
    const isRearOpenWall = /פתוח/i.test(String(cabinetData?.rearDoor || ''));
    if (!isRearOpenWall) {
      const fixedRearPanelMat = (materials.panelMat as THREE.MeshStandardMaterial).clone();
      const rearPanelMesh = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, doorHeight, doorThick),
        fixedRearPanelMat
      );
      rearPanelMesh.position.set(0, doorCenterY, -halfD - 0.01);
      rearPanelMesh.receiveShadow = true;
      (rearPanelMesh as any).userData = {
        isProductMesh: true,
        isDoor: false,
        item: {
          instanceId: 'fixed-rear-wall-panel',
          sku: 'FIXED-BACK-PANEL',
          name: 'גב פח אחורי אטום קבוע לתליית קיר (Fixed Back Panel)',
          description: 'לוח גב אחורי קבוע מפלדת SPCC עם חורי עיגון לתליית הארון על קיר (סעיף 3 במפרט הטכני - אינו דלת נפתחת).',
          price: 0,
          isIncluded: true,
          type: 'panel',
        },
      };
      group.add(rearPanelMesh);
    }
  }

  // Door state & Cutaway handling
  let currentRearDoorState: DoorLeafState = options?.doorState?.rear || 'closed';
  let isCutawayActive = false;

  const updateRearDoorOpacity = () => {
    if (!hasRearDoor || currentRearDoorState === 'removed') return;
    if (doorsInfo.rearDoorType !== 'perforated') {
      if (isCutawayActive && (currentRearDoorState === 'closed' || currentRearDoorState === 'transparent')) {
        rearSolidMat.opacity = 0.18;
        rearSolidMat.transparent = true;
      } else if (currentRearDoorState === 'transparent') {
        rearSolidMat.opacity = 0.35;
        rearSolidMat.transparent = true;
      } else {
        rearSolidMat.opacity = 1.0;
        rearSolidMat.transparent = false;
      }
    } else if (rearDoorMat) {
      if (isCutawayActive && (currentRearDoorState === 'closed' || currentRearDoorState === 'transparent')) {
        rearDoorMat.opacity = 0.18;
        rearDoorMat.transparent = true;
        rearDoorFrameMat.opacity = 0.22;
        rearDoorFrameMat.transparent = true;
      } else if (currentRearDoorState === 'transparent') {
        rearDoorMat.opacity = 0.32;
        rearDoorMat.transparent = true;
        rearDoorFrameMat.opacity = 0.45;
        rearDoorFrameMat.transparent = true;
      } else {
        // 'closed' or 'open' -> 100% solid SPCC frame & crisp perforated mesh!
        rearDoorMat.opacity = 1.0;
        rearDoorMat.transparent = false;
        rearDoorFrameMat.opacity = 1.0;
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
      const isGlassFront = doorsInfo.frontDoorType === 'glass';
      if (state === 'removed') {
        frontDoorGroup.visible = false;
        setHierarchyRaycast(frontDoorGroup, false);
      } else {
        frontDoorGroup.visible = true;
        setHierarchyRaycast(frontDoorGroup, true);
        if (state === 'open') {
          frontDoorGroup.rotation.y = -Math.PI * 0.58; // swing outward to front
          frontDoorMat.opacity = isGlassFront ? 0.26 : 1.0;
          frontDoorMat.transparent = isGlassFront;
          frontDoorFrameMat.opacity = 1.0;
          frontDoorFrameMat.transparent = false;
        } else if (state === 'closed') {
          frontDoorGroup.rotation.y = 0;
          frontDoorMat.opacity = isGlassFront ? 0.22 : 1.0;
          frontDoorMat.transparent = isGlassFront;
          frontDoorFrameMat.opacity = 1.0;
          frontDoorFrameMat.transparent = false;
        } else {
          // transparent mode
          frontDoorGroup.rotation.y = 0;
          frontDoorMat.opacity = isGlassFront ? 0.12 : 0.32;
          frontDoorMat.transparent = true;
          frontDoorFrameMat.opacity = 0.45;
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
        const angle105 = (105 * Math.PI) / 180;
        if (state === 'open') {
          if (!isDoubleRear) {
            rearSingleLeafRoot.rotation.y = -angle105; // Single one-piece rear door swings open outward
          } else {
            rearLeftLeafRoot.rotation.y = -angle105;
            rearRightLeafRoot.rotation.y = angle105;
          }
        } else {
          rearSingleLeafRoot.rotation.y = 0;
          rearLeftLeafRoot.rotation.y = 0;
          rearRightLeafRoot.rotation.y = 0;
        }
        updateRearDoorOpacity();
      }
    }
  };

  const initialFront = options?.doorState?.front || 'transparent';
  const initialRear = options?.doorState?.rear || 'closed';
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
    setSidePanel,
    doorsInfo,
  };
}
