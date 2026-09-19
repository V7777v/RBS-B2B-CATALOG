import * as THREE from 'three';
import { CabinetDimensions3D, DoorLeafState, DoorState } from './Cabinet3DTypes';
import { CabinetMatrixData } from '../../utils/cabinetData';
import {
  BuildCabinetFrameOptions,
  CabinetDoorsInfo,
  U_HEIGHT_UNITS,
  RACK_19_WIDTH_UNITS,
} from './CabinetModelBuilder';
import { createBoostHeaderBadgeMesh } from './BoostRackMountLogo';

/**
 * Builds the verified 3D digital-twin model for SKU 221221:
 * "Boost RackMount - 4U Single Section Wall Cabinet (550x400x200mm)"
 * Accurately reconstructed from the manufacturer technical specification blueprint (Page 2):
 * 1. Mounting plate (2 PCS, SPCC 0.8mm)
 * 2. Top cover (1 PCS, SPCC 0.8mm) with circular fan cutout for 120mm fan + cable knockout
 * 3. Side doors (2 PCS, SPCC 0.8mm) detachable with upper/lower louvers and quick-release lock
 * 4. Structural Frame (2 PCS, SPCC 1.0mm)
 * 5. Mounting rails (2 PCS, SPCC 1.2mm) 19" 4U with cage nut holes
 * 6. Bottom panel (1 PCS, SPCC 0.8mm) with cable entry
 * 7. Toughened glass Door (1 PCS, SPCC 1.0mm frame / 4.0mm glass) with small round lock
 * 8. Back panel (SPCC 0.8mm) with 4 wall-mounting keyholes and cable knockout
 * 9. Boost RackMount logo in the top-right corner of the front header
 */
export function build221221CabinetGroup(
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
  options?: BuildCabinetFrameOptions & { doorState?: DoorState }
): {
  group: THREE.Group;
  uCenters: number[];
  innerDepthUnits: number;
  doorsGroup?: THREE.Group;
  setDoorMode?: (side: 'front' | 'rear', state: DoorLeafState) => void;
  setRearCutaway?: (active: boolean) => void;
  doorsInfo?: CabinetDoorsInfo;
} {
  const group = new THREE.Group();
  group.name = 'cabinet-221221-root';

  // EXACT DIMENSIONS FROM TECHNICAL SPECIFICATION BLUEPRINT:
  // 4U, Width: 550mm, Depth: 400mm, Height: 200mm
  const widthUnits = 5.50; // 550mm
  const depthUnits = 4.00; // 400mm
  const totalU = 4;
  const railHeightUnits = totalU * U_HEIGHT_UNITS; // 4 * 0.4445 = 1.778 units
  const roofHeight = 0.20; // 20mm
  const baseHeight = 0.20; // 20mm
  const frameHeightUnits = 2.18; // ~218mm outer cabinet height

  const halfW = widthUnits / 2; // 2.75
  const halfD = depthUnits / 2; // 2.00
  const halfH = frameHeightUnits / 2; // 1.09

  // 19" Vertical Rail positions: standard 450mm usable opening, 482.6mm outer spacing
  const railX = RACK_19_WIDTH_UNITS / 2; // 2.413 units
  const frontRailZ = halfD - 0.50; // 50mm front recess
  const rearRailZ = -halfD + 0.60; // 60mm from rear panel
  const innerDepthUnits = Math.abs(frontRailZ - rearRailZ);

  // Bottom of U1
  const u1BottomY = -halfH + baseHeight;
  const uCenters: number[] = [];
  for (let u = 1; u <= totalU; u++) {
    const centerY = u1BottomY + (u - 0.5) * U_HEIGHT_UNITS;
    uCenters.push(centerY);
  }

  // PBR SPCC Cold Rolled Steel Materials (RAL 9005 Black)
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x18191c, // RAL 9005 Black powder-coat
    roughness: 0.52,
    metalness: 0.45,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Galvanized zinc-plated 19" rails
    roughness: 0.22,
    metalness: 0.88,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x111827,
    roughness: 0.05,
    metalness: 0.10,
    transmission: 0.88,
    transparent: true,
    opacity: 0.35,
    ior: 1.52,
  });

  // =========================================================================
  // 1. STRUCTURAL FRAMES (Item 4: Frame 2 PCS, SPCC 1.0mm)
  // Front and rear welded rectangular structural frames
  // =========================================================================
  const postThick = 0.08;
  const frameGeometry = new THREE.BoxGeometry(postThick, frameHeightUnits, postThick);

  // 4 Main corner vertical posts
  const postPositions: [number, number][] = [
    [-halfW + postThick / 2, halfD - postThick / 2],
    [halfW - postThick / 2, halfD - postThick / 2],
    [-halfW + postThick / 2, -halfD + postThick / 2],
    [halfW - postThick / 2, -halfD + postThick / 2],
  ];

  postPositions.forEach(([px, pz]) => {
    const postMesh = new THREE.Mesh(frameGeometry, steelMat);
    postMesh.position.set(px, 0, pz);
    (postMesh as any).userData = { isCabinetStructure: true };
    group.add(postMesh);
  });

  // Front Header (Top beam)
  const headerGeom = new THREE.BoxGeometry(widthUnits, roofHeight, postThick);
  const frontHeaderMesh = new THREE.Mesh(headerGeom, steelMat);
  frontHeaderMesh.position.set(0, halfH - roofHeight / 2, halfD - postThick / 2);
  (frontHeaderMesh as any).userData = { isCabinetStructure: true };
  group.add(frontHeaderMesh);

  // Boost brand nameplate badge on the front face of the top header bar (FRAME group child)
  // Right-aligned: right edge at (innerWidth/2 - 0.12); centered on header bar height; z = header front surface + 0.01
  const headerBadgeMesh = createBoostHeaderBadgeMesh(
    widthUnits - postThick * 2,
    roofHeight,
    halfH - roofHeight / 2,
    halfD,
    steelMat
  );
  group.add(headerBadgeMesh);

  // Front Threshold (Bottom beam)
  const thresholdGeom = new THREE.BoxGeometry(widthUnits, baseHeight, postThick);
  const frontThresholdMesh = new THREE.Mesh(thresholdGeom, steelMat);
  frontThresholdMesh.position.set(0, -halfH + baseHeight / 2, halfD - postThick / 2);
  (frontThresholdMesh as any).userData = { isCabinetStructure: true };
  group.add(frontThresholdMesh);

  // =========================================================================
  // 2. TOP COVER (Item 2: Top 1 PCS, SPCC 0.8mm)
  // With circular fan cutout (120mm) + cable entry knockout plate
  // =========================================================================
  const topPlateGeom = new THREE.BoxGeometry(widthUnits, 0.03, depthUnits);
  const topPlateMesh = new THREE.Mesh(topPlateGeom, steelMat);
  topPlateMesh.position.set(0, halfH - 0.015, 0);
  (topPlateMesh as any).userData = { isCabinetStructure: true };
  group.add(topPlateMesh);

  // Circular fan cutout & grille on the roof (Page 2 blueprint: circular fan cutout)
  const fanHoleRadius = 0.55; // ~110mm fan intake
  const fanRingGeom = new THREE.RingGeometry(0.12, fanHoleRadius, 32);
  const fanRingMesh = new THREE.Mesh(
    fanRingGeom,
    new THREE.MeshStandardMaterial({
      color: 0x090d14,
      roughness: 0.7,
      metalness: 0.6,
      side: THREE.DoubleSide,
    })
  );
  fanRingMesh.rotation.x = -Math.PI / 2;
  fanRingMesh.position.set(0, halfH + 0.002, 0.20);
  group.add(fanRingMesh);

  // Concentric wire grille rings & spokes
  [0.22, 0.35, 0.48].forEach(r => {
    const ringWire = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.01, r + 0.01, 32),
      chromeMat
    );
    ringWire.rotation.x = -Math.PI / 2;
    ringWire.position.set(0, halfH + 0.003, 0.20);
    group.add(ringWire);
  });

  // Top cable entry knockout plate with screws (Page 2 blueprint: rectangular plate)
  const cableEntryGeom = new THREE.BoxGeometry(2.40, 0.015, 0.70);
  const cableEntryMesh = new THREE.Mesh(cableEntryGeom, steelMat);
  cableEntryMesh.position.set(0, halfH + 0.005, -halfD + 0.65);
  (cableEntryMesh as any).userData = { isCabinetStructure: true };
  group.add(cableEntryMesh);

  // =========================================================================
  // 3. BOTTOM PANEL (Item 6: Bottom 1 PCS, SPCC 0.8mm)
  // With knockout cable entry plate
  // =========================================================================
  const bottomPlateGeom = new THREE.BoxGeometry(widthUnits, 0.03, depthUnits);
  const bottomPlateMesh = new THREE.Mesh(bottomPlateGeom, steelMat);
  bottomPlateMesh.position.set(0, -halfH + 0.015, 0);
  (bottomPlateMesh as any).userData = { isCabinetStructure: true };
  group.add(bottomPlateMesh);

  const bottomCableEntry = new THREE.Mesh(cableEntryGeom, steelMat);
  bottomCableEntry.position.set(0, -halfH - 0.005, -halfD + 0.65);
  (bottomCableEntry as any).userData = { isCabinetStructure: true };
  group.add(bottomCableEntry);

  // =========================================================================
  // 4. BACK PANEL (Installing back panel: SPCC 0.8mm)
  // Wall-mounting panel with 4 keyhole slots and wall cable entry
  // =========================================================================
  const backPanelGeom = new THREE.BoxGeometry(widthUnits - 0.04, frameHeightUnits - 0.04, 0.03);
  const backPanelMesh = new THREE.Mesh(backPanelGeom, steelMat);
  backPanelMesh.position.set(0, 0, -halfD + 0.015);
  (backPanelMesh as any).userData = { isCabinetStructure: true, isDoor: false };
  group.add(backPanelMesh);

  // 4 Keyhole wall mounting slots (Page 2 & 3: wall mounting holes)
  const keyholeOffsetW = halfW - 0.40;
  const keyholeOffsetH = halfH - 0.35;
  const keyholeGeom = new THREE.BoxGeometry(0.12, 0.22, 0.005);
  const keyholeMat = new THREE.MeshBasicMaterial({ color: 0x05070a });

  [
    [-keyholeOffsetW, keyholeOffsetH],
    [keyholeOffsetW, keyholeOffsetH],
    [-keyholeOffsetW, -keyholeOffsetH],
    [keyholeOffsetW, -keyholeOffsetH],
  ].forEach(([kx, ky]) => {
    const kh = new THREE.Mesh(keyholeGeom, keyholeMat);
    kh.position.set(kx, ky, -halfD + 0.032);
    group.add(kh);
  });

  // =========================================================================
  // 5. SIDE DOORS (Item 3: Side door 2 PCS, SPCC 0.8mm)
  // Detachable side panels with upper & lower louvers and center release lock
  // =========================================================================
  const sideWidth = depthUnits - postThick * 2;
  const sideHeight = frameHeightUnits - roofHeight - baseHeight;
  const sideGeom = new THREE.BoxGeometry(0.02, sideHeight, sideWidth);

  // Left and Right side panels
  [-1, 1].forEach(side => {
    const sideX = side * (halfW - 0.01);
    const sideMesh = new THREE.Mesh(sideGeom, steelMat);
    sideMesh.position.set(sideX, 0, 0);
    (sideMesh as any).userData = { isCabinetStructure: true };
    group.add(sideMesh);

    // Center circular latch/lock
    const lockGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16);
    const lockMesh = new THREE.Mesh(lockGeom, chromeMat);
    lockMesh.rotation.z = Math.PI / 2;
    lockMesh.position.set(side * (halfW + 0.01), 0, 0);
    group.add(lockMesh);

    // Upper and lower ventilation slot decals/cutouts
    [-0.50, 0.50].forEach(slotYOffset => {
      const ventGeom = new THREE.BoxGeometry(0.005, 0.16, sideWidth * 0.65);
      const ventMesh = new THREE.Mesh(
        ventGeom,
        new THREE.MeshBasicMaterial({ color: 0x0a0c10 })
      );
      ventMesh.position.set(side * (halfW + 0.005), slotYOffset, 0);
      group.add(ventMesh);
    });
  });

  // =========================================================================
  // 6. 19" VERTICAL MOUNTING RAILS (Item 5: Mounting rail 2 PCS, SPCC 1.2mm)
  // 4U labeled markers (U1..U4) with cage nut square holes
  // =========================================================================
  const railProfileW = 0.12;
  const railProfileD = 0.12;
  const railGeom = new THREE.BoxGeometry(railProfileW, railHeightUnits, railProfileD);

  [-1, 1].forEach(side => {
    const rx = side * railX;
    const railMesh = new THREE.Mesh(railGeom, chromeMat);
    railMesh.position.set(rx, 0, frontRailZ);
    (railMesh as any).userData = { isCabinetStructure: true };
    group.add(railMesh);

    // Square Cage Nut holes along the 4U rail face
    for (let u = 1; u <= totalU; u++) {
      const uCenter = uCenters[u - 1];
      [-0.14, 0, 0.14].forEach(offset => {
        const holeGeom = new THREE.BoxGeometry(0.03, 0.03, 0.01);
        const holeMesh = new THREE.Mesh(
          holeGeom,
          new THREE.MeshBasicMaterial({ color: 0x111317 })
        );
        holeMesh.position.set(rx, uCenter + offset, frontRailZ + railProfileD / 2 + 0.002);
        group.add(holeMesh);
      });
    }
  });

  // Horizontal depth mounting brackets (Item 1: Mounting plate 2 PCS)
  [-1, 1].forEach(side => {
    const bracketGeom = new THREE.BoxGeometry(0.04, 0.06, depthUnits * 0.70);
    const bracketMesh = new THREE.Mesh(bracketGeom, chromeMat);
    bracketMesh.position.set(side * (railX + 0.10), uCenters[0] - 0.20, 0);
    group.add(bracketMesh);

    const bracketTopMesh = new THREE.Mesh(bracketGeom, chromeMat);
    bracketTopMesh.position.set(side * (railX + 0.10), uCenters[3] + 0.20, 0);
    group.add(bracketTopMesh);
  });

  // =========================================================================
  // 8. TOUGHENED GLASS FRONT DOOR (Item 7: Toughened glass Door 1 PCS, SPCC 1.0mm frame / 4.0mm glass)
  // With small round lock and key on the right side, left hinges
  // =========================================================================
  const doorsGroup = new THREE.Group();
  doorsGroup.name = 'cabinet-221221-doors-root';
  group.add(doorsGroup);

  const doorWidth = widthUnits - postThick * 2 + 0.04;
  const doorHeight = frameHeightUnits - roofHeight - baseHeight + 0.02;
  const doorThick = 0.03;

  // Front Door Pivot Group (Left Hinge)
  const frontHingeX = -halfW + 0.08;
  const frontDoorPivot = new THREE.Group();
  frontDoorPivot.name = 'front-door-pivot';
  frontDoorPivot.position.set(frontHingeX, 0, halfD + 0.015);
  doorsGroup.add(frontDoorPivot);

  // Door leaf container inside pivot
  const doorLeafGroup = new THREE.Group();
  doorLeafGroup.position.set(doorWidth / 2, 0, 0);
  frontDoorPivot.add(doorLeafGroup);

  const frontDoorItem221221 = {
    instanceId: 'door-front-221221',
    sku: '221221-FRONT-DOOR',
    name: 'דלת קדמית זכוכית מחוסמת 4.0 מ״מ עם מנעול עגול (כלול בארון)',
    price: 0,
    isIncluded: true,
  };

  // Left and Right SPCC 1.0mm frame borders
  const frameBorderW = 0.28;
  const leftBorderGeom = new THREE.BoxGeometry(frameBorderW, doorHeight, doorThick);
  const leftBorderMesh = new THREE.Mesh(leftBorderGeom, steelMat);
  leftBorderMesh.position.set(-doorWidth / 2 + frameBorderW / 2, 0, 0);
  (leftBorderMesh as any).userData = {
    isProductMesh: true,
    isDoor: true,
    item: frontDoorItem221221,
  };
  doorLeafGroup.add(leftBorderMesh);

  const rightBorderMesh = new THREE.Mesh(leftBorderGeom, steelMat);
  rightBorderMesh.position.set(doorWidth / 2 - frameBorderW / 2, 0, 0);
  (rightBorderMesh as any).userData = {
    isProductMesh: true,
    isDoor: true,
    item: frontDoorItem221221,
  };
  doorLeafGroup.add(rightBorderMesh);

  // Toughened Glass center window (4.0mm)
  const glassWidth = doorWidth - frameBorderW * 2;
  const glassGeom = new THREE.BoxGeometry(glassWidth, doorHeight, 0.015);
  const frontGlassMesh = new THREE.Mesh(glassGeom, glassMat);
  frontGlassMesh.position.set(0, 0, 0);
  (frontGlassMesh as any).userData = {
    isProductMesh: true,
    isDoor: true,
    item: frontDoorItem221221,
  };
  doorLeafGroup.add(frontGlassMesh);

  // Small round lock on the right metal border (Page 2: "with small round lock")
  const roundLockGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
  const roundLockMesh = new THREE.Mesh(roundLockGeom, chromeMat);
  roundLockMesh.rotation.x = Math.PI / 2;
  roundLockMesh.position.set(doorWidth / 2 - frameBorderW / 2, 0, doorThick / 2 + 0.015);
  doorLeafGroup.add(roundLockMesh);

  // Keyhole in the lock
  const lockKeyholeGeom = new THREE.BoxGeometry(0.012, 0.045, 0.01);
  const lockKeyholeMesh = new THREE.Mesh(
    lockKeyholeGeom,
    new THREE.MeshBasicMaterial({ color: 0x05070a })
  );
  lockKeyholeMesh.position.set(doorWidth / 2 - frameBorderW / 2, 0, doorThick / 2 + 0.036);
  doorLeafGroup.add(lockKeyholeMesh);

  // Left hinges
  [-doorHeight * 0.38, doorHeight * 0.38].forEach(hy => {
    const hingeGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12);
    const hingeMesh = new THREE.Mesh(hingeGeom, chromeMat);
    hingeMesh.position.set(-doorWidth / 2, hy, 0);
    doorLeafGroup.add(hingeMesh);
  });

  // Door interactivity state
  let currentFrontState: DoorLeafState = options?.doorState?.front || 'transparent';
  let isCutaway = false;

  const updateDoorOpacity = () => {
    if (currentFrontState === 'removed') return;
    if (isCutaway && (currentFrontState === 'closed' || currentFrontState === 'transparent')) {
      glassMat.opacity = 0.08;
      glassMat.transparent = true;
    } else {
      if (currentFrontState === 'closed') {
        glassMat.opacity = 0.85;
        glassMat.transparent = true;
      } else if (currentFrontState === 'transparent') {
        glassMat.opacity = 0.35;
        glassMat.transparent = true;
      } else if (currentFrontState === 'open') {
        glassMat.opacity = 0.70;
        glassMat.transparent = true;
      }
    }
  };

  const setDoorMode = (side: 'front' | 'rear', state: DoorLeafState) => {
    if (side === 'front') {
      currentFrontState = state;
      if (state === 'removed') {
        frontDoorPivot.visible = false;
      } else {
        frontDoorPivot.visible = true;
        if (state === 'open') {
          // Open 105 degrees swing
          frontDoorPivot.rotation.y = Math.PI * 0.58;
        } else {
          frontDoorPivot.rotation.y = 0;
        }
        updateDoorOpacity();
      }
    }
    // Rear door is not present on 221221 wall cabinet
  };

  const setRearCutaway = (active: boolean) => {
    isCutaway = active;
    updateDoorOpacity();
  };

  // Initial door mode
  setDoorMode('front', currentFrontState);

  const doorsInfo: CabinetDoorsInfo = {
    hasFrontDoor: true,
    hasRearDoor: false, // Wall mounted cabinet with fixed wall back-panel
    frontDoorType: 'glass',
    rearDoorType: 'solid',
    isDoubleFront: false,
    isDoubleRear: false,
    frontDoorName: 'דלת זכוכית מחוסמת 4.0 מ״מ עם מנעול עגול',
    rearDoorName: 'ללא דלת אחורית (גב לתליית קיר)',
    isFrontDoorIllustrative: false,
    isRearDoorIllustrative: false,
  };

  return {
    group,
    uCenters,
    innerDepthUnits,
    doorsGroup,
    setDoorMode,
    setRearCutaway,
    doorsInfo,
  };
}
