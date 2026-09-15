import Papa from 'papaparse';

export interface CabinetMatrixData {
  sku: string;
  model?: string;
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

export const GENERIC_SHELF_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="100%" height="100%">
  <defs>
    <linearGradient id="shelfMetal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="35%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="earMetal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#475569" />
      <stop offset="50%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <pattern id="ventGrid" width="24" height="14" patternUnits="userSpaceOnUse">
      <rect x="2" y="2" width="20" height="5" rx="2.5" fill="#090d16" />
      <rect x="2" y="3" width="20" height="2" rx="1" fill="#1e293b" opacity="0.6" />
    </pattern>
  </defs>
  <!-- Base frame plate -->
  <rect x="15" y="20" width="470" height="200" rx="8" fill="#090d16" stroke="#334155" stroke-width="2" />
  <!-- Shelf Surface in 3D perspective -->
  <polygon points="45,45 455,45 475,185 25,185" fill="url(#shelfMetal)" stroke="#64748b" stroke-width="2" />
  <!-- Ventilation perforation grid -->
  <polygon points="70,60 430,60 450,165 50,165" fill="url(#ventGrid)" opacity="0.95" />
  <!-- Front fold / Lip -->
  <polygon points="25,185 475,185 475,205 25,205" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5" />
  <line x1="25" y1="187" x2="475" y2="187" stroke="#94a3b8" stroke-width="2" opacity="0.7" />
  <!-- Left mounting bracket with standard 19" rack holes -->
  <rect x="15" y="40" width="28" height="148" rx="4" fill="url(#earMetal)" stroke="#94a3b8" stroke-width="1.5" />
  <circle cx="29" cy="65" r="5" fill="#090d16" stroke="#cbd5e1" stroke-width="1.5" />
  <circle cx="29" cy="114" r="5" fill="#090d16" stroke="#cbd5e1" stroke-width="1.5" />
  <circle cx="29" cy="163" r="5" fill="#090d16" stroke="#cbd5e1" stroke-width="1.5" />
  <!-- Right mounting bracket with standard 19" rack holes -->
  <rect x="457" y="40" width="28" height="148" rx="4" fill="url(#earMetal)" stroke="#94a3b8" stroke-width="1.5" />
  <circle cx="471" cy="65" r="5" fill="#090d16" stroke="#cbd5e1" stroke-width="1.5" />
  <circle cx="471" cy="114" r="5" fill="#090d16" stroke="#cbd5e1" stroke-width="1.5" />
  <circle cx="471" cy="163" r="5" fill="#090d16" stroke="#cbd5e1" stroke-width="1.5" />
  <!-- Center metallic label badge -->
  <rect x="150" y="190" width="200" height="13" rx="3" fill="#0f172a" stroke="#0284c7" stroke-width="1" />
  <text x="250" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="bold" fill="#38bdf8" text-anchor="middle" letter-spacing="0.5">19" RACK SHELF • מדף מתכת מאוורר</text>
</svg>
`)}`;

export const parseAccessoryCount = (val: any): number => {
  if (!val) return 0;
  const str = String(val).trim().toUpperCase();
  if (
    str === 'X' ||
    str === '0' ||
    str === '-' ||
    str === '--' ||
    str.includes('לא כלול') ||
    str.includes('ללא') ||
    str.includes('אין') ||
    str.includes('מידע לא זמין') ||
    str.includes('NONE') ||
    str.includes('NO') ||
    str.includes('N/A') ||
    str.includes('NA')
  ) {
    return 0;
  }
  // Clean out common false-positive numbers like voltage or inches before matching quantity
  let cleanStr = str.replace(/[0-9]{1,4}\s*[vV]\b|[0-9]{1,4}\s*וולט/gi, '');
  cleanStr = cleanStr.replace(/19\s*["״'']|19\s*inch/gi, '');
  
  // Look for explicit quantity patterns like "2 מדפים", "כולל 4 מאווררים", "2 יחידות", "4 מאווררים"
  const qtyMatch = cleanStr.match(/(?:כולל|עם|מכיל)?\s*(\d+)\s*(?:יח|יחידות|מדפ|מאוורר|גלגל|רגל|fan|shelf)/i);
  if (qtyMatch) {
    return parseInt(qtyMatch[1], 10);
  }
  
  // If it's literally just a number
  if (/^\s*\d+\s*$/.test(cleanStr.trim())) {
    return parseInt(cleanStr.trim(), 10);
  }

  // Standalone checkmark or inclusion phrases
  if (
    /^(?:[Vv✓✔]|YES|TRUE|כלול|כולל)$/.test(str) ||
    str.includes('כלול') ||
    str.includes('כולל') ||
    str.includes('מדף') ||
    str.includes('מאוורר') ||
    str.includes('גלגל') ||
    str.includes('רגליות')
  ) {
    return 1;
  }
  return 0;
};

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

export const KNOWN_MATRIX_SHELF_SKUS = new Set<string>([
  '1024',
  '1152',
  '2234',
  '1179',
  '117909',
  '117911',
  '117913',
  '117914',
  '117915',
  '117916',
  '150460',
  '150461',
  '150463',
  '150467',
  '150470',
  '130460D',
]);

export const extractAllMatrixShelfSkus = (matrix: Record<string, CabinetMatrixData>): Set<string> => {
  const set = new Set<string>(KNOWN_MATRIX_SHELF_SKUS);
  for (const cabSku in matrix) {
    const cab = matrix[cabSku];
    if (!cab) continue;
    (cab.suitableStandard || []).forEach(s => s && s !== 'X' && set.add(normalizeSku(s)));
    (cab.suitableHanging || []).forEach(s => s && s !== 'X' && set.add(normalizeSku(s)));
    (cab.suitableSliding || []).forEach(s => s && s !== 'X' && set.add(normalizeSku(s)));
  }
  return set;
};

export const isProductShelf = (
  prodOrSku: any,
  catalogMap?: Map<string, any>,
  allMatrixShelfSkus?: Set<string>
): boolean => {
  if (!prodOrSku) return false;

  let sku = '';
  let prod: any = null;

  if (typeof prodOrSku === 'string') {
    sku = normalizeSku(prodOrSku);
    if (catalogMap && catalogMap.has(sku)) {
      prod = catalogMap.get(sku);
    }
  } else if (typeof prodOrSku === 'object') {
    sku = normalizeSku(prodOrSku.sku || prodOrSku.pn);
    prod = prodOrSku;
    if ((!prod.name || !prod.description) && catalogMap && catalogMap.has(sku)) {
      prod = { ...catalogMap.get(sku), ...prod };
    }
  }

  // 1. Check SKU against matrix shelf columns across the matrix
  if (sku) {
    if (allMatrixShelfSkus && allMatrixShelfSkus.has(sku)) return true;
    if (KNOWN_MATRIX_SHELF_SKUS.has(sku)) return true;
  }

  // 2. Check product text / subcategories
  if (prod) {
    const name = String(prod.name || prod['שם פריט'] || '').toLowerCase();
    const desc = String(prod.description || prod['תיאור'] || '').toLowerCase();
    const sub = String(prod.subcategory || prod['קטגוריה'] || '').toLowerCase();
    const nested = String(prod.nestedSubcategory || prod['תת קטגוריה'] || prod['Nested subcategory'] || '').toLowerCase();

    // Prevent non-shelf equipment (amplifiers, UPS, switches, PDUs, etc.) from accidental classification
    const isExplicitNonShelf = /מגבר|amplifier|מתג|switch|נתב|router|אל פסק|ups|pdu|פס שקע|פאנל|panel|מברשת|brush|מאוורר|fan|גלגל|wheel|רגלית|feet|בורג|screw|תושבת/i.test(name);
    if (isExplicitNonShelf) return false;

    if (/מדף|shelf|מגירה|drawer/i.test(name)) return true;
    if (nested.includes('מדפ') || sub.includes('מדפ')) return true;
    // Strict description check: only if explicitly beginning or titled as shelf
    if (/^\s*(מדף|מגירה|shelf|drawer)\b/i.test(desc)) return true;
  }

  return false;
};

export const transformImageLink = (url: string, size: number = 600): string => {
  if (!url) return '';
  try {
    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    const parsed = new URL(trimmedUrl);
    const host = parsed.hostname.toLowerCase();
    const isGoogleDrive = host === 'drive.google.com' || host.endsWith('.drive.google.com');
    const isGoogleLh3 = host === 'lh3.googleusercontent.com' || host.endsWith('.lh3.googleusercontent.com');

    if (isGoogleDrive && parsed.pathname.includes('/folders/')) {
      return '';
    }

    let fileId: string | null = null;
    if (isGoogleDrive) {
      if (parsed.pathname.includes('/file/d/')) {
        const match = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) fileId = match[1];
      } else if (parsed.searchParams.has('id')) {
        fileId = parsed.searchParams.get('id');
      }
    } else if (isGoogleLh3) {
      const match = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }

    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=w${size}`;
    }
    return trimmedUrl;
  } catch {
    return url;
  }
};

export const KNOWN_BRANDS = ['HIKVISION', 'POLMAN', 'EZVIZ', 'CISCO', 'DAHUA', 'UBIQUITI', 'TP-LINK', 'D-LINK', 'BOOST', 'INGENIUM', 'RACKMOUNT'];

export const deriveBrand = (pp: any): string => {
  if (!pp) return 'כללי';
  
  // 1. Explicit brand property from data object
  const explicitBrand = pp.brand || pp['מותג'] || pp.Brand || pp.manufacturer || pp['יצרן'];
  if (explicitBrand && typeof explicitBrand === 'string' && !explicitBrand.startsWith('http')) {
    const trimmed = explicitBrand.trim();
    if (trimmed && trimmed !== 'כללי' && trimmed !== 'אחר' && trimmed !== 'תשתיות' && trimmed !== 'מחירון תשתיות') {
      const up = trimmed.toUpperCase();
      const matched = KNOWN_BRANDS.find(b => up.includes(b));
      if (matched) return matched;
      return trimmed;
    }
  }

  // 2. Scan text for known brands
  const hay = `${pp.name || ''} ${pp.description || ''} ${pp.subcategory || ''} ${pp.category || ''} ${pp.sku || ''}`.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (hay.includes(b)) return b;
  }

  // 3. Fallback
  return 'כללי';
};

export const parseDepthMmLocal = (txt: string): number => {
  if (!txt) return 0;
  const str = String(txt);

  // Match explicit depth mention (עומק: X or depth X or D=X or בעומק X)
  // Check for unit (mm / מ"מ vs cm / ס"מ)
  // Match explicit depth mention (עומק: X or depth X or D=X or בעומק X)
  // Check for unit (mm / מ"מ vs cm / ס"מ). Handle different quotes.
  const depthMatch = str.match(/(?:עומק|depth|D=)\s*[:]?\s*([0-9]{2,4})\s*(מ[״"']?מ|mm|ס[״"']?מ|cm)?/i);
  if (depthMatch) {
    const val = parseInt(depthMatch[1], 10);
    const unit = (depthMatch[2] || '').toLowerCase();
    if (unit.includes('ס') || unit.includes('cm')) {
      return val * 10; // e.g. "עומק 60 cm" -> 600, "עומק 60 ס״מ" -> 600
    }
    if (unit.includes('מ') || unit.includes('mm')) {
      return val; // e.g. "עומק 80 mm" -> 80
    }
    // No unit: < 150 assumes cm, >= 150 assumes mm
    return val < 150 ? val * 10 : val;
  }

  // Look for dimension patterns like 600x800 or 600*800 or 800D, but NEVER match "רוחב X cm" or "גובה X cm"
  const dimMatch = str.match(/בגודל\s*([0-9]{2,4})\s*[*xX\u00d7]\s*([0-9]{2,4})/i);
  if (dimMatch) {
    const d = parseInt(dimMatch[1], 10);
    return d < 150 ? d * 10 : d;
  }

  return 0; // No reliable depth found, do not invent one
};

export interface GroupedRubric {
  id: string;
  title: string;
  brand?: string;
  brandLogo?: string;
  items: any[];
  tone: string;
}

/**
 * Unified grouping for all accessory selection views:
 * - Matrix Shelves
 * - HIKVISION
 * - POLMAN
 * - Additional brand groups
 * - Additional equipment taking space (>0U, no shelves, no brand items)
 * - Accessories taking no space (0U, no brand items)
 *
 * Guarantees every candidate item appears in EXACTLY ONE group.
 */
export function groupAccessoriesForDisplay(
  accessories: any[],
  searchQuery: string = '',
  _availableU?: number
): GroupedRubric[] {
  const qTokens = searchQuery.trim().toLowerCase().split(/[\s\-/,]+/).filter(Boolean);

  // Search filter across SKU, Name, Description, Brand
  // Note: We do NOT filter out items by availableU capacity here!
  // All compatible items remain visible in their respective tabs/rubrics.
  // The UI displays an "insufficient space" indicator and disables the add button
  // for items that exceed remaining U, ensuring tabs never disappear.
  const filtered = (accessories || []).filter(acc => {
    if (qTokens.length === 0) return true;
    const hay = `${acc.pn || ''} ${acc.sku || ''} ${acc.name || ''} ${acc.description || ''} ${acc.brand || ''}`.toLowerCase();
    return qTokens.every(tok => hay.includes(tok));
  });

  // Ensure unique SKUs in the result and filter disallowed items
  const seenSkus = new Set<string>();
  const uniqueFiltered = filtered.filter(acc => {
    const rawSku = (acc.sku || acc.pn || '').toUpperCase();
    const norm = normalizeSku(rawSku);
    if (!norm || norm === '111014') return false;
    if (seenSkus.has(norm)) return false;
    seenSkus.add(norm);
    const itemText = `${acc.name || ''} ${acc.description || ''}`.toLowerCase();
    if (norm === '821410' || itemText.includes('שערות') || (itemText.includes('פנל') && itemText.includes('מברשת'))) {
      acc.uSize = 1;
    }
    return true;
  });

  const shelves = uniqueFiltered.filter(acc => acc.isShelf);
  const nonShelves = uniqueFiltered.filter(acc => !acc.isShelf);

  const brandMap: Record<string, any[]> = {};
  const takesU: any[] = [];
  const freeU: any[] = [];
  const pdus: any[] = [];

  nonShelves.forEach(acc => {
    const rawSku = (acc.sku || acc.pn || '').toUpperCase();
    const norm = normalizeSku(rawSku);
    const itemText = `${acc.name || ''} ${acc.description || ''}`.toLowerCase();
    if (norm === '821410' || itemText.includes('שערות') || (itemText.includes('פנל') && itemText.includes('מברשת'))) {
      acc.uSize = 1;
    }
    if (acc._pdu) {
      pdus.push(acc);
      return;
    }
    const b = String(acc.brand || '').trim();
    const isDistinctBrand = b && b !== 'כללי' && b !== 'אחר' && !b.startsWith('http');
    if (isDistinctBrand) {
      const brandKey = b.toUpperCase();
      if (!brandMap[brandKey]) brandMap[brandKey] = [];
      brandMap[brandKey].push(acc);
    } else {
      if ((acc.uSize ?? 1) === 0) {
        freeU.push(acc);
      } else {
        takesU.push(acc);
      }
    }
  });

  const rubrics: GroupedRubric[] = [];

  // Group 1: Matrix Shelves
  if (shelves.length > 0) {
    rubrics.push({
      id: 'shelves',
      title: 'מדפים המתאימים לפי המטריצה',
      items: shelves,
      tone: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    });
  }

  // Group: PDUs
  if (pdus.length > 0) {
    rubrics.push({
      id: 'pdus',
      title: 'פסי שקעים (PDU)',
      items: pdus,
      tone: 'bg-purple-50 text-purple-900 border-purple-200',
    });
  }

  // Priority Brand Groups: HIKVISION first, POLMAN second, then others alphabetically
  const brandKeys = Object.keys(brandMap);
  const prioritizedBrands = ['HIKVISION', 'POLMAN'];

  prioritizedBrands.forEach(bName => {
    const key = brandKeys.find(k => k.toUpperCase() === bName);
    if (key && brandMap[key]?.length > 0) {
      const firstWithLogo = brandMap[key].find((it: any) => it.brandLogo);
      rubrics.push({
        id: `brand-${bName.toLowerCase()}`,
        title: bName,
        brand: bName,
        brandLogo: firstWithLogo?.brandLogo,
        items: brandMap[key],
        tone: 'bg-amber-50 text-amber-900 border-amber-200',
      });
    }
  });

  brandKeys
    .filter(k => !prioritizedBrands.includes(k.toUpperCase()))
    .sort()
    .forEach(bKey => {
      if (brandMap[bKey]?.length > 0) {
        const firstWithLogo = brandMap[bKey].find((it: any) => it.brandLogo);
        rubrics.push({
          id: `brand-${bKey.toLowerCase().replace(/\s+/g, '-')}`,
          title: bKey,
          brand: bKey,
          brandLogo: firstWithLogo?.brandLogo,
          items: brandMap[bKey],
          tone: 'bg-amber-50 text-amber-900 border-amber-200',
        });
      }
    });

  // Group: Additional equipment taking space (>0U)
  if (takesU.length > 0) {
    rubrics.push({
      id: 'takes-u',
      title: 'ציוד נוסף שתופס מקום בארון',
      items: takesU,
      tone: 'bg-[#e6f0fa] text-[#004387] border-blue-200',
    });
  }

  // Group: Accessories taking no space (0U)
  if (freeU.length > 0) {
    rubrics.push({
      id: 'free-u',
      title: 'אביזרים ללא תפיסת נפח (0U)',
      items: freeU,
      tone: 'bg-slate-100 text-slate-800 border-slate-300',
    });
  }

  return rubrics;
}

export const isAccessoryAShelf = (accNameOrDescOrSku: string): boolean => {
  if (!accNameOrDescOrSku) return false;
  const norm = normalizeSku(accNameOrDescOrSku);
  if (KNOWN_MATRIX_SHELF_SKUS.has(norm)) return true;
  const text = accNameOrDescOrSku.toLowerCase();
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

export const parseCabinetDepthFromName = (name: string): number => {
  const m = String(name || '').match(/בגודל\s*([0-9]{2,4})\s*[*xX×]\s*([0-9]{2,4})/);
  if (m) { const d = parseInt(m[1], 10); return d < 150 ? d * 10 : d; }
  return 0;
};

export const isCabinetProduct = (pp: any): boolean => {
  if (!pp) return false;
  const name = String(pp?.name || pp?.['שם פריט'] || '').trim();
  const desc = String(pp?.description || pp?.['תיאור'] || '').trim();
  const sub = String(pp?.subcategory || pp?.['תת קטגוריה'] || pp?.['קטגוריה'] || '').trim();
  const cat = String(pp?.category || '').trim();
  const nested = String(pp?.nestedSubcategory || pp?.['Nested subcategory'] || '').trim();

  // 1. Explicit accessories and mounted equipment are NOT cabinet enclosures
  const isAccessoryOrEquipment = 
    /מדף|מדפים|shelf|shelves|מגירה|drawer/i.test(name) ||
    /פאנל|פנל|panel|blank|עיוור|סיבים/i.test(name) ||
    /מאוורר|מפוח|fan|איוורור/i.test(name) ||
    /פס שקע|פסי שקעים|שקע|pdu|power strip/i.test(name) ||
    /ניהול כבל|מארגן כבל|תעלת כבל|ארגונית כבל|מברשת|brush|cable management/i.test(name) ||
    /בורג|ברגים|אום|אומים|screw|cage nut/i.test(name) ||
    /גלגל|גלגלים|caster|wheel|רגלי|רגלית|feet/i.test(name) ||
    /דלת חלופית|דופן צד|side panel|מנעול לארון|ידית לארון|lock|handle/i.test(name) ||
    /הארקה|grounding|תרמוסטט|thermostat|בסיס לארון|plinth/i.test(name) ||
    /מסיל|מסילות|rail|פרופיל|תושבת|bracket|מתאם/i.test(name) ||
    /מתג|switch|נתב|router|מגבר|amplifier|אל פסק|ups|סולל|battery|nvr|dvr|מצלמ|camera|ספק כח|ספק כוח|power supply/i.test(name) ||
    /ערכת|kit|כלי עבודה|tool|מחלץ|extractor/i.test(name);

  if (isAccessoryOrEquipment) return false;

  // 2. Explicit cabinet enclosures by subcategory or nested subcategory
  const isCabinetSub = 
    /ארונות עומדים|ארונות תלויים|ארונות שרתים|ארונות פתוחים|ארונות תקשורת עומדים|ארונות תקשורת תלויים|מסדים עומדים|מסדים תלויים|מסדים פתוחים|ארונות ומסדים|מסדים/i.test(nested) ||
    /ארונות עומדים|ארונות תלויים|ארונות שרתים|ארונות פתוחים|ארונות תקשורת עומדים|ארונות תקשורת תלויים/i.test(sub);

  if (isCabinetSub) return true;

  // 3. Explicit cabinet name matches (e.g. "ארון תקשורת עומד 42U", "ארון שרתים 19 אינץ'", "מסד תקשורת 15U", "מארז ארון...")
  if (/(?:ארון תקשורת|ארון שרתים|ארון עומד|ארון תלוי|ארון פתוח|מסד תקשורת|מסד שרתים|מסד עומד|מסד תלוי|מסד פתוח|מארז תקשורת|server\s+cabinet|network\s+cabinet|wallmount\s+cabinet|floor\s+cabinet|rack\s+cabinet)/i.test(name)) {
    return true;
  }

  // 4. Cabinet starting with ארון / מסד / מארז with a U-size declaration (e.g. "ארון 19 12U", "מסד 42U 800x1000")
  if (/^(?:ארון|מסד|מארז|Cabinet|Rack)\b/i.test(name) && /\b\d{1,2}\s*[uU]\b/i.test(`${name} ${desc}`)) {
    return true;
  }

  // 5. If subcategory/category is "ארונות תקשורת" and product is named like a cabinet
  if (/ארונות תקשורת|מסדים/i.test(sub) || /ארונות תקשורת|מסדים/i.test(cat)) {
    if (/\b\d{1,2}\s*[uU]\b/i.test(name) && /ארון|מסד|Cabinet|Rack/i.test(name)) {
      return true;
    }
  }

  return false;
};
