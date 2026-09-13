import * as THREE from 'three';
import { CabinetDimensions3D } from './Cabinet3DTypes';
import { CabinetMatrixData } from '../../utils/cabinetData';

export const SCALE_MM_TO_UNITS = 0.01; // 1 unit = 100mm (0.1 meter)
export const U_HEIGHT_UNITS = 0.4445; // 44.45mm in 3D units
export const RACK_19_WIDTH_UNITS = 4.826; // 482.6mm standard 19-inch mounting width
export const USABLE_OPENING_WIDTH = 4.50; // 450mm inner aperture

/**
 * Derives verified cabinet dimensions or provides clear schematic fallback
 */
export function resolveCabinetDimensions(
  product: any,
  cabinetData: CabinetMatrixData | null,
  totalU: number
): CabinetDimensions3D {
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

/**
 * Builds the 3D parametric open-cabinet frame
 */
export function buildCabinetFrameGroup(
  dims: CabinetDimensions3D,
  cabinetData: CabinetMatrixData | null,
  materials: {
    frameMat: THREE.Material;
    railMat: THREE.Material;
    panelMat: THREE.Material;
    metalMat: THREE.Material;
    accentMat: THREE.Material;
    rubberMat: THREE.Material;
  }
): {
  group: THREE.Group;
  uCenters: number[]; // Y positions for each U unit center from bottom (U1) to top (Un)
  innerDepthUnits: number;
  stagingTrayGroup?: THREE.Group;
  hasStagingContent?: boolean;
} {
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

  // Roof ventilation grill insert
  const grillGeom = new THREE.BoxGeometry(widthUnits * 0.6, 0.02, depthUnits * 0.5);
  const grillMesh = new THREE.Mesh(grillGeom, materials.panelMat);
  grillMesh.position.set(0, halfH - roofHeight / 2 + 0.02, 0);
  group.add(grillMesh);

  // Roof fans (if included in matrix, e.g. 2 or 4 fans)
  const fansCount = parseInt(cabinetData?.fans || '0', 10);
  if (!isNaN(fansCount) && fansCount > 0) {
    const fanRadius = 0.45; // 90mm diameter fan
    const fanCylGeom = new THREE.CylinderGeometry(fanRadius, fanRadius, 0.08, 24);
    const fanMat = materials.accentMat;
    const fanPositions: [number, number][] = [];
    if (fansCount === 2) {
      fanPositions.push([-widthUnits * 0.18, 0], [widthUnits * 0.18, 0]);
    } else if (fansCount >= 4) {
      fanPositions.push(
        [-widthUnits * 0.18, -depthUnits * 0.14],
        [widthUnits * 0.18, -depthUnits * 0.14],
        [-widthUnits * 0.18, depthUnits * 0.14],
        [widthUnits * 0.18, depthUnits * 0.14]
      );
    } else {
      fanPositions.push([0, 0]);
    }

    fanPositions.forEach(([fx, fz], idx) => {
      const fanGroup = new THREE.Group();
      fanGroup.name = `roof-fan-${idx + 1}`;
      (fanGroup as any).userData = {
        isProductMesh: true,
        item: {
          instanceId: `builtin-fan-${idx + 1}`,
          sku: 'BUILTIN-FAN',
          name: `מאוורר גג (${fansCount} יחידות כלולות)`,
          description: 'מאוורר איוורור עליון הכלול בארון. סידור סכמטי בגג (0U).',
          price: 0,
          isIncluded: true,
          type: 'fan',
        },
      };

      const fanMesh = new THREE.Mesh(fanCylGeom, fanMat);
      fanMesh.position.set(0, 0, 0);
      fanGroup.add(fanMesh);

      // Fan hub / guard ring
      const ringGeom = new THREE.TorusGeometry(fanRadius * 0.85, 0.02, 8, 20);
      ringGeom.rotateX(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeom, materials.metalMat);
      ringMesh.position.set(0, 0.04, 0);
      fanGroup.add(ringMesh);

      // Subtle spinning blade shape inside
      const bladeGeom = new THREE.BoxGeometry(fanRadius * 1.5, 0.015, 0.10);
      const bladeMesh1 = new THREE.Mesh(bladeGeom, materials.frameMat);
      fanGroup.add(bladeMesh1);
      const bladeMesh2 = new THREE.Mesh(bladeGeom, materials.frameMat);
      bladeMesh2.rotation.y = Math.PI / 2;
      fanGroup.add(bladeMesh2);

      fanGroup.position.set(fx, halfH - roofHeight + 0.03, fz);
      group.add(fanGroup);
    });
  }

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
  const sideMat = materials.panelMat;

  // Left side panel
  const leftSide = new THREE.Mesh(sideGeom, sideMat);
  leftSide.position.set(-halfW + 0.02, -halfH + baseHeight + postHeight / 2, 0);
  leftSide.receiveShadow = true;
  group.add(leftSide);

  // Right side panel
  const rightSide = new THREE.Mesh(sideGeom, sideMat);
  rightSide.position.set(halfW - 0.02, -halfH + baseHeight + postHeight / 2, 0);
  rightSide.receiveShadow = true;
  group.add(rightSide);

  // Rear panel (perforated / tinted so inside is visible)
  const rearWidth = widthUnits - wallThick * 2;
  const rearGeom = new THREE.BoxGeometry(rearWidth, postHeight * 0.98, 0.04);
  const rearMesh = new THREE.Mesh(rearGeom, sideMat);
  rearMesh.position.set(0, -halfH + baseHeight + postHeight / 2, -halfD + 0.02);
  group.add(rearMesh);

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
  const uTextureCache = new Map<number, THREE.CanvasTexture>();
  const getUTexture = (uNum: number) => {
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
  const wheelsCount = parseInt(cabinetData?.wheels || '0', 10);
  const feetCount = parseInt(cabinetData?.levelingFeet || '0', 10);
  const hasWheels = (!isNaN(wheelsCount) && wheelsCount > 0) || (Boolean(cabinetData?.wheels) && cabinetData?.wheels !== 'X' && cabinetData?.wheels !== '0');
  const hasFeet = (!isNaN(feetCount) && feetCount > 0) || (Boolean(cabinetData?.levelingFeet) && cabinetData?.levelingFeet !== 'X' && cabinetData?.levelingFeet !== '0');

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
        sku: 'BUILTIN-WHEELS',
        name: `גלגלי נסיעה כבדים (${wheelsCount || 4} יח׳ כלולות)`,
        description: isStaging
          ? 'ערכת גלגלים כלולה בתכולת הארון (במגש ציוד נלווה למניעת הרכבה מומצאת).'
          : 'גלגלי נסיעה מסיביים מותקנים בבסיס הארון להסעה ושינוע נוח (כלול בארון).',
        price: 0,
        isIncluded: true,
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
        sku: 'BUILTIN-FEET',
        name: `רגליות פילוס מתכווננות (${feetCount || 4} יח׳ כלולות)`,
        description: isStaging
          ? 'ערכת רגליות פילוס כלולה בתכולת הארון (במגש תכולה סמוך למניעת הרכבה כפולה מומצאת).'
          : 'רגליות פילוס ואיזון מותקנות בבסיס הארון ליציבות מרבית ומניעת רעידות (כלול בארון).',
        price: 0,
        isIncluded: true,
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

  // Dedicated staging tray for unmounted included items and 0U hardware
  const stagingTrayGroup = new THREE.Group();
  stagingTrayGroup.name = 'cabinet-staging-tray-palette';
  const trayWidth = 1.6;
  const trayDepth = 1.6;
  const trayHeight = 0.05;
  const trayX = halfW + 1.25;
  const trayY = -halfH - 0.22;
  const trayZ = 0;
  stagingTrayGroup.position.set(trayX, trayY, trayZ);

  // Tray platform mesh
  const trayGeom = new THREE.BoxGeometry(trayWidth, trayHeight, trayDepth);
  const trayMesh = new THREE.Mesh(trayGeom, materials.panelMat);
  trayMesh.receiveShadow = true;
  stagingTrayGroup.add(trayMesh);

  // Tray border rim
  const rimGeom = new THREE.BoxGeometry(trayWidth + 0.04, 0.04, 0.04);
  const frontRim = new THREE.Mesh(rimGeom, materials.accentMat);
  frontRim.position.set(0, 0.04, trayDepth / 2);
  stagingTrayGroup.add(frontRim);
  const backRim = new THREE.Mesh(rimGeom, materials.accentMat);
  backRim.position.set(0, 0.04, -trayDepth / 2);
  stagingTrayGroup.add(backRim);

  // Metallic badge on front of staging tray
  const plaqueGeom = new THREE.BoxGeometry(0.9, 0.06, 0.02);
  const plaqueMesh = new THREE.Mesh(plaqueGeom, materials.railMat);
  plaqueMesh.position.set(0, 0.03, trayDepth / 2 + 0.02);
  (plaqueMesh as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'staging-tray-plaque',
      sku: 'STAGING-TRAY',
      name: 'מגש תכולת מארז וציוד נלווה (כלול בארון)',
      description: 'אזור סמוך להצגת אביזרים וחלקי תכולה כלולים ללא המצאת הרכבה פיזית שגויה.',
      price: 0,
      isIncluded: true,
      type: 'active',
    },
  };
  stagingTrayGroup.add(plaqueMesh);

  let hasStagingContent = false;

  if (hasWheels && hasFeet) {
    // Both are included in matrix: mount wheels on base, place feet on adjacent staging tray!
    cornerOffsets.forEach(([cx, cz], idx) => {
      const wheelGroup = createWheelGroup(idx, cx, -halfH - 0.22, cz, false);
      group.add(wheelGroup);
    });

    // Place 4 leveling feet in a neat 2x2 layout on the staging tray
    const feetStagingOffsets = [
      [-0.4, -0.4],
      [0.4, -0.4],
      [-0.4, 0.4],
      [0.4, 0.4],
    ];
    feetStagingOffsets.forEach(([sx, sz], idx) => {
      const footGroup = createFootGroup(idx, sx, 0.08, sz, true);
      stagingTrayGroup.add(footGroup);
    });
    hasStagingContent = true;

  } else if (hasWheels) {
    // Only wheels included: mount on base corners
    cornerOffsets.forEach(([cx, cz], idx) => {
      const wheelGroup = createWheelGroup(idx, cx, -halfH - 0.22, cz, false);
      group.add(wheelGroup);
    });
  } else if (hasFeet) {
    // Only feet included: mount on base corners
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

  // Add staging tray to group
  group.add(stagingTrayGroup);

  return {
    group,
    uCenters,
    innerDepthUnits,
    stagingTrayGroup,
    hasStagingContent,
  };
}
