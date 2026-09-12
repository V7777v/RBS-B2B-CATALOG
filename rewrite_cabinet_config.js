import fs from 'fs';

let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// Import utilities
if (!content.includes('fetchCabinetMatrix')) {
  content = content.replace(
    "import Papa from 'papaparse';",
    "import Papa from 'papaparse';\nimport { fetchCabinetMatrix, fetchCompatMap, checkAccessoryFitsCabinet, isAccessoryAShelf, normalizeSku, CabinetMatrixData } from '../utils/cabinetData';"
  );
}

// Remove normalizeSku if it exists locally in the file to avoid conflict
content = content.replace(/const normalizeSku = [^;]+;/, '');

// Change buildCatalogAccessories signature and body
const newBuildCatalogAccessories = `const buildCatalogAccessories = (catalogData: any[], productSkuNorm: string, cabinet: CabinetMatrixData | null, compatMap: Record<string, any>) => {
  const CAB_ACC_SUB = 'אביזרים לארונות תקשורת';
  const isFlagged = (pp: any) => pp?.tags?.includes('cfg-acc');
  const resolveAccU = (pp: any) => {
    const raw = String(pp?.['נפח'] || '').trim();
    const vol = parseFloat(raw);
    if (raw !== '' && !isNaN(vol) && vol >= 0) return vol;           // authoritative column "נפח"
    if (String(pp?.nestedSubcategory || '').includes('פסי שקעים')) return 0; // PDU = free
    return determineUSize(pp?.sku || '', \`\${pp?.name || ''} \${pp?.description || ''}\`);
  };
  const parseDepthMmLocal = (txt: string): number => {
    if (!txt) return 0;
    const m = String(txt).match(/עומק[:\\s]*([0-9]{2,4})/);
    let n = m ? parseInt(m[1], 10) : 0;
    if (!n) { const m2 = String(txt).match(/([0-9]{2,4})\\s*(ס"?מ|cm|מ"מ|mm)/i); n = m2 ? parseInt(m2[1], 10) : 0; }
    if (!n) return 0;
    return n < 150 ? n * 10 : n;
  };
  const KNOWN_BRANDS = ['HIKVISION', 'EZVIZ', 'POLMAN', 'BOOST', 'INGENIUM', 'UBIQUITI', 'TP-LINK', 'DAHUA'];
  const deriveBrand = (pp: any): string => {
    const hay = \`\${pp?.category || ''} \${pp?.subcategory || ''} \${pp?.name || ''} \${pp?.sku || ''}\`.toUpperCase();
    for (const b of KNOWN_BRANDS) if (hay.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
    const c = String(pp?.category || '').replace('מחירון', '').replace(/20\\d\\d/, '').trim();
    return c || 'אחר';
  };
  const built = (catalogData || []).filter((pp: any) => {
    if (!pp || !pp.sku) return false;
    if (normalizeSku(pp.sku) === productSkuNorm) return false;               // not the cabinet itself
    const nested = String(pp.nestedSubcategory || '');
    if (nested.includes('דלת מחוררת') || nested.includes('דלת זכוכית')) return false; // other cabinets
    const nameHay = \`\${pp.name || ''} \${pp.description || ''}\`.toLowerCase();
    if (/מחלץ|extractor|כלי\\b|tool\\b/.test(nameHay)) return false;
    const inUniverse = String(pp.subcategory || '').trim() === CAB_ACC_SUB &&
      (nested.includes('אביזרים לארונות') || nested.includes('פסי שקעים'));
    return inUniverse || isFlagged(pp);
  }).map((pp: any) => ({
    pn: pp.sku, sku: pp.sku, name: pp.name, price: pp.price,
    description: pp.description || '', uSize: resolveAccU(pp), suitableRange: '',
    _depth: parseDepthMmLocal(\`\${pp.name || ''} \${pp.description || ''}\`),
    _promoted: isFlagged(pp), brand: deriveBrand(pp),
    brandLogo: (typeof pp.brand === 'string' && pp.brand.startsWith('http')) ? pp.brand : '',
    _pdu: String(pp.nestedSubcategory || '').includes('פסי שקעים'),
    _curated: !!compatMap[String(pp.sku ?? '').trim().toUpperCase()],
    image: (pp.images && pp.images[0]) || pp.imageURL || '',
  }));
  
  if (!cabinet) {
    // If no cabinet matrix data is available, do a highly permissive filter for robustness
    return built;
  }
  
  return built.filter((a: any) => {
    const isShelf = isAccessoryAShelf(a.name || '');
    const accDepthFallback = a._depth ? a._depth : null;
    const result = checkAccessoryFitsCabinet(a.sku, isShelf, cabinet, compatMap, accDepthFallback);
    return result.fits;
  });
};`;

// Find and replace buildCatalogAccessories
const buildRegex = /const buildCatalogAccessories = \([\s\S]*?\n};\n/m;
content = content.replace(buildRegex, newBuildCatalogAccessories + '\n');

// Also remove shelfFitsCabinet as it's unused and obsolete
const shelfFitsRegex = /const shelfFitsCabinet = \([\s\S]*?\n};\n/m;
content = content.replace(shelfFitsRegex, '');

// Fix CabinetData interface (remove it, we use CabinetMatrixData)
const cabDataRegex = /interface CabinetData \{[\s\S]*?\}/;
content = content.replace(cabDataRegex, '');

// Use CabinetMatrixData for setCabinetData state
content = content.replace(/useState<CabinetData \| null>/g, 'useState<CabinetMatrixData | null>');

fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
