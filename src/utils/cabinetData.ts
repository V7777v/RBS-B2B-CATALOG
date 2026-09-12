import Papa from 'papaparse';

export interface CabinetMatrixData {
  sku: string;
  u: number;
  width: number | null;
  depth: number | null;
  frontDoor: string;
  rearDoor: string;
  color: string;
  fans: string;
  wheels: string;
  levelingFeet: string;
  shelvesQty: string;
  suitableStandard: string[];
  suitableHanging: string[];
  suitableSliding: string[];
}

export const normalizeSku = (sku: any): string => String(sku ?? '').trim().toUpperCase();

export const parseCompatibleSkus = (cellValue: string | undefined): string[] => {
  if (!cellValue) return [];
  const val = cellValue.toString().trim();
  if (val.toUpperCase() === 'X') return [];
  return val.split(/[\s,;\n]+/).map(s => normalizeSku(s)).filter(s => s.length > 0);
};

export const fetchCabinetMatrix = async (appCheckTok: string): Promise<Record<string, CabinetMatrixData>> => {
  const acHeaders = { headers: { 'X-Firebase-AppCheck': appCheckTok } };
  const CABINETS_CSV_URL = '/api/sheets?gid=250535112';
  try {
    const cabRes = await fetch(CABINETS_CSV_URL, acHeaders);
    if (!cabRes.ok) throw new Error(`HTTP ${cabRes.status}`);
    const cabCsvText = await cabRes.text();
    const cabRows = (Papa.parse(cabCsvText, { header: false, skipEmptyLines: false }).data) as any[][];
    
    const matrix: Record<string, CabinetMatrixData> = {};
    for (let i = 2; i < cabRows.length; i++) {
       const row = cabRows[i];
       if (!row || row[0] === undefined || row[0] === null) continue;
       const sku = normalizeSku(row[0]);
       if (!sku || sku === 'X') continue;

       const uVal = parseInt(String(row[2]), 10);
       const widthVal = parseInt(String(row[3]), 10);
       const depthVal = parseInt(String(row[4]), 10);

       matrix[sku] = {
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
    }
    return matrix;
  } catch (e) {
    console.warn("Failed to fetch cabinet matrix", e);
    return {};
  }
};

export const parseCompatRange = (s: string): any => {
  const str = String(s || '');
  if (str.includes('כל הארונות')) return { all: true };
  const u = str.match(/(\d+)U?\s*-\s*(\d+)U/i);
  const uMin = u ? parseInt(u[1], 10) : null;
  const uMax = u ? parseInt(u[2], 10) : null;
  let dMin: number | null = null, dMax: number | null = null;
  const dr = str.match(/עומק[:\s]*([0-9]{2,4})\s*-\s*([0-9]{2,4})/);
  if (dr) { dMin = parseInt(dr[1], 10); dMax = parseInt(dr[2], 10); }
  else { const d = str.match(/עומק[:\s]*([0-9]{2,4})/); if (d) { dMin = dMax = parseInt(d[1], 10); } }
  return { uMin, uMax, dMin, dMax };
};

export const fetchCompatMap = async (appCheckTok: string): Promise<Record<string, any>> => {
  const acHeaders = { headers: { 'X-Firebase-AppCheck': appCheckTok } };
  let compatMap: Record<string, any> = {};
  try {
    const compRes = await fetch('/api/sheets?gid=1366808268', acHeaders);
    if (compRes.ok) {
      const compText = await compRes.text();
      const compRows = (Papa.parse(compText, { header: false, skipEmptyLines: false }).data) as any[][];
      for (const row of compRows) {
        const sku = normalizeSku(row[0]);
        if (!sku || !/^[0-9]/.test(sku)) continue;
        const rangeStr = String(row[5] ?? '');
        if (rangeStr.trim()) compatMap[sku] = parseCompatRange(rangeStr);
      }
    }
  } catch (e) {
    console.warn('Compat sheet optional - skipped', e);
  }
  return compatMap;
};

export const isAccessoryAShelf = (accNameOrDesc: string): boolean => {
  const text = accNameOrDesc.toLowerCase();
  return text.includes('מדף') || text.includes('shelf') || text.includes('מגירה') || text.includes('drawer');
};

export const checkAccessoryFitsCabinet = (
  accSku: string,
  isShelf: boolean,
  cabinet: CabinetMatrixData,
  compatMap: Record<string, any>,
  accDepthFallback: number | null
): { fits: boolean; reason: string } => {
  const normAccSku = normalizeSku(accSku);
  
  // Matrix check for shelves
  if (isShelf) {
    const isStd = cabinet.suitableStandard.includes(normAccSku);
    const isHanging = cabinet.suitableHanging.includes(normAccSku);
    const isSliding = cabinet.suitableSliding.includes(normAccSku);
    
    if (isStd || isHanging || isSliding) {
      return { fits: true, reason: 'Matched in cabinet matrix' };
    }
    
    // Conflict detection
    const c = compatMap[normAccSku];
    if (c) {
      const uFits = (!c.uMin || cabinet.u >= c.uMin) && (!c.uMax || cabinet.u <= c.uMax);
      const dFits = (!c.dMin || (cabinet.depth !== null && cabinet.depth >= c.dMin)) && 
                    (!c.dMax || (cabinet.depth !== null && cabinet.depth <= c.dMax));
      
      if (c.all || (uFits && dFits)) {
        console.warn(`[DEV REPORT] Conflict: Shelf ${normAccSku} fits Cabinet ${cabinet.sku} according to compatMap, but is NOT listed in the Cabinet Matrix. Matrix is authoritative. Rejecting match.`);
      }
    }
    return { fits: false, reason: 'Not listed in cabinet matrix' };
  }
  
  // For non-shelves, check compatMap
  const c = compatMap[normAccSku];
  if (c) {
    if (c.all) return { fits: true, reason: 'Compat map - fits all' };
    
    if (c.uMin != null && cabinet.u > 0 && cabinet.u < c.uMin) return { fits: false, reason: 'Cabinet too small (U)' };
    if (c.uMax != null && cabinet.u > 0 && cabinet.u > c.uMax) return { fits: false, reason: 'Cabinet too big (U)' };
    
    if (c.dMin != null) {
      if (cabinet.depth === null) return { fits: false, reason: 'Cabinet depth unknown, cannot guarantee fit' };
      if (cabinet.depth < c.dMin) return { fits: false, reason: 'Cabinet too shallow' };
    }
    if (c.dMax != null) {
      if (cabinet.depth === null) return { fits: false, reason: 'Cabinet depth unknown, cannot guarantee fit' };
      if (cabinet.depth > c.dMax) return { fits: false, reason: 'Cabinet too deep' };
    }
    return { fits: true, reason: 'Matched compat map constraints' };
  }
  
  // If no explicit compatMap rule exists for a non-shelf, do a basic depth sanity check if we have one.
  if (cabinet.depth !== null && accDepthFallback !== null) {
    // If the accessory is significantly deeper than the cabinet, it doesn't fit
    if (accDepthFallback > cabinet.depth + 40) return { fits: false, reason: 'Accessory physically too deep' };
  }
  
  return { fits: true, reason: 'Universal/Unrestricted accessory' };
};
