import { CabinetMatrixData, normalizeSku } from './cabinetData';

export interface ZeroUException {
  sku: string;
  name: string;
  zone: 'roof' | 'plinth' | 'vertical' | 'hardware';
  reason: string;
  minU?: number;
  maxU?: number;
  minDepth?: number;
  maxDepth?: number;
}

/**
 * Authoritative dictionary of verified 0U accessories.
 * Centrally documented with rationale and physical installation zone.
 */
export const VERIFIED_ZERO_U_EXCEPTIONS: Record<string, ZeroUException> = {
  // Wheels and Feet (Plinth/Base)
  '2232': {
    sku: '2232',
    name: 'סט גלגלים "2 לארון תקשורת',
    zone: 'plinth',
    reason: 'אושר מפורשות ע"י המשתמש. מותקן בבסיס/תחתית הארון מחוץ לשטח ה-U הפנימי',
  },
  '1118': {
    sku: '1118',
    name: 'סט רגליות לארונות תקשורת (4 יח\') 25U-42U',
    zone: 'plinth',
    reason: 'רגליות פילוס בבסיס הארון. מיועד לארונות עומדים 25U-42U',
    minU: 20,
  },
  '111818': {
    sku: '111818',
    name: 'סט רגליות קטנות לארונות 4U - 20U',
    zone: 'plinth',
    reason: 'רגליות פילוס קטנות לבסיס ארונות תלייה 4U-20U',
    maxU: 20,
  },

  // Roof / Ceiling accessories
  '831010': {
    sku: '831010',
    name: 'תאורת לד לארון תקשורת "10 כולל מגנט וחיישן קרבה',
    zone: 'roof',
    reason: 'אושר מפורשות ע"י המשתמש. התקנה מגנטית לתקרת/דופן הארון ללא תפיסת מסילת U',
  },
  '2233': {
    sku: '2233',
    name: 'מאוורר לארון תקשורת 220V + כבל חשמל',
    zone: 'roof',
    reason: 'מאוורר בודד המותקן בפתחי האיוורור הייעודיים בגג הארון',
  },

  // Vertical & Side Cable Management
  '105456': {
    sku: '105456',
    name: 'תעלה ורטיקלית לסידור כבלים לארונות תקשורת 20-32U',
    zone: 'vertical',
    reason: 'תעלת ניהול כבילה ורטיקלית המותקנת בצד הארון (עמודות צד), אינה תופסת U חזיתי',
    minU: 20,
    maxU: 32,
  },
  '105458': {
    sku: '105458',
    name: 'מסתיר ליצאה/כניסת כבלים בארון תקשורת',
    zone: 'hardware',
    reason: 'כיסוי מגן לכניסת/יציאת כבילה במעטפת הארון',
  },

  // Heavy Equipment Support Rails (Sides)
  '150480': {
    sku: '150480',
    name: 'זוג תומכי רלסים לארונות תקשורת בעומק 800',
    zone: 'hardware',
    reason: 'תומכים צידיים למסילות הארון עבור ציוד כבד, אינם תופסים יחידות U חזיתיות',
    minDepth: 800,
  },
  '150481': {
    sku: '150481',
    name: 'זוג תומכי רלסים לארונות תקשורת בעומק 1000',
    zone: 'hardware',
    reason: 'תומכים צידיים למסילות הארון עבור ציוד כבד, אינם תופסים יחידות U חזיתיות',
    minDepth: 1000,
  },

  // Cage Nuts & Screws
  '13454511': {
    sku: '13454511',
    name: 'סט של 4 אום כלוב עם בורג ושייבה לארון תקשורת',
    zone: 'hardware',
    reason: 'ברגים ואומי כלוב להתקנת ציוד',
  },
  '8224': {
    sku: '8224',
    name: 'אום כלוב עם בורג ושייבה לפנל ארון 50 יח באריזה',
    zone: 'hardware',
    reason: 'מארז 50 ברגים ואומי כלוב להתקנת ציוד',
  },

  // Vertical 12-outlet PDUs (mount vertically in side/rear cable channels)
  '812131111': {
    sku: '812131111',
    name: 'פס 12 שקעים ישראלים מאמת 16A, לד ביקורת, אורך כבל -3מ\' תקע רגיל',
    zone: 'vertical',
    reason: 'פס 12 שקעים אנכי (0U) באורך כ-70 ס"מ, מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
  '812151111': {
    sku: '812151111',
    name: 'פס 12 שקעים ישראלים מאמת 16A, לד ביקורת, אורך כבל -5מ\' תקע רגיל',
    zone: 'vertical',
    reason: 'פס 12 שקעים אנכי (0U) באורך כ-70 ס"מ, מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
  '812151112': {
    sku: '812151112',
    name: 'פס 12 שקעים IL ,מאמת 16A ונורת ביקורת 5מ\' כבל תקע סיקון',
    zone: 'vertical',
    reason: 'פס 12 שקעים אנכי (0U) באורך כ-70 ס"מ, מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
  '812131112': {
    sku: '812131112',
    name: 'פס 12 שקעים ישראלים מאמת 16A, לד ביקורת, אורך כבל -3מ\' תקע סיקון',
    zone: 'vertical',
    reason: 'פס 12 שקעים אנכי (0U) באורך כ-70 ס"מ, מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
  '812231112': {
    sku: '812231112',
    name: '12 שקעים קומקום (C13) מאמת 16A, לד ביקורת, אורך כבל -3מ\' תקע סיקון',
    zone: 'vertical',
    reason: 'פס 12 שקעים C13 אנכי (0U), מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
  '812251112': {
    sku: '812251112',
    name: 'פס 12 שקעים קומקום (C13) מאמת 16A, לד ביקורת, אורך כבל -5מ\' תקע סיקון',
    zone: 'vertical',
    reason: 'פס 12 שקעים C13 אנכי (0U), מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
  '812251111': {
    sku: '812251111',
    name: 'פס 12 שקעים קומקום (C13) מאמת 16A, לד ביקורת, אורך כבל -5מ\' תקע רגיל',
    zone: 'vertical',
    reason: 'פס 12 שקעים C13 אנכי (0U), מותקן ורטיקלית בדופן/גב הארון',
    minU: 15,
  },
};

/**
 * Checks if a string or object has the "התאמה לארון" flag set to TRUE.
 */
export const isFlaggedForCabinetSuitability = (pp: any): boolean => {
  if (!pp) return false;
  // Normalized lookup: check multiple spelling variations
  const keys = Object.keys(pp);
  for (const k of keys) {
    const trimmed = k.trim();
    if (trimmed === 'התאמה לארון' || trimmed === 'התאמה לארונות') {
      const val = String(pp[k] ?? '').trim().toLowerCase();
      if (val === 'true' || val === 'כן' || val === 'yes' || val === '1' || val === 'v') {
        return true;
      }
    }
  }
  return false;
};

export interface VolumeResult {
  hasExplicitValue: boolean;
  volume: number | null;
  isExplicitZero: boolean;
  dataError?: string;
}

/**
 * Normalizes and parses the explicit volume cell value.
 * Handles 0, "0", "0U", blank cells, whitespace, and decimals.
 * Identifies and logs invalid data without silently converting it.
 */
export const parseNormalizedVolume = (pp: any): VolumeResult => {
  let raw: any = undefined;
  if (pp) {
    const keys = Object.keys(pp);
    for (const k of keys) {
      const trimmed = k.trim();
      if (trimmed === 'נפח' || trimmed === 'נפח בארון' || trimmed === 'volume' || trimmed === 'u_size') {
        raw = pp[k];
        break;
      }
    }
  }

  if (raw === undefined || raw === null) {
    return { hasExplicitValue: false, volume: null, isExplicitZero: false };
  }

  const str = String(raw).trim();
  if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') {
    return { hasExplicitValue: false, volume: null, isExplicitZero: false };
  }

  // Explicit 0
  if (str === '0' || str.toLowerCase() === '0u') {
    return { hasExplicitValue: true, volume: 0, isExplicitZero: true };
  }

  // Number with optional 'U' suffix, e.g. "1", "2", "2.5", "1U", "2u"
  const m = str.match(/^([0-9]+(\.[0-9]+)?)\s*[uU]?$/);
  if (m) {
    const val = parseFloat(m[1]);
    if (!isNaN(val) && val >= 0) {
      if (val % 1 !== 0) {
        console.warn(`[Data Warning] Fractional U value (${val}) for SKU ${pp?.sku}. Rack grid operates on whole U units.`);
      }
      return { hasExplicitValue: true, volume: val, isExplicitZero: val === 0 };
    }
  }

  // Invalid data format
  console.warn(`[Data Error] Invalid volume format "${str}" for SKU ${pp?.sku || 'unknown'}`);
  return { hasExplicitValue: false, volume: null, isExplicitZero: false, dataError: str };
};

/**
 * Resolves U consumption according to the 4-tier user business priority rules:
 * 1. Explicit valid volume from the sheet.
 * 2. In absence of volume: verified 0U accessory mapping from source/rules.
 * 3. For Track C additional equipment flagged "התאמה לארון" with empty volume: defaults to 1U.
 * 4. For other accessories: extracts U from description (e.g. 1U, 2U, 3U) or defaults to 1U.
 */
/**
 * List of SKUs strictly prohibited from being added as cabinet accessories (e.g. hand tools).
 */
export const DISALLOWED_ACCESSORY_SKUS = new Set<string>(['111014']);

export const isDisallowedAccessorySku = (skuOrPn: any): boolean => {
  if (!skuOrPn) return false;
  const norm = normalizeSku(typeof skuOrPn === 'string' ? skuOrPn : (skuOrPn.sku || skuOrPn.pn || ''));
  return DISALLOWED_ACCESSORY_SKUS.has(norm);
};

export const resolveUConsumption = (
  pp: any,
  isTrackC: boolean = false
): { u: number; source: 'explicit' | 'zero_u_rule' | 'track_c_default' | 'rack_pattern_default' } => {
  const normSku = normalizeSku(typeof pp === 'string' ? pp : (pp?.sku || pp?.pn));
  const nameDesc = typeof pp === 'object' && pp ? `${pp?.name || ''} ${pp?.description || ''}`.toLowerCase() : '';

  // Explicit user directive: SKU 821410 (פנל שערות / מברשת) occupies 1U in standard rack rails
  if (normSku === '821410' || nameDesc.includes('שערות') || (nameDesc.includes('פנל') && nameDesc.includes('מברשת'))) {
    return { u: 1, source: 'rack_pattern_default' };
  }

  // Priority 1: Explicit valid volume
  const volResult = parseNormalizedVolume(pp);
  if (volResult.hasExplicitValue && volResult.volume !== null) {
    // Check if user-verified 0U items have an explicit contradictory volume in the sheet
    if ((normSku === '2232' || normSku === '831010') && volResult.volume > 0) {
      console.warn(`[Data Contradiction] SKU ${normSku} was designated as 0U by user, but has explicit volume ${volResult.volume}U in sheet!`);
    }
    return { u: volResult.volume, source: 'explicit' };
  }

  // Priority 2: Verified 0U exception mapping
  if (normSku && VERIFIED_ZERO_U_EXCEPTIONS[normSku]) {
    return { u: 0, source: 'zero_u_rule' };
  }

  const text = `${pp?.sku || ''} ${pp?.name || ''} ${pp?.description || ''}`.toLowerCase();
  
  // Specific catch for brush panel / cable management (פנל שיערות / פנל עיוור) that might default to 0 incorrectly
  if (text.includes('פנל') || text.includes('פאנל') || text.includes('ניהול כבל') || text.includes('מארגן כבל')) {
    const uMatch = text.match(/(\d+)\s*u\b/i);
    if (uMatch) {
        return { u: parseInt(uMatch[1], 10), source: 'rack_pattern_default' };
    }
    return { u: 1, source: 'rack_pattern_default' };
  }

  // Priority 3: Track C flagged equipment with empty volume defaults to 1U
  if (isTrackC || isFlaggedForCabinetSuitability(pp)) {
    return { u: 1, source: 'track_c_default' };
  }

  // Priority 4: Rack accessories pattern-matching or 1U default
  const uMatchFallback = text.match(/(\d+)\s*u\b/i);
  if (uMatchFallback) {
    const parsed = parseInt(uMatchFallback[1], 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return { u: parsed, source: 'rack_pattern_default' };
    }
  }

  return { u: 1, source: 'rack_pattern_default' };
};

/**
 * Checks physical compatibility for Track B cabinet accessories against the cabinet.
 */
export const checkTrackBAccessoryCompatibility = (
  pp: any,
  cabinet: CabinetMatrixData | null,
  compatMap: Record<string, any>
): { fits: boolean; reason: string } => {
  if (!cabinet) return { fits: true, reason: 'No cabinet constraints' };

  const normSku = normalizeSku(pp?.sku);

  // Check verified constraints
  const zeroUDef = VERIFIED_ZERO_U_EXCEPTIONS[normSku];
  if (zeroUDef) {
    if (zeroUDef.minU && cabinet.u > 0 && cabinet.u < zeroUDef.minU) {
      return { fits: false, reason: `מתאים לארונות מ-${zeroUDef.minU}U ומעלה` };
    }
    if (zeroUDef.maxU && cabinet.u > 0 && cabinet.u > zeroUDef.maxU) {
      return { fits: false, reason: `מתאים לארונות עד ${zeroUDef.maxU}U` };
    }
    if (zeroUDef.minDepth && cabinet.depth !== null && cabinet.depth < zeroUDef.minDepth) {
      return { fits: false, reason: `מתאים לארונות בעומק ${zeroUDef.minDepth} מ"מ ומעלה` };
    }
    if (zeroUDef.maxDepth && cabinet.depth !== null && cabinet.depth > zeroUDef.maxDepth) {
      return { fits: false, reason: `מתאים לארונות בעומק עד ${zeroUDef.maxDepth} מ"מ` };
    }
  }

  // Check compatMap from sheet 1366808268 if present
  if (compatMap && compatMap[normSku]) {
    const c = compatMap[normSku];
    if (c.all) return { fits: true, reason: 'Universal fit from sheet' };
    if (c.uMin != null && cabinet.u > 0 && cabinet.u < c.uMin) {
      return { fits: false, reason: `דרוש מינימום ${c.uMin}U` };
    }
    if (c.uMax != null && cabinet.u > 0 && cabinet.u > c.uMax) {
      return { fits: false, reason: `מתאים עד ${c.uMax}U בלבד` };
    }
    if (c.dMin != null && cabinet.depth !== null && cabinet.depth < c.dMin) {
      return { fits: false, reason: `דרוש עומק מינימלי ${c.dMin} מ"מ` };
    }
    if (c.dMax != null && cabinet.depth !== null && cabinet.depth > c.dMax) {
      return { fits: false, reason: `מתאים עד עומק ${c.dMax} מ"מ` };
    }
  }

  // Physical depth constraint
  const text = `${pp?.name || ''} ${pp?.description || ''}`.toLowerCase();
  const depthMatch = text.match(/עומק[:\s]*([0-9]{2,4})/);
  if (depthMatch && cabinet.depth !== null) {
    let d = parseInt(depthMatch[1], 10);
    if (d < 150) d = d * 10;
    if (d > cabinet.depth + 40) {
      return { fits: false, reason: `עומק הפריט (${d} מ"מ) חורג מעומק הארון (${cabinet.depth} מ"מ)` };
    }
  }

  return { fits: true, reason: 'תואם' };
};
