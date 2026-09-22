import Papa from 'papaparse';
import { resolveCabinetDimensions } from '../src/components/Cabinet3D/CabinetModelBuilder';
import { CabinetDimensions3D } from '../src/components/Cabinet3D/Cabinet3DTypes';
import { CabinetMatrixData, parseCompatibleSkus, normalizeSku } from '../src/utils/cabinetData';

async function runAudit() {
  console.log('--- STARTING COMPREHENSIVE CABINET MATRIX AUDIT ---');
  const res = await fetch('http://localhost:3000/api/sheets?gid=250535112');
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status}`);
  }
  const csvText = await res.text();
  const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: false }).data as any[][];
  
  console.log(`Total CSV rows: ${parsed.length}`);
  
  // Row 0 is header row 1, Row 1 is subheaders, data starts at row 2
  const headers1 = parsed[0];
  const headers2 = parsed[1];
  console.log('Headers line 1:', headers1);
  console.log('Headers line 2:', headers2);

  const cabinets: CabinetMatrixData[] = [];
  const issues: string[] = [];
  const uDistribution: Record<number, number> = {};

  for (let i = 2; i < parsed.length; i++) {
    const row = parsed[i];
    if (!row || !row[0]) continue;
    const sku = normalizeSku(row[0]);
    if (!sku || sku === 'X') continue;

    const uVal = parseInt(String(row[2]), 10);
    const widthVal = parseInt(String(row[3]), 10);
    const depthVal = parseInt(String(row[4]), 10);

    const cab: CabinetMatrixData = {
      sku,
      u: isNaN(uVal) ? 0 : uVal,
      width: isNaN(widthVal) ? null : widthVal,
      depth: isNaN(depthVal) ? null : depthVal,
      frontDoor: String(row[5] ?? '').trim(),
      rearDoor: String(row[6] ?? '').trim(),
      color: String(row[7] ?? '').trim(),
      fans: String(row[8] ?? '').trim(),
      wheels: String(row[9] ?? '').trim(),
      levelingFeet: String(row[10] ?? '').trim(),
      shelvesQty: String(row[11] ?? '').trim(),
      suitableStandard: parseCompatibleSkus(row[12]),
      suitableHanging: parseCompatibleSkus(row[13]),
      suitableSliding: parseCompatibleSkus(row[14]),
    };
    cabinets.push(cab);

    uDistribution[cab.u] = (uDistribution[cab.u] || 0) + 1;

    // Validation checks
    if (!cab.u || cab.u <= 0) {
      issues.push(`SKU ${sku}: Missing or invalid U count (${row[2]})`);
    }
    if (!cab.width || cab.width <= 0) {
      issues.push(`SKU ${sku}: Missing or invalid Width (${row[3]})`);
    }
    if (!cab.depth || cab.depth <= 0) {
      issues.push(`SKU ${sku}: Missing or invalid Depth (${row[4]})`);
    }

    // Check resolveCabinetDimensions
    const mockProduct = { sku: cab.sku, name: `${row[1] || ''} ${cab.u}U` };
    const dims = resolveCabinetDimensions(mockProduct, cab, cab.u);
    if (!dims.widthMm || dims.widthMm <= 0 || !dims.depthMm || dims.depthMm <= 0 || !dims.totalU || dims.totalU <= 0) {
      issues.push(`SKU ${sku}: resolveCabinetDimensions returned invalid dimensions: ${JSON.stringify(dims)}`);
    }
  }

  console.log(`\nSuccessfully parsed ${cabinets.length} unique cabinet records.`);
  console.log('U Capacity distribution:', uDistribution);
  
  if (issues.length > 0) {
    console.log(`\nFound ${issues.length} data discrepancies:`);
    issues.forEach(iss => console.log(' - ' + iss));
  } else {
    console.log('\nAll cabinet rows parsed with valid U, Width, Depth, and Dimensions!');
  }

  // Specific Check 2: Cabinet 2227
  console.log('\n--- VERIFYING CABINET 2227 ---');
  const cab2227 = cabinets.find(c => c.sku === '2227');
  if (!cab2227) {
    console.error('ERROR: Cabinet 2227 not found in matrix!');
  } else {
    console.log('Cabinet 2227 Data:', JSON.stringify(cab2227, null, 2));
    const allPermittedShelves = [
      ...cab2227.suitableStandard,
      ...cab2227.suitableHanging,
      ...cab2227.suitableSliding
    ];
    console.log('Cabinet 2227 Permitted Shelves:', allPermittedShelves);
    
    const requiredPermitted = ['1024', '150467', '150463'];
    const requiredForbidden = ['150470', '150461', '150460'];

    requiredPermitted.forEach(req => {
      const ok = allPermittedShelves.includes(req);
      console.log(`Shelf ${req} permitted on 2227: ${ok ? 'YES (PASS)' : 'NO (FAIL)'}`);
    });

    requiredForbidden.forEach(forb => {
      const isForbidden = !allPermittedShelves.includes(forb);
      console.log(`Shelf ${forb} forbidden on 2227: ${isForbidden ? 'YES (PASS)' : 'NO (FAIL - permitted!)'}`);
    });
  }
}

runAudit().catch(console.error);
