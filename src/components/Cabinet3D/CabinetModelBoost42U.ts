import * as THREE from 'three';
import { CabinetDimensions3D, DoorLeafState, DoorState } from './Cabinet3DTypes';
import { CabinetMatrixData, parseAccessoryCount } from '../../utils/cabinetData';
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
 * High-fidelity 3D simulation strictly built according to the official manufacturer specification:
 * Boost RackMount - מפרט ארונות 42U (Pages 1-3: 2178 600x600 & 2068 600x800)
 */

export function buildBoost42UCabinetGroup(
  dims: CabinetDimensions3D,
  cabinetData: CabinetMatrixData | null,
  materials: {
    frameMat: THREE.Material;
    railMat: THREE.Material;
    panelMat: THREE.Material;
    metalMat: THREE.Material;
    accentMat: THREE.Material;
    rubberMat: THREE.Material;
    shelfMat?: THREE.Material;
    includedShelfMat?: THREE.Material;
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
  group.name = 'cabinet-boost-42u-root';

  // EXACT DIMENSIONS FROM TECHNICAL SPECIFICATION PDF:
  // 42U, Width: 600mm, Depth: 600/800/1000mm, Frame Height: 2000mm
  const widthUnits = (dims.widthMm || 600) * SCALE_MM_TO_UNITS;
  const depthUnits = (dims.depthMm || 1000) * SCALE_MM_TO_UNITS;
  const totalU = 42;
  const railHeightUnits = totalU * U_HEIGHT_UNITS; // 42 * 0.4445 = 18.669 units (matches 1866.9mm rail)
  const roofHeight = 0.40; // 40mm top canopy
  const baseHeight = 0.45; // 45mm base plinth
  const frameHeightUnits = 20.00; // 2000mm outer frame height

  const halfW = widthUnits / 2;
  const halfD = depthUnits / 2;
  const halfH = frameHeightUnits / 2; // 10.00

  // 19" Vertical Rail positions:
  // 482.6mm (4.826 units) outer spacing, 450mm (4.50 units) usable opening
  const railX = RACK_19_WIDTH_UNITS / 2; // 2.413 units
  const frontRailZ = halfD - 0.70; // 70mm front recess
  const rearRailZ = -halfD + 0.80; // 80mm rear recess
  const innerDepthUnits = Math.abs(frontRailZ - rearRailZ);

  // Bottom of U1
  const u1BottomY = -halfH + baseHeight;
  const uCenters: number[] = [];
  for (let u = 1; u <= totalU; u++) {
    const centerY = u1BottomY + (u - 0.5) * U_HEIGHT_UNITS;
    uCenters.push(centerY);
  }

  // PBR Materials for Boost SPCC Cold Rolled Steel
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x17191d, // Deep RAL9005 industrial powder coat
    roughness: 0.50,
    metalness: 0.40,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Galvanized / zinc plated steel
    roughness: 0.20,
    metalness: 0.90,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // 5.0mm Toughened glass
    roughness: 0.10,
    metalness: 0.85,
    transparent: true,
    opacity: 0.32,
  });

  const perfVentMat = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    roughness: 0.65,
    metalness: 0.30,
  });

  // =========================================================================
  // 1. BASE PLINTH & BOTTOM COVER (Page 2 Item 2, Page 3 Item 8, 15)
  // SPCC 1.2mm Cold rolled steel bottom panel
  // =========================================================================
  const baseGeom = new THREE.BoxGeometry(widthUnits, baseHeight, depthUnits);
  const baseMesh = new THREE.Mesh(baseGeom, steelMat);
  baseMesh.position.set(0, -halfH + baseHeight / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  baseMesh.name = 'boost-42u-bottom-panel';
  (baseMesh as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'bottom-panel-boost-42u',
      sku: 'SPCC-BASE-42U',
      name: 'פנל בסיס תחתון SPCC 1.2mm (כלול בארון)',
      description: 'בסיס ארון מסיבי מפלדה מעורגלת קר SPCC 1.2 מ״מ עם פתחי כבילה וצלעות חיזוק לעומס סטטי של עד 800 ק״ג.',
      price: 0,
      isIncluded: true,
      type: 'active',
    },
  };
  group.add(baseMesh);

  // Bottom cable entry cover board (Page 3 Item 15)
  const bottomCableBoardGeom = new THREE.BoxGeometry(widthUnits * 0.45, 0.03, depthUnits * 0.28);
  const bottomCableBoard = new THREE.Mesh(bottomCableBoardGeom, chromeMat);
  bottomCableBoard.position.set(0, -halfH + baseHeight + 0.015, -depthUnits * 0.15);
  (bottomCableBoard as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'bottom-cable-board-boost-42u',
      sku: 'CABLE-BOARD-BTM',
      name: 'מכסה פתח כבילה תחתון (כלול בארון)',
      description: 'מכסה פלדה מודולרי בבסיס הארון לכניסת כבלי תקשורת והזנה מהרצפה (Item 15 Bottom Cover Board).',
      price: 0,
      isIncluded: true,
      type: 'hardware',
    },
  };
  group.add(bottomCableBoard);

  // =========================================================================
  // 2. ROOF CANOPY & TOP COVER (Page 2 Item 1, Page 3 Item 3, 4)
  // SPCC 1.2mm Cold rolled steel top cover
  // =========================================================================
  const roofGeom = new THREE.BoxGeometry(widthUnits, roofHeight, depthUnits);
  const roofMesh = new THREE.Mesh(roofGeom, steelMat);
  roofMesh.position.set(0, halfH - roofHeight / 2, 0);
  roofMesh.castShadow = true;
  roofMesh.name = 'boost-42u-top-cover';
  (roofMesh as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'top-cover-boost-42u',
      sku: 'SPCC-TOP-42U',
      name: 'גג עליון SPCC 1.2mm (כלול בארון)',
      description: 'גג עליון מחורר לאיוורור פסיבי עם פתחי כבילה מודולריים ומקום ליחידת מאווררים (Item 1 Top Cover).',
      price: 0,
      isIncluded: true,
      type: 'active',
    },
  };
  group.add(roofMesh);

  // Boost brand nameplate badge on the front face of the top header bar
  const headerBadgeMesh = createBoostHeaderBadgeMesh(
    widthUnits - 0.28,
    roofHeight,
    halfH - roofHeight / 2,
    halfD,
    steelMat
  );
  group.add(headerBadgeMesh);

  // Top cable entry cover board (Page 3 Item 4 & 17)
  const topCoverBoardGeom = new THREE.BoxGeometry(widthUnits * 0.45, 0.016, 0.55);
  const topCoverBoard = new THREE.Mesh(topCoverBoardGeom, steelMat);
  topCoverBoard.position.set(0, halfH + 0.008, -halfD + 0.45);
  (topCoverBoard as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'top-cover-board-boost-42u',
      sku: 'CABLE-BOARD-TOP',
      name: 'מכסה כבילה עליון עם ברגי M4*8 (כלול בארון)',
      description: 'פלטת כיסוי עליונה מודולרית לכניסת כבלים מהתקרה מקובעת בברגי M4*8 (Item 4 Top Cover Board).',
      price: 0,
      isIncluded: true,
      type: 'hardware',
    },
  };
  group.add(topCoverBoard);

  // =========================================================================
  // 3. FLUSH ROOF VENTILATION GRILLE & INTERIOR CEILING FAN UNIT (Page 2 Items 7, 8)
  // Respects exact datasheet fan count: 2 fans for 600x600 (2178) or 4 fans for 600x800 (2068)
  // =========================================================================
  const builtInFans = parseAccessoryCount(cabinetData?.fans) || (depthUnits >= 7.5 ? 4 : 2);
  const totalFans = builtInFans + (options?.additionalFansCount || 0);
  const isFourFans = totalFans > 2 || builtInFans > 2;

  const ventGrilleW = Math.min(widthUnits * 0.56, 3.30);
  const ventGrilleD = isFourFans ? Math.min(depthUnits * 0.46, 3.20) : Math.min(depthUnits * 0.30, 1.75);
  const roofPerfTex = createPerforationTexture();
  if (roofPerfTex) {
    roofPerfTex.repeat.set(ventGrilleW * 4.5, ventGrilleD * 4.5);
  }
  const roofGrilleMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    map: roofPerfTex || null,
    roughness: 0.55,
    metalness: 0.55,
  });
  const roofGrilleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(ventGrilleW, 0.012, ventGrilleD),
    roofGrilleMat
  );
  roofGrilleMesh.position.set(0, halfH + 0.006, 0.15);
  group.add(roofGrilleMesh);

  // Modular Fan Unit Tray mounted INSIDE ceiling below roof
  const roofCeilingY = halfH - roofHeight;
  const fanUnitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(ventGrilleW + 0.24, 0.04, ventGrilleD + 0.24),
    steelMat
  );
  fanUnitMesh.position.set(0, roofCeilingY - 0.02, 0.15);
  (fanUnitMesh as any).userData = {
    isProductMesh: true,
    item: {
      instanceId: 'fan-unit-tray-boost-42u',
      sku: 'FAN-UNIT-42U',
      name: `יחידת מאווררי תקרה SPCC 1.2mm (${builtInFans} מאווררים כלולים)`,
      description: `מגש פלדה מובנה בתקרת הארון (Item 7 Fan Unit) המאכלס ${builtInFans} מאווררים תעשייתיים לשאיבת חום.`,
      price: 0,
      isIncluded: true,
      type: 'fan',
    },
  };
  group.add(fanUnitMesh);

  const fanPositions = isFourFans
    ? [
        { x: -0.72, z: 0.15 + 0.72, label: 'קדמי-שמאל' },
        { x: 0.72, z: 0.15 + 0.72, label: 'קדמי-ימין' },
        { x: -0.72, z: 0.15 - 0.72, label: 'אחורי-שמאל' },
        { x: 0.72, z: 0.15 - 0.72, label: 'אחורי-ימין' },
      ]
    : [
        { x: -0.72, z: 0.15, label: 'שמאל' },
        { x: 0.72, z: 0.15, label: 'ימין' },
      ];

  const fanMidY = (halfH + roofCeilingY) / 2;
  const topRelY = halfH - fanMidY;
  const btmRelY = roofCeilingY - fanMidY;
  const fullSpanH = halfH - roofCeilingY;
  const darkWellMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85, metalness: 0.2 });

  fanPositions.forEach((fp, idx) => {
    const fanGroup = new THREE.Group();
    fanGroup.name = `boost-42u-fan-${idx + 1}`;
    fanGroup.position.set(fp.x, fanMidY, fp.z);

    // 120mm Square Housing penetrating roof so it is visible from top exterior & bottom ceiling
    const fanBoxGeom = new THREE.BoxGeometry(1.18, fullSpanH + 0.032, 1.18);
    const fanBox = new THREE.Mesh(fanBoxGeom, steelMat);
    fanBox.position.set(0, 0.004, 0);
    fanGroup.add(fanBox);

    // Dark Circular Turbine Well
    const fanHoleGeom = new THREE.CylinderGeometry(0.50, 0.50, fullSpanH + 0.036, 28);
    const fanHole = new THREE.Mesh(fanHoleGeom, darkWellMat);
    fanHole.position.set(0, 0.004, 0);
    fanGroup.add(fanHole);

    // Top & Bottom Intake Bezels
    const bezelGeom = new THREE.TorusGeometry(0.50, 0.018, 8, 28);
    bezelGeom.rotateX(Math.PI / 2);
    const topBezel = new THREE.Mesh(bezelGeom, materials.accentMat);
    topBezel.position.set(0, topRelY + 0.024, 0);
    fanGroup.add(topBezel);

    const btmBezel = new THREE.Mesh(bezelGeom, chromeMat);
    btmBezel.position.set(0, btmRelY - 0.016, 0);
    fanGroup.add(btmBezel);

    // Rotor Hub & 7 Blades on top & bottom
    const rotorHubGeom = new THREE.CylinderGeometry(0.16, 0.16, fullSpanH + 0.044, 16);
    const rotorHub = new THREE.Mesh(rotorHubGeom, chromeMat);
    rotorHub.position.set(0, 0.004, 0);
    fanGroup.add(rotorHub);

    const bladeGeom = new THREE.BoxGeometry(0.30, 0.022, 0.11);
    for (let b = 0; b < 7; b++) {
      const angle = (b * Math.PI * 2) / 7;
      const bx = Math.cos(angle) * 0.27;
      const bz = Math.sin(angle) * 0.27;

      const topBlade = new THREE.Mesh(bladeGeom, chromeMat);
      topBlade.position.set(bx, topRelY + 0.020, bz);
      topBlade.rotation.y = -angle + 0.35;
      topBlade.rotation.z = 0.28;
      fanGroup.add(topBlade);

      const btmBlade = new THREE.Mesh(bladeGeom, chromeMat);
      btmBlade.position.set(bx, btmRelY - 0.010, bz);
      btmBlade.rotation.y = -angle + 0.35;
      btmBlade.rotation.z = 0.28;
      fanGroup.add(btmBlade);
    }

    // Metallic Finger Guard concentric rings & spokes on top exterior & bottom ceiling
    const spokeGeom = new THREE.BoxGeometry(0.96, 0.010, 0.010);
    [topRelY + 0.030, btmRelY - 0.020].forEach(gy => {
      [0.19, 0.33, 0.46].forEach(r => {
        const ringGeom = new THREE.TorusGeometry(r, 0.009, 6, 24);
        ringGeom.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeom, chromeMat);
        ring.position.set(0, gy, 0);
        fanGroup.add(ring);
      });

      const sp1 = new THREE.Mesh(spokeGeom, chromeMat);
      sp1.position.set(0, gy + 0.002, 0);
      sp1.rotation.y = Math.PI / 4;
      fanGroup.add(sp1);

      const sp2 = new THREE.Mesh(spokeGeom, chromeMat);
      sp2.position.set(0, gy + 0.002, 0);
      sp2.rotation.y = -Math.PI / 4;
      fanGroup.add(sp2);
    });

    (fanGroup as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `roof-fan-boost-42u-${idx + 1}`,
        sku: 'FAN-120-38',
        name: `מאוורר גג תעשייתי 120*120*38 מ״מ (#${idx + 1} מתוך ${builtInFans} - ${fp.label})`,
        description: 'מאוורר איוורור תעשייתי עליון 120*120*38 מ״מ מובנה בגג הארון לשאיבת חום שרתים וציוד תקשורת.',
        price: 0,
        isIncluded: true,
        type: 'fan',
      },
    };
    group.add(fanGroup);
  });

  // =========================================================================
  // 4. STRUCTURAL FRAMES (2 PCS) & 4 CORNER POSTS (Page 2 Item 6; Page 3 Item 6)
  // SPCC 1.2mm Welded Front & Rear Frames
  // =========================================================================
  const postHeight = frameHeightUnits - roofHeight - baseHeight;
  const postThick = 0.14; // 14mm formed hollow corner post
  const postGeom = new THREE.BoxGeometry(postThick, postHeight, postThick);

  const cornerPositions = [
    [-halfW + postThick / 2, -halfD + postThick / 2], // Rear-Left
    [halfW - postThick / 2, -halfD + postThick / 2],  // Rear-Right
    [-halfW + postThick / 2, halfD - postThick / 2],  // Front-Left
    [halfW - postThick / 2, halfD - postThick / 2],   // Front-Right
  ];

  cornerPositions.forEach(([cx, cz], idx) => {
    const postMesh = new THREE.Mesh(postGeom, steelMat);
    postMesh.position.set(cx, -halfH + baseHeight + postHeight / 2, cz);
    postMesh.castShadow = true;
    (postMesh as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `corner-post-${idx + 1}-boost-42u`,
        sku: 'SPCC-FRAME-POST',
        name: 'עמוד שלד פינתי מחוזק SPCC 1.2mm (כלול בארון)',
        description: 'עמוד שלד ראשי מעורגל ומכופף בדיוק גבוה לחיזוק מבנה הארון ועמידה בעומסים של עד 800 ק״ג (Item 6 Frame).',
        price: 0,
        isIncluded: true,
        type: 'active',
      },
    };
    group.add(postMesh);
  });

  // Upper & Lower Horizontal Beams connecting corner posts
  const frontTopBeam = new THREE.Mesh(new THREE.BoxGeometry(widthUnits, 0.12, postThick), steelMat);
  frontTopBeam.position.set(0, halfH - roofHeight - 0.06, halfD - postThick / 2);
  group.add(frontTopBeam);

  const rearTopBeam = new THREE.Mesh(new THREE.BoxGeometry(widthUnits, 0.12, postThick), steelMat);
  rearTopBeam.position.set(0, halfH - roofHeight - 0.06, -halfD + postThick / 2);
  group.add(rearTopBeam);

  // =========================================================================
  // 5. 19" VERTICAL MOUNTING PROFILES (4 PCS) (Page 2 Item 3; Page 3 Item 9)
  // SPCC 2.0mm Heavy-duty uprights with EIA-310-D holes & U numbers
  // =========================================================================
  const railProfileThick = 0.04;
  const railFlangeWidth = 0.18;
  const railPostGeom = new THREE.BoxGeometry(railFlangeWidth, railHeightUnits, railProfileThick);

  // Front Left & Right Rails
  const frontLeftRail = new THREE.Mesh(railPostGeom, materials.railMat);
  frontLeftRail.position.set(-railX, -halfH + baseHeight + railHeightUnits / 2, frontRailZ);
  frontLeftRail.name = 'boost-42u-front-left-rail';
  group.add(frontLeftRail);

  const frontRightRail = new THREE.Mesh(railPostGeom, materials.railMat);
  frontRightRail.position.set(railX, -halfH + baseHeight + railHeightUnits / 2, frontRailZ);
  frontRightRail.name = 'boost-42u-front-right-rail';
  group.add(frontRightRail);

  // Rear Left & Right Rails
  const rearLeftRail = new THREE.Mesh(railPostGeom, materials.railMat);
  rearLeftRail.position.set(-railX, -halfH + baseHeight + railHeightUnits / 2, rearRailZ);
  rearLeftRail.name = 'boost-42u-rear-left-rail';
  group.add(rearLeftRail);

  const rearRightRail = new THREE.Mesh(railPostGeom, materials.railMat);
  rearRightRail.position.set(railX, -halfH + baseHeight + railHeightUnits / 2, rearRailZ);
  rearRightRail.name = 'boost-42u-rear-right-rail';
  group.add(rearRightRail);

  const profileItemData = {
    instanceId: 'mounting-profiles-42u',
    sku: 'MOUNTING-PROFILE-2.0',
    name: 'פרופילי עמודים 19 אינץ׳ SPCC 2.0mm (4 יח׳ כלולות)',
    description: '4 עמודי מסילות אנכיים בתקן 19" ברוחב 482.6 מ״מ ועובי פלדה 2.0 מ״מ עם סימוני U וחורי כלוב מרובעים (Item 3 Mounting Profile).',
    price: 0,
    isIncluded: true,
    type: 'active',
  };
  (frontLeftRail as any).userData = { isProductMesh: true, item: profileItemData };
  (frontRightRail as any).userData = { isProductMesh: true, item: profileItemData };
  (rearLeftRail as any).userData = { isProductMesh: true, item: profileItemData };
  (rearRightRail as any).userData = { isProductMesh: true, item: profileItemData };

  // =========================================================================
  // 6. MOUNTING ANGLES (6 PCS) - HORIZONTAL DEPTH RAILS (Page 2 Item 4; Page 3 Item 7)
  // SPCC 1.2mm, exactly 6 PCS for 42U (3 per side: Lower, Middle, Upper)
  // Elongated depth adjustment slots allowing vertical rails to slide
  // =========================================================================
  const braceSpanZ = Math.abs((halfD - postThick) - (-halfD + postThick));
  const braceGeom = new THREE.BoxGeometry(0.08, 0.12, braceSpanZ);
  const braceZMid = 0;

  // 3 Height levels for 42U: 15% (lower), 50% (middle), 85% (upper)
  const angleFractions = [0.15, 0.50, 0.85];
  const angleLabels = ['תחתונה', 'מרכזית', 'עליונה'];

  [-halfW + 0.35, halfW - 0.35].forEach((bx, sideIdx) => {
    const sideName = sideIdx === 0 ? 'שמאל' : 'ימין';
    angleFractions.forEach((fraction, levelIdx) => {
      const braceY = -halfH + baseHeight + railHeightUnits * fraction;
      const braceMesh = new THREE.Mesh(braceGeom, materials.metalMat);
      braceMesh.position.set(bx, braceY, braceZMid);

      // Elongated adjustment slots along depth
      [-2.2, -1.1, 0, 1.1, 2.2].forEach(sz => {
        const slotCutout = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.45), materials.accentMat);
        slotCutout.position.set(bx, braceY, sz);
        group.add(slotCutout);
      });

      (braceMesh as any).userData = {
        isProductMesh: true,
        item: {
          instanceId: `mounting-angle-${sideIdx}-${levelIdx}-boost-42u`,
          sku: 'MOUNTING-ANGLE-1.2',
          name: `קורת עומק Mounting Angle SPCC 1.2mm (${sideName} ${angleLabels[levelIdx]})`,
          description: 'קורת עומק אופקית מפלדה 1.2 מ״מ עם חריצי כיוונון להזזת פרופילי ה-19" קדימה ואחורה (Item 4 Mounting Angle, 6 יח׳ ב-42U).',
          price: 0,
          isIncluded: true,
          type: 'active',
        },
      };
      group.add(braceMesh);
    });
  });

  // =========================================================================
  // 7. HIGH-CONTRAST U NUMBER BADGES & TICKS ON FRONT RAILS (U1 to U42)
  // =========================================================================
  const tickGeom = new THREE.BoxGeometry(0.07, 0.015, 0.02);
  const labelPlaneGeom = new THREE.PlaneGeometry(0.30, U_HEIGHT_UNITS * 0.60);

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
        ctx.strokeStyle = '#22c55e'; // Boost signature green border
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
    const yTick = u1BottomY + u * U_HEIGHT_UNITS;
    const yCenter = uCenters[u - 1];

    [-railX, railX].forEach(rx => {
      const tick = new THREE.Mesh(tickGeom, materials.accentMat);
      tick.position.set(rx, yTick, frontRailZ + 0.08);
      group.add(tick);
    });

    const uTex = getUTexture(u);
    const uLabelMat = new THREE.MeshBasicMaterial({ map: uTex, toneMapped: false });

    const leftLabelMesh = new THREE.Mesh(labelPlaneGeom, uLabelMat);
    leftLabelMesh.position.set(-railX - 0.20, yCenter, frontRailZ + 0.082);
    group.add(leftLabelMesh);

    const rightLabelMesh = new THREE.Mesh(labelPlaneGeom, uLabelMat);
    rightLabelMesh.position.set(railX + 0.20, yCenter, frontRailZ + 0.082);
    group.add(rightLabelMesh);
  }

  // =========================================================================
  // 8. 4x SWIVEL CASTORS & 4x M10 ADJUSTABLE LEVELING FEET (Page 2 Items 14, 15; Page 3 Items 13, 14)
  // Maximum Static Loading Capacity: 800KGS
  // =========================================================================
  const wheelOffsets = [
    [-halfW + 0.38, -halfD + 0.40],
    [halfW - 0.38, -halfD + 0.40],
    [-halfW + 0.38, halfD - 0.40],
    [halfW - 0.38, halfD - 0.40],
  ];

  wheelOffsets.forEach(([cx, cz], idx) => {
    // Heavy Duty Swivel Wheel (Item 15)
    const wheelGroup = new THREE.Group();
    wheelGroup.name = `boost-42u-wheel-${idx + 1}`;
    wheelGroup.position.set(cx, -halfH - 0.22, cz);

    const forkGeom = new THREE.BoxGeometry(0.18, 0.22, 0.18);
    const fork = new THREE.Mesh(forkGeom, chromeMat);
    fork.position.set(0, 0.11, 0);
    wheelGroup.add(fork);

    const wheelGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeom, materials.rubberMat);
    wheel.position.set(0, 0, 0);
    wheel.castShadow = true;
    wheelGroup.add(wheel);

    (wheelGroup as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `wheel-${idx + 1}-boost-42u`,
        sku: 'CASTOR-WHEEL-HD',
        name: `גלגל נסיעה כבד Swivel Castor (#${idx + 1})`,
        description: 'גלגל נסיעה מסיבי לשינוע קל של ארון התקשורת עם מעצור ותקן עומס תעשייתי (Item 15 Wheels).',
        price: 0,
        isIncluded: true,
        type: 'active',
      },
    };
    group.add(wheelGroup);

    // M10 Adjustable Leveling Foot (Item 14)
    const footGroup = new THREE.Group();
    footGroup.name = `boost-42u-leveling-foot-${idx + 1}`;
    footGroup.position.set(cx * 0.76, -halfH - 0.14, cz * 0.76);

    const padGeom = new THREE.CylinderGeometry(0.22, 0.26, 0.10, 16);
    const pad = new THREE.Mesh(padGeom, materials.rubberMat);
    footGroup.add(pad);

    const stemGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12);
    const stem = new THREE.Mesh(stemGeom, chromeMat);
    stem.position.set(0, 0.10, 0);
    footGroup.add(stem);

    const hexNutGeom = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 6);
    const hexNut = new THREE.Mesh(hexNutGeom, chromeMat);
    hexNut.position.set(0, 0.14, 0);
    footGroup.add(hexNut);

    (footGroup as any).userData = {
      isProductMesh: true,
      item: {
        instanceId: `leveling-foot-${idx + 1}-boost-42u`,
        sku: 'M10-ADJUSTABLE-FOOT',
        name: `רגלית פילוס מתכווננת M10 (#${idx + 1})`,
        description: 'רגלית פילוס מפלדה מגולוונת עם הברגת M10 וכרית גומי לעמידה בעומס סטטי של עד 800 ק״ג (Item 14 M10 Adjustable feet).',
        price: 0,
        isIncluded: true,
        type: 'active',
      },
    };
    group.add(footGroup);
  });

  // =========================================================================
  // 9. FRONT GLASS DOOR WITH HANDLE LOCK (Page 1 Photo, Page 2 Items 5, 11; Page 3 Item 1)
  // SPCC 1.2 frame + 5.0mm Toughened Glass + Galvanized Handle Lock + 2 keys
  // =========================================================================
  const doorWidth = widthUnits - 0.18; // ~580mm
  const doorHeight = railHeightUnits + 0.14; // ~1880mm
  const doorCenterY = (-roofHeight + baseHeight) / 2;
  const doorThick = 0.06;

  const frontDoorRoot = new THREE.Group();
  frontDoorRoot.name = 'boost-42u-front-door-root';

  // Front Door Leaf hinged on left edge
  const frontDoorLeaf = new THREE.Group();
  frontDoorLeaf.name = 'boost-42u-front-door-leaf';
  const frontHingeX = -halfW + 0.09;
  frontDoorLeaf.position.set(frontHingeX, doorCenterY, halfD + 0.035);

  const frontDoorItem = {
    instanceId: 'front-glass-door-boost-42u',
    sku: 'DOOR-GLASS-42U',
    name: 'דלת קדמית זכוכית מחוסמת 5 מ״מ עם מנעול ידית (כלול בארון)',
    description: 'דלת קדמית עם חלון זכוכית מחוסמת 5.0 מ״מ, מסגרת פלדה SPCC 1.2 מ״מ עם פתחי איוורור צידיים ומנעול ידית מגולוון עם 2 מפתחות (Item 5 & 11).',
    price: 0,
    isIncluded: true,
    type: 'door',
  };

  const frontDoorFrameMat = (steelMat as THREE.MeshStandardMaterial).clone();
  frontDoorFrameMat.transparent = true;
  frontDoorFrameMat.opacity = 0.40;

  const frontDoorGlassMat = (glassMat as THREE.MeshStandardMaterial).clone();
  frontDoorGlassMat.transparent = true;
  frontDoorGlassMat.opacity = 0.30;

  // Frame Top & Bottom Beams
  const doorHBeamGeom = new THREE.BoxGeometry(doorWidth, 0.22, doorThick);
  const frontDoorTopBeam = new THREE.Mesh(doorHBeamGeom, frontDoorFrameMat);
  frontDoorTopBeam.position.set(doorWidth / 2, doorHeight / 2 - 0.11, 0);
  (frontDoorTopBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(frontDoorTopBeam);

  const frontDoorBtmBeam = new THREE.Mesh(doorHBeamGeom, frontDoorFrameMat);
  frontDoorBtmBeam.position.set(doorWidth / 2, -doorHeight / 2 + 0.11, 0);
  (frontDoorBtmBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(frontDoorBtmBeam);

  // Side Beveled Profiles with Decorative Airflow Perforations (Page 1 Photo)
  const sideBeamW = 0.22;
  const sideBeamGeom = new THREE.BoxGeometry(sideBeamW, doorHeight - 0.44, doorThick);

  const leftSideBeam = new THREE.Mesh(sideBeamGeom, frontDoorFrameMat);
  leftSideBeam.position.set(sideBeamW / 2, 0, 0);
  (leftSideBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(leftSideBeam);

  const rightSideBeam = new THREE.Mesh(sideBeamGeom, frontDoorFrameMat);
  rightSideBeam.position.set(doorWidth - sideBeamW / 2, 0, 0);
  (rightSideBeam as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(rightSideBeam);

  // Curved Vent Strips on Sides (Page 1 Photo)
  [-1, 1].forEach(sideDir => {
    const ventX = sideDir === -1 ? sideBeamW / 2 : doorWidth - sideBeamW / 2;
    for (let vy = -doorHeight * 0.35; vy <= doorHeight * 0.35; vy += 0.50) {
      const ventSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, doorThick + 0.01), perfVentMat);
      ventSlot.position.set(ventX, vy, 0);
      (ventSlot as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
      frontDoorLeaf.add(ventSlot);
    }
  });

  // 5.0mm Toughened Glass Window Center Panel
  const glassWidth = doorWidth - sideBeamW * 2 + 0.04;
  const glassHeight = doorHeight - 0.44 + 0.04;
  const glassGeom = new THREE.BoxGeometry(glassWidth, glassHeight, 0.05);
  const glassMesh = new THREE.Mesh(glassGeom, frontDoorGlassMat);
  glassMesh.position.set(doorWidth / 2, 0, 0);
  (glassMesh as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(glassMesh);

  // Handle Lock for Front Door (Item 11, Galvanized with swing lever & 2 keys)
  const lockEscutcheon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.10, 0.07), chromeMat);
  lockEscutcheon.position.set(doorWidth - 0.16, 0, 0.04);
  (lockEscutcheon as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(lockEscutcheon);

  // Swing Handle Lever
  const handleLever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), chromeMat);
  handleLever.position.set(doorWidth - 0.16, -0.15, 0.08);
  (handleLever as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(handleLever);

  // Keyhole
  const keyHole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12), materials.accentMat);
  keyHole.rotateX(Math.PI / 2);
  keyHole.position.set(doorWidth - 0.16, 0.32, 0.08);
  (keyHole as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
  frontDoorLeaf.add(keyHole);

  // Heavy-duty Steel Pin Hinges (Left side)
  [-doorHeight * 0.40, doorHeight * 0.40].forEach(hy => {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), chromeMat);
    hinge.position.set(0, hy, 0);
    (hinge as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };
    frontDoorLeaf.add(hinge);
  });

  (frontDoorLeaf as any).userData = { isProductMesh: true, isDoor: true, item: frontDoorItem };

  frontDoorRoot.add(frontDoorLeaf);
  group.add(frontDoorRoot);

  // =========================================================================
  // 10. REAR SHEET STEEL DOOR WITH ROUND LOCK (Page 2 Items 10, 12; Page 3 Item 5)
  // SPCC 1.2mm Sheet Steel + Small round lock with 2 keys
  // =========================================================================
  const rearDoorRoot = new THREE.Group();
  rearDoorRoot.name = 'boost-42u-rear-door-root';

  const rearDoorLeaf = new THREE.Group();
  rearDoorLeaf.name = 'boost-42u-rear-door-leaf';
  const rearHingeX = -halfW + 0.09;
  rearDoorLeaf.position.set(rearHingeX, doorCenterY, -halfD - 0.035);

  const rearDoorItem = {
    instanceId: 'rear-steel-door-boost-42u',
    sku: 'DOOR-REAR-STEEL-42U',
    name: 'דלת אחורית מפלדה עם מנעול עגול (כלול בארון)',
    description: 'דלת אחורית עשויה פח פלדה SPCC 1.2 מ״מ מלא עם מנעול עגול מגולוון ו-2 מפתחות (Item 10 & 12).',
    price: 0,
    isIncluded: true,
    type: 'door',
  };

  const rearDoorSteelMat = (steelMat as THREE.MeshStandardMaterial).clone();
  rearDoorSteelMat.transparent = true;
  rearDoorSteelMat.opacity = 0.40;

  const rearDoorPlate = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, doorThick),
    rearDoorSteelMat
  );
  rearDoorPlate.position.set(doorWidth / 2, 0, 0);
  (rearDoorPlate as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
  rearDoorLeaf.add(rearDoorPlate);

  // Small Round Lock (Item 12, Small round lock for rear door with 2 keys)
  const roundLockCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16),
    chromeMat
  );
  roundLockCylinder.rotateX(Math.PI / 2);
  roundLockCylinder.position.set(doorWidth - 0.20, 0, -0.04);
  (roundLockCylinder as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
  rearDoorLeaf.add(roundLockCylinder);

  const roundKeyhole = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.05, 0.09),
    materials.accentMat
  );
  roundKeyhole.position.set(doorWidth - 0.20, 0, -0.04);
  (roundKeyhole as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
  rearDoorLeaf.add(roundKeyhole);

  // Rear Hinges
  [-doorHeight * 0.40, doorHeight * 0.40].forEach(hy => {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), chromeMat);
    hinge.position.set(0, hy, 0);
    (hinge as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
    rearDoorLeaf.add(hinge);
  });

  (rearDoorLeaf as any).userData = { isProductMesh: true, isDoor: true, item: rearDoorItem };
  rearDoorRoot.add(rearDoorLeaf);
  group.add(rearDoorRoot);

  // Door Mode Controls
  const setHierarchyRaycast = (obj: THREE.Object3D, enabled: boolean) => {
    obj.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.raycast = enabled ? THREE.Mesh.prototype.raycast : () => {};
      }
    });
  };

  let currentRearState: DoorLeafState = options?.doorState?.rear || 'closed';
  let isCutaway = false;

  const updateRearDoorOpacity = () => {
    if (currentRearState === 'removed') return;
    if (isCutaway) {
      rearDoorSteelMat.opacity = 0.15;
      rearDoorSteelMat.transparent = true;
    } else {
      if (currentRearState === 'closed') {
        rearDoorSteelMat.opacity = 0.95;
        rearDoorSteelMat.transparent = false;
      } else if (currentRearState === 'transparent') {
        rearDoorSteelMat.opacity = 0.38;
        rearDoorSteelMat.transparent = true;
      } else if (currentRearState === 'open') {
        rearDoorSteelMat.opacity = 0.90;
        rearDoorSteelMat.transparent = false;
      }
    }
  };

  const setDoorMode = (side: 'front' | 'rear', state: DoorLeafState) => {
    if (side === 'front') {
      if (state === 'removed') {
        frontDoorRoot.visible = false;
        setHierarchyRaycast(frontDoorRoot, false);
      } else {
        frontDoorRoot.visible = true;
        setHierarchyRaycast(frontDoorRoot, true);
        if (state === 'open') {
          frontDoorLeaf.rotation.y = -Math.PI * 0.58; // Swing open outward to the front
          frontDoorFrameMat.opacity = 0.95;
          frontDoorFrameMat.transparent = false;
          frontDoorGlassMat.opacity = 0.85;
          frontDoorGlassMat.transparent = false;
        } else if (state === 'closed') {
          frontDoorLeaf.rotation.y = 0;
          frontDoorFrameMat.opacity = 0.95;
          frontDoorFrameMat.transparent = false;
          frontDoorGlassMat.opacity = 0.70;
          frontDoorGlassMat.transparent = true;
        } else {
          // 'transparent'
          frontDoorLeaf.rotation.y = 0;
          frontDoorFrameMat.opacity = 0.40;
          frontDoorFrameMat.transparent = true;
          frontDoorGlassMat.opacity = 0.28;
          frontDoorGlassMat.transparent = true;
        }
      }
    } else {
      // 'rear'
      currentRearState = state;
      if (state === 'removed') {
        rearDoorRoot.visible = false;
        setHierarchyRaycast(rearDoorRoot, false);
      } else {
        rearDoorRoot.visible = true;
        setHierarchyRaycast(rearDoorRoot, true);
        if (state === 'open') {
          rearDoorLeaf.rotation.y = Math.PI * 0.58; // Swing open outward behind the cabinet
        } else {
          rearDoorLeaf.rotation.y = 0;
        }
        updateRearDoorOpacity();
      }
    }
  };

  const setRearCutaway = (active: boolean) => {
    isCutaway = active;
    updateRearDoorOpacity();
  };

  const initialFront = options?.doorState?.front || 'transparent';
  const initialRear = options?.doorState?.rear || 'closed';
  setDoorMode('front', initialFront);
  setDoorMode('rear', initialRear);

  // =========================================================================
  // 11. DETACHABLE SIDE PANELS (2 PCS) (Page 2 Item 9; Page 3 Item 2, 20)
  // SPCC 1.0mm Removable Side Doors with L-Type Quick Release Latches
  // =========================================================================
  const sideWidth = depthUnits - 0.35; // ~965mm
  const sideHeight = railHeightUnits;
  const sidePanelGeom = new THREE.BoxGeometry(0.04, sideHeight, sideWidth);

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
    const sideName = isLeft ? 'שמאל' : 'ימין';
    const sideDir: 'left' | 'right' = isLeft ? 'left' : 'right';
    const sidePanel = new THREE.Mesh(sidePanelGeom, steelMat);
    sidePanel.position.set(sx, doorCenterY, 0);

    const sideItemData = {
      instanceId: `side-panel-${isLeft ? 'left' : 'right'}-boost-42u`,
      sku: 'SIDE-PANEL-1.0',
      name: `דלת צד פריקה SPCC 1.0mm (דופן ${sideName})`,
      description: 'דופן צדדית מפח פלדה 1.0 מ״מ ניתנת לפירוק מהיר בלחיצה לתחזוקה וסלילת כבילה (Item 9 Side Panel).',
      price: 0,
      isIncluded: true,
      type: 'panel',
    };
    (sidePanel as any).userData = { isProductMesh: true, item: sideItemData, isSidePanel: true, side: sideDir };
    targetGroup.add(sidePanel);

    // Lock cylinder on side panel
    const sideLock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), chromeMat);
    sideLock.rotateZ(Math.PI / 2);
    sideLock.position.set(sx + (isLeft ? -0.02 : 0.02), halfH - roofHeight - 0.45, 0);
    (sideLock as any).userData = { isProductMesh: true, item: sideItemData, isSidePanel: true, side: sideDir };
    targetGroup.add(sideLock);

    // Quick release finger latches (Page 3 Item 20, L Type Side Door Baffle)
    [-sideWidth * 0.32, sideWidth * 0.32].forEach(lz => {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.12), chromeMat);
      latch.position.set(sx, halfH - roofHeight - 0.70, lz);
      (latch as any).userData = { isProductMesh: true, item: sideItemData, isSidePanel: true, side: sideDir };
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
    ghostLines.position.set(sx, doorCenterY, 0);
    (ghostLines as any).userData = { isSidePanelGhost: true, side: sideDir };
    targetGhostGroup.add(ghostLines);

    // Invisible thin box helper mesh to ensure reliable raycasting
    const ghostRaycastHelper = new THREE.Mesh(
      sidePanelGeom,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ghostRaycastHelper.position.set(sx, doorCenterY, 0);
    (ghostRaycastHelper as any).userData = { isSidePanelGhost: true, side: sideDir };
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
  // 12. 20 SETS M6 SCREWS & SQUARE CAGE NUTS KIT BOX (Page 2 Item 13; Page 3 Items 18, 19)
  // Placed visibly on the bottom plinth tray
  // =========================================================================
  const kitGroup = new THREE.Group();
  kitGroup.name = 'boost-42u-m6-cage-nuts-kit';
  kitGroup.position.set(-0.8, -halfH + baseHeight + 0.24, 0.6);

  const kitBoxGeom = new THREE.BoxGeometry(1.4, 0.40, 1.0);
  const kitBoxMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Boost blue accessories packaging box
    roughness: 0.75,
    metalness: 0.10,
  });
  const kitBox = new THREE.Mesh(kitBoxGeom, kitBoxMat);
  kitBox.castShadow = true;
  kitGroup.add(kitBox);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 256;
  const lCtx = labelCanvas.getContext('2d');
  if (lCtx) {
    lCtx.fillStyle = '#ffffff';
    lCtx.fillRect(0, 0, 512, 256);
    lCtx.fillStyle = '#0c2d57';
    lCtx.fillRect(8, 8, 496, 240);
    lCtx.fillStyle = '#ffffff';
    lCtx.font = 'bold 36px sans-serif';
    lCtx.textAlign = 'center';
    lCtx.fillText('20x M6 CAGE NUTS KIT', 256, 75);
    lCtx.fillStyle = '#22c55e';
    lCtx.font = 'bold 28px sans-serif';
    lCtx.fillText('SCREWS & SQUARE NUTS', 256, 125);
    lCtx.fillStyle = '#94a3b8';
    lCtx.font = '22px monospace';
    lCtx.fillText('BOOST RACKMOUNT 42U', 256, 185);
  }
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.8),
    new THREE.MeshBasicMaterial({ map: labelTex })
  );
  labelMesh.position.set(0, 0.205, 0);
  labelMesh.rotateX(-Math.PI / 2);
  kitGroup.add(labelMesh);

  const kitItemData = {
    instanceId: 'cage-nuts-20-kit-boost-42u',
    sku: 'M6-CAGE-NUTS-20',
    name: '20 סטים ברגים ואומי כלוב M6 (כלול בארון)',
    description: 'ערכת התקנה מקורית של 20 סטים ברגי M6 מגולוונים, אומי כלוב מרובעים ודיסקיות פלסטיק (Item 13 & 19).',
    price: 0,
    isIncluded: true,
    type: 'hardware',
  };
  (kitBox as any).userData = { isProductMesh: true, item: kitItemData };
  (labelMesh as any).userData = { isProductMesh: true, item: kitItemData };
  (kitGroup as any).userData = { isProductMesh: true, item: kitItemData };
  group.add(kitGroup);

  // =========================================================================
  // 13. GROUNDING KIT (Page 3 Item 21, Cages for Grounding)
  // Copper busbar and safety green-yellow grounding wires
  // =========================================================================
  const groundBarItem = {
    instanceId: 'grounding-kit-boost-42u',
    sku: 'GROUND-KIT-42U',
    name: 'סט הארקה והגנה מפני זרמים תועים (כלול בארון)',
    description: 'מוט הארקה וכבלי סיכוך תקניים צהוב-ירוק לחיבור והארקת שלד הארון והדלתות (Item 21 Cages for Grounding).',
    price: 0,
    isIncluded: true,
    type: 'hardware',
  };

  const groundRodGeom = new THREE.CylinderGeometry(0.035, 0.035, 3.8, 12);
  groundRodGeom.rotateZ(Math.PI / 2);
  const groundRodMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Copper / brass
    roughness: 0.35,
    metalness: 0.85,
  });
  const groundRod = new THREE.Mesh(groundRodGeom, groundRodMat);
  groundRod.position.set(0, -halfH + baseHeight + 0.12, -halfD + 1.1);
  (groundRod as any).userData = { isProductMesh: true, item: groundBarItem };
  group.add(groundRod);

  const wireMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
  [-1.4, 1.4].forEach(wx => {
    const wireGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.1, 8);
    const wire = new THREE.Mesh(wireGeom, wireMat);
    wire.position.set(wx, -halfH + baseHeight + 0.40, -halfD + 0.95);
    (wire as any).userData = { isProductMesh: true, item: groundBarItem };
    group.add(wire);
  });

  const doorsInfo = resolveCabinetDoorsInfo(dims, cabinetData);

  return {
    group,
    uCenters,
    innerDepthUnits,
    doorsGroup: frontDoorRoot,
    setDoorMode,
    setRearCutaway,
    setSidePanel,
    doorsInfo,
  };
}
