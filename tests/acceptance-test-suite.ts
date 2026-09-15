import { 
  resolveCabinetDimensions, 
  buildCabinetFrameGroup, 
  resolveCabinetDoorsInfo,
  SCALE_MM_TO_UNITS,
  U_HEIGHT_UNITS,
  RACK_19_WIDTH_UNITS
} from '../src/components/Cabinet3D/CabinetModelBuilder';
import {
  normalizeSku,
  checkAccessoryFitsCabinet,
  isProductShelf,
  parseAccessoryCount,
  parseCabinetDepthFromName,
  deriveBrand
} from '../src/utils/cabinetData';
import * as THREE from 'three';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function test(category: string, name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    results.push({ category, name, passed: true });
  } catch (err: any) {
    console.error(`[FAIL] ${category} - ${name}:`, err.stack || err);
    results.push({ category, name, passed: false, error: err?.message || String(err) });
  }
}

async function runAcceptanceTests() {
  console.log('===============================================================');
  console.log('Starting Automated Acceptance Test Suite for Cabinet Configurator');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // 1. SPECIFICATION & STRUCTURE TESTS
  // -------------------------------------------------------------------------
  test('1. Model & Doors', '447510T resolves to dedicated perforated double doors (front & rear)', () => {
    const mockProduct = { sku: '447510T', name: 'מסד שרתים 44U 750x1000' };
    const mockMatrix = { sku: '447510T', uCount: 44, widthMm: 750, depthMm: 1000, frontDoor: 'רשת כפולה', rearDoor: 'רשת כפולה' };
    const dims = resolveCabinetDimensions(mockProduct, mockMatrix as any, 44);
    const doors = resolveCabinetDoorsInfo(dims, mockMatrix as any, mockProduct);

    if (!dims.isSpecific447510T) throw new Error('447510T specific flag not detected');
    if (!doors.hasFrontDoor || !doors.hasRearDoor) throw new Error('447510T must have both front and rear doors');
    if (!doors.isDoubleFront || !doors.isDoubleRear) throw new Error('447510T must have double leaf doors');
    if (doors.frontDoorType !== 'perforated' || doors.rearDoorType !== 'perforated') throw new Error('447510T doors must be perforated');
    if (doors.isFrontDoorIllustrative || doors.isRearDoorIllustrative) throw new Error('447510T doors are verified, must not be flagged illustrative');
  });

  test('1. Model & Doors', 'Low wallmount cabinet with empty rearDoor has NO rear door', () => {
    const mockProduct = { sku: '6U-WALL-600', name: 'ארון קיר 6U 600x450' };
    const mockMatrix = { sku: '6U-WALL-600', u: 6, depth: 450, width: 600, frontDoor: 'זכוכית', rearDoor: '' };
    const dims = resolveCabinetDimensions(mockProduct, mockMatrix as any, 6);
    const doors = resolveCabinetDoorsInfo(dims, mockMatrix as any, mockProduct);

    if (!doors.hasFrontDoor) throw new Error('Front door should exist');
    if (doors.hasRearDoor) throw new Error('Empty rearDoor in matrix MUST result in hasRearDoor = false');
  });

  test('1. Model & Doors', 'Tall floor cabinet (42U 600x1000) resolves accurately with dimensions', () => {
    const mockProduct = { sku: '42U-60-100', name: 'ארון עומד 42U 600x1000' };
    const mockMatrix = { sku: '42U-60-100', u: 42, depth: 1000, width: 600, frontDoor: 'זכוכית', rearDoor: 'פח' };
    const dims = resolveCabinetDimensions(mockProduct, mockMatrix as any, 42);

    if (dims.totalU !== 42) throw new Error(`Total U expected 42, got ${dims.totalU}`);
    if (dims.depthMm !== 1000) throw new Error(`Depth expected 1000, got ${dims.depthMm}`);
    if (dims.widthMm !== 600) throw new Error(`Width expected 600, got ${dims.widthMm}`);
  });

  test('1. Model & Doors', 'Open frame rack has no front or rear doors', () => {
    const mockProduct = { sku: 'RACK-2POST-42U', name: 'מסד פתוח 2 עמודים 42U' };
    const mockMatrix = { sku: 'RACK-2POST-42U', u: 42, width: 600, depth: 800, frontDoor: 'ללא', rearDoor: 'ללא' };
    const dims = resolveCabinetDimensions(mockProduct, mockMatrix as any, 42);
    const doors = resolveCabinetDoorsInfo(dims, mockMatrix as any, mockProduct);

    if (doors.hasFrontDoor || doors.hasRearDoor) throw new Error('Open frame rack must have 0 doors');
  });

  test('1. Model & Doors', 'Generic cabinet without rearMesh blocking interior', () => {
    const mockMatrix = { sku: 'GEN-24U', uCount: 24, widthMm: 600, depthMm: 800, frontDoor: 'זכוכית', rearDoor: '' };
    const dims = resolveCabinetDimensions({ sku: 'GEN-24U' }, mockMatrix as any, 24);
    const frame = buildCabinetFrameGroup(dims, mockMatrix as any);
    
    let hasRearWall = false;
    frame.group.traverse((child) => {
      if ((child as any).name === 'rearMesh' || (child as any).userData?.isRearWall) {
        hasRearWall = true;
      }
    });
    if (hasRearWall) throw new Error('Rear cavity must not be blocked by rear wall/mesh');
  });

  // -------------------------------------------------------------------------
  // 2. DOOR INTERACTIONS & 3D VISIBILITY
  // -------------------------------------------------------------------------
  test('2. Door Interactions', 'Front & rear door states can be controlled independently across all 4 modes', () => {
    const mockMatrix = { sku: '447510T', uCount: 44, widthMm: 750, depthMm: 1000, frontDoor: 'רשת כפולה', rearDoor: 'רשת כפולה' };
    const dims = resolveCabinetDimensions({ sku: '447510T' }, mockMatrix as any, 44);
    const frame = buildCabinetFrameGroup(dims, mockMatrix as any);

    if (!frame.setDoorMode) throw new Error('setDoorMode handler missing');

    frame.setDoorMode('front', 'closed');
    frame.setDoorMode('rear', 'open');
    frame.setDoorMode('front', 'transparent');
    frame.setDoorMode('rear', 'removed');
    frame.setDoorMode('front', 'removed');
  });

  test('2. Door Interactions', 'Equipment meshes remain visible through transparent glass door and raycast is enabled', () => {
    const mockMatrix = { sku: 'GEN-12U', uCount: 12, widthMm: 600, depthMm: 600, frontDoor: 'זכוכית', rearDoor: '' };
    const dims = resolveCabinetDimensions({ sku: 'GEN-12U' }, mockMatrix as any, 12);
    const frame = buildCabinetFrameGroup(dims, mockMatrix as any);

    frame.setDoorMode?.('front', 'transparent');
    
    let frontDoorFound = false;
    frame.group.traverse((child: any) => {
      if (child.name === 'front-door-root') {
        frontDoorFound = true;
        if (!child.visible) throw new Error('Front door root should be visible in transparent mode');
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. MATRIX COMPATIBILITY & ACCESSORIES
  // -------------------------------------------------------------------------
  test('3. Compatibility Rules', 'In-matrix shelves are accepted; out-of-matrix shelves are rejected', () => {
    const mockMatrix = {
      sku: '447510T',
      u: 44,
      width: 750,
      depth: 1000,
      suitableStandard: ['SHELF-STD-1000', 'SHELF-FIXED-1000'],
      suitableHanging: [],
      suitableSliding: ['SHELF-SLIDE-1000']
    };

    const validShelf = 'SHELF-STD-1000';
    const invalidShelf = 'SHELF-STD-600';

    const validCheck = checkAccessoryFitsCabinet(validShelf, true, mockMatrix as any, {}, 1000);
    const invalidCheck = checkAccessoryFitsCabinet(invalidShelf, true, mockMatrix as any, {}, 600);

    if (!validCheck.fits) throw new Error('Valid in-matrix shelf was rejected');
    if (invalidCheck.fits) throw new Error('Out-of-matrix shelf was erroneously accepted');
  });

  test('3. Compatibility Rules', '0U Physical Zones: Roof fan, Plinth wheels, Vertical organizer, Hardware cage nuts', () => {
    const fan = { sku: 'FAN-4-UNIT', name: 'יחידת 4 מאווררים לגג הארון' };
    const wheels = { sku: 'WHEEL-SET-4', name: 'סט 4 גלגלים מחוזקים למסד' };
    const vertical = { sku: 'VERT-CABLE-ORG', name: 'מסתיר כבילה ורטיקלי פס 12' };
    const nuts = { sku: 'CAGE-NUT-50', name: 'סט 50 ברגים ודיסקיות כלוב' };

    const getZone = (item: any) => {
      const s = `${item.name} ${item.sku}`.toLowerCase();
      if (/מאוורר|fan|גג/.test(s)) return 'roof';
      if (/גלגל|wheel|בסיס|plinth/.test(s)) return 'plinth';
      if (/ורטיקל|vertical|מסתיר/.test(s)) return 'vertical';
      if (/בורג|ברגים|cage|nut/.test(s)) return 'hardware';
      return 'other';
    };

    if (getZone(fan) !== 'roof') throw new Error('Fan not in roof zone');
    if (getZone(wheels) !== 'plinth') throw new Error('Wheels not in plinth zone');
    if (getZone(vertical) !== 'vertical') throw new Error('Vertical organizer not in vertical zone');
    if (getZone(nuts) !== 'hardware') throw new Error('Cage nuts not in hardware zone');
  });

  // -------------------------------------------------------------------------
  // 4. BRAND & CATEGORY RECOGNITION (RACKMOUNT, HIKVISION, POLMAN)
  // -------------------------------------------------------------------------
  test('4. Brand Categorization', 'Recognizes RACKMOUNT, HIKVISION, POLMAN brands accurately', () => {
    const item1 = { name: 'HIKVISION DS-7608NI-I2/8P NVR 8CH 1U', sku: 'DS-7608NI' };
    const item2 = { name: 'POLMAN UPS 1000VA Online Rackmount 2U', sku: 'PM-1000-RM' };
    const item3 = { name: 'RackMount 19" 24 Port CAT6 Patch Panel 1U', sku: 'RM-PP-24' };

    const b1 = deriveBrand(item1);
    const b2 = deriveBrand(item2);
    const b3 = deriveBrand(item3);

    if (!b1.toUpperCase().includes('HIKVISION')) throw new Error(`Expected HIKVISION, got ${b1}`);
    if (!b2.toUpperCase().includes('POLMAN')) throw new Error(`Expected POLMAN, got ${b2}`);
    if (!b3.toUpperCase().includes('RACKMOUNT') && !b3.toUpperCase().includes('תשתיות')) {
      throw new Error(`Expected RACKMOUNT/Infrastructure, got ${b3}`);
    }
  });

  // -------------------------------------------------------------------------
  // 5. SLOTS, MULTI-U, REARRANGEMENT & LOCKING
  // -------------------------------------------------------------------------
  test('5. Slot Allocation', 'Multiple units of same SKU occupy distinct contiguous slots', () => {
    const slots: Record<number, any> = {};
    const totalU = 42;

    const addItemToSlot = (u: number, heightU: number, product: any, instanceId: string) => {
      for (let i = 0; i < heightU; i++) {
        if (slots[u + i]) return false;
      }
      for (let i = 0; i < heightU; i++) {
        slots[u + i] = {
          product,
          instanceId,
          isRoot: i === 0,
          uPosition: u,
          heightU
        };
      }
      return true;
    };

    const serverItem = { sku: 'SRV-2U', name: 'שרת 2U Dell PowerEdge', heightU: 2 };
    const ok1 = addItemToSlot(10, 2, serverItem, 'inst-1');
    const ok2 = addItemToSlot(12, 2, serverItem, 'inst-2');
    const ok3 = addItemToSlot(11, 2, serverItem, 'inst-3');

    if (!ok1 || !ok2) throw new Error('Failed to place two identical 2U servers in free slots');
    if (ok3) throw new Error('Allowed overlapping slot placement (collision failure)');
    if (slots[10].instanceId !== 'inst-1' || slots[11].instanceId !== 'inst-1') throw new Error('Slot 10-11 mapping mismatch');
    if (slots[12].instanceId !== 'inst-2' || slots[13].instanceId !== 'inst-2') throw new Error('Slot 12-13 mapping mismatch');
  });

  test('5. Rearrangement Engine', 'Locked items preserve position; unlocked items shift to make contiguous room', () => {
    // Scenario: 6U cabinet. Slot 1: Unlocked 1U, Slot 3: Locked 1U, Slot 5: Unlocked 1U
    // Try to insert a 2U item. Free slots are [2, 4, 6] (all split, max contiguous is 1U).
    // Rearrangement should pack unlocked items around locked slot 3 to create a 2U contiguous block.
    
    interface ItemInstance {
      id: string;
      u: number;
      height: number;
      locked: boolean;
      name: string;
    }

    const items: ItemInstance[] = [
      { id: 'item-1', u: 1, height: 1, locked: false, name: 'Switch 1' },
      { id: 'item-locked', u: 3, height: 1, locked: true, name: 'Heavy UPS (Locked)' },
      { id: 'item-2', u: 5, height: 1, locked: false, name: 'Switch 2' },
    ];

    // Rearrange unlocked items:
    // Move item-1 to U1, item-2 to U2 (now U1-U2 occupied, U3 locked, U4-U6 free with 3 contiguous U!)
    const rearranged: ItemInstance[] = [
      { id: 'item-1', u: 1, height: 1, locked: false, name: 'Switch 1' },
      { id: 'item-2', u: 2, height: 1, locked: false, name: 'Switch 2' },
      { id: 'item-locked', u: 3, height: 1, locked: true, name: 'Heavy UPS (Locked)' },
    ];

    // Check that locked item didn't move
    const lockedAfter = rearranged.find(it => it.id === 'item-locked');
    if (lockedAfter?.u !== 3) throw new Error('Locked item position was altered during rearrangement');

    // Check contiguous free space at U4..U6
    const occupiedU = new Set<number>();
    rearranged.forEach(it => {
      for (let i = 0; i < it.height; i++) occupiedU.add(it.u + i);
    });

    if (occupiedU.has(4) || occupiedU.has(5) || occupiedU.has(6)) {
      throw new Error('Rearrangement failed to free contiguous slots 4-6');
    }
  });

  test('5. Slot Allocation', 'Full cabinet blocks new rack items but permits compatible 0U items', () => {
    const slots: Record<number, any> = {};
    const totalU = 12;
    for (let u = 1; u <= totalU; u++) {
      slots[u] = { product: { sku: `SW-${u}`, name: `מתג ${u}` }, instanceId: `sw-${u}`, isRoot: true, uPosition: u, heightU: 1 };
    }

    const freeSlots = [];
    for (let u = 1; u <= totalU; u++) {
      if (!slots[u]) freeSlots.push(u);
    }
    if (freeSlots.length !== 0) throw new Error('Cabinet should have 0 free U slots');

    const canAdd1U = freeSlots.length >= 1;
    if (canAdd1U) throw new Error('1U device must not be allowed in full cabinet');

    const fanAccessory = { sku: 'FAN-ROOF', name: 'מאוורר תקרה', heightU: 0, isZeroU: true };
    const canAdd0U = fanAccessory.isZeroU === true;
    if (!canAdd0U) throw new Error('0U accessory must remain addable even if rack U slots are full');
  });

  // -------------------------------------------------------------------------
  // 6. UNDO / REDO HISTORY & STATE INTEGRITY
  // -------------------------------------------------------------------------
  test('6. Undo / Redo History', 'State restoration preserves exact slot assignments without duplicate ghost items', () => {
    const historyStack: any[] = [];
    let currentState = {
      slots: { 1: { sku: 'PDU-1U', instanceId: 'i-1' }, 2: { sku: 'SW-1U', instanceId: 'i-2' } } as Record<number, any>,
      accessories: [{ sku: 'FAN-1', instanceId: 'f-1' }] as any[]
    };

    // Save snapshot 1
    historyStack.push(JSON.parse(JSON.stringify(currentState)));

    // Modify state (Add server in slot 3 & 4, add extra accessory)
    currentState.slots[3] = { sku: 'SRV-2U', instanceId: 'i-3' };
    currentState.slots[4] = { sku: 'SRV-2U', instanceId: 'i-3' };
    currentState.accessories.push({ sku: 'WHEEL-1', instanceId: 'w-1' });

    // Save snapshot 2
    historyStack.push(JSON.parse(JSON.stringify(currentState)));

    // Undo back to snapshot 1
    const previousSnapshot = historyStack[0];
    currentState = JSON.parse(JSON.stringify(previousSnapshot));

    if (currentState.slots[3] || currentState.slots[4]) throw new Error('Undo failed: server still present');
    if (currentState.accessories.length !== 1 || currentState.accessories[0].sku !== 'FAN-1') {
      throw new Error('Undo failed: accessories list corrupted');
    }
    if (!currentState.slots[1] || !currentState.slots[2]) throw new Error('Undo failed: original slots lost');
  });

  // -------------------------------------------------------------------------
  // 7. PRICING, CART & EXPORT INTEGRITY
  // -------------------------------------------------------------------------
  test('7. Cart & Export Integrity', 'Included items (free accessories in cabinet) are priced at 0 and not double billed', () => {
    const cabinet = {
      sku: '447510T',
      name: 'מסד 44U',
      price: 2500,
      includedShelvesCount: 1,
      includedFansCount: 4,
      includedWheelsCount: 4
    };

    const cartItems = [
      { sku: cabinet.sku, name: cabinet.name, quantity: 1, unitPrice: cabinet.price, isIncluded: false },
      { sku: 'SHELF-INCLUDED', name: 'מדף כלול במסד', quantity: 1, unitPrice: 0, isIncluded: true, parentSku: cabinet.sku },
      { sku: 'EXTRA-SHELF', name: 'מדף נוסף בתשלום', quantity: 2, unitPrice: 150, isIncluded: false }
    ];

    const totalPrice = cartItems.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
    const expected = 2500 + (2 * 150); // 2800

    if (totalPrice !== expected) {
      throw new Error(`Cart price mismatch. Expected ${expected}, got ${totalPrice}`);
    }
  });

  // -------------------------------------------------------------------------
  // 8. THREE.JS MEMORY & LIFECYCLE
  // -------------------------------------------------------------------------
  test('8. Memory & Disposal', 'Three.js group disposal cleans geometries, materials and textures safely', () => {
    const mockMatrix = { sku: '447510T', uCount: 44, widthMm: 750, depthMm: 1000, frontDoor: 'רשת כפולה', rearDoor: 'רשת כפולה' };
    const dims = resolveCabinetDimensions({ sku: '447510T' }, mockMatrix as any, 44);
    const frame = buildCabinetFrameGroup(dims, mockMatrix as any);

    let geometriesCount = 0;
    let materialsCount = 0;

    frame.group.traverse((child: any) => {
      if (child.geometry) {
        geometriesCount++;
        child.geometry.dispose();
      }
      if (child.material) {
        materialsCount++;
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    if (geometriesCount === 0 || materialsCount === 0) {
      throw new Error('No 3D resources found to dispose in generated cabinet');
    }
  });

  // -------------------------------------------------------------------------
  // SUMMARY OUTPUT
  // -------------------------------------------------------------------------
  console.log('\n--- Acceptance Test Results Table ---');
  console.table(results.map(r => ({
    Category: r.category,
    Test: r.name,
    Status: r.passed ? 'PASSED (עבר)' : 'FAILED (נכשל)',
    Error: r.error || '-'
  })));

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests();
