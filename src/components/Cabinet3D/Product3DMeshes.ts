import * as THREE from 'three';
import { Product3DInstance, NonU3DItem } from './Cabinet3DTypes';
import { U_HEIGHT_UNITS, RACK_19_WIDTH_UNITS, USABLE_OPENING_WIDTH } from './CabinetModelBuilder';
import { lookup3DAsset, Product3DAssetDef } from './Product3DAssets';
import { transformImageLink, isProductShelf, parseSwitchPorts } from '../../utils/cabinetData';
import { createDiagonalVentSlotTexture } from './CabinetModel447510T';
import { createPolmanFaceTexture, createHikvisionFaceTexture } from './BrandTextures';

/**
 * Safely extracts the first valid HTTP/HTTPS URL from any image field without blind splitting that breaks query strings
 */
export function extractSafeProductImage(rawImage: any): string {
  if (!rawImage) return '';
  const str = String(rawImage).trim();
  if (!str) return '';
  try {
    const url = new URL(str);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return str;
    }
  } catch (e) {}
  
  // If multiple items, try to find the first URL. Don't split by comma if it's part of a valid URL parameter.
  const match = str.match(/https?:\/\/[^\s"<>]+/i);
  if (match && match[0]) {
    return match[0].trim();
  }
  return str;
}

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
    metalMat?: THREE.Material;
  },
  onTextureLoaded?: () => void
): THREE.Group {
  const group = new THREE.Group();
  group.name = `product-mesh-${item.instanceId}`;
  (group as any).userData = { item, isProductMesh: true };

  const assetDef = lookup3DAsset(item.sku, item.name);
  const spanHeight = item.uSpan * U_HEIGHT_UNITS - 0.03; // small gap for realism
  const nameLower = (item.name || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();
  const skuLower = (item.sku || '').toLowerCase();

  // Normalized business classification:
  // Amplifiers or switches mentioning "מדף" in their description will NEVER be treated as shelves!
  const isAudioAmp = assetDef?.categoryProfile === 'audio-amplifier' || /מגבר|amplifier|polman|xl600|סאונד/i.test(nameLower);
  const isUps = assetDef?.categoryProfile === 'ups-online' || /אל פסק|ups\b|סוללה|power supply/i.test(nameLower);
  const isSwitchOrRouter = assetDef?.categoryProfile?.startsWith('switch') || assetDef?.categoryProfile === 'router-vpn' || /מתג|switch|ראוטר|router/i.test(nameLower);
  const isPdu = item.type === 'pdu' || /שקע|pdu|פס כוח|פס שקעים/i.test(nameLower);
  const isBrush = /מברשת|brush/i.test(nameLower);
  const isBlank = /עיוור|blank/i.test(nameLower);
  const isPanel = item.type === 'panel' || isBrush || isBlank || /פנל|panel|פאנל/i.test(nameLower);

  const isShelf = !isAudioAmp && !isUps && !isSwitchOrRouter && !isPdu && !isPanel && (
    item.type === 'shelf' ||
    Boolean((item as any).isShelf) ||
    Boolean(item.accessoryRef?.isShelf) ||
    isProductShelf(item.accessoryRef || item) ||
    /מדף|shelf/i.test(nameLower) ||
    /מדף|shelf/i.test(skuLower)
  );

  const switchPorts = parseSwitchPorts(item.accessoryRef || item);
  const totalAccess = switchPorts ? (switchPorts.access + switchPorts.poe) : 0;
  const uplinkCount = switchPorts ? switchPorts.uplinkRj45 : 0;
  const sfpCount = switchPorts ? (switchPorts.sfp + switchPorts.sfpPlus) : 0;
  const totalPortCount = totalAccess + uplinkCount + sfpCount;

  const isDesktopSwitch = Boolean(
    switchPorts && (
      item.uSpan === 0 ||
      (item as any).isDesktop ||
      (item as any).onShelf ||
      /desktop|שולחני|1510/i.test(`${skuLower} ${nameLower} ${descLower}`) ||
      (totalPortCount <= 10 && !nameLower.includes('19') && !nameLower.includes('rack') && item.uSpan <= 1 && /desktop|שולחני|1510|1505|105|108/i.test(`${skuLower} ${nameLower}`))
    )
  );

  // 1. PHYSICAL CHASSIS & MOUNTING EARS (Body & Depth)
  if (isShelf) {
    const isPN117914 = skuLower.includes('117914') || nameLower.includes('117914') || descLower.includes('117914');
    let shelfMat = item.isIncluded ? materials.includedShelfMat : materials.shelfMat;
    if (isPN117914) {
      const ventTexture = createDiagonalVentSlotTexture();
      shelfMat = new THREE.MeshStandardMaterial({
        map: ventTexture || null,
        roughness: 0.35,
        metalness: 0.70,
      });
    }

    const shelfWidth = isPN117914 ? 4.70 : USABLE_OPENING_WIDTH * 0.98;
    const shelfDepth = isPN117914 ? 6.50 : Math.max(2.8, Math.min(innerDepthUnits * 0.88, 6.2));
    const shelfThick = isPN117914 ? 0.048 : 0.08;

    // Main horizontal steel tray surface
    const surfaceGeom = new THREE.BoxGeometry(shelfWidth, shelfThick, shelfDepth);
    const surfaceMesh = new THREE.Mesh(surfaceGeom, shelfMat);
    surfaceMesh.position.set(0, -spanHeight / 2 + shelfThick / 2, -shelfDepth / 2);
    surfaceMesh.castShadow = true;
    surfaceMesh.receiveShadow = true;
    group.add(surfaceMesh);

    // Left and Right Side Stiffening Flanges
    const flangeGeom = new THREE.BoxGeometry(0.04, 0.18, shelfDepth);
    const leftFlange = new THREE.Mesh(flangeGeom, shelfMat);
    leftFlange.position.set(-shelfWidth / 2 + 0.02, -spanHeight / 2 + 0.09, -shelfDepth / 2);
    group.add(leftFlange);

    const rightFlange = new THREE.Mesh(flangeGeom, shelfMat);
    rightFlange.position.set(shelfWidth / 2 - 0.02, -spanHeight / 2 + 0.09, -shelfDepth / 2);
    group.add(rightFlange);

    // Realistic Airflow Ventilation Slots on the shelf surface (4 parallel slotted strips)
    const slotStripGeom = new THREE.BoxGeometry(shelfWidth * 0.78, 0.015, 0.22);
    [-shelfDepth * 0.25, -shelfDepth * 0.50, -shelfDepth * 0.75].forEach(slotZ => {
      const slotMesh = new THREE.Mesh(slotStripGeom, materials.panelMat);
      slotMesh.position.set(0, -spanHeight / 2 + shelfThick + 0.005, slotZ);
      group.add(slotMesh);
    });

    // Front reinforced lip with metallic bevel
    const lipGeom = new THREE.BoxGeometry(shelfWidth, 0.16, 0.05);
    const lipMesh = new THREE.Mesh(lipGeom, shelfMat);
    lipMesh.position.set(0, -spanHeight / 2 + 0.08, 0.01);
    group.add(lipMesh);

    const lipBevelGeom = new THREE.BoxGeometry(shelfWidth * 0.94, 0.03, 0.02);
    const lipBevel = new THREE.Mesh(lipBevelGeom, materials.earMat);
    lipBevel.position.set(0, -spanHeight / 2 + 0.14, 0.035);
    group.add(lipBevel);

    // 19" Heavy-Duty Mounting Ears with Chrome Screws
    const earGeom = new THREE.BoxGeometry(0.22, spanHeight * 0.90, 0.06);
    const leftEar = new THREE.Mesh(earGeom, materials.earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.10, 0, 0.025);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, materials.earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.10, 0, 0.025);
    group.add(rightEar);

    // Chrome Cage Screws on mounting ears
    const screwGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8);
    screwGeom.rotateX(Math.PI / 2);
    const screwMat = materials.metalMat || materials.earMat;
    [-RACK_19_WIDTH_UNITS / 2 + 0.10, RACK_19_WIDTH_UNITS / 2 - 0.10].forEach(sx => {
      const screwTop = new THREE.Mesh(screwGeom, screwMat);
      screwTop.position.set(sx, spanHeight * 0.25, 0.06);
      group.add(screwTop);

      const screwBottom = new THREE.Mesh(screwGeom, screwMat);
      screwBottom.position.set(sx, -spanHeight * 0.25, 0.06);
      group.add(screwBottom);
    });

  } else if (isPdu) {
    const silverPduMat = new THREE.MeshStandardMaterial({
      color: 0xc9ced4,
      metalness: 0.6,
      roughness: 0.4,
    });
    const pduDepth = 0.65;
    const pduChassisGeom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, spanHeight, pduDepth);
    const pduMesh = new THREE.Mesh(pduChassisGeom, silverPduMat);
    pduMesh.position.set(0, 0, -pduDepth / 2);
    pduMesh.castShadow = true;
    group.add(pduMesh);

    // Sturdy 19" mounting ears
    const earGeom = new THREE.BoxGeometry(0.20, spanHeight, 0.05);
    const earMat = materials.earMat;
    const leftEar = new THREE.Mesh(earGeom, earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.10, 0, 0.025);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.10, 0, 0.025);
    group.add(rightEar);

    // Chrome mounting cage screws on ears
    const screwGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8);
    screwGeom.rotateX(Math.PI / 2);
    const screwMat = materials.metalMat || materials.earMat;
    [-RACK_19_WIDTH_UNITS / 2 + 0.10, RACK_19_WIDTH_UNITS / 2 - 0.10].forEach(sx => {
      [-spanHeight * 0.28, spanHeight * 0.28].forEach(sy => {
        const sMesh = new THREE.Mesh(screwGeom, screwMat);
        sMesh.position.set(sx, sy, 0.05);
        group.add(sMesh);
      });
    });

    // N sockets along the body (N from the product name digits, default 8): dark rounded insets (0x23282e) each with 3 small pin cylinders
    const rawName = `${item.name || ''} ${item.description || ''}`;
    const digitMatch = rawName.match(/(\d+)\s*(?:שקע|שקעים|outlet|outlets|port|ports|way)/i) || rawName.match(/\b(\d+)\b/);
    const socketCount = digitMatch ? Math.max(2, Math.min(24, parseInt(digitMatch[1], 10))) : 8;

    const socketOuterGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.025, 20);
    socketOuterGeom.rotateX(Math.PI / 2);
    const socketOuterMat = new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.6, metalness: 0.2 });

    const pinGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.035, 10);
    pinGeom.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.7 });

    const socketStartX = -RACK_19_WIDTH_UNITS / 2 + 0.75;
    const socketSpacing = (RACK_19_WIDTH_UNITS - 1.8) / Math.max(1, socketCount - 1);
    for (let si = 0; si < socketCount; si++) {
      const sx = socketStartX + si * socketSpacing;
      // Outer socket ring
      const outerRing = new THREE.Mesh(socketOuterGeom, socketOuterMat);
      outerRing.position.set(sx, 0, 0.015);
      group.add(outerRing);

      // 3 small pin cylinders
      const pinL = new THREE.Mesh(pinGeom, pinMat);
      pinL.position.set(sx - 0.04, 0, 0.025);
      group.add(pinL);

      const pinR = new THREE.Mesh(pinGeom, pinMat);
      pinR.position.set(sx + 0.04, 0, 0.025);
      group.add(pinR);

      const pinG = new THREE.Mesh(pinGeom, pinMat);
      pinG.position.set(sx, 0.04, 0.025);
      group.add(pinG);
    }

    // Small red power switch
    const switchHousingGeom = new THREE.BoxGeometry(0.18, 0.24, 0.04);
    const switchHousing = new THREE.Mesh(switchHousingGeom, socketOuterMat);
    switchHousing.position.set(RACK_19_WIDTH_UNITS / 2 - 0.50, 0, 0.02);
    group.add(switchHousing);

    const switchRockerGeom = new THREE.BoxGeometry(0.10, 0.16, 0.03);
    const switchRockerMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const switchRocker = new THREE.Mesh(switchRockerGeom, switchRockerMat);
    switchRocker.position.set(RACK_19_WIDTH_UNITS / 2 - 0.50, 0, 0.035);
    group.add(switchRocker);

    // Green surge protection LED indicator with chrome bezel
    const ledBezelGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12);
    ledBezelGeom.rotateX(Math.PI / 2);
    const ledBezel = new THREE.Mesh(ledBezelGeom, materials.metalMat || materials.earMat);
    ledBezel.position.set(RACK_19_WIDTH_UNITS / 2 - 0.28, 0, 0.025);
    group.add(ledBezel);

    const ledGeom = new THREE.SphereGeometry(0.028, 12, 12);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.9
    });
    const ledMesh = new THREE.Mesh(ledGeom, ledMat);
    ledMesh.position.set(RACK_19_WIDTH_UNITS / 2 - 0.28, 0, 0.038);
    group.add(ledMesh);

    // Black power cable (TubeGeometry on a short curve)
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-RACK_19_WIDTH_UNITS / 2 + 0.35, 0, -pduDepth),
      new THREE.Vector3(-RACK_19_WIDTH_UNITS / 2 + 0.35, -0.10, -pduDepth - 0.15),
      new THREE.Vector3(-RACK_19_WIDTH_UNITS / 2 + 0.30, -0.22, -pduDepth - 0.30),
      new THREE.Vector3(-RACK_19_WIDTH_UNITS / 2 + 0.22, -0.35, -pduDepth - 0.45),
    ]);
    const cableGeom = new THREE.TubeGeometry(cableCurve, 20, 0.045, 12, false);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.1 });
    const cableMesh = new THREE.Mesh(cableGeom, cableMat);
    group.add(cableMesh);

  } else if (isPanel) {
    const isPatch = /patch|24|rj45|ניתוב|פאץ/i.test(nameLower) || /patch|24|rj45|ניתוב/i.test(skuLower);
    const isCableOrg = /סידור כבלים|מארגן|organizer|cable manager|טבעות/i.test(nameLower) || /סידור|organizer/i.test(skuLower);
    const panelDepth = isCableOrg ? 0.45 : isPatch ? 0.28 : 0.18;

    const panelGeom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, spanHeight, 0.06);
    const panelMesh = new THREE.Mesh(panelGeom, materials.panelMat);
    panelMesh.position.set(0, 0, -0.03);
    panelMesh.castShadow = true;
    group.add(panelMesh);

    // Mounting ears
    const earGeom = new THREE.BoxGeometry(0.18, spanHeight, 0.05);
    const leftEar = new THREE.Mesh(earGeom, materials.earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.09, 0, 0.02);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, materials.earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.09, 0, 0.02);
    group.add(rightEar);

    // Silver mounting screws
    const screwGeom = new THREE.CylinderGeometry(0.024, 0.024, 0.03, 8);
    screwGeom.rotateX(Math.PI / 2);
    const screwMat = materials.metalMat || materials.earMat;
    [-RACK_19_WIDTH_UNITS / 2 + 0.09, RACK_19_WIDTH_UNITS / 2 - 0.09].forEach(sx => {
      const sMesh = new THREE.Mesh(screwGeom, screwMat);
      sMesh.position.set(sx, 0, 0.045);
      group.add(sMesh);
    });

    if (isPatch) {
      // 24-Port RJ45 Cat6 Patch Panel (4 blocks of 6 ports each)
      const portBlockW = 0.85;
      const blockPositions = [-1.45, -0.50, 0.50, 1.45];
      const portGeom = new THREE.BoxGeometry(0.08, 0.09, 0.04);
      const portMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
      const pinGeom = new THREE.BoxGeometry(0.05, 0.015, 0.01);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Gold contacts

      blockPositions.forEach((bx, bIdx) => {
        // Port block housing
        const blockHousingGeom = new THREE.BoxGeometry(portBlockW, spanHeight * 0.65, 0.03);
        const blockHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const blockHousing = new THREE.Mesh(blockHousingGeom, blockHousingMat);
        blockHousing.position.set(bx, 0, 0.015);
        group.add(blockHousing);

        // White label strip above ports
        const labelGeom = new THREE.BoxGeometry(portBlockW * 0.95, 0.04, 0.01);
        const labelMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        const labelMesh = new THREE.Mesh(labelGeom, labelMat);
        labelMesh.position.set(bx, spanHeight * 0.24, 0.032);
        group.add(labelMesh);

        // 6 RJ45 individual ports per block
        for (let p = 0; p < 6; p++) {
          const px = bx - portBlockW / 2 + 0.08 + p * 0.138;
          const port = new THREE.Mesh(portGeom, portMat);
          port.position.set(px, -0.02, 0.03);
          group.add(port);

          const pin = new THREE.Mesh(pinGeom, pinMat);
          pin.position.set(px, 0.015, 0.045);
          group.add(pin);
        }
      });
    } else if (isBrush) {
      // High-density black nylon brush cable pass-through
      const slotW = USABLE_OPENING_WIDTH * 0.88;
      const slotH = spanHeight * 0.50;
      const frameGeom = new THREE.BoxGeometry(slotW, slotH, 0.03);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const brushFrame = new THREE.Mesh(frameGeom, frameMat);
      brushFrame.position.set(0, 0, 0.015);
      group.add(brushFrame);

      // Dense nylon bristles
      const bristleGeom = new THREE.BoxGeometry(slotW * 0.96, slotH * 0.75, 0.04);
      const bristleMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      const bristleMesh = new THREE.Mesh(bristleGeom, bristleMat);
      bristleMesh.position.set(0, 0, 0.025);
      group.add(bristleMesh);

      // Center split line in bristles
      const splitLineGeom = new THREE.BoxGeometry(slotW * 0.96, 0.01, 0.045);
      const splitLineMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const splitLine = new THREE.Mesh(splitLineGeom, splitLineMat);
      splitLine.position.set(0, 0, 0.03);
      group.add(splitLine);
    } else if (isCableOrg) {
      // Horizontal Cable Organizer with 5 sturdy D-Rings
      const ringPositions = [-1.6, -0.8, 0, 0.8, 1.6];
      const ringGeom = new THREE.TorusGeometry(0.14, 0.022, 8, 20);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
      ringPositions.forEach(rx => {
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(rx, 0, 0.16);
        ring.castShadow = true;
        group.add(ring);

        // Ring base mount
        const baseGeom = new THREE.BoxGeometry(0.08, spanHeight * 0.6, 0.14);
        const baseMesh = new THREE.Mesh(baseGeom, ringMat);
        baseMesh.position.set(rx, 0, 0.07);
        group.add(baseMesh);
      });
    } else {
      // Blank Filler Panel (פנל עיוור) with horizontal stamped reinforcement ribs
      const ribGeom = new THREE.BoxGeometry(USABLE_OPENING_WIDTH * 0.86, 0.03, 0.02);
      const ribMat = materials.accentMat;
      [-spanHeight * 0.22, spanHeight * 0.22].forEach(ry => {
        const rib = new THREE.Mesh(ribGeom, ribMat);
        rib.position.set(0, ry, 0.02);
        group.add(rib);
      });
    }

  } else if (switchPorts && isDesktopSwitch) {
    // Desktop Switch: a box on the shelf whose width = 0.12 * (access + uplinkRj45 + sfp) + 0.4
    const desktopWidth = 0.12 * (totalAccess + uplinkCount + sfpCount) + 0.4;
    const desktopHeight = Math.min(spanHeight * 0.75, 0.42);
    const desktopDepth = 1.3;
    const desktopY = -spanHeight / 2 + desktopHeight / 2 + 0.04;

    const desktopChassisGeom = new THREE.BoxGeometry(desktopWidth, desktopHeight, desktopDepth);
    const desktopChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.65,
    });
    const desktopChassis = new THREE.Mesh(desktopChassisGeom, desktopChassisMat);
    desktopChassis.position.set(0, desktopY, -desktopDepth / 2);
    desktopChassis.castShadow = true;
    desktopChassis.receiveShadow = true;
    group.add(desktopChassis);

  } else {
    // Active Equipment (Rack Switches, Routers, UPS, Amplifiers, Servers)
    const activeDepth = Math.max(1.8, Math.min(innerDepthUnits * 0.8, item.uSpan > 1 ? 4.5 : 2.8));
    const chassisWidth = USABLE_OPENING_WIDTH;
    const chassisGeom = new THREE.BoxGeometry(chassisWidth, spanHeight, activeDepth);

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

    // Front bezel faceplate (full 19" faceplate in its U height)
    const faceplateGeom = new THREE.BoxGeometry(RACK_19_WIDTH_UNITS, spanHeight, 0.05);
    const faceplateMesh = new THREE.Mesh(faceplateGeom, activeMat);
    faceplateMesh.position.set(0, 0, 0);
    group.add(faceplateMesh);

    // Mounting ears
    const earGeom = new THREE.BoxGeometry(0.18, spanHeight, 0.06);
    const leftEar = new THREE.Mesh(earGeom, materials.earMat);
    leftEar.position.set(-RACK_19_WIDTH_UNITS / 2 + 0.09, 0, 0.03);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, materials.earMat);
    rightEar.position.set(RACK_19_WIDTH_UNITS / 2 - 0.09, 0, 0.03);
    group.add(rightEar);

    // Silver mounting screws
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
  }

  // 2. UNIFIED VISUAL FRONT FACE LAYER (Image Presentation or Procedural Fallback)
  const frontFaceGroup = new THREE.Group();
  frontFaceGroup.name = `front-face-${item.instanceId}`;
  group.add(frontFaceGroup);

  const clearFrontFaceGroup = () => {
    while (frontFaceGroup.children.length > 0) {
      const child = frontFaceGroup.children[0];
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      }
      frontFaceGroup.remove(child);
    }
  };

  const renderProceduralFallback = () => {
    clearFrontFaceGroup();

    if (isShelf) {
      // Shelf geometry and vent slots are already completely built in primary chassis pass
      const lipLabelGeom = new THREE.BoxGeometry(USABLE_OPENING_WIDTH * 0.40, 0.04, 0.01);
      const labelMat = item.isIncluded ? materials.includedShelfMat : materials.accentMat;
      const lipLabel = new THREE.Mesh(lipLabelGeom, labelMat);
      lipLabel.position.set(0, -spanHeight / 2 + 0.08, 0.038);
      frontFaceGroup.add(lipLabel);

    } else if (isPdu) {
      const switchGeom = new THREE.BoxGeometry(0.22, 0.14, 0.04);
      const redSwitchMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const switchMesh = new THREE.Mesh(switchGeom, redSwitchMat);
      switchMesh.position.set(RACK_19_WIDTH_UNITS * 0.38, 0, 0.02);
      frontFaceGroup.add(switchMesh);

      const socketGeom = new THREE.BoxGeometry(0.28, 0.18, 0.02);
      for (let s = -3; s <= 2; s++) {
        const socketMesh = new THREE.Mesh(socketGeom, materials.accentMat);
        socketMesh.position.set(s * 0.45 - 0.2, 0, 0.01);
        frontFaceGroup.add(socketMesh);
      }

    } else if (isPanel) {
      if (isBrush) {
        const brushGeom = new THREE.BoxGeometry(USABLE_OPENING_WIDTH * 0.85, spanHeight * 0.45, 0.03);
        const brushMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
        const brushMesh = new THREE.Mesh(brushGeom, brushMat);
        brushMesh.position.set(0, 0, 0.01);
        frontFaceGroup.add(brushMesh);
      } else if (!isBlank) {
        const portBlockGeom = new THREE.BoxGeometry(0.65, spanHeight * 0.45, 0.03);
        [-1.4, -0.5, 0.5, 1.4].forEach(px => {
          const portMesh = new THREE.Mesh(portBlockGeom, materials.accentMat);
          portMesh.position.set(px, 0, 0.01);
          frontFaceGroup.add(portMesh);
        });
      }

    } else if (isAudioAmp || assetDef?.categoryProfile === 'audio-amplifier' || /polman|xl600/i.test(nameLower) || /xl600/i.test(skuLower)) {
      // Photorealistic Polman Professional Audio 2U amplifier faceplate
      const polmanTex = createPolmanFaceTexture(item, spanHeight);
      const faceplateW = USABLE_OPENING_WIDTH * 0.995;
      const faceplateH = spanHeight * 0.98;
      const frontGeom = new THREE.PlaneGeometry(faceplateW, faceplateH);
      const frontMat = new THREE.MeshStandardMaterial({
        map: polmanTex || null,
        roughness: 0.35,
        metalness: 0.7,
        side: THREE.FrontSide,
      });
      const frontMesh = new THREE.Mesh(frontGeom, frontMat);
      frontMesh.position.set(0, 0, 0.042);
      frontMesh.userData = { item, isProductMesh: true };
      frontFaceGroup.add(frontMesh);

    } else if (switchPorts) {
      // Procedural Switch Faceplate with exact parsed ports
      const isDesktop = isDesktopSwitch;
      const targetFaceWidth = isDesktop ? (0.12 * (totalAccess + uplinkCount + sfpCount) + 0.4) : USABLE_OPENING_WIDTH;
      const centerY = isDesktop ? (-spanHeight / 2 + Math.min(spanHeight * 0.75, 0.42) / 2 + 0.04) : 0;
      const frontZ = 0.035;

      // Power LED & Brand plate on left
      const pwrX = -targetFaceWidth / 2 + (isDesktop ? 0.12 : 0.45);
      const pwrY = centerY + (isDesktop ? 0.07 : 0.06);

      // Power LED (green)
      const pwrLedGeom = new THREE.SphereGeometry(0.016, 8, 8);
      const greenLedMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.95,
      });
      const pwrLed = new THREE.Mesh(pwrLedGeom, greenLedMat);
      pwrLed.position.set(pwrX, pwrY, frontZ);
      frontFaceGroup.add(pwrLed);

      const pwrTagGeom = new THREE.BoxGeometry(0.065, 0.022, 0.005);
      const pwrTagMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
      const pwrTag = new THREE.Mesh(pwrTagGeom, pwrTagMat);
      pwrTag.position.set(pwrX, pwrY - 0.032, frontZ);
      frontFaceGroup.add(pwrTag);

      // Port layout configuration
      const useTwoRows = totalAccess >= 16 && !isDesktop;
      const portPitch = isDesktop ? 0.11 : 0.115;
      const sfpPitch = isDesktop ? 0.13 : 0.15;
      const gapW = 0.18;

      const accessCols = useTwoRows ? Math.ceil(totalAccess / 2) : totalAccess;
      const uplinkCols = (useTwoRows && uplinkCount >= 2) ? Math.ceil(uplinkCount / 2) : uplinkCount;
      const totalGridW = accessCols * portPitch + (uplinkCount > 0 ? gapW + uplinkCols * portPitch : 0) + (sfpCount > 0 ? gapW + sfpCount * sfpPitch : 0);

      const startX = isDesktop
        ? (-targetFaceWidth / 2 + 0.28)
        : Math.max(-USABLE_OPENING_WIDTH / 2 + 0.90, -totalGridW / 2 + 0.3);

      // Common materials
      const rj45InsetMat = new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.9 });
      const goldPinMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const orangePoeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const sfpSilverMat = new THREE.MeshStandardMaterial({ color: 0xc4cbd4, metalness: 0.85, roughness: 0.25 });
      const sfpInnerMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 });

      const rj45Geom = new THREE.BoxGeometry(0.076, 0.076, 0.02);
      const pinGeom = new THREE.BoxGeometry(0.045, 0.012, 0.005);
      const poeStripGeom = new THREE.BoxGeometry(0.065, 0.012, 0.005);
      const portLedGeom = new THREE.SphereGeometry(0.012, 8, 8);
      const sfpCageGeom = new THREE.BoxGeometry(0.115, 0.095, 0.022);
      const sfpInnerGeom = new THREE.BoxGeometry(0.088, 0.068, 0.028);

      // 1. Draw Access Ports
      for (let i = 0; i < totalAccess; i++) {
        const isPoe = i < switchPorts.poe;
        let px = 0;
        let py = centerY;

        if (useTwoRows) {
          const col = Math.floor(i / 2);
          const row = i % 2; // 0 = upper, 1 = lower
          px = startX + col * portPitch;
          py = centerY + (row === 0 ? 0.052 : -0.052);
        } else {
          px = startX + i * portPitch;
        }

        // Dark RJ45 opening
        const rj45 = new THREE.Mesh(rj45Geom, rj45InsetMat);
        rj45.position.set(px, py, frontZ);
        frontFaceGroup.add(rj45);

        // Gold contact pins
        const pin = new THREE.Mesh(pinGeom, goldPinMat);
        const pinYOffset = useTwoRows ? (i % 2 === 1 ? -0.022 : 0.022) : 0.022;
        pin.position.set(px, py + pinYOffset, frontZ + 0.01);
        frontFaceGroup.add(pin);

        // PoE thin orange strip above
        if (isPoe) {
          const poeStrip = new THREE.Mesh(poeStripGeom, orangePoeMat);
          const poeYOffset = useTwoRows ? (i % 2 === 1 ? -0.048 : 0.048) : 0.048;
          poeStrip.position.set(px, py + poeYOffset, frontZ + 0.01);
          frontFaceGroup.add(poeStrip);
        }

        // Green LED per port
        const portLed = new THREE.Mesh(portLedGeom, greenLedMat);
        const ledYOffset = useTwoRows
          ? (i % 2 === 1 ? (isPoe ? -0.066 : -0.052) : (isPoe ? 0.066 : 0.052))
          : (isPoe ? 0.066 : 0.052);
        portLed.position.set(px, py + ledYOffset, frontZ + 0.01);
        frontFaceGroup.add(portLed);
      }

      // 2. Draw Uplink RJ45 Ports (after gap)
      const uplinkStartX = startX + accessCols * portPitch + gapW;
      for (let u = 0; u < uplinkCount; u++) {
        let upx = 0;
        let upy = centerY;

        if (useTwoRows && uplinkCount >= 2) {
          const col = Math.floor(u / 2);
          const row = u % 2;
          upx = uplinkStartX + col * portPitch;
          upy = centerY + (row === 0 ? 0.052 : -0.052);
        } else {
          upx = uplinkStartX + u * portPitch;
        }

        const rj45 = new THREE.Mesh(rj45Geom, rj45InsetMat);
        rj45.position.set(upx, upy, frontZ);
        frontFaceGroup.add(rj45);

        const pin = new THREE.Mesh(pinGeom, goldPinMat);
        pin.position.set(upx, upy + 0.022, frontZ + 0.01);
        frontFaceGroup.add(pin);

        const portLed = new THREE.Mesh(portLedGeom, greenLedMat);
        portLed.position.set(upx, upy + 0.052, frontZ + 0.01);
        frontFaceGroup.add(portLed);
      }

      // 3. Draw SFP Cages (wider silver insets)
      const sfpStartX = uplinkCount > 0
        ? (uplinkStartX + uplinkCols * portPitch + gapW)
        : (startX + accessCols * portPitch + gapW);

      for (let s = 0; s < sfpCount; s++) {
        const sx = sfpStartX + s * sfpPitch;
        const sy = centerY;

        const sfpCage = new THREE.Mesh(sfpCageGeom, sfpSilverMat);
        sfpCage.position.set(sx, sy, frontZ);
        frontFaceGroup.add(sfpCage);

        const sfpInner = new THREE.Mesh(sfpInnerGeom, sfpInnerMat);
        sfpInner.position.set(sx, sy, frontZ + 0.005);
        frontFaceGroup.add(sfpInner);

        const sfpLed = new THREE.Mesh(portLedGeom, greenLedMat);
        sfpLed.position.set(sx, sy + 0.060, frontZ + 0.01);
        frontFaceGroup.add(sfpLed);
      }

    } else if (
      isUps ||
      isSwitchOrRouter ||
      assetDef?.details?.brandText?.includes('HIKVISION') ||
      /hikvision|היקויזן|הייקויזן|ds-3/i.test(nameLower) ||
      /ds-3|hik/i.test(skuLower)
    ) {
      // Photorealistic Hikvision Switch or Online UPS faceplate
      const hikTex = createHikvisionFaceTexture(item, spanHeight, assetDef);
      const faceplateW = USABLE_OPENING_WIDTH * 0.995;
      const faceplateH = spanHeight * 0.98;
      const frontGeom = new THREE.PlaneGeometry(faceplateW, faceplateH);
      const frontMat = new THREE.MeshStandardMaterial({
        map: hikTex || null,
        roughness: 0.35,
        metalness: 0.5,
        side: THREE.FrontSide,
      });
      const frontMesh = new THREE.Mesh(frontGeom, frontMat);
      frontMesh.position.set(0, 0, 0.042);
      frontMesh.userData = { item, isProductMesh: true };
      frontFaceGroup.add(frontMesh);

    } else {
      const portBlocks = assetDef?.details?.portBlocks || 2;
      const blockWidth = portBlocks >= 4 ? 0.75 : portBlocks >= 3 ? 0.95 : 1.2;
      const startX = 0.2;

      for (let b = 0; b < portBlocks; b++) {
        const portClusterGeom = new THREE.BoxGeometry(blockWidth, spanHeight * 0.45, 0.02);
        const portMesh = new THREE.Mesh(portClusterGeom, materials.accentMat);
        portMesh.position.set(startX + b * (blockWidth + 0.18), 0, 0.035);
        frontFaceGroup.add(portMesh);
      }

      const ledCount = assetDef?.details?.ledCount || 8;
      const displayLeds = Math.min(ledCount, 16);
      const ledGeom = new THREE.BoxGeometry(0.04, 0.04, 0.02);
      for (let l = 0; l < displayLeds; l++) {
        const led = new THREE.Mesh(ledGeom, materials.ledMat);
        led.position.set(-1.6 + l * 0.10, spanHeight * 0.18, 0.035);
        frontFaceGroup.add(led);
      }
    }
  };

  // Pre-render realistic fallback immediately so user never sees a blank box
  renderProceduralFallback();

  // 3. IMAGE LOADING & PRESENTATION PIPELINE
  // For shelves, the physical 3D horizontal tray with venting and mounting ears is rendered directly.
  // For front-panel equipment (switches, servers, blank panels, PDUs), front textures or orthographic catalog images are mapped onto the 19" faceplate.
  // When parseSwitchPorts returns a value, we render the procedural 3D model directly and only use image loading as fallback when parse is null.
  const rawImage = !switchPorts ? (assetDef?.frontTextureUrl || extractSafeProductImage(item.image)) : '';
  group.userData.isImageFallback = Boolean(rawImage);
  group.userData.isProcedural = !rawImage;

  if (rawImage) {
    const imageUrl = transformImageLink(rawImage, 800);
    if (imageUrl) {
      let isCancelled = false;
      (group as any)._cancelTexture = () => { isCancelled = true; };

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        imageUrl,
        (texture) => {
          if (isCancelled) {
            texture.dispose();
            return;
          }

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          // Clear any fallback procedural elements completely so NO fake buttons/ports overlay the image
          clearFrontFaceGroup();

          const img = texture.image;
          const imgW = (img && img.width) ? img.width : 1;
          const imgH = (img && img.height) ? img.height : 1;
          const naturalAspect = imgW / imgH;

          // Check if image is an ultra-wide panoramic faceplate texture (e.g. aspect ratio >= 4.5:1)
          // or a standard catalog product photo
          const isDedicatedFrontPlate = Boolean(assetDef?.frontTextureUrl) || naturalAspect >= 4.5;

          if (isDedicatedFrontPlate) {
            // Full-width 19" rack opening faceplate presentation
            const planeW = USABLE_OPENING_WIDTH * 0.995;
            const planeH = spanHeight * 0.98;

            const frontGeom = new THREE.PlaneGeometry(planeW, planeH);
            const frontMat = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.35,
              metalness: 0.2,
              toneMapped: true,
              side: THREE.FrontSide,
            });
            const frontMesh = new THREE.Mesh(frontGeom, frontMat);
            if (isShelf) {
              frontMesh.rotation.x = -Math.PI / 2;
              frontMesh.position.set(0, -spanHeight / 2 + 0.082, -0.2); // Lay flat on shelf
            } else {
              frontMesh.position.set(0, 0, 0.042);
            }
            frontMesh.userData = { item, isProductMesh: true };
            frontFaceGroup.add(frontMesh);
          } else {
            // Catalog photo with square or rectangular aspect ratio:
            // 1. Maintain exact aspect ratio without vertical squash or horizontal stretch
            // 2. Display the photo neatly framed on the faceplate
            // 3. Render a clean, crisp product identification panel with SKU, name, and specs in the remaining faceplate space
            const faceplateW = USABLE_OPENING_WIDTH * 0.995;
            const faceplateH = spanHeight * 0.98;

            // Base mounting plate
            const basePlateGeom = new THREE.PlaneGeometry(faceplateW, faceplateH);
            const basePlateMat = new THREE.MeshStandardMaterial({
              color: 0x181a1f,
              roughness: 0.45,
              metalness: 0.7,
              side: THREE.FrontSide,
            });
            const basePlate = new THREE.Mesh(basePlateGeom, basePlateMat);
            basePlate.position.set(0, 0, 0.038);
            basePlate.userData = { item, isProductMesh: true };
            frontFaceGroup.add(basePlate);

            // Compute undistorted photo dimensions preserving aspect ratio
            const maxPhotoH = faceplateH * 0.88;
            const maxPhotoW = Math.min(faceplateW * 0.42, 2.2);
            let photoW = maxPhotoH * naturalAspect;
            let photoH = maxPhotoH;
            if (photoW > maxPhotoW) {
              photoW = maxPhotoW;
              photoH = photoW / naturalAspect;
            }

            const photoX = -faceplateW / 2 + photoW / 2 + 0.12;
            const photoGeom = new THREE.PlaneGeometry(photoW, photoH);
            const photoMat = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.3,
              metalness: 0.1,
              side: THREE.FrontSide,
            });
            const photoMesh = new THREE.Mesh(photoGeom, photoMat);
            photoMesh.position.set(photoX, 0, 0.042);
            photoMesh.userData = { item, isProductMesh: true };

            // Subtle border outline around photo
            const photoBorderGeom = new THREE.EdgesGeometry(photoGeom);
            const photoBorderMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.65 });
            const photoBorder = new THREE.LineSegments(photoBorderGeom, photoBorderMat);
            photoMesh.add(photoBorder);
            frontFaceGroup.add(photoMesh);
          }

          // Traverse frontFaceGroup so all new meshes have raycast metadata
          frontFaceGroup.traverse((child) => {
            (child as any).userData = { item, isProductMesh: true };
          });

          if (onTextureLoaded) onTextureLoaded();
        },
        undefined,
        (err) => {
          if (isCancelled) return;
          console.warn(`[Product3D] Failed to load texture for ${item.sku}, rendering procedural fallback:`, err);
          renderProceduralFallback();
          if (onTextureLoaded) onTextureLoaded();
        }
      );
    } else {
      renderProceduralFallback();
    }
  } else {
    renderProceduralFallback();
  }

  // Ensure all descendants carry isProductMesh for immediate raycasting hit
  group.traverse((child) => {
    (child as any).userData = { item, isProductMesh: true };
  });

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
    // Silver metal body material: color 0xc9ced4, metalness 0.6, roughness 0.4
    const silverPduMat = new THREE.MeshStandardMaterial({
      color: 0xc9ced4,
      metalness: 0.6,
      roughness: 0.4,
    });

    // Body: BoxGeometry, same size and position as today
    const chassisGeom = new THREE.BoxGeometry(0.42, barHeight, 0.38);
    const chassisMesh = new THREE.Mesh(chassisGeom, silverPduMat);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    group.add(chassisMesh);

    // N sockets along the body (N from the product name digits, default 8)
    const rawName = `${item.name || ''} ${item.description || ''}`;
    const digitMatch = rawName.match(/(\d+)\s*(?:שקע|שקעים|outlet|outlets|port|ports|way)/i) || rawName.match(/\b(\d+)\b/);
    const nSockets = digitMatch ? Math.max(2, Math.min(36, parseInt(digitMatch[1], 10))) : 8;

    // Dark rounded insets (0x23282e) each with 3 small pin cylinders
    const insetGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.025, 24);
    insetGeom.rotateX(Math.PI / 2);
    const insetMat = new THREE.MeshStandardMaterial({
      color: 0x23282e,
      roughness: 0.6,
      metalness: 0.2,
    });

    const pinGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.035, 12);
    pinGeom.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.7,
    });

    const socketAvailableH = barHeight - 0.9;
    const spacing = socketAvailableH / Math.max(1, nSockets - 1);
    const startY = -barHeight / 2 + 0.45;

    for (let s = 0; s < nSockets; s++) {
      const sy = startY + s * spacing;
      const insetMesh = new THREE.Mesh(insetGeom, insetMat);
      insetMesh.position.set(0, sy, 0.195);
      group.add(insetMesh);

      // 3 small pin cylinders
      const pin1 = new THREE.Mesh(pinGeom, pinMat);
      pin1.position.set(-0.04, sy, 0.205);
      group.add(pin1);

      const pin2 = new THREE.Mesh(pinGeom, pinMat);
      pin2.position.set(0.04, sy, 0.205);
      group.add(pin2);

      const pin3 = new THREE.Mesh(pinGeom, pinMat);
      pin3.position.set(0, sy + 0.04, 0.205);
      group.add(pin3);
    }

    // A small red power switch at the top end
    const swHousingGeom = new THREE.BoxGeometry(0.18, 0.22, 0.04);
    const swHousing = new THREE.Mesh(swHousingGeom, insetMat);
    swHousing.position.set(0, barHeight / 2 - 0.22, 0.195);
    group.add(swHousing);

    const swRockerGeom = new THREE.BoxGeometry(0.10, 0.14, 0.03);
    const swRockerMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const swRocker = new THREE.Mesh(swRockerGeom, swRockerMat);
    swRocker.position.set(0, barHeight / 2 - 0.22, 0.215);
    group.add(swRocker);

    // Green surge LED
    const ledGeom = new THREE.SphereGeometry(0.025, 8, 8);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.9 });
    const ledMesh = new THREE.Mesh(ledGeom, ledMat);
    ledMesh.position.set(0, barHeight / 2 - 0.38, 0.195);
    group.add(ledMesh);

    // A black power cable (TubeGeometry on a short curve) leaving the bottom end
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -barHeight / 2, 0),
      new THREE.Vector3(0, -barHeight / 2 - 0.15, -0.05),
      new THREE.Vector3(0.06, -barHeight / 2 - 0.32, -0.14),
      new THREE.Vector3(0.09, -barHeight / 2 - 0.48, -0.22),
    ]);
    const cableGeom = new THREE.TubeGeometry(cableCurve, 20, 0.05, 12, false);
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
      metalness: 0.1,
    });
    const cableMesh = new THREE.Mesh(cableGeom, cableMat);
    group.add(cableMesh);
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

  group.traverse((child) => {
    (child as any).userData = { item, isProductMesh: true };
  });

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

  group.traverse((child) => {
    (child as any).userData = { item, isProductMesh: true };
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
    // Auxiliary roof fan module tray (120mm dual turbine fan tray)
    const trayWidth = Math.min(widthUnits * 0.70, 3.4);
    const trayDepth = Math.min(depthUnits * 0.60, 3.2);
    const trayGeom = new THREE.BoxGeometry(trayWidth, 0.12, trayDepth);
    const trayMesh = new THREE.Mesh(trayGeom, materials.panelMat);
    trayMesh.castShadow = true;
    group.add(trayMesh);

    // Two active turbine fan assemblies
    const fanRadius = 0.50;
    const fanSpacing = trayWidth * 0.28;
    [-fanSpacing, fanSpacing].forEach(fx => {
      // Fan circular intake shroud
      const shroudGeom = new THREE.TorusGeometry(fanRadius, 0.03, 8, 28);
      shroudGeom.rotateX(Math.PI / 2);
      const shroud = new THREE.Mesh(shroudGeom, materials.metalMat);
      shroud.position.set(fx, 0.065, 0);
      group.add(shroud);

      // Motor hub
      const hubGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16);
      const hub = new THREE.Mesh(hubGeom, materials.metalMat);
      hub.position.set(fx, 0, 0);
      group.add(hub);

      // 7 aerodynamic turbine blades
      const bladeGeom = new THREE.BoxGeometry(fanRadius * 0.65, 0.08, 0.12);
      for (let b = 0; b < 7; b++) {
        const angle = (b * Math.PI * 2) / 7;
        const blade = new THREE.Mesh(bladeGeom, materials.accentMat);
        blade.position.set(
          fx + Math.cos(angle) * (fanRadius * 0.52),
          0,
          Math.sin(angle) * (fanRadius * 0.52)
        );
        blade.rotation.y = -angle + 0.35;
        blade.rotation.z = 0.25;
        group.add(blade);
      }

      // Chrome concentric finger guard rings (top and bottom)
      [0.07, -0.07].forEach(gy => {
        [fanRadius * 0.45, fanRadius * 0.80].forEach(r => {
          const ringGeom = new THREE.TorusGeometry(r, 0.012, 6, 24);
          ringGeom.rotateX(Math.PI / 2);
          const ring = new THREE.Mesh(ringGeom, materials.metalMat);
          ring.position.set(fx, gy, 0);
          group.add(ring);
        });

        // Cross spokes
        const spokeGeom = new THREE.BoxGeometry(fanRadius * 1.8, 0.012, 0.012);
        const spoke1 = new THREE.Mesh(spokeGeom, materials.metalMat);
        spoke1.position.set(fx, gy, 0);
        spoke1.rotation.y = Math.PI / 4;
        group.add(spoke1);

        const spoke2 = new THREE.Mesh(spokeGeom, materials.metalMat);
        spoke2.position.set(fx, gy, 0);
        spoke2.rotation.y = -Math.PI / 4;
        group.add(spoke2);
      });
    });

    // Illuminated power switch on fan tray
    const swGeom = new THREE.BoxGeometry(0.12, 0.04, 0.18);
    const swMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.8 });
    const swMesh = new THREE.Mesh(swGeom, swMat);
    swMesh.position.set(0, 0.065, -trayDepth / 2 + 0.25);
    group.add(swMesh);
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

  group.traverse((child) => {
    (child as any).userData = { item, isProductMesh: true };
  });

  return group;
}
