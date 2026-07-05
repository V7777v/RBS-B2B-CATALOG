import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Plus, Minus, X, Server, Download, Box, AlertTriangle, ChevronDown, Search } from 'lucide-react';
import Papa from 'papaparse';
import { getToken as getAppCheckToken } from 'firebase/app-check';
import { appCheck } from '../firebase';

interface Accessory {
  pn: string;
  description: string;
  uSize: number;
  sku?: string;
  name?: string;
  price?: number;
  suitableRange?: string;
}

// Match a shelf to a cabinet using the accessory sheet's "ארונות מתאימים" range
// Handles: "כל הארונות" (all) | "NU-MU" (U range) | "...עומק: D" / "בעומק D1-D2" (depth) | U-range guarded by shelf's own depth
const parseCabinetDepthFromName = (name: string): number => {
  // Cabinet name format: "... בגודל DEPTH*WIDTH ..." (first number = depth). Returns mm.
  const m = String(name || '').match(/בגודל\s*([0-9]{2,4})\s*[*xX\u00d7]\s*([0-9]{2,4})/);
  if (m) { const d = parseInt(m[1], 10); return d < 150 ? d * 10 : d; }
  return 0;
};

const parseCompatRange = (s: string): any => {
  const str = String(s || '');
  if (str.includes('כל הארונות')) return { all: true };
  const u = str.match(/(\d+)U?\s*-\s*(\d+)U/);
  const uMin = u ? parseInt(u[1], 10) : null;
  const uMax = u ? parseInt(u[2], 10) : null;
  let dMin: number | null = null, dMax: number | null = null;
  const dr = str.match(/עומק[:\s]*([0-9]{2,4})\s*-\s*([0-9]{2,4})/);
  if (dr) { dMin = parseInt(dr[1], 10); dMax = parseInt(dr[2], 10); }
  else { const d = str.match(/עומק[:\s]*([0-9]{2,4})/); if (d) { dMin = dMax = parseInt(d[1], 10); } }
  return { uMin, uMax, dMin, dMax };
};

const normalizeSku = (val: any): string => String(val ?? '').trim().toUpperCase();

const buildCatalogAccessories = (catalogData: any[], productSkuNorm: string, cabDepthMm: number, cabU: number = 0, compatMap: Record<string, any> = {}): any[] => {
  const CAB_ACC_SUB = 'ארונות תקשורת ואביזרים';
  const isFlagged = (pp: any): boolean => {
    const v = String(pp?.['התאמה לארון'] ?? '').trim().toUpperCase();
    return v === 'TRUE' || v === 'כן' || v === 'YES' || v === '1' || v === 'V';
  };
  const resolveAccU = (pp: any): number => {
    const raw = String(pp?.['נפח'] ?? pp?.['נפח בארון'] ?? '').trim();
    const vol = parseInt(raw, 10);
    if (raw !== '' && !isNaN(vol) && vol >= 0) return vol;           // authoritative column "נפח"
    if (String(pp?.nestedSubcategory || '').includes('פסי שקעים')) return 0; // PDU = free
    return determineUSize(pp?.sku || '', `${pp?.name || ''} ${pp?.description || ''}`);
  };
  const parseDepthMmLocal = (txt: string): number => {
    if (!txt) return 0;
    const m = String(txt).match(/עומק[:\s]*([0-9]{2,4})/);
    let n = m ? parseInt(m[1], 10) : 0;
    if (!n) { const m2 = String(txt).match(/([0-9]{2,4})\s*(ס"?מ|cm|מ"מ|mm)/i); n = m2 ? parseInt(m2[1], 10) : 0; }
    if (!n) return 0;
    return n < 150 ? n * 10 : n;
  };
  const KNOWN_BRANDS = ['HIKVISION', 'EZVIZ', 'POLMAN', 'BOOST', 'INGENIUM', 'UBIQUITI', 'TP-LINK', 'DAHUA'];
  const deriveBrand = (pp: any): string => {
    const hay = `${pp?.category || ''} ${pp?.subcategory || ''} ${pp?.name || ''} ${pp?.sku || ''}`.toUpperCase();
    for (const b of KNOWN_BRANDS) if (hay.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
    const c = String(pp?.category || '').replace('מחירון', '').replace(/20\d\d/, '').trim();
    return c || 'אחר';
  };
  const built = (catalogData || []).filter((pp: any) => {
    if (!pp || !pp.sku) return false;
    if (normalizeSku(pp.sku) === productSkuNorm) return false;               // not the cabinet itself
    const nested = String(pp.nestedSubcategory || '');
    if (nested.includes('דלת מחוררת') || nested.includes('דלת זכוכית')) return false; // other cabinets
    const inUniverse = String(pp.subcategory || '').trim() === CAB_ACC_SUB &&
      (nested.includes('אביזרים לארונות') || nested.includes('פסי שקעים'));
    return inUniverse || isFlagged(pp);
  }).map((pp: any) => ({
    pn: pp.sku, sku: pp.sku, name: pp.name, price: pp.price,
    description: pp.description || '', uSize: resolveAccU(pp), suitableRange: '',
    _depth: parseDepthMmLocal(`${pp.name || ''} ${pp.description || ''}`),
    _promoted: isFlagged(pp), brand: deriveBrand(pp),
    _curated: !!compatMap[String(pp.sku ?? '').trim().toUpperCase()],
    image: (pp.images && pp.images[0]) || pp.imageURL || '',
  }));
  return built.filter((a: any) => {
    if (a.uSize === 0) return true;                    // fans / PDU / hardware: free add
    // PRECISE: curated U-range/depth from the "מדפים ואביזרים" sheet (authoritative).
    const c = compatMap[String(a.sku ?? '').trim().toUpperCase()];
    if (c) {
      if (c.all) return true;
      if (c.uMin != null && cabU && (cabU < c.uMin || cabU > c.uMax)) return false;
      if (c.dMin != null && cabDepthMm && (cabDepthMm < c.dMin - 60 || cabDepthMm > c.dMax + 60)) return false;
      return true;
    }
    // Uncurated (not in the compat sheet): a shelf DEEPER than the cabinet cannot fit
    // physically -> hide. Shallower shelves remain valid (front/hanging mount).
    if (!cabDepthMm || !a._depth) return true;
    if (a._depth > cabDepthMm + 40) return false;
    return true;
  });
};

const shelfFitsCabinet = (suitableRange: string, shelfDesc: string, cabU: number, cabDepth: number): boolean => {
  const str = (suitableRange || '').trim();
  if (!str) return false;
  if (str.includes('כל הארונות')) return true;
  const um = str.match(/(\d+)\s*U?\s*-\s*(\d+)\s*U/i);
  const uRange = um ? [parseInt(um[1], 10), parseInt(um[2], 10)] : null;
  if (uRange && !(cabU >= uRange[0] && cabU <= uRange[1])) return false;
  const deps = ((str.replace(/\d+\s*U/gi, '')).match(/\d{3,4}/g) || []).map(n => parseInt(n, 10));
  if (deps.length === 1) {
    if (cabDepth && cabDepth !== deps[0]) return false;
  } else if (deps.length >= 2) {
    const lo = Math.min(...deps), hi = Math.max(...deps);
    if (cabDepth && !(cabDepth >= lo && cabDepth <= hi)) return false;
  } else if (uRange) {
    const own = (shelfDesc || '').match(/עומק[:\s]*(\d+)\s*ס/);
    if (own && cabDepth && cabDepth < parseInt(own[1], 10) * 10) return false;
  }
  return uRange !== null || deps.length > 0;
};

interface CabinetData {
  pn: string;
  u: string;
  fans: string;
  wheels: string;
  levelingFeet: string;
  shelvesQty: string;
  suitableStandard: string;
  suitableHanging: string;
  suitableSliding: string;
}

const determineUSize = (pn: string, desc: string): number => {
  const text = `${pn} ${desc}`.toLowerCase();
  
  // High Priority: if it's a non-rack-mounted or side-mounted accessory, it occupies 0U of the frontal rail slots
  if (
    text.includes('בורג') || text.includes('ברגים') || text.includes('screw') || text.includes('cage') || text.includes('nut') ||
    text.includes('גלגל') || text.includes('wheels') || text.includes('wheel') ||
    text.includes('רגליות') || text.includes('feet') || text.includes('leveling') ||
    text.includes('מסיל') || text.includes('rails') || text.includes('rail') ||
    text.includes('סט תל') || text.includes('התקנה') || text.includes('kit') ||
    text.includes('מחבר') || text.includes('connector') ||
    text.includes('מאוורר') || text.includes('fan') || text.includes('מפוח') || text.includes('איוורור') ||
    text.includes('תקרה') || text.includes('roof') || text.includes('ceiling')
  ) {
    return 0; // Fans/feet/PDU/hardware have dedicated space — do not consume frame rail U height
  }
  
  // Extract U size
  const uMatch = text.match(/(\d+)\s*u/i);
  if (uMatch) {
    return parseInt(uMatch[1]);
  }
  
  // Default sizes for common items
  if (text.includes('מדף') || text.includes('shelf')) {
    return 1;
  }
  if (text.includes('פנל') || text.includes('panel') || text.includes('עיוור') || text.includes('עור') || text.includes('מברשת') || text.includes('שערות') || text.includes('שעירות')) {
    if (text.includes('2u')) return 2;
    if (text.includes('3u')) return 3;
    if (text.includes('4u')) return 4;
    return 1; // standard panels are usually 1U
  }
  if (text.includes('שקע') || text.includes('pdu') || text.includes('power') || text.includes('פס כח')) {
    return 1; // horizontal PDUs are 1U
  }
  
  return 1; // default to 1U if not specified and not a 0U accessory
};

interface CabinetConfiguratorProps {
  product: any;
  catalogData: any[];
  onOptionalsChange?: (optionals: Accessory[]) => void;
  initialAccessory?: any;
}

// Module-level store: survives remounts of the component so the user's selections are not wiped.
const CABINET_CFG_STORE: Record<string, any[]> = {};
const CABINET_CFG_INIT = new Set<string>();

export const CabinetConfigurator: React.FC<CabinetConfiguratorProps> = ({ product, catalogData, onOptionalsChange, initialAccessory }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cabinetData, setCabinetData] = useState<CabinetData | null>(null);
  
  const [totalU, setTotalU] = useState<number>(0);
  const [builtInUsedU, setBuiltInUsedU] = useState<number>(0);
  
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [compatibleAccessories, setCompatibleAccessories] = useState<Accessory[]>([]);
  const [selectedOptionals, setSelectedOptionals] = useState<(Accessory & { quantity: number; id: string })[]>(() => (CABINET_CFG_STORE[product?.sku] as any) ?? []);
  useEffect(() => {
    if (product?.sku) CABINET_CFG_STORE[product.sku] = selectedOptionals;
  }, [selectedOptionals, product?.sku]);

  // ACCURACY: availableU is DERIVED (never mutated incrementally) so the counter
  // can never drift — always = total − built-in − sum(selected U × qty).
  const usedU = React.useMemo(
    () => builtInUsedU + selectedOptionals.reduce((s: number, o: any) => s + (o.uSize || 0) * (o.quantity || 1), 0),
    [builtInUsedU, selectedOptionals]
  );
  const availableU = totalU - usedU;
  
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [pendingAccessory, setPendingAccessory] = useState<Accessory | null>(null);
  const [addedIdx, setAddedIdx] = useState<number | null>(null);
  const [chassisPulse, setChassisPulse] = useState(false);
  const [pdfWithPrice, setPdfWithPrice] = useState(false);
  const [accSearch, setAccSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const handleIncrementQuantity = (index: number) => {
    const item = selectedOptionals[index];
    if (!item) return;
    setSelectedOptionals(prev => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], quantity: newArr[index].quantity + 1 };
      return newArr;
    });
  };

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const CABINETS_CSV_URL = '/api/sheets?gid=250535112';

        let appCheckTok = '';
        try { 
          appCheckTok = (await getAppCheckToken(appCheck)).token; 
        } catch (e) {
          console.warn("Failed to obtain App Check token.", e);
          const isPreview = window.location.hostname.includes('run.app') || window.location.hostname.includes('localhost');
          if (isPreview) {
            console.warn("Bypassing App Check failure in preview environment.");
            appCheckTok = "DEV_PREVIEW_BYPASS";
          } else {
            setErrorMsg("אבטחת המערכת (App Check) נכשלה. אנא רענן את העמוד.");
            setLoading(false);
            return;
          }
        }
        const acHeaders = { headers: { 'X-Firebase-AppCheck': appCheckTok } };
        const productSkuNorm = normalizeSku(product.sku);

        // 2. Cabinets Table ('טבלת ארונות מעודכנת') — OPTIONAL.
        // If it can't be fetched (e.g. preview without backend, transient error),
        // we degrade gracefully to catalog-only mode instead of a hard error.
        let cabRows: any[][] = [];
        try {
          const cabRes = await fetch(CABINETS_CSV_URL, acHeaders);
          if (cabRes.ok) {
            const cabCsvText = await cabRes.text();
            cabRows = (Papa.parse(cabCsvText, { header: false, skipEmptyLines: false }).data) as any[][];
          } else {
            console.warn('[CabinetConfigurator] cabinet sheet HTTP', cabRes.status, '- catalog-only fallback');
          }
        } catch (e) {
          console.warn('[CabinetConfigurator] cabinet sheet unavailable - catalog-only fallback', e);
        }

        // Optional curated compatibility (SKU -> U-range/depth) from 'מדפים ואביזרים' (gid 1366808268).
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
        } catch (e) { console.warn('[CabinetConfigurator] compat sheet optional - skipped', e); }

        let cabRow: any[] | null = null;
        for (let i = 2; i < cabRows.length; i++) {
           if (cabRows[i] && cabRows[i][0] !== undefined && cabRows[i][0] !== null) {
               if (normalizeSku(cabRows[i][0]) === productSkuNorm) {
                   cabRow = cabRows[i];
                   break;
               }
           }
        }

        if (!cabRow) {
           console.warn("Cabinet not found in external configurator sheet for SKU:", product.sku);
           // Fallback mode if the cabinet is not in the updated list
           const uMatch = product.name?.match(/(\d+)U/i) || product.description?.match(/(\d+)U/i);
           const parsedTotalU = uMatch ? parseInt(uMatch[1]) : 42; // default to 42 if not found
           setTotalU(parsedTotalU);
           
           let initialAvailableU = parsedTotalU;
           if (initialAccessory) {
             const uSz = determineUSize(initialAccessory.sku, initialAccessory.name || '');
             initialAvailableU -= uSz;
             setSelectedOptionals([{
                pn: initialAccessory.sku,
                sku: initialAccessory.sku,
                name: initialAccessory.name,
                description: initialAccessory.description || '',
                price: initialAccessory.price || 0,
                uSize: uSz,
                quantity: 1,
                id: 'initial-' + initialAccessory.sku
             }]);
           } else {
             if (!CABINET_CFG_INIT.has(product.sku)) setSelectedOptionals([]);
           }
           CABINET_CFG_INIT.add(product.sku);
           setBuiltInUsedU(0);
           setIncludedItems([]);
           // FIX: cabinets missing from the built-in sheet still get catalog accessories
           // (depth parsed from the cabinet name "בגודל DEPTH*WIDTH").
           setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, parseCabinetDepthFromName(product.name || ''), parsedTotalU, compatMap));
           setLoading(false);
           return;
        }

        const data: CabinetData = {
           pn: cabRow[0]?.toString() || '',
           u: cabRow[2]?.toString() || '0U',
           fans: cabRow[8]?.toString() || 'X',
           wheels: cabRow[9]?.toString() || 'X',
           levelingFeet: cabRow[10]?.toString() || 'X',
           shelvesQty: cabRow[11]?.toString() || 'X',
           suitableStandard: cabRow[12]?.toString() || '',
           suitableHanging: cabRow[13]?.toString() || '',
           suitableSliding: cabRow[14]?.toString() || ''
        };

        setCabinetData(data);

        // Robust U capacity. Priority: product name ("42U") > sheet U column > any cell with "NNU" > safe default.
        const parseUStrict = (txt: any): number => {
          const m = String(txt ?? '').match(/(\d+)\s*U/i);
          return m ? parseInt(m[1], 10) : 0;
        };
        const parseULoose = (txt: any): number => {
          const u = parseUStrict(txt);
          if (u) return u;
          const n = parseInt(String(txt ?? '').trim(), 10);
          return (n >= 1 && n <= 60) ? n : 0;
        };
        let parsedTotalU = parseUStrict(product.name) || parseUStrict(product.description) || parseULoose(data.u);
        if (!parsedTotalU && cabRow) {
          for (const cell of cabRow) { const u = parseUStrict(cell); if (u) { parsedTotalU = u; break; } }
        }
        if (!parsedTotalU) parsedTotalU = 42;
        console.log('[CabinetConfigurator] Resolved cabinet U capacity:', parsedTotalU, 'for SKU', product.sku);
        setTotalU(parsedTotalU);
        const parsedDepth = parseInt(String(cabRow[4] ?? '').replace(/[^0-9]/g, ''), 10) || 0;

        // Calculate used U from included items
        const shelvesQty = parseInt(data.shelvesQty) || 0;
        const initialUsedU = shelvesQty * 1; // Assuming each shelf is 1U
        let initialAvailableU = parsedTotalU - initialUsedU;

        if (initialAccessory) {
          const uSz = determineUSize(initialAccessory.sku, initialAccessory.name || '');
          initialAvailableU -= uSz;
          setSelectedOptionals([{
             pn: initialAccessory.sku,
             sku: initialAccessory.sku,
             name: initialAccessory.name,
             description: initialAccessory.description || '',
             price: initialAccessory.price || 0,
             uSize: uSz,
             quantity: 1,
             id: 'initial-' + initialAccessory.sku
          }]);
        } else if (!CABINET_CFG_INIT.has(product.sku)) {
          setSelectedOptionals([]);
        }
        CABINET_CFG_INIT.add(product.sku);
        setBuiltInUsedU(initialUsedU);

        // Determine "What's in the Box" (Included Accessories)
        const included: string[] = [];
        if (data.fans && data.fans.toLowerCase() !== 'x' && data.fans !== '0' && data.fans !== '') included.push(`מאווררים: ${data.fans}`);
        if (data.wheels && data.wheels.toLowerCase() !== 'x' && data.wheels !== '') included.push('גלגלים');
        if (data.levelingFeet && data.levelingFeet.toLowerCase() !== 'x' && data.levelingFeet !== '') included.push('רגליות פילוס');
        if (shelvesQty > 0) included.push(`מדפים: ${shelvesQty}`);
        setIncludedItems(included);

        // 3. Catalog-driven compatibility (shared helper; depth from sheet or cabinet name).
        const cabDepthMm = parsedDepth ? (parsedDepth < 150 ? parsedDepth * 10 : parsedDepth) : parseCabinetDepthFromName(product.name || '');
        setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, cabDepthMm, parsedTotalU, compatMap));
        setLoading(false);
        
      } catch (error) {
        console.error("[CabinetConfigurator] error - attempting catalog-only fallback:", error);
        try {
          const uMatch = product.name?.match(/(\d+)U/i) || product.description?.match(/(\d+)U/i);
          setTotalU(uMatch ? parseInt(uMatch[1]) : 42);
          setBuiltInUsedU(0);
          setIncludedItems([]);
          const uM = product.name?.match(/(\d+)U/i) || product.description?.match(/(\d+)U/i);
          setCompatibleAccessories(buildCatalogAccessories(catalogData, String(product.sku ?? '').trim().toUpperCase(), parseCabinetDepthFromName(product.name || ''), uM ? parseInt(uM[1]) : 0, {}));
          setErrorMsg(null);
        } catch (e2) {
          console.error('[CabinetConfigurator] catalog fallback also failed', e2);
          setErrorMsg('שגיאה בטעינת נתוני הקונפיגורטור. אנא רענן את העמוד.');
        }
        setLoading(false);
      }
    };

    if (product) {
      fetchAndParse();
    }
  }, [product?.sku, initialAccessory?.sku]);

  const onOptionalsChangeRef = React.useRef(onOptionalsChange);
  useEffect(() => {
    onOptionalsChangeRef.current = onOptionalsChange;
  });

  // Fire onOptionalsChange
  useEffect(() => {
    if (onOptionalsChangeRef.current) {
      const flattened: Accessory[] = [];
      selectedOptionals.forEach(item => {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          flattened.push(item);
        }
      });
      onOptionalsChangeRef.current(flattened);
    }
  }, [selectedOptionals]);

  const handleAddOptional = (acc: Accessory, idx: number) => {
    // Advisory capacity only: always add. Over-capacity is shown by the red "מקום פנוי" badge, never silently blocked.
    setSelectedOptionals(prev => {
      const existingIdx = prev.findIndex(item => item.pn === acc.pn);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx] = { ...newArr[existingIdx], quantity: newArr[existingIdx].quantity + 1 };
        return newArr;
      }
      return [...prev, { ...acc, quantity: 1, id: Math.random().toString() }];
    });
    setAddedIdx(idx);
    setChassisPulse(true);
    setTimeout(() => setAddedIdx(null), 1000);
    setTimeout(() => setChassisPulse(false), 700);
  };

  const handleRemoveOptional = (index: number, fullyRemove = false) => {
    const item = selectedOptionals[index];
    if (!item) return;

    if (fullyRemove || item.quantity === 1) {
      setSelectedOptionals(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedOptionals(prev => {
         const newArr = [...prev];
         newArr[index] = { ...newArr[index], quantity: newArr[index].quantity - 1 };
         return newArr;
      });
    }
  };

  const forceAddPending = () => {
    if (pendingAccessory) {
      setSelectedOptionals(prev => {
        const existingIdx = prev.findIndex(item => item.pn === pendingAccessory.pn);
        if (existingIdx >= 0) {
          const newArr = [...prev];
          newArr[existingIdx] = { ...newArr[existingIdx], quantity: newArr[existingIdx].quantity + 1 };
          return newArr;
        }
        return [...prev, { ...pendingAccessory, quantity: 1, id: Math.random().toString() }];
      });
    }
    setWarningModalOpen(false);
    setPendingAccessory(null);
  };

  if (loading) return <div className="p-8 mt-8 bg-gray-50 text-center text-gray-500 border border-gray-200">טוען קונפיגורטור ארון מותאם אישית...</div>;
  if (errorMsg) return <div className="p-8 mt-8 bg-red-50 text-center text-red-700 border border-red-200" dir="rtl">{errorMsg}</div>;

  // --- DYNAMIC SLOT CALCULATION FOR VISUAL CHASSIS ---
  interface VisualSlot {
    uIndex: number;
    type: 'empty' | 'preset-fan' | 'preset-shelf' | 'optional-accessory';
    name: string;
    description?: string;
    accessoryRef?: any;
    optionalIdx?: number;
  }

  const slots: VisualSlot[] = [];
  const usedIndexes = new Set<number>();
  const totalSlotsU = totalU || 42;

  // 1. Check if Fan is included
  const hasFan = includedItems.some(i => i.toLowerCase().includes('מאוורר') || i.includes('מאווררים'));
  if (hasFan && totalSlotsU >= 1) {
    usedIndexes.add(totalSlotsU);
  }

  // 2. Check standard shelves
  const shelvesQtyMatch = includedItems.find(i => i.includes('מדפים:'));
  const shelvesQty = shelvesQtyMatch ? parseInt(shelvesQtyMatch.replace(/[^\d]/g, '')) : 0;
  const shelfPositions: number[] = [];
  if (shelvesQty > 0) {
    for (let s = 1; s <= shelvesQty; s++) {
      const pos = Math.round((s * totalSlotsU) / (shelvesQty + 1));
      if (pos >= 1 && pos <= totalSlotsU && !usedIndexes.has(pos)) {
        usedIndexes.add(pos);
        shelfPositions.push(pos);
      } else {
        // Look for nearest empty
        let placed = false;
        for (let offset = 1; offset < totalSlotsU; offset++) {
          if (pos + offset <= totalSlotsU && !usedIndexes.has(pos + offset)) {
            usedIndexes.add(pos + offset);
            shelfPositions.push(pos + offset);
            placed = true;
            break;
          }
          if (pos - offset >= 1 && !usedIndexes.has(pos - offset)) {
            usedIndexes.add(pos - offset);
            shelfPositions.push(pos - offset);
            placed = true;
            break;
          }
        }
        if (!placed) {
          shelfPositions.push(pos);
        }
      }
    }
  }

  // 3. Optional accessories added by user
  const optionalItemsAssignment: { uIndex: number; name: string; description: string; accessoryRef: any; optionalIdx: number }[] = [];
  let currentCandidateSlot = totalSlotsU;

  selectedOptionals.forEach((opt, optIdx) => {
    if (opt.uSize === 0) return; // Skip 0U/side rails accessories (screws, wheels, feet, cable management accessories) from frontal rail slots!
    const qty = opt.quantity || 1;
    const size = opt.uSize;
    for (let q = 0; q < qty; q++) {
      const allocatedSlots: number[] = [];
      let sizeAssigned = 0;
      
      while (sizeAssigned < size && currentCandidateSlot >= 1) {
        if (!usedIndexes.has(currentCandidateSlot)) {
          allocatedSlots.push(currentCandidateSlot);
          sizeAssigned++;
        }
        currentCandidateSlot--;
      }
      
      allocatedSlots.forEach(slot => {
        usedIndexes.add(slot);
        optionalItemsAssignment.push({
          uIndex: slot,
          name: opt.pn,
          description: opt.name || opt.description || '',
          accessoryRef: opt,
          optionalIdx: optIdx
        });
      });
    }
  });

  // Compose all slots from totalSlotsU down to 1
  for (let u = totalSlotsU; u >= 1; u--) {
    if (hasFan && u === totalSlotsU) {
      slots.push({
        uIndex: u,
        type: 'preset-fan',
        name: 'מאוורר מובנה 🔌',
        description: 'מאוורר תקרה מקורי ואיכותי הכלול במארז הארון.'
      });
    } else if (shelfPositions.includes(u)) {
      slots.push({
        uIndex: u,
        type: 'preset-shelf',
        name: 'מדף מובנה קבוע 📦',
        description: 'מדף מתכת קבוע הכלול כחלק מאביזרי הארון.'
      });
    } else {
      const optMatch = optionalItemsAssignment.find(o => o.uIndex === u);
      if (optMatch) {
        slots.push({
          uIndex: u,
          type: 'optional-accessory',
          name: optMatch.name,
          description: optMatch.description,
          accessoryRef: optMatch.accessoryRef,
          optionalIdx: optMatch.optionalIdx
        });
      } else {
        slots.push({
          uIndex: u,
          type: 'empty',
          name: 'תושבת פנויה [לחץ עלי כדי להתקין]'
        });
      }
    }
  }

  const nonUAccessories: { name: string; quantity: number; description: string; accessoryRef: any; optionalIdx: number }[] = [];
  selectedOptionals.forEach((opt, optIdx) => {
    if (opt.uSize === 0) {
      nonUAccessories.push({
        name: opt.pn,
        quantity: opt.quantity,
        description: opt.name || opt.description || '',
        accessoryRef: opt,
        optionalIdx: optIdx
      });
    }
  });

  // --- Accessory grouping: search + accordion buckets (promoted grouped by BRAND) ---
  const _accPairs = compatibleAccessories.map((acc, idx) => ({ acc, idx }));
  const _q = accSearch.trim().toLowerCase();
  const _accMatch = ({ acc }: any) => !_q || `${acc.pn || ''} ${acc.name || ''} ${acc.description || ''}`.toLowerCase().includes(_q);
  const _filtered = _accPairs.filter(_accMatch);
  const _bucketTakesU = _filtered
    .filter(({ acc }: any) => !acc._promoted && acc.uSize > 0)
    .sort((a: any, b: any) => {
      const rank = (x: any) => (x.acc._curated ? 0 : (x.acc._depth ? 1 : 2));
      return rank(a) - rank(b);
    });
  const _bucketFree = _filtered.filter(({ acc }: any) => !acc._promoted && acc.uSize === 0);
  const _bucketPromoted = _filtered.filter(({ acc }: any) => acc._promoted);
  const _promotedByBrand: Record<string, any[]> = {};
  _bucketPromoted.forEach((pair: any) => {
    const brand = String(pair.acc.brand || 'אחר').trim() || 'אחר';
    (_promotedByBrand[brand] = _promotedByBrand[brand] || []).push(pair);
  });

  const handleDownloadPdf = (withPrice: boolean) => {
    setPdfWithPrice(withPrice);
    setTimeout(() => { try { window.print(); } catch {} }, 200);
  };
  const pdfCabinetPrice = Math.round(Number(product?.price) || 0);
  const pdfAccessoriesTotal = selectedOptionals.reduce((s: number, o: any) => s + (Math.round(Number(o.price) || 0) * (o.quantity || 1)), 0);
  const pdfGrandTotal = pdfCabinetPrice + pdfAccessoriesTotal;

  const renderAccCard = (acc: any, idx: number) => {
    const catalogMatch = catalogData.find(pp => pp && pp.sku && (pp.sku === acc.pn || pp.sku === acc.sku));
    const showPrice = catalogMatch ? catalogMatch.price : (acc.price || 0);
    const fitsRemaining = acc.uSize === 0 || acc.uSize <= availableU;
    return (
      <div key={idx} className={`flex flex-col p-3.5 border group transition-all relative rounded-none hover:shadow-sm ${fitsRemaining ? 'bg-slate-50 border-slate-100 hover:border-[#004387]' : 'bg-rose-50/40 border-rose-100'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-[15px] text-slate-900 group-hover:text-[#004387] transition-colors leading-snug">{acc.pn}</p>
            <p className="text-[13px] text-gray-600 line-clamp-2 break-words mt-0.5 leading-snug font-medium" title={acc.description}>{acc.description}</p>
          </div>
          {showPrice > 0 && (
            <span className="text-xs font-bold text-slate-800 bg-slate-200 py-0.5 px-1.5 rounded-none whitespace-nowrap font-mono h-5 flex items-center justify-center">
              ₪{showPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 gap-2">
          {acc.image ? (
            <img referrerPolicy="no-referrer" src={acc.image} alt={acc.pn}
              className="w-9 h-9 object-contain bg-white border border-slate-200 rounded p-0.5 flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : null}
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 flex-1">
            <Box size={13} className="text-slate-400" />
            {acc.uSize > 0 ? `גודל נדרש: ${acc.uSize}U` : 'ללא נפח בארון'}
            {acc._curated && <span className="text-emerald-600 font-bold mr-1">✓ התאמה מדויקת</span>}
            {acc.uSize > 0 && !fitsRemaining && <span className="text-rose-500 font-bold mr-1">(חורג מהמקום הפנוי)</span>}
          </span>
          <button type="button" onClick={() => handleAddOptional(acc, idx)}
            className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 rounded-none hover:shadow-sm ${addedIdx === idx ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-[#004387] text-white hover:bg-[#fe8d00]'}`}
            aria-label="Add Accessory">
            {addedIdx === idx ? (<><CheckCircle size={14} /><span>נוסף לארון!</span></>) : (<><Plus size={14} /><span>הוסף לארון</span></>)}
          </button>
        </div>
      </div>
    );
  };

  const AccordionSection = (id: string, title: string, pairs: any[], tone: string, defaultOpen: boolean = true) => {
    if (!pairs.length) return null;
    const open = openSections[id] ?? defaultOpen;
    return (
      <div key={id} className="border border-slate-200 rounded-none mb-2.5">
        <button type="button" onClick={() => setOpenSections(s => ({ ...s, [id]: !( s[id] !== false) }))}
          className={`w-full flex items-center justify-between px-3 py-2.5 font-bold text-sm ${tone}`}>
          <span>{title} <span className="opacity-70 font-mono">({pairs.length})</span></span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="space-y-3 p-2.5 max-h-[320px] overflow-y-auto">{pairs.map(({ acc, idx }: any) => renderAccCard(acc, idx))}</div>}
      </div>
    );
  };

  return (
    <div className="mt-8 bg-white border-2 border-[#004387] shadow-sm relative overflow-hidden" dir="rtl">
      
      {/* Header */}
      <div className="bg-[#004387] text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Server size={24} className="text-orange-400" />
            קונפיגורטור ארון תקשורת מתקדם ({product.name})
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-xl">
            קבעו את הרכב הסל והארון שלכם בסימולציה תלת-ממדית. בחרו מדפים ואביזרים שונים, צפו במיקומם הפיזי בארון והוסיפו כחבילה שלמה.
          </p>
        </div>
        
        {/* U Capacity Tracker Badge */}
        <div className={`px-4 py-2 font-bold text-sm tracking-wide shadow-inner flex items-center gap-2 flex-shrink-0 border border-white/20 rounded-none ${availableU > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white animate-pulse'}`}>
          <Box size={16} />
          מקום פנוי מובטח: {availableU}U / {totalSlotsU}U
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Interactive Server Rack Simulator (Right side) */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-1 justify-between">
            <span>🖥️ הדמיית ארון תקשורת פיזי (Rack Simulator)</span>
            <span className="text-xs text-gray-400 font-mono">1U = 44.45mm</span>
          </div>

          {/* Visual Rack Container */}
          <div className={`relative border-4 bg-slate-950 p-3 shadow-2xl overflow-hidden flex flex-col min-h-[140px] max-h-[520px] transition-all duration-300 ${chassisPulse ? 'border-emerald-400 ring-4 ring-emerald-400/40 scale-[1.01]' : 'border-slate-700'}`}>
            
            {/* Simulated Glass Door Gloss Effect */}
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white/5 to-transparent pointer-events-none z-10 select-none"></div>
            
            {/* Left and Right Rack Rails with mounting holes */}
            <div className="absolute right-1 top-0 bottom-0 w-3 bg-gradient-to-r from-gray-800 via-gray-600 to-gray-900 border-l border-slate-700 flex flex-col justify-around py-2 z-10 pointer-events-none">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400/50 mx-auto shadow-inner border border-slate-900"></div>
              ))}
            </div>
            
            <div className="absolute left-1 top-0 bottom-0 w-3 bg-gradient-to-r from-gray-900 via-gray-600 to-gray-800 border-r border-slate-700 flex flex-col justify-around py-2 z-10 pointer-events-none">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400/50 mx-auto shadow-inner border border-slate-900"></div>
              ))}
            </div>

            {/* Scrollable Chassis Interior */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 px-4 relative z-0 custom-scrollbar pr-1">
              {slots.map((slot, idx) => {
                const isEmpty = slot.type === 'empty';
                const isFan = slot.type === 'preset-fan';
                const isShelf = slot.type === 'preset-shelf';
                const isOptional = slot.type === 'optional-accessory';

                const nameLower = (slot.name || '').toLowerCase();
                const descLower = (slot.description || '').toLowerCase();

                const isBlank = isOptional && (nameLower.includes('עיוור') || descLower.includes('עיוור') || nameLower.includes('blank') || descLower.includes('blank'));
                const isBrush = isOptional && (nameLower.includes('מברשת') || descLower.includes('מברשת') || nameLower.includes('שערות') || descLower.includes('שערות') || nameLower.includes('brush') || descLower.includes('brush'));
                const isFanUpgrade = isOptional && (nameLower.includes('מאוורר') || descLower.includes('מאוורר') || nameLower.includes('fan') || descLower.includes('fan') || nameLower.includes('מפוח') || descLower.includes('מפוח'));
                const isPdu = isOptional && (nameLower.includes('שקע') || descLower.includes('שקע') || nameLower.includes('pdu') || descLower.includes('pdu') || nameLower.includes('כח') || descLower.includes('כוח') || nameLower.includes('כבילה'));
                const isShelfUpgrade = isOptional && (nameLower.includes('מדף') || descLower.includes('מדף') || nameLower.includes('shelf') || descLower.includes('shelf') || nameLower.includes('מגירה') || descLower.includes('sliding'));

                // Choose ClassNames based on type
                let slotStyles = 'bg-slate-900/20 hover:bg-slate-900/50 border-slate-800/60 text-slate-500 py-2 px-3 border-dashed hover:text-slate-300 hover:border-[#004387]/70 cursor-pointer';
                if (isFan || isFanUpgrade) {
                  slotStyles = 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 border-cyan-500/80 text-cyan-200 py-2.5 px-3 shadow-md hover:border-cyan-400';
                } else if (isShelf || isShelfUpgrade) {
                  slotStyles = 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-emerald-500/80 text-emerald-200 py-2.5 px-3 shadow-md hover:border-emerald-400';
                } else if (isBlank) {
                  slotStyles = 'bg-gradient-to-r from-neutral-800 via-neutral-900 to-neutral-800 border-neutral-600/80 text-neutral-300 py-2.5 px-3 shadow-sm hover:border-neutral-400';
                } else if (isBrush) {
                  slotStyles = 'bg-gradient-to-r from-black via-zinc-900 to-black border-amber-600/60 text-amber-200 py-2.5 px-3 shadow-sm hover:border-amber-400';
                } else if (isPdu) {
                  slotStyles = 'bg-gradient-to-r from-red-950/90 via-zinc-950 to-red-900 border-red-600/70 text-red-100 py-2.5 px-3 shadow-md hover:border-red-400';
                } else if (isOptional) {
                  slotStyles = 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 border-indigo-600/60 text-indigo-200 py-2.5 px-3 shadow-sm hover:border-indigo-400';
                }

                return (
                  <div 
                    key={idx}
                    className={`group text-xs flex items-center justify-between transition-all duration-200 border relative ${slotStyles}`}
                    onClick={() => {
                      if (isEmpty) {
                        // Highlight or scroll to accessories list
                        const el = document.getElementById('com-accessories-list');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else if (isOptional && typeof slot.optionalIdx === 'number') {
                        // Quick increment when clicked on rack
                        handleIncrementQuantity(slot.optionalIdx);
                      }
                    }}
                  >
                    {/* Position indicator */}
                    <div className="font-mono font-bold text-[10px] tabular-nums bg-slate-800/80 text-slate-300 w-8 h-5 flex items-center justify-center rounded border border-slate-700/50 flex-shrink-0">
                      {slot.uIndex}U
                    </div>

                    {/* Left content description */}
                    <div className="flex-1 min-w-0 pr-3 pl-1 text-right">
                      <div className="flex items-center gap-1.5">
                        {/* Dynamic category icon */}
                        {(isFan || isFanUpgrade) && <span className="inline-block animate-spin text-cyan-400 mr-1" style={{ animationDuration: '5s' }}>🌀</span>}
                        {(isShelf || isShelfUpgrade) && <span className="text-emerald-400">📥</span>}
                        {isBlank && <span className="text-neutral-500">🔩</span>}
                        {isBrush && <span className="text-amber-500 font-bold">💈</span>}
                        {isPdu && <span className="text-red-500 animate-pulse">⚡</span>}
                        
                        <p className="font-semibold tracking-wide break-words leading-tight">
                          {slot.name}
                        </p>
                      </div>

                      {isBrush && (
                        <div className="text-[8px] text-amber-500/80 font-mono tracking-widest mt-0.5 select-none opacity-60">
                          ||||||||||||||||||||||||||||||||||||||||||||
                        </div>
                      )}
                      {isPdu && (
                        <div className="text-[8px] text-red-500/80 font-mono tracking-widest mt-0.5 select-none opacity-80">
                          [::] [::] [::] [::] [::] [::]
                        </div>
                      )}

                      {slot.description && !isBrush && !isPdu && (
                        <p className="text-[10px] text-slate-400 font-normal line-clamp-2 break-words opacity-85 mt-0.5" title={slot.description}>
                          {slot.description}
                        </p>
                      )}
                    </div>

                    {/* Action buttons inside interactive slots */}
                    <div className="flex items-center gap-1">
                      {isOptional && typeof slot.optionalIdx === 'number' && (
                        <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 px-1 py-0.5 rounded opacity-80 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            title="הוסף יחידה"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof slot.optionalIdx === 'number') handleIncrementQuantity(slot.optionalIdx);
                            }}
                            className="p-1 hover:bg-slate-800 rounded text-amber-300"
                          >
                            <Plus size={12} />
                          </button>
                          <span className="text-amber-400 px-1 font-bold font-mono text-[11px]">
                            {slot.accessoryRef.quantity}x
                          </span>
                          <button 
                            type="button"
                            title="הסר יחידה"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof slot.optionalIdx === 'number') handleRemoveOptional(slot.optionalIdx);
                            }}
                            className="p-1 hover:bg-slate-800 rounded text-red-400"
                          >
                            <Minus size={12} />
                          </button>
                        </div>
                      )}

                      {isFan && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      )}
                      
                      {isShelf && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ground-level or side-rail zero-U accessories (screws, wheels, feet, cable management) */}
            {nonUAccessories.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                <div className="text-[9px] font-black tracking-widest text-[#fe8d00]/90 uppercase text-center mb-1 select-none">
                  ◄ פריטי חיבור והתקנה מופעלים (Side Rail / 0U) ►
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {nonUAccessories.map((nonU, index) => {
                    const nameLower = (String(nonU.name || '') + " " + String(nonU.description || '')).toLowerCase();
                    const isScrew = nameLower.includes('בורג') || nameLower.includes('ברגים') || nameLower.includes('screw') || nameLower.includes('nut');
                    const isWheel = nameLower.includes('גלגל') || nameLower.includes('wheel') || nameLower.includes('wheels');
                    const isFeet = nameLower.includes('רגליות') || nameLower.includes('feet');
                    const isCable = nameLower.includes('כביל') || nameLower.includes('cable');
                    
                    let icon = '⚙️';
                    if (isScrew) icon = '🔩';
                    else if (isWheel) icon = '🛞';
                    else if (isFeet) icon = '🪜';
                    else if (isCable) icon = '🔗';

                    return (
                      <div key={index} className="flex items-center justify-between bg-slate-900/60 border border-slate-800/70 p-1.5 px-2 text-[10px] text-slate-300">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span className="text-xs flex-shrink-0">{icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-slate-100 truncate">{nonU.name}</p>
                            <p className="text-slate-400 text-[8px] truncate">{nonU.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 border border-slate-800 rounded flex-shrink-0 mr-1">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIncrementQuantity(nonU.optionalIdx);
                            }}
                            className="text-amber-400 hover:bg-slate-800 p-0.5 rounded cursor-pointer"
                          >
                            <Plus size={10} />
                          </button>
                          <span className="font-mono font-bold text-amber-500 min-w-[16px] text-center text-[10px]">
                            {nonU.quantity}x
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveOptional(nonU.optionalIdx);
                            }}
                            className="text-red-400 hover:bg-slate-800 p-0.5 rounded cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Simulated Server Room Floor Shadow */}
            <div className="mt-2 text-center text-[10px] font-semibold text-slate-500 tracking-wide select-none border-t border-slate-800/80 pt-1.5 uppercase font-mono">
              ◄ STEEL FRAME CHASSIS INTERLINKED ►
            </div>
          </div>
        </div>

        {/* Column 2: Selected Optionals & Included Items (Middle side) */}
        <div className="space-y-6">
          
          {/* Included Items */}
          <div className="bg-gray-50 p-5 border border-gray-200">
            <h3 className="text-lg font-bold text-[#0c2d57] mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
              <span>📦 פריטי אבזור כלולים (חלק מהמארז)</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 rounded-none text-slate-700">ללא עלות נוספת</span>
            </h3>
            {includedItems.length > 0 ? (
              <ul className="space-y-3">
                {includedItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-gray-700 border-b border-gray-100/60 pb-1.5 last:border-none">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <span className="font-semibold text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-sm">אין פריטי משנה מוגדרים מראש לארון זה.</p>
            )}
          </div>

          {/* Selected Optionals Review Area */}
          <div className="bg-[#e6f0fa]/30 border border-[#b3d4f5] p-5 shadow-sm">
            <h3 className="text-[15px] font-bold text-[#004387] mb-4 uppercase tracking-wider flex items-center justify-between border-b border-[#b3d4f5] pb-2">
              <span>🛠️ אביזרים ששדרגתם לארון</span>
              <span className="bg-[#004387] text-white text-xs px-2.5 py-0.5 rounded-none font-mono">
                {selectedOptionals.reduce((acc, curr) => acc + curr.quantity, 0)} EXTRA
              </span>
            </h3>
            
            {selectedOptionals.length > 0 ? (
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                 {selectedOptionals.map((item, idx) => (
                   <div key={item.id} className="flex flex-col bg-white border border-[#b3d4f5] p-3 rounded-none text-sm font-medium animate-in zoom-in duration-200 shadow-sm hover:border-[#004387] transition-all">
                     <div className="flex items-start justify-between gap-2">
                       <span className="text-gray-800 font-bold leading-tight truncate">
                          {item.pn}
                       </span>
                       <span className="text-xs text-[#004387] font-bold bg-[#e6f0fa] px-2 py-0.5 rounded-none font-mono whitespace-nowrap">
                         ₪{((item.price || 0) * item.quantity).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                       </span>
                     </div>
                     
                     <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed font-normal">
                       {item.description}
                     </p>

                     <div className="flex items-center justify-between border-t border-gray-100 mt-2.5 pt-2">
                       <span className="text-[11px] font-mono font-medium text-slate-400">
                         {item.uSize > 0 ? `תופס: ${item.uSize * item.quantity}U מתוך הארון` : 'ללא נפח בארון'}
                       </span>
                       
                       <div className="flex bg-slate-50 border border-slate-200 rounded-none overflow-hidden h-7">
                         <button 
                           type="button"
                           title="הוסף 1"
                           onClick={() => handleIncrementQuantity(idx)} 
                           className="px-2.5 hover:bg-slate-200 text-[#004387] transition-colors"
                         >
                           <Plus size={12} />
                         </button>
                         <span className="w-8 flex items-center justify-center border-x border-slate-200 text-xs font-bold bg-white text-slate-800 font-mono">
                           {item.quantity}
                         </span>
                         <button 
                           type="button"
                           title="הפחת 1"
                           onClick={() => handleRemoveOptional(idx)} 
                           className="px-2.5 hover:bg-slate-200 text-red-500 transition-colors"
                         >
                           <Minus size={12} />
                         </button>
                         <button 
                           type="button"
                           title="הסר לחלוטין"
                           onClick={() => handleRemoveOptional(idx, true)} 
                           className="px-2 border-r border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                         >
                           <X size={12} />
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm italic bg-white border border-[#b3d4f5]/60">
                טרם בחרתם אביזרים נוספים.
                <br/>
                בחרו אביזרי הרחבה בהמשך או לחצו על תאים פנויים בארון משמאל!
              </div>
            )}
          </div>
          
          {/* PDF export: two options — with prices / without */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 print:hidden">
            <button type="button" onClick={() => handleDownloadPdf(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-[#004387] text-white font-bold text-sm rounded-none hover:bg-[#0c2d57] transition-colors cursor-pointer shadow-sm">
              <Download size={15} /> PDF עם מחירים
            </button>
            <button type="button" onClick={() => handleDownloadPdf(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-white text-[#004387] border border-[#004387] font-bold text-sm rounded-none hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
              <Download size={15} /> PDF ללא מחירים
            </button>
          </div>
        </div>

        {/* Column 3: Optional Compatible Upgrades / Accessories (Left side) */}
        <div id="com-accessories-list" className="border border-gray-200 p-5 bg-white space-y-4">
          <div className="border-b border-gray-200 pb-2">
            <h3 className="text-lg font-bold text-[#0c2d57] flex items-center gap-2">
              <Plus size={18} className="text-[#fe8d00]" />
              <span>➕ שדרוגים ואביזרים תואמים פיזית</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              פריטים אלו נבדקו ונמצאו בעלי התאמה של 100% לפרופיל ומסילות הארון הנוכחי.
            </p>
          </div>

          {compatibleAccessories.length > 0 ? (
            <div>
              <div className="relative mb-3">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={accSearch} onChange={e => setAccSearch(e.target.value)} dir="rtl"
                  placeholder="חיפוש אביזר (שם / מק״ט)"
                  className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-none focus:border-[#004387] outline-none font-medium" />
              </div>
              <div className="mb-3 text-[12px] font-bold text-slate-600">
                נותרו <span className="text-[#004387]">{availableU}U</span> פנויים — מלא עם אביזרים תואמים:
              </div>
              {AccordionSection('takesU', '📏 אביזרים שתופסים מקום', _bucketTakesU, 'bg-slate-100 text-slate-800', false)}
              {AccordionSection('free', '🔌 תוספות ללא נפח (חופשי)', _bucketFree, 'bg-emerald-50 text-emerald-800', false)}
              {Object.keys(_promotedByBrand).sort().map(brand => AccordionSection('brand:' + brand, '⭐ ' + brand, _promotedByBrand[brand], 'bg-amber-50 text-amber-800', false))}
              {_filtered.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-gray-200">לא נמצאו תוצאות לחיפוש.</div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 px-6 bg-gray-50 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-none leading-relaxed">
              לא נמצאו אביזרי שדרוג נוספים תואמים לבחירה,
              או שקיבולת הארון כבר נוצלה וכל האביזרים מסונכרנים.
            </div>
          )}
        </div>

      </div>

      {/* WARNING MODAL (Rule 3) */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200 border-t-4 border-amber-500 rounded-none">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">אזהרת קיבולת (U Space Warning)</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              הגעת לניצול מלא של נפח הארון ({totalSlotsU}U). 
              <br/><br/>
              האם ברצונך להתקין את הפריט <strong>{pendingAccessory?.pn}</strong> בכל זאת? שימו לב: יתכן ותצטרכו להוציא אביזרים כלולים אחרים במעמד ההתקנה הפיזית!
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                type="button"
                onClick={() => {
                  setWarningModalOpen(false);
                  setPendingAccessory(null);
                }}
                className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-all text-sm rounded-none"
              >
                בטל התקנה
              </button>
              <button 
                type="button"
                onClick={forceAddPending}
                className="flex-1 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all text-sm shadow-sm rounded-none"
              >
                אלץ התקנה (המשך)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable spec sheet (hidden on screen, shown on print) */}
      <div id="printable-cabinet-area" dir="rtl" className="hidden print:block" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', padding: '24px', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #004387', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0c2d57' }}>מפרט תצורת ארון תקשורת</div>
            <div style={{ fontSize: '12px', color: '#555' }}>{new Date().toLocaleDateString('he-IL')}</div>
          </div>
          <img src="https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png" alt="RBS" style={{ height: '42px' }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
          <tbody>
            <tr><td style={{ padding: '4px 8px', fontWeight: 700, background: '#f1f5f9', width: '30%' }}>דגם הארון</td><td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{product?.name}</td></tr>
            <tr><td style={{ padding: '4px 8px', fontWeight: 700, background: '#f1f5f9' }}>מק״ט</td><td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{product?.sku}</td></tr>
            <tr><td style={{ padding: '4px 8px', fontWeight: 700, background: '#f1f5f9' }}>נפח כולל</td><td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{totalU}U — נוצלו {usedU}U, פנויים {availableU}U</td></tr>
          </tbody>
        </table>

        {includedItems.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#004387', marginBottom: '6px' }}>כלול בארון</div>
            <ul style={{ margin: 0, paddingRight: '18px', fontSize: '13px' }}>
              {includedItems.map((it, i) => <li key={i} style={{ marginBottom: '2px' }}>{it}</li>)}
            </ul>
          </div>
        )}

        <div style={{ fontSize: '14px', fontWeight: 800, color: '#004387', marginBottom: '6px' }}>אביזרים שנוספו</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#0c2d57', color: '#fff' }}>
              <th style={{ padding: '6px', textAlign: 'right' }}>מק״ט</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>שם</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>כמות</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>נפח</th>
              {pdfWithPrice && <th style={{ padding: '6px', textAlign: 'center' }}>מחיר</th>}
            </tr>
          </thead>
          <tbody>
            {selectedOptionals.length === 0 ? (
              <tr><td colSpan={pdfWithPrice ? 5 : 4} style={{ padding: '10px', textAlign: 'center', color: '#888', border: '1px solid #e2e8f0' }}>לא נוספו אביזרים</td></tr>
            ) : selectedOptionals.map((o: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 6px', border: '1px solid #e2e8f0' }}>{o.pn}</td>
                <td style={{ padding: '5px 6px', border: '1px solid #e2e8f0' }}>{o.name || o.description}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{o.quantity || 1}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{o.uSize > 0 ? `${o.uSize}U` : '—'}</td>
                {pdfWithPrice && <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>₪{(Math.round(Number(o.price) || 0) * (o.quantity || 1)).toLocaleString('he-IL')}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {pdfWithPrice && (
          <div style={{ marginTop: '14px', textAlign: 'left', fontSize: '15px', fontWeight: 800, color: '#0c2d57' }}>
            סה״כ (ארון + אביזרים): ₪{pdfGrandTotal.toLocaleString('he-IL')}
            <div style={{ fontSize: '11px', fontWeight: 400, color: '#777' }}>* מחיר מומלץ, לפני מע״מ</div>
          </div>
        )}

        <div style={{ marginTop: '22px', paddingTop: '10px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          רבס טלקום בע״מ · 077-2045522 · info@rbs-telecom.com
        </div>
      </div>

    </div>
  );
};
