import * as THREE from 'three';
import { Product3DInstance, NonU3DItem } from './Cabinet3DTypes';
import { U_HEIGHT_UNITS, RACK_19_WIDTH_UNITS, USABLE_OPENING_WIDTH } from './CabinetModelBuilder';
import { lookup3DAsset, Product3DAssetDef } from './Product3DAssets';
import { transformImageLink } from '../../utils/cabinetData';

/**
 * Creates equipment 3D mesh representation based on product type, dimensions, and SKU asset mapping
 */
export function buildProduct3DMesh(
  item: Product3DInstance,
  innerDepthUnits: number,
  materials: {
    shelfMat: THREE.Material;
    activeChassisMat: THREE.Material;
    panelMat: THREE.Material;
    pduMat: THREE.Material;
    earMat: THREE.Material;
    accentMat: THREE.Material;
    ledMat: THREE.Material;
    includedShelfMat: THREE.Material;
  },
  onTextureLoaded?: () => void
): THREE.Group {
  const group = new THREE.Group();
  group.name = `product-mesh-${item.instanceId}`;
  (group as any).userData = { item, isProductMesh: true };

  const assetDef = lookup3DAsset(item.sku);
  const spanHeight = item.uSpan * U_HEIGHT_UNITS - 0.03; // small gap for realism
  const nameLower = (item.name || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();

  const isShelf = item.type === 'shelf' || /מדף|shelf|sliding|נשלף|תלוי/i.test(nameLower) || /מדף|shelf/i.test(descLower);
  const isPdu = item.type === 'pdu' || /שקע|pdu|power|כח|כוח/i.test(nameLower) || /שקע|pdu/i.test(descLower);
  const isBrush = /מברשת|שערות|brush/i.test(nameLower) || /מברשת|שערות|brush/i.test(descLower);
  const isBlank = /עיוור|blank/i.test(nameLower) || /עיוור|blank/i.test(descLower);
  const isPanel = item.type === 'panel' || isBrush || isBlank || /פנל|panel|סיכוך/i.test(nameLower);
  const isAudioAmp = assetDef?.categoryProfile === 'audio-amplifier' || /מגבר|polman|xl600|amplifier|סאונד/i.test(nameLower) || /מגבר/i.test(descLower);
  const isUps = assetDef?.categoryProfile === 'ups-online' || /ups|אל פסק|סוללה|power supply/i.test(nameLower) || /ups|אל פסק/i.test(descLower);
  const isSwitchOrRouter = assetDef?.categoryProfile?.startsWith('switch') || assetDef?.categoryProfile === 'router-vpn';

  // 1. SHELF REPRESENTATION
  if (isShelf) {
    const shelfMat = item.isIncluded ? materials.includedShelfMat : materials.shelfMat;
    const shelfWidth = USABLE_OPENING_WIDTH * 0.98;
    const shelfDepth = Math.max(1.8, Math.min(innerDepthUnits * 0.85, 5.0));
    const shelfThick = 0.05; // 5mm sheet steel

    // Main horizontal surface
    const surfaceGeom = new THREE.BoxGeometry(shelfWidth, shelfThick, shelfDepth);
    const surfaceMesh = new THREE.Mesh(surfaceGeom, shelfMat);
    surfaceMesh.position.set(0, -spanHeight / 2 + shelfThick / 2, -shelfDepth / 2);
    surfaceMesh.castShadow = true;
    surfaceMesh.receiveShadow = true;
    group.add(surfaceMesh);

    // Front lip (turned down/up edge)
    const lipGeom = new THREE.BoxGeometry(shelfWidth, 0.12, 0.04);
    const lipMesh = new THREE.Mesh(lipGeom, shelfMat);
    lipMesh.position.set(0, -spanHeight / 2 + 0.06, 0);
    group.add(lipMesh);

    // Left and Right mounting ears (attaching to 19" rails)
    const earGeom = new THREE.BoxGeometry(0.20, spanHeight * 0.8, 0.06);
    const leftEar = new THREE.Mesh(earGeom, materials.earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.09, 0, 0.02);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, materials.earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.09, 0, 0.02);
    group.add(rightEar);

    // Subtle ventilation slot markings on shelf
    const ventGeom = new THREE.BoxGeometry(shelfWidth * 0.7, 0.01, shelfDepth * 0.6);
    const ventMesh = new THREE.Mesh(ventGeom, materials.accentMat);
    ventMesh.position.set(0, -spanHeight / 2 + shelfThick + 0.005, -shelfDepth / 2);
    group.add(ventMesh);

    return group;
  }

  // 2. PDU / POWER STRIP REPRESENTATION
  if (isPdu) {
    const pduDepth = 0.65;
    const pduChassisGeom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, spanHeight, pduDepth);
    const pduMesh = new THREE.Mesh(pduChassisGeom, materials.pduMat);
    pduMesh.position.set(0, 0, -pduDepth / 2);
    pduMesh.castShadow = true;
    group.add(pduMesh);

    // Red illuminated power rocker switch
    const switchGeom = new THREE.BoxGeometry(0.22, 0.14, 0.04);
    const redSwitchMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const switchMesh = new THREE.Mesh(switchGeom, redSwitchMat);
    switchMesh.position.set(RACK_19_WIDTH_UNITS * 0.38, 0, 0.02);
    group.add(switchMesh);

    // Simulated sockets (6 black socket indentations)
    const socketGeom = new THREE.BoxGeometry(0.28, 0.18, 0.02);
    for (let s = -3; s <= 2; s++) {
      const socketMesh = new THREE.Mesh(socketGeom, materials.accentMat);
      socketMesh.position.set(s * 0.45 - 0.2, 0, 0.01);
      group.add(socketMesh);
    }

    // Mounting ears
    const earGeom = new THREE.BoxGeometry(0.18, spanHeight, 0.04);
    const leftEar = new THREE.Mesh(earGeom, materials.earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.09, 0, 0.02);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, materials.earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.09, 0, 0.02);
    group.add(rightEar);

    return group;
  }

  // 3. BLANK / BRUSH / PATCH PANELS
  if (isPanel) {
    const panelDepth = 0.20;
    const panelGeom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, spanHeight, panelDepth);
    const panelMesh = new THREE.Mesh(panelGeom, materials.panelMat);
    panelMesh.position.set(0, 0, -panelDepth / 2);
    panelMesh.castShadow = true;
    group.add(panelMesh);

    if (isBrush) {
      // Black brush bristle slit in the center
      const brushGeom = new THREE.BoxGeometry(USABLE_OPENING_WIDTH * 0.85, spanHeight * 0.45, 0.03);
      const brushMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
      const brushMesh = new THREE.Mesh(brushGeom, brushMat);
      brushMesh.position.set(0, 0, 0.01);
      group.add(brushMesh);
    } else if (!isBlank) {
      // Patch panel port blocks (24 ports in 4 blocks of 6)
      const portBlockGeom = new THREE.BoxGeometry(0.65, spanHeight * 0.45, 0.03);
      [-1.4, -0.5, 0.5, 1.4].forEach(px => {
        const portMesh = new THREE.Mesh(portBlockGeom, materials.accentMat);
        portMesh.position.set(px, 0, 0.01);
        group.add(portMesh);
      });
    }

    // Mounting ears
    const earGeom = new THREE.BoxGeometry(0.18, spanHeight, 0.04);
    const leftEar = new THREE.Mesh(earGeom, materials.earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.09, 0, 0.02);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, materials.earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.09, 0, 0.02);
    group.add(rightEar);

    return group;
  }

  // 4. ACTIVE EQUIPMENT (Switches, Routers, UPS, Amplifiers, Servers)
  const activeDepth = Math.max(1.8, Math.min(innerDepthUnits * 0.8, item.uSpan > 1 ? 4.5 : 2.8));
  const chassisWidth = USABLE_OPENING_WIDTH;
  const chassisGeom = new THREE.BoxGeometry(chassisWidth, spanHeight, activeDepth);

  // Material customization per assetDef or brand/type
  let activeMat = materials.activeChassisMat;
  if (assetDef?.chassisColor) {
    activeMat = new THREE.MeshStandardMaterial({
      color: assetDef.chassisColor,
      roughness: assetDef.roughness ?? 0.35,
      metalness: assetDef.metalness ?? 0.65,
    });
  } else if (isAudioAmp) {
    activeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25, metalness: 0.8 });
  } else if (isUps) {
    activeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.6 });
  }

  const chassisMesh = new THREE.Mesh(chassisGeom, activeMat);
  chassisMesh.position.set(0, 0, -activeDepth / 2);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  group.add(chassisMesh);

  // Front bezel faceplate (extending to full 19" width with ears)
  const faceplateGeom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, spanHeight, 0.05);
  const faceplateMesh = new THREE.Mesh(faceplateGeom, activeMat);
  faceplateMesh.position.set(0, 0, 0);
  group.add(faceplateMesh);

  // Mounting ears on left and right
  const earGeom = new THREE.BoxGeometry(0.18, spanHeight, 0.06);
  const leftEar = new THREE.Mesh(earGeom, materials.earMat);
  leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.09, 0, 0.03);
  group.add(leftEar);

  const rightEar = new THREE.Mesh(earGeom, materials.earMat);
  rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.09, 0, 0.03);
  group.add(rightEar);

  // Silver mounting screws in ears
  const screwGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8);
  screwGeom.rotateX(Math.PI / 2);
  const screwMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
  [-RACK_19_WIDTH_UNITS / 2 + 0.09, RACK_19_WIDTH_UNITS / 2 - 0.09].forEach(sx => {
    [-spanHeight * 0.35, spanHeight * 0.35].forEach(sy => {
      const screw = new THREE.Mesh(screwGeom, screwMat);
      screw.position.set(sx, sy, 0.065);
      group.add(screw);
    });
  });

  // Front panel visual indicators:
  if (isAudioAmp || assetDef?.categoryProfile === 'audio-amplifier') {
    // Polman dual volume dials
    const knobGeom = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 16);
    knobGeom.rotateX(Math.PI / 2);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9, roughness: 0.2 });

    [-0.8, 0.8].forEach(kx => {
      const knob = new THREE.Mesh(knobGeom, knobMat);
      knob.position.set(kx, 0, 0.06);
      group.add(knob);
    });

    // VU meter / blue LEDs
    const vuGeom = new THREE.BoxGeometry(0.4, 0.08, 0.02);
    const blueLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const vuMesh = new THREE.Mesh(vuGeom, blueLedMat);
    vuMesh.position.set(0, 0.08, 0.04);
    group.add(vuMesh);

    // Subtle front cooling vents
    const ventGeom = new THREE.BoxGeometry(0.5, 0.03, 0.01);
    const ventMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    [-0.2, 0, 0.2].forEach(vy => {
      const vent = new THREE.Mesh(ventGeom, ventMat);
      vent.position.set(0, -0.15 + vy, 0.035);
      group.add(vent);
    });

  } else if (isUps || assetDef?.categoryProfile === 'ups-online') {
    // UPS LCD Status Screen
    const screenGeom = new THREE.BoxGeometry(0.8, spanHeight * 0.5, 0.02);
    const screenMat = new THREE.MeshBasicMaterial({ color: assetDef?.details?.lcdColor || 0x10b981 });
    const screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.position.set(-0.9, 0, 0.04);
    group.add(screenMesh);

    // Battery vent grille
    const ventGeom = new THREE.BoxGeometry(1.4, spanHeight * 0.5, 0.02);
    const ventMesh = new THREE.Mesh(ventGeom, materials.accentMat);
    ventMesh.position.set(0.6, 0, 0.04);
    group.add(ventMesh);

  } else {
    // Switch / Router: Ethernet port clusters & status LEDs
    const portBlocks = assetDef?.details?.portBlocks || 2;
    const blockWidth = portBlocks >= 4 ? 0.75 : portBlocks >= 3 ? 0.95 : 1.2;
    const startX = 0.2;

    for (let b = 0; b < portBlocks; b++) {
      const portClusterGeom = new THREE.BoxGeometry(blockWidth, spanHeight * 0.45, 0.02);
      const portMesh = new THREE.Mesh(portClusterGeom, materials.accentMat);
      portMesh.position.set(startX + b * (blockWidth + 0.18), 0, 0.035);
      group.add(portMesh);
    }

    // Green/Amber status LEDs
    const ledCount = assetDef?.details?.ledCount || 8;
    const displayLeds = Math.min(ledCount, 16);
    const ledGeom = new THREE.BoxGeometry(0.04, 0.04, 0.02);
    for (let l = 0; l < displayLeds; l++) {
      const led = new THREE.Mesh(ledGeom, materials.ledMat);
      led.position.set(-1.6 + l * 0.10, spanHeight * 0.18, 0.035);
      group.add(led);
    }
  }

  // 5. REAL PRODUCT IMAGE INTEGRATION
  // Prefer dedicated front face texture from asset registry; fallback to catalog image
  const rawImage = assetDef?.frontTextureUrl || (item.image ? String(item.image).split(/[,;]+/)[0].trim() : '');
  if (rawImage) {
    const imageUrl = transformImageLink(rawImage, 800);
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        imageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          const imgW = texture.image?.naturalWidth || texture.image?.width || 1;
          const imgH = texture.image?.naturalHeight || texture.image?.height || 1;
          const imgAspect = Math.max(0.1, imgW / imgH);

          if (assetDef?.frontTextureUrl) {
            // High-fidelity orthographic front panel texture
            const frontGeom = new THREE.PlaneGeometry(USABLE_OPENING_WIDTH * 0.98, spanHeight * 0.95);
            const frontMat = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.35,
              metalness: 0.2,
              toneMapped: true,
            });
            const frontMesh = new THREE.Mesh(frontGeom, frontMat);
            frontMesh.position.set(0, 0, 0.04);
            group.add(frontMesh);
          } else {
            // Real catalog photo: displayed on a dedicated front presentation surface
            // Strictly preserves original aspect ratio without distortion or cropping
            const maxW = USABLE_OPENING_WIDTH * 0.88;
            const maxH = spanHeight * 0.84;
            let planeW = maxW;
            let planeH = maxW / imgAspect;
            if (planeH > maxH) {
              planeH = maxH;
              planeW = maxH * imgAspect;
            }

            // Clean dark bezel backing to seamlessly blend into 19" chassis face
            const bezelGeom = new THREE.BoxGeometry(planeW + 0.04, planeH + 0.02, 0.01);
            const bezelMesh = new THREE.Mesh(bezelGeom, materials.panelMat);
            bezelMesh.position.set(0, 0, 0.032);
            group.add(bezelMesh);

            // Aspect-ratio-accurate textured plane
            const photoGeom = new THREE.PlaneGeometry(planeW, planeH);
            const photoMat = new THREE.MeshBasicMaterial({
              map: texture,
              toneMapped: true,
            });
            const photoMesh = new THREE.Mesh(photoGeom, photoMat);
            photoMesh.position.set(0, 0, 0.042);
            group.add(photoMesh);
          }

          if (onTextureLoaded) onTextureLoaded();
        },
        undefined,
        (err) => {
          // Graceful fallback: procedural mesh (LEDs, dials, port blocks, vents) remains fully functional
          console.warn(`[Product3D] Fallback procedural mesh used for ${item.sku}:`, err);
        }
      );
    }
  }

  return group;
}

/**
 * Builds an interactive hitbox for an empty U slot with optional selection highlight
 */
export function buildEmptySlotHitbox(
  uIndex: number,
  yPos: number,
  depthUnits: number,
  isSelected = false
): THREE.Group {
  const group = new THREE.Group();
  group.name = `empty-u-slot-${uIndex}`;
  (group as any).userData = {
    isEmptySlot: true,
    uIndex,
  };

  const geom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, U_HEIGHT_UNITS * 0.95, depthUnits * 0.7);
  
  // Invisible / faint hover material
  const mat = new THREE.MeshBasicMaterial({
    color: isSelected ? 0x004387 : 0x10b981,
    transparent: true,
    opacity: isSelected ? 0.22 : 0.0,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(0, yPos, -depthUnits * 0.35);
  (mesh as any).userData = {
    isEmptySlot: true,
    uIndex,
  };
  group.add(mesh);

  // If selected, add crisp glowing wireframe border
  if (isSelected) {
    const edgeGeom = new THREE.EdgesGeometry(geom);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const edgeMesh = new THREE.LineSegments(edgeGeom, edgeMat);
    edgeMesh.position.copy(mesh.position);
    group.add(edgeMesh);

    // Add glowing slot label on the front edge
    const tagGeom = new THREE.BoxGeometry(0.8, U_HEIGHT_UNITS * 0.5, 0.02);
    const tagMat = new THREE.MeshBasicMaterial({ color: 0x004387 });
    const tagMesh = new THREE.Mesh(tagGeom, tagMat);
    tagMesh.position.set(0, yPos, 0.05);
    group.add(tagMesh);
  }

  return group;
}

/**
 * Builds 3D mesh representation for 0U vertical accessories (e.g. vertical PDUs, vertical cable channels)
 */
export function buildVerticalAccessoryMesh(
  item: NonU3DItem,
  heightUnits: number,
  materials: {
    pduMat: THREE.Material;
    panelMat: THREE.Material;
    accentMat: THREE.Material;
    metalMat: THREE.Material;
    ledMat: THREE.Material;
  }
): THREE.Group {
  const group = new THREE.Group();
  group.name = `non-u-vertical-${item.sku}`;
  (group as any).userData = { item, isProductMesh: true };

  const isVerticalPdu = /pdu|שקע|power/i.test(item.name || '') || /pdu|שקע/i.test(item.description || '');
  const barHeight = Math.max(2.0, heightUnits * 0.85);

  if (isVerticalPdu) {
    // Slim vertical PDU chassis
    const chassisGeom = new THREE.BoxGeometry(0.35, barHeight, 0.35);
    const chassisMesh = new THREE.Mesh(chassisGeom, materials.pduMat);
    chassisMesh.castShadow = true;
    group.add(chassisMesh);

    // Vertical row of black sockets
    const socketGeom = new THREE.BoxGeometry(0.20, 0.28, 0.02);
    const socketCount = Math.min(12, Math.max(4, Math.floor(barHeight / 0.45)));
    for (let s = 0; s < socketCount; s++) {
      const socketMesh = new THREE.Mesh(socketGeom, materials.accentMat);
      const sy = -barHeight / 2 + 0.3 + s * 0.42;
      socketMesh.position.set(0, sy, 0.18);
      group.add(socketMesh);
    }

    // Top power switch indicator
    const ledGeom = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const ledMesh = new THREE.Mesh(ledGeom, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    ledMesh.position.set(0, barHeight / 2 - 0.2, 0.18);
    group.add(ledMesh);
  } else {
    // Vertical Cable Management Finger Duct
    const ductGeom = new THREE.BoxGeometry(0.40, barHeight, 0.30);
    const ductMesh = new THREE.Mesh(ductGeom, materials.panelMat);
    ductMesh.castShadow = true;
    group.add(ductMesh);

    // Cable fingers slots along duct
    const fingerGeom = new THREE.BoxGeometry(0.42, 0.04, 0.28);
    const slotCount = Math.floor(barHeight / 0.35);
    for (let f = 0; f < slotCount; f++) {
      const fingerMesh = new THREE.Mesh(fingerGeom, materials.accentMat);
      fingerMesh.position.set(0, -barHeight / 2 + 0.2 + f * 0.35, 0);
      group.add(fingerMesh);
    }
  }

  return group;
}

/**
 * Builds 3D mesh representation for hardware sets (cage nuts, screws, grounding bars) on staging tray
 */
export function buildHardwareBoxMesh(
  item: NonU3DItem,
  materials: {
    panelMat: THREE.Material;
    metalMat: THREE.Material;
    accentMat: THREE.Material;
  }
): THREE.Group {
  const group = new THREE.Group();
  group.name = `hardware-box-${item.sku}`;
  (group as any).userData = { item, isProductMesh: true };

  // Industrial modular hardware packaging box
  const boxGeom = new THREE.BoxGeometry(0.65, 0.25, 0.55);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // Professional blue hardware box
    roughness: 0.4,
    metalness: 0.3,
  });
  const boxMesh = new THREE.Mesh(boxGeom, boxMat);
  boxMesh.position.set(0, 0.125, 0);
  boxMesh.castShadow = true;
  group.add(boxMesh);

  // Top label badge
  const labelGeom = new THREE.BoxGeometry(0.50, 0.01, 0.35);
  const labelMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const labelMesh = new THREE.Mesh(labelGeom, labelMat);
  labelMesh.position.set(0, 0.255, 0);
  group.add(labelMesh);

  // Metallic silver bolts/screws protruding for realism
  const boltGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
  boltGeom.rotateX(Math.PI / 2);
  [-0.15, 0, 0.15].forEach(bx => {
    const bolt = new THREE.Mesh(boltGeom, materials.metalMat);
    bolt.position.set(bx, 0.28, 0.10);
    group.add(bolt);
  });

  return group;
}

/**
 * Builds 3D mesh representation for 0U roof accessories (e.g. roof fan units, top brush panels)
 */
export function buildRoofAccessoryMesh(
  item: NonU3DItem,
  widthUnits: number,
  depthUnits: number,
  materials: {
    panelMat: THREE.Material;
    accentMat: THREE.Material;
    metalMat: THREE.Material;
  }
): THREE.Group {
  const group = new THREE.Group();
  group.name = `non-u-roof-${item.sku}`;
  (group as any).userData = { item, isProductMesh: true };

  const isFan = /מאוורר|fan|מפוח|איוורור/i.test(item.name || '');

  if (isFan) {
    // Auxiliary roof fan module tray
    const trayGeom = new THREE.BoxGeometry(widthUnits * 0.45, 0.10, depthUnits * 0.35);
    const trayMesh = new THREE.Mesh(trayGeom, materials.panelMat);
    trayMesh.castShadow = true;
    group.add(trayMesh);

    // Two fan grilles
    const grillGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16);
    [-0.35, 0.35].forEach(gx => {
      const grillMesh = new THREE.Mesh(grillGeom, materials.accentMat);
      grillMesh.position.set(gx, 0.06, 0);
      group.add(grillMesh);
    });
  } else {
    // Top brush entry cover plate
    const brushGeom = new THREE.BoxGeometry(widthUnits * 0.5, 0.06, depthUnits * 0.2);
    const brushMesh = new THREE.Mesh(brushGeom, materials.panelMat);
    group.add(brushMesh);

    const bristleGeom = new THREE.BoxGeometry(widthUnits * 0.42, 0.02, 0.04);
    const bristleMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const bristleMesh = new THREE.Mesh(bristleGeom, bristleMat);
    bristleMesh.position.set(0, 0.04, 0);
    group.add(bristleMesh);
  }

  return group;
}
