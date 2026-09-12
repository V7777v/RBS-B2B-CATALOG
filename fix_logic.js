import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

const regex = /const buildCatalogAccessories = [\s\S]*?const ILLUSTRATION_ACCESSORIES/m;

const newLogic = `const buildCatalogAccessories = (catalogData: any[], productSkuNorm: string, cabinet: CabinetMatrixData | null, compatMap: Record<string, any>) => {
  const CAB_ACC_SUB = 'אביזרים לארונות תקשורת';
  
  const isFlagged = (pp: any) => {
    const flagStr = String(pp?.['התאמה לארון '] || pp?.['התאמה לארון'] || pp?.tags || '').trim().toLowerCase();
    return flagStr === 'true' || flagStr === 'כן' || flagStr === 'yes' || flagStr === 'v' || flagStr === '1' || flagStr === 'TRUE' || flagStr.includes('cfg-acc');
  };

  const parseAccU = (pp: any): number => {
    const raw = String(pp?.['נפח '] || pp?.['נפח'] || '');
    const trimmed = raw.trim();
    if (trimmed === '') return 1; // Business rule: empty = 1U
    
    const m = trimmed.match(/^([0-9.]+)\\s*[uU]?$/);
    if (m) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v >= 0) return v;
    }
    
    console.warn(\`[Data Error] Invalid volume value "\${raw}" for SKU \${pp.sku}\`);
    return 1; // Fallback to 1 if we must, or handle properly. Let's return 1 to avoid breaking.
  };

  const resolveAccU = (pp: any) => {
    // If explicit U is zero (e.g. "0") it will be parsed as 0.
    const u = parseAccU(pp);
    if (String(pp?.nestedSubcategory || '').includes('פסי שקעים') && String(pp?.['נפח '] || pp?.['נפח'] || '').trim() === '') {
       return 0; // Old rule for PDU if volume is empty
    }
    return u;
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

  const diag = { total: (catalogData || []).length, rejectedSku: 0, rejectedSelf: 0, rejectedOtherCab: 0, rejectedExtractor: 0, candidateMatrix: 0, candidateCompat: 0, candidateFlagged: 0, final: 0 };
  
  const inMatrixSet = new Set<string>();
  if (cabinet) {
    cabinet.suitableStandard.forEach(s => inMatrixSet.add(s));
    cabinet.suitableHanging.forEach(s => inMatrixSet.add(s));
    cabinet.suitableSliding.forEach(s => inMatrixSet.add(s));
  }

  const candidates = (catalogData || []).filter((pp: any) => {
    if (!pp || !pp.sku) { diag.rejectedSku++; return false; }
    const normSku = normalizeSku(pp.sku);
    if (normSku === productSkuNorm) { diag.rejectedSelf++; return false; }
    
    const nameHay = \`\${pp.name || ''} \${pp.description || ''}\`.toLowerCase();
    if (/(?:^|\\s)(ארון|מסד|מארז)\\s/.test(nameHay) && !nameHay.includes('אביזר') && !nameHay.includes('מדף')) { diag.rejectedOtherCab++; return false; }
    if (/מחלץ|extractor|כלי\\b|tool\\b/.test(nameHay)) { diag.rejectedExtractor++; return false; }

    const isMatrix = inMatrixSet.has(normSku);
    const isCompat = !!compatMap[normSku];
    const flagged = isFlagged(pp);
    // Backward compatibility: items in 'אביזרים לארונות תקשורת' 
    // are automatically considered flagged for suitability.
    const inUniverse = String(pp.subcategory || '').trim() === CAB_ACC_SUB;
    
    if (isMatrix) diag.candidateMatrix++;
    if (isCompat) diag.candidateCompat++;
    if (flagged || inUniverse) diag.candidateFlagged++;

    return isMatrix || isCompat || flagged || inUniverse;
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
    return candidates;
  }
  
  console.log('[Catalog Diagnostics]', diag);
  
  const final = candidates.filter((a: any) => {
    const isShelf = isAccessoryAShelf(a.name || '');
    const accDepthFallback = a._depth ? a._depth : null;
    const result = checkAccessoryFitsCabinet(a.sku, isShelf, cabinet, compatMap, accDepthFallback);
    return result.fits;
  });
  
  return final;
};

const ILLUSTRATION_ACCESSORIES`;

content = content.replace(regex, newLogic);
fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
