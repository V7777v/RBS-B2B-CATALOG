import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle, Plus, Minus, X, Server, Download, Box, AlertTriangle, ChevronDown, Search, ZoomIn, Eye, Maximize2 } from 'lucide-react';
import Papa from 'papaparse';
import { 
  fetchCabinetMatrix, 
  fetchCompatMap, 
  checkAccessoryFitsCabinet, 
  isAccessoryAShelf, 
  isProductShelf, 
  extractAllMatrixShelfSkus, 
  KNOWN_MATRIX_SHELF_SKUS, 
  normalizeSku, 
  parseCompatibleSkus, 
  CabinetMatrixData 
} from '../utils/cabinetData';
import { 
  VERIFIED_ZERO_U_EXCEPTIONS, 
  isFlaggedForCabinetSuitability, 
  parseNormalizedVolume, 
  resolveUConsumption, 
  checkTrackBAccessoryCompatibility 
} from '../utils/cabinetRules';
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
  image?: string;
  brand?: string;
  brandLogo?: string;
  _pdu?: boolean;
  _curated?: boolean;
  _promoted?: boolean;
  _depth?: number;
  _illustration?: boolean;
  isShelf?: boolean;
  shelfType?: string;
  _source?: string;
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

const isCabinetProduct = (pp: any): boolean => {
  const name = String(pp?.name || '').trim();
  const sub = String(pp?.subcategory || '').trim();
  const nested = String(pp?.['Nested subcategory'] || pp?.nestedSubcategory || '').trim();
  if (sub === 'ארונות תקשורת ואביזרים') {
    if (nested.includes('דלת זכוכית') || nested.includes('דלת מחוררת') || nested.includes('מסדות תקשורת')) {
      return true;
    }
  }
  if ((name.startsWith('ארון תקשורת') || name.startsWith('מסד תקשורת') || name.startsWith('ארון הסתעפות')) &&
      !name.includes('מדף') && !name.includes('אביזר') && !name.includes('מאוורר') && !name.includes('בורג')) {
    return true;
  }
  return false;
};

// Only items belonging to Infrastructure pricelist / categories should appear as cabinet accessories
const isInfrastructureItem = (pp: any): boolean => {
  if (!pp) return false;
  const cat = String(pp.category || '').toLowerCase();
  const sub = String(pp.subcategory || '').toLowerCase();
  const nested = String(pp['Nested subcategory'] || pp.nestedSubcategory || '').toLowerCase();
  const name = String(pp.name || '').toLowerCase();

  // Explicit exclude non-infrastructure products like vacuum cleaners, keypads, intercoms, CCTV, etc.
  if (
    sub.includes('שואב') || cat.includes('שואב') || name.includes('שואב') ||
    sub.includes('קודן') || cat.includes('קודן') || name.includes('קודן') ||
    sub.includes('אינטרקום') || cat.includes('אינטרקום') ||
    sub.includes('אזעק') || cat.includes('אזעק') ||
    sub.includes('שמע') || cat.includes('שמע') ||
    sub.includes('הגברה') || cat.includes('הגברה') ||
    cat.includes('ezviz') || cat.includes('hikvision') || cat.includes('polman') || cat.includes('סאונד')
  ) {
    return false;
  }

  // Category must be infrastructure (מחירון תשתיות), or subcategory in infrastructure domain
  const isInfraCategory = cat.includes('תשתיות') || cat === 'מחירון תשתיות';
  const isInfraSub = 
    sub.includes('תשתיות') ||
    sub.includes('ארונות תקשורת') ||
    sub.includes('מסדים') ||
    sub.includes('פסי שקעים') ||
    sub.includes('ספקי כח') ||
    sub.includes('ספקי כוח') ||
    nested.includes('פסי שקעים') ||
    nested.includes('אביזרים למסד') ||
    nested.includes('אביזרים לארון') ||
    nested.includes('מדפים ואביזרים');

  return isInfraCategory || isInfraSub;
};

const getPhysicalZone = (sku: string, name: string, desc: string): 'roof' | 'plinth' | 'vertical' | 'hardware' => {
  const norm = normalizeSku(sku);
  if (norm && VERIFIED_ZERO_U_EXCEPTIONS[norm]) {
    return VERIFIED_ZERO_U_EXCEPTIONS[norm].zone;
  }
  const s = `${name || ''} ${desc || ''}`.toLowerCase();
  if (/מאוורר|fan|מפוח|איוורור|נורת|נורה|led|לד|תאורה|light|כניסה עליונה/.test(s)) return 'roof';
  if (/פס 12|ורטיקל|vertical|תעלה|מסתיר/.test(s)) return 'vertical';
  if (/גלגל|wheel|רגלי|feet|בסיס|plinth/.test(s)) return 'plinth';
  if (/בורג|ברגים|screw|cage|nut|אום|רלס|rail|hardware/.test(s)) return 'hardware';
  return 'hardware';
};

const buildCatalogAccessories = (
  catalogData: any[],
  productSkuNorm: string,
  cabinet: CabinetMatrixData | null,
  compatMap: Record<string, any>,
  allMatrixShelves?: Set<string>
): Accessory[] => {
  const inMatrixShelves = new Set<string>();
  const shelfTypeMap = new Map<string, string>();
  if (cabinet) {
    (cabinet.suitableStandard || []).forEach(s => {
      const n = normalizeSku(s);
      if (n && n !== 'X') {
        inMatrixShelves.add(n);
        shelfTypeMap.set(n, 'סטנדרטי');
      }
    });
    (cabinet.suitableHanging || []).forEach(s => {
      const n = normalizeSku(s);
      if (n && n !== 'X') {
        inMatrixShelves.add(n);
        shelfTypeMap.set(n, 'תלוי');
      }
    });
    (cabinet.suitableSliding || []).forEach(s => {
      const n = normalizeSku(s);
      if (n && n !== 'X') {
        inMatrixShelves.add(n);
        shelfTypeMap.set(n, 'נשלף');
      }
    });
  }

  const catalogMap = new Map<string, any>();
  (catalogData || []).forEach((p: any) => {
    if (p && p.sku) {
      const s = normalizeSku(p.sku);
      if (s) catalogMap.set(s, p);
    }
  });

  const itemsMap = new Map<string, Accessory>();

  // ==========================================
  // Track 1: Shelves permitted in Cabinet Matrix (authoritative and sole source for shelves)
  // ==========================================
  inMatrixShelves.forEach(shelfSku => {
    const prod = catalogMap.get(shelfSku);
    const origSku = prod?.sku || shelfSku;
    const name = prod?.name || `מדף מק"ט ${shelfSku}`;
    const desc = prod?.description || '';
    const uSize = resolveUConsumption(prod).u;
    const price = prod?.price ? parseFloat(String(prod.price).replace(/,/g, '')) : 0;
    
    itemsMap.set(shelfSku, {
      pn: origSku,
      sku: origSku,
      name,
      description: desc,
      price,
      uSize,
      suitableRange: '',
      _depth: parseDepthMmLocal(`${name} ${desc}`),
      _promoted: false,
      brand: prod ? deriveBrand(prod) : 'כללי',
      brandLogo: (typeof prod?.brand === 'string' && prod.brand.startsWith('http')) ? prod.brand : '',
      _pdu: false,
      _curated: true,
      image: (prod?.images && prod.images[0]) || prod?.imageURL || '',
      isShelf: true,
      shelfType: shelfTypeMap.get(shelfSku) || 'סטנדרטי',
      _source: 'matrix_shelf'
    });
  });

  // ==========================================
  // Track 2: Cabinet Accessories & PDUs (Strictly non-shelf items only)
  // ==========================================
  (catalogData || []).forEach((pp: any) => {
    if (!pp || !pp.sku) return;
    const normSku = normalizeSku(pp.sku);
    if (!normSku || normSku === productSkuNorm) return;

    // Check if this item belongs to Infrastructure pricelist
    if (!isInfrastructureItem(pp)) return;
    if (isCabinetProduct(pp)) return;

    // Any item identified as a shelf is completely excluded from non-shelf tracks!
    if (isProductShelf(pp, catalogMap, allMatrixShelves)) return;

    const cat = String(pp.category || '');
    const sub = String(pp.subcategory || '');
    const nested = String(pp['Nested subcategory'] || pp.nestedSubcategory || '');
    const isAccCategory = 
      sub.includes('ארונות תקשורת') || 
      cat.includes('ארונות תקשורת') || 
      nested.includes('אביזרים') || 
      nested.includes('פסי שקעים') ||
      compatMap[normSku] !== undefined ||
      VERIFIED_ZERO_U_EXCEPTIONS[normSku] !== undefined;

    if (!isAccCategory) return;

    // Validate physical compatibility with cabinet
    const compatResult = checkTrackBAccessoryCompatibility(pp, cabinet, compatMap);
    if (!compatResult.fits) return;

    if (itemsMap.has(normSku)) {
      // Enrich existing record if needed
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      return;
    }

    const uSize = resolveUConsumption(pp).u;
    const isPdu = nested.includes('פסי שקעים') || /פס שקע|שקעים|pdu/i.test(`${pp.name || ''} ${pp.description || ''}`);
    const price = pp.price ? parseFloat(String(pp.price).replace(/,/g, '')) : 0;

    itemsMap.set(normSku, {
      pn: pp.sku,
      sku: pp.sku,
      name: pp.name || `אביזר מק"ט ${pp.sku}`,
      description: pp.description || '',
      price,
      uSize,
      suitableRange: '',
      _depth: parseDepthMmLocal(`${pp.name || ''} ${pp.description || ''}`),
      _promoted: false,
      brand: deriveBrand(pp),
      brandLogo: (typeof pp.brand === 'string' && pp.brand.startsWith('http')) ? pp.brand : '',
      _pdu: isPdu,
      _curated: true,
      image: (pp.images && pp.images[0]) || pp.imageURL || '',
      isShelf: false,
      _source: 'cabinet_accessory'
    });
  });

  // Also ensure any non-shelf items in compatMap that weren't in catalogData are included
  Object.keys(compatMap || {}).forEach(compSku => {
    if (compSku === productSkuNorm || itemsMap.has(compSku)) return;

    // Any item identified as a shelf in compatMap is excluded here!
    if (isProductShelf(compSku, catalogMap, allMatrixShelves)) return;

    const catProd = catalogMap.get(compSku);
    if (catProd && !isInfrastructureItem(catProd)) return;

    const compatResult = checkTrackBAccessoryCompatibility({ sku: compSku }, cabinet, compatMap);
    if (!compatResult.fits) return;

    const uSize = resolveUConsumption({ sku: compSku }).u;
    itemsMap.set(compSku, {
      pn: compSku,
      sku: compSku,
      name: catProd ? (catProd.name || `אביזר מק"ט ${compSku}`) : `אביזר מק"ט ${compSku}`,
      description: catProd?.description || '',
      price: catProd?.price ? parseFloat(String(catProd.price).replace(/,/g, '')) : 0,
      uSize,
      suitableRange: '',
      _depth: 0,
      _promoted: false,
      brand: catProd ? deriveBrand(catProd) : 'כללי',
      _pdu: false,
      _curated: true,
      image: (catProd?.images && catProd.images[0]) || catProd?.imageURL || '',
      isShelf: false,
      _source: 'compat_sheet'
    });
  });

  // ==========================================
  // Track 3: Additional equipment flagged "התאמה לארון" in Products_React (Strictly non-shelf items only)
  // ==========================================
  (catalogData || []).forEach((pp: any) => {
    if (!pp || !pp.sku) return;
    const normSku = normalizeSku(pp.sku);
    if (!normSku || normSku === productSkuNorm) return;

    if (itemsMap.has(normSku)) {
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      if (!existing.price && pp.price) {
        existing.price = parseFloat(String(pp.price).replace(/,/g, '')) || 0;
      }
      return;
    }

    if (isCabinetProduct(pp)) return;
    // Strictly ensure item belongs to Infrastructure domain
    if (!isInfrastructureItem(pp)) return;

    // Any item identified as a shelf is completely excluded from non-shelf tracks!
    if (isProductShelf(pp, catalogMap, allMatrixShelves)) return;

    const nameDesc = `${pp.name || ''} ${pp.description || ''}`.toLowerCase();
    if (/מחלץ|extractor|כלי\b|tool\b/.test(nameDesc)) return;

    // Check suitability flag
    const flagged = isFlaggedForCabinetSuitability(pp);
    if (!flagged) return;

    // Depth check
    const itemDepth = parseDepthMmLocal(nameDesc);
    if (cabinet && cabinet.depth !== null && itemDepth > 0 && itemDepth > cabinet.depth + 40) {
      return;
    }

    const uSize = resolveUConsumption(pp, true).u;
    const isPdu = String(pp.nestedSubcategory || '').includes('פסי שקעים') || /פס שקע|שקעים|pdu/i.test(nameDesc);
    const price = pp.price ? parseFloat(String(pp.price).replace(/,/g, '')) : 0;

    itemsMap.set(normSku, {
      pn: pp.sku,
      sku: pp.sku,
      name: pp.name,
      description: pp.description || '',
      price,
      uSize,
      suitableRange: '',
      _depth: itemDepth,
      _promoted: true,
      brand: deriveBrand(pp),
      brandLogo: (typeof pp.brand === 'string' && pp.brand.startsWith('http')) ? pp.brand : '',
      _pdu: isPdu,
      _curated: false,
      image: (pp.images && pp.images[0]) || pp.imageURL || '',
      isShelf: false,
      _source: 'flagged_equipment'
    });
  });

  // Final unified safeguard filtering:
  // Shelves can ONLY exist if they are listed in inMatrixShelves for this cabinet!
  const finalUnified: Accessory[] = [];
  for (const item of itemsMap.values()) {
    const isShelf = isProductShelf(item, catalogMap, allMatrixShelves);
    const normSku = normalizeSku(item.sku || item.pn);
    if (isShelf) {
      if (inMatrixShelves.has(normSku)) {
        item.isShelf = true;
        if (!item.shelfType) item.shelfType = shelfTypeMap.get(normSku) || 'סטנדרטי';
        finalUnified.push(item);
      }
      // Shelves not in inMatrixShelves are dropped!
    } else {
      item.isShelf = false;
      finalUnified.push(item);
    }
  }

  return finalUnified;
};

const usePrefersReducedMotion = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
};

const ILLUSTRATION_ACCESSORIES: any[] = [
  { pn: 'NVR', sku: 'ILLUS-NVR', name: 'מקליט NVR', description: 'מקליט וידאו לרשת (להמחשה בלבד)', uSize: 1, price: 0, _illustration: true, image: 'https://drive.google.com/uc?export=view&id=12dVrH0GOzPUdbiVZO8ELDulnnBGUunCN' },
];

export interface EnrichedPreviewItem {
  name: string;
  sku?: string;
  description?: string;
  image?: string;
  uSize: number;
  spanU?: number;
  price?: number;
  quantity?: number;
  zone: string;
  type?: string;
  optionalIdx?: number;
  isPreset?: boolean;
}

const RenderSchematicFallback: React.FC<{ item: EnrichedPreviewItem; isLarge?: boolean }> = ({ item, isLarge }) => {
  const name = (item.name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const isShelf = name.includes('מדף') || desc.includes('מדף') || name.includes('shelf') || item.type === 'preset-shelf';
  const isFan = name.includes('מאוורר') || desc.includes('מאוורר') || name.includes('fan') || item.type === 'preset-fan';
  const isPdu = name.includes('שקע') || desc.includes('שקע') || name.includes('pdu');
  const isBrush = name.includes('מברשת') || desc.includes('מברשת') || name.includes('brush');
  const isWheel = name.includes('גלגל') || desc.includes('גלגל') || name.includes('wheel') || name.includes('רגליות');

  if (isShelf) {
    return (
      <div className="flex flex-col items-center justify-center p-3 w-full h-full text-center">
        <svg viewBox="0 0 200 60" className={isLarge ? "w-4/5 max-h-36 drop-shadow-md" : "w-full max-h-20"}>
          <rect x="5" y="10" width="190" height="40" rx="3" fill="#334155" stroke="#0f172a" strokeWidth="2" />
          <rect x="15" y="18" width="170" height="24" rx="2" fill="#1e293b" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={25 + i * 20} y="22" width="12" height="16" rx="1.5" fill="#475569" opacity="0.8" />
          ))}
          <circle cx="10" cy="20" r="2.5" fill="#94a3b8" />
          <circle cx="10" cy="40" r="2.5" fill="#94a3b8" />
          <circle cx="190" cy="20" r="2.5" fill="#94a3b8" />
          <circle cx="190" cy="40" r="2.5" fill="#94a3b8" />
        </svg>
        <span className="text-[11px] text-slate-400 mt-2 font-mono">19" Vented Metal Rack Shelf</span>
      </div>
    );
  }

  if (isFan) {
    return (
      <div className="flex flex-col items-center justify-center p-3 w-full h-full text-center">
        <div className="flex items-center gap-4 text-cyan-400">
          <span className="text-4xl animate-spin" style={{ animationDuration: '3s' }}>🌀</span>
          <span className="text-4xl animate-spin" style={{ animationDuration: '3s' }}>🌀</span>
        </div>
        <span className="text-[11px] text-cyan-300 mt-3 font-mono">Roof Ventilation & Cooling Fan Unit</span>
      </div>
    );
  }

  if (isPdu) {
    return (
      <div className="flex flex-col items-center justify-center p-3 w-full h-full text-center">
        <div className="w-full max-w-xs bg-red-950 border border-red-700 p-2 flex items-center justify-around rounded shadow">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-5 h-5 bg-black border border-red-800 flex items-center justify-center text-[7px] text-red-300 font-mono">
              ::
            </div>
          ))}
          <div className="w-4 h-3 bg-red-600 rounded-sm"></div>
        </div>
        <span className="text-[11px] text-red-300 mt-3 font-mono">19" Power Distribution Unit (PDU)</span>
      </div>
    );
  }

  if (isBrush) {
    return (
      <div className="flex flex-col items-center justify-center p-3 w-full h-full text-center">
        <div className="w-full max-w-xs bg-zinc-900 border border-amber-600/70 p-2 rounded">
          <div className="text-amber-400 font-mono text-[9px] tracking-widest text-center">
            ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
          </div>
        </div>
        <span className="text-[11px] text-amber-300 mt-3 font-mono">1U Cable Brush Management Panel</span>
      </div>
    );
  }

  if (isWheel) {
    return (
      <div className="flex flex-col items-center justify-center p-3 w-full h-full text-center">
        <div className="text-4xl text-emerald-400">🛞</div>
        <span className="text-[11px] text-emerald-300 mt-2 font-mono">Heavy Duty Castor Wheels / Feet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 w-full h-full text-center text-slate-400">
      <Box size={isLarge ? 48 : 28} className="text-slate-500 mb-2" />
      <span className="text-[11px] font-mono">אביזר ארון תקשורת 19 אינץ'</span>
    </div>
  );
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
  const [cabinetData, setCabinetData] = useState<CabinetMatrixData | null>(null);
  const [compatMap, setCompatMap] = useState<Record<string, any>>({});
  
  const [totalU, setTotalU] = useState<number>(0);
  const [builtInUsedU, setBuiltInUsedU] = useState<number>(0);
  
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [compatibleAccessories, setCompatibleAccessories] = useState<Accessory[]>([]);
  const [selectedOptionals, setSelectedOptionals] = useState<(Accessory & { quantity: number; id: string })[]>(() => (CABINET_CFG_STORE[product?.sku] as any) ?? []);

  const allMatrixShelvesRef = React.useRef<Set<string>>(new Set<string>(KNOWN_MATRIX_SHELF_SKUS));
  const inMatrixShelvesRef = React.useRef<Set<string>>(new Set<string>());
  const catalogMapRef = React.useRef<Map<string, any>>(new Map<string, any>());

  useEffect(() => {
    const map = new Map<string, any>();
    (catalogData || []).forEach((p: any) => {
      if (p && p.sku) map.set(normalizeSku(p.sku), p);
    });
    catalogMapRef.current = map;
  }, [catalogData]);

  useEffect(() => {
    if (product?.sku) CABINET_CFG_STORE[product.sku] = selectedOptionals;
  }, [selectedOptionals, product?.sku]);

  // Late catalog loading updates compatible options without resetting selected options
  useEffect(() => {
    if (!product || !cabinetData) return;
    const productSkuNorm = normalizeSku(product.sku);
    setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, cabinetData, compatMap, allMatrixShelvesRef.current));
  }, [catalogData, cabinetData, compatMap, product?.sku]);

  // ACCURACY: availableU is DERIVED (never mutated incrementally) so the counter
  // can never drift — always = total − built-in − sum(selected U × qty).
  
  const { usedU, slots, nonUAccessories, unallocatedItems } = React.useMemo(() => {
    const totalSlotsU = totalU || 0;
    const visualSlotsAlloc = new Array(totalSlotsU).fill(null);
    const shelfPositions: number[] = [];
    const unallocatedItems: any[] = [];
    
    // 1. Included Shelves
    const shelvesQtyMatch = includedItems.find(i => i.includes('מדפים:') && i.includes('כלול בכמות'));
    const shelvesQty = shelvesQtyMatch ? parseInt(shelvesQtyMatch.replace(/[^\d]/g, '')) : 0;
    if (shelvesQty > 0) {
      for (let s = 1; s <= shelvesQty; s++) {
        const pos = Math.round((s * totalSlotsU) / (shelvesQty + 1));
        if (pos >= 1 && pos <= totalSlotsU && visualSlotsAlloc[pos - 1] === null) {
          visualSlotsAlloc[pos - 1] = 'shelf';
          shelfPositions.push(pos);
        } else {
          let placed = false;
          for (let offset = 1; offset < totalSlotsU; offset++) {
            if (pos + offset <= totalSlotsU && visualSlotsAlloc[pos + offset - 1] === null) {
              visualSlotsAlloc[pos + offset - 1] = 'shelf';
              shelfPositions.push(pos + offset);
              placed = true;
              break;
            }
            if (pos - offset >= 1 && visualSlotsAlloc[pos - offset - 1] === null) {
              visualSlotsAlloc[pos - offset - 1] = 'shelf';
              shelfPositions.push(pos - offset);
              placed = true;
              break;
            }
          }
          if (!placed) shelfPositions.push(pos);
        }
      }
    }

    // 2. Optional accessories added by user (Contiguous allocation)
    const optionalItemsAssignment: { uIndex: number; name: string; description: string; accessoryRef: any; optionalIdx: number; isAnchor: boolean; spanU: number; error?: string; instanceId?: string }[] = [];
    const nonUAccessories: { name: string; sku: string; quantity: number; description: string; accessoryRef: any; optionalIdx: number; zone: 'roof' | 'plinth' | 'vertical' | 'hardware' }[] = [];
    
    selectedOptionals.forEach((opt: any, optIdx: number) => {
      if (opt.uSize === 0) {
        nonUAccessories.push({
          name: opt.name || opt.pn,
          sku: opt.sku || opt.pn,
          quantity: opt.quantity || 1,
          description: opt.description || opt.name || '',
          accessoryRef: opt,
          optionalIdx: optIdx,
          zone: getPhysicalZone(opt.sku || opt.pn, opt.name || '', opt.description || ''),
        });
        return;
      }
      const qty = opt.quantity || 1;
      const size = opt.uSize;
      
      for (let q = 0; q < qty; q++) {
        let foundStart = -1;
        // Search from top (totalSlotsU - 1) down to find a contiguous block of 'size'
        for (let i = totalSlotsU - size; i >= 0; i--) {
          let fits = true;
          for (let j = 0; j < size; j++) {
            if (visualSlotsAlloc[i + j] !== null) {
              fits = false;
              break;
            }
          }
          if (fits) {
            foundStart = i;
            break;
          }
        }
        
        if (foundStart !== -1) {
          // Mark allocated
          const instId = `${opt.sku || opt.pn}-unit-${q}`;
          for (let j = 0; j < size; j++) {
            visualSlotsAlloc[foundStart + j] = 'opt';
            const currentU = foundStart + j + 1;
            optionalItemsAssignment.push({
              uIndex: currentU,
              name: opt.name || opt.pn,
              description: opt.description || '',
              accessoryRef: opt,
              optionalIdx: optIdx,
              isAnchor: j === size - 1, // anchor at the TOP of the span
              spanU: size,
              instanceId: instId
            });
          }
        } else {
          unallocatedItems.push(opt);
          console.warn('Could not find contiguous space for accessory:', opt.pn);
        }
      }
    });

    let calcUsedU = 0;
    for (let i = 0; i < totalSlotsU; i++) {
      if (visualSlotsAlloc[i] !== null) calcUsedU++;
    }

    const builtSlots: VisualSlot[] = [];
    for (let u = totalSlotsU; u >= 1; u--) {
      if (shelfPositions.includes(u)) {
        builtSlots.push({
          uIndex: u,
          type: 'preset-shelf',
          name: 'מדף מובנה קבוע (המחשה) 📦',
          description: 'מדף מתכת קבוע הכלול בארון. המיקום להמחשה.'
        });
      } else {
        const optMatch = optionalItemsAssignment.find(o => o.uIndex === u);
        if (optMatch) {
          builtSlots.push({
            uIndex: u,
            type: 'optional-accessory',
            name: optMatch.name,
            description: optMatch.description,
            accessoryRef: optMatch.accessoryRef,
            optionalIdx: optMatch.optionalIdx,
            isAnchor: optMatch.isAnchor,
            spanU: optMatch.spanU,
            instanceId: optMatch.instanceId
          });
        } else {
          builtSlots.push({
            uIndex: u,
            type: 'empty',
            name: `U${u} פנוי`,
            description: 'מקום פנוי להתקנת ציוד'
          });
        }
      }
    }
    
    return { usedU: calcUsedU, slots: builtSlots, nonUAccessories, unallocatedItems };
  }, [totalU, includedItems, selectedOptionals]);

  const totalSlotsU = totalU || 0;
  const availableU = totalU - usedU;

  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [pendingAccessory, setPendingAccessory] = useState<Accessory | null>(null);
  const [addedIdx, setAddedIdx] = useState<number | null>(null);
  const [highlightedOptIdx, setHighlightedOptIdx] = useState<number | null>(null);
  const [lastAddedInstanceId, setLastAddedInstanceId] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<EnrichedPreviewItem | null>(null);
  const [inspectedProduct, setInspectedProduct] = useState<EnrichedPreviewItem | null>(null);
  const [modalZoomLevel, setModalZoomLevel] = useState<number>(1);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Close inspection modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectedProduct(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset modal zoom level when inspected item changes
  useEffect(() => {
    setModalZoomLevel(1);
  }, [inspectedProduct]);

  const [a11yMessage, setA11yMessage] = useState<string>('');
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [chassisPulse, setChassisPulse] = useState(false);
  const [pdfWithPrice, setPdfWithPrice] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [accSearch, setAccSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const [customAccName, setCustomAccName] = useState('');
  const [customAccU, setCustomAccU] = useState<number>(1);

  const handleAddCustomIllustration = () => {
    if (!customAccName.trim()) return;
    const newAcc = {
      pn: 'CUSTOM',
      sku: 'ILLUS-CUSTOM-' + Date.now(),
      name: customAccName.trim(),
      description: 'פריט מותאם אישית (להמחשה בלבד)',
      uSize: customAccU,
      price: 0,
      _illustration: true,
      _curated: false,
    } as Accessory;
    
    handleAddOptional(newAcc, -1);
    setCustomAccName('');
    setCustomAccU(1);
  };

  const handleIncrementQuantity = (index: number) => {
    const item = selectedOptionals[index];
    if (!item) return;
    
    const fitsRemaining = item.uSize === 0 || item.uSize <= availableU;
    if (!fitsRemaining) {
      setPendingAccessory(item);
      setWarningModalOpen(true);
      return;
    }

    const nextUnitIdx = item.quantity;
    const newInstId = `${item.sku || item.pn}-unit-${nextUnitIdx}`;
    setLastAddedInstanceId(newInstId);
    setHighlightedOptIdx(index);
    setChassisPulse(true);

    setSelectedOptionals(prev => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], quantity: newArr[index].quantity + 1 };
      return newArr;
    });

    setTimeout(() => {
      setLastAddedInstanceId(null);
      setChassisPulse(false);
    }, 1400);
    setTimeout(() => {
      setHighlightedOptIdx(null);
    }, 2200);
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
        setCompatMap(compatMap);

        // Extract all shelf SKUs appearing anywhere in the matrix (columns 12, 13, 14)
        const allMatrixShelves = new Set<string>(KNOWN_MATRIX_SHELF_SKUS);
        for (let i = 2; i < cabRows.length; i++) {
          const row = cabRows[i];
          if (!row) continue;
          [row[12], row[13], row[14]].forEach(cell => {
            if (!cell) return;
            const str = cell.toString().trim();
            if (str.toUpperCase() === 'X') return;
            str.split(/[\s,;\n]+/).forEach((s: string) => {
              const norm = normalizeSku(s);
              if (norm && norm !== 'X') allMatrixShelves.add(norm);
            });
          });
        }
        allMatrixShelvesRef.current = allMatrixShelves;

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
           const parsedTotalU = uMatch ? parseInt(uMatch[1]) : 0; // do not fallback to 42
           setTotalU(parsedTotalU);
           
           let initialAvailableU = parsedTotalU;
           inMatrixShelvesRef.current = new Set<string>();
           if (initialAccessory) {
             const initSku = normalizeSku(initialAccessory.sku || initialAccessory.pn);
             const isInitShelf = isProductShelf(initialAccessory, catalogMapRef.current, allMatrixShelves);
             if (isInitShelf) {
               console.warn(`[CabinetConfigurator] initialAccessory ${initSku} is a shelf not in matrix for fallback cabinet. Ignored.`);
             } else {
               const uSz = resolveUConsumption(initialAccessory).u;
               initialAvailableU -= uSz;
               setSelectedOptionals([{
                  pn: initialAccessory.sku,
                  sku: initialAccessory.sku,
                  name: initialAccessory.name,
                  description: initialAccessory.description || '',
                  price: initialAccessory.price || 0,
                  uSize: uSz,
                  quantity: 1,
                  isShelf: false,
                  id: 'initial-' + initialAccessory.sku
               }]);
             }
           } else {
             if (!CABINET_CFG_INIT.has(product.sku)) setSelectedOptionals([]);
           }
           CABINET_CFG_INIT.add(product.sku);
           setBuiltInUsedU(0);
           setIncludedItems([]);
           const fallbackCabinet: CabinetMatrixData = {
             sku: productSkuNorm,
             u: parsedTotalU,
             depth: parseCabinetDepthFromName(product.name || ''),
             width: null,
             frontDoor: '',
             rearDoor: '',
             color: '',
             fans: '',
             wheels: '',
             levelingFeet: '',
             shelvesQty: '',
             suitableStandard: [],
             suitableHanging: [],
             suitableSliding: []
           };
           setCabinetData(fallbackCabinet);
           setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, fallbackCabinet, compatMap, allMatrixShelves));
           setLoading(false);
           return;
        }

        const widthVal = parseInt(String(cabRow[3] ?? ''), 10);
        const depthVal = parseInt(String(cabRow[4] ?? ''), 10);
        const data: CabinetMatrixData = {
           sku: cabRow[0]?.toString() || '',
           u: parseInt(cabRow[2]?.toString() || '0', 10),
           width: isNaN(widthVal) ? null : widthVal,
           depth: isNaN(depthVal) ? null : depthVal,
           frontDoor: String(cabRow[5] ?? '').trim(),
           rearDoor: String(cabRow[6] ?? '').trim(),
           color: String(cabRow[7] ?? '').trim(),
           fans: cabRow[8]?.toString() || 'X',
           wheels: cabRow[9]?.toString() || 'X',
           levelingFeet: cabRow[10]?.toString() || 'X',
           shelvesQty: cabRow[11]?.toString() || 'X',
           suitableStandard: parseCompatibleSkus(cabRow[12]?.toString()),
           suitableHanging: parseCompatibleSkus(cabRow[13]?.toString()),
           suitableSliding: parseCompatibleSkus(cabRow[14]?.toString())
        };

        setCabinetData(data);

        const inMatrixShelves = new Set<string>([
          ...data.suitableStandard,
          ...data.suitableHanging,
          ...data.suitableSliding
        ].map(normalizeSku).filter(s => s && s !== 'X'));
        inMatrixShelvesRef.current = inMatrixShelves;

        // U capacity
        let parsedTotalU = data.u > 0 ? data.u : (parseInt((product.name || '').match(/(\d+)U/i)?.[1] || '0') || 0); // do not fallback to 42
        console.log('[CabinetConfigurator] Resolved cabinet U capacity:', parsedTotalU, 'for SKU', product.sku);
        setTotalU(parsedTotalU);
        
        // Calculate used U from included items
        const shelvesQty = parseInt(data.shelvesQty) || 0;
        const initialUsedU = shelvesQty * 1; // Assuming each shelf is 1U
        let initialAvailableU = parsedTotalU - initialUsedU;

        if (initialAccessory) {
          const initSku = normalizeSku(initialAccessory.sku || initialAccessory.pn);
          const isInitShelf = isProductShelf(initialAccessory, catalogMapRef.current, allMatrixShelves);
          if (isInitShelf && !inMatrixShelves.has(initSku)) {
            console.warn(`[CabinetConfigurator] initialAccessory ${initSku} is a shelf not permitted by cabinet matrix for ${productSkuNorm}. Ignored.`);
          } else {
            const uSz = resolveUConsumption(initialAccessory).u;
            initialAvailableU -= uSz;
            setSelectedOptionals([{
               pn: initialAccessory.sku,
               sku: initialAccessory.sku,
               name: initialAccessory.name,
               description: initialAccessory.description || '',
               price: initialAccessory.price || 0,
               uSize: uSz,
               quantity: 1,
               isShelf: isInitShelf,
               id: 'initial-' + initialAccessory.sku
            }]);
          }
        } else if (!CABINET_CFG_INIT.has(product.sku)) {
          setSelectedOptionals([]);
        }
        CABINET_CFG_INIT.add(product.sku);
        setBuiltInUsedU(initialUsedU);

        // Determine "What's in the Box" (Included Accessories)
        const included: string[] = [];
        
        const checkIncluded = (val: string, name: string) => {
          if (!val) return `${name}: מידע לא זמין`;
          if (val.toUpperCase() === 'X' || val === '0') return `${name}: לא כלול`;
          return `${name}: כלול בכמות ${val}`;
        };

        included.push(checkIncluded(data.fans, 'מאווררים'));
        included.push(checkIncluded(data.wheels, 'גלגלים'));
        included.push(checkIncluded(data.levelingFeet, 'רגליות פילוס'));
        included.push(checkIncluded(data.shelvesQty, 'מדפים'));

        setIncludedItems(included);

        // 3. Catalog-driven compatibility
        setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, data, compatMap, allMatrixShelves));
        setLoading(false);
        
      } catch (error) {
        console.error("[CabinetConfigurator] error - attempting catalog-only fallback:", error);
        try {
          const uMatch = product.name?.match(/(\d+)U/i) || product.description?.match(/(\d+)U/i);
          setTotalU(uMatch ? parseInt(uMatch[1]) : 0);
          setBuiltInUsedU(0);
          setIncludedItems([]);
          const uM = product.name?.match(/(\d+)U/i) || product.description?.match(/(\d+)U/i);
          const pSku = String(product.sku ?? '').trim().toUpperCase(); const pU = uM ? parseInt(uM[1]) : 0; setCompatibleAccessories(buildCatalogAccessories(catalogData, pSku, { sku: pSku, u: pU, depth: parseCabinetDepthFromName(product.name || ''), width: null, frontDoor: '', rearDoor: '', color: '', fans: '', wheels: '', levelingFeet: '', shelvesQty: '', suitableStandard: [], suitableHanging: [], suitableSliding: [] }, {}, allMatrixShelvesRef.current));
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
        if ((item as any)._illustration) return; // visual-only, never added to the order
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          flattened.push(item);
        }
      });
      onOptionalsChangeRef.current(flattened);
    }
  }, [selectedOptionals]);

  const handleAddOptional = (acc: Accessory, idx: number) => {
    const normSku = normalizeSku(acc.sku || acc.pn);
    const isShelf = isProductShelf(acc, catalogMapRef.current, allMatrixShelvesRef.current);
    if (isShelf) {
      if (!inMatrixShelvesRef.current.has(normSku)) {
        console.warn(`[CabinetConfigurator] Shelf ${normSku} is not permitted for cabinet ${cabinetData?.sku}. Blocked.`);
        return;
      }
    }

    const existingItem = selectedOptionals.find(item => item.pn === acc.pn);
    const nextUnitIdx = existingItem ? existingItem.quantity : 0;
    const newInstId = `${acc.sku || acc.pn}-unit-${nextUnitIdx}`;

    // Advisory capacity only: always add. Over-capacity is shown by the red "מקום פנוי" badge, never silently blocked.
    setSelectedOptionals(prev => {
      const existingIdx = prev.findIndex(item => item.pn === acc.pn);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx] = { ...newArr[existingIdx], quantity: newArr[existingIdx].quantity + 1 };
        return newArr;
      }
      return [...prev, { ...acc, quantity: 1, id: acc.sku || acc.pn || Math.random().toString() }];
    });
    setLastAddedInstanceId(newInstId);
    setAddedIdx(idx);
    setHighlightedOptIdx(idx);
    setChassisPulse(true);

    setTimeout(() => {
      setLastAddedInstanceId(null);
      setChassisPulse(false);
    }, 1400);
    setTimeout(() => {
      setAddedIdx(null);
      setHighlightedOptIdx(null);
    }, 2200);
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
    isAnchor?: boolean;
    instanceId?: string;
    spanU?: number;
    name: string;
    description?: string;
    accessoryRef?: any;
    optionalIdx?: number;
  }

  const getAccessoryImage = (acc: any): string => {
    if (!acc) return '';
    if (acc.image && typeof acc.image === 'string' && acc.image.trim() !== '') {
      return acc.image;
    }
    if (acc.accessoryRef?.image && typeof acc.accessoryRef.image === 'string' && acc.accessoryRef.image.trim() !== '') {
      return acc.accessoryRef.image;
    }
    const targetSku = normalizeSku(acc.sku || acc.pn || acc.accessoryRef?.sku || acc.accessoryRef?.pn || '');
    if (targetSku && catalogData && Array.isArray(catalogData)) {
      const found = catalogData.find((p: any) => normalizeSku(p.sku) === targetSku);
      if (found) {
        if (found.images && Array.isArray(found.images) && found.images[0]) {
          return found.images[0];
        }
        if (found.imageURL) return found.imageURL;
      }
    }
    if ((acc.type === 'preset-shelf' || acc.isShelf) && cabinetData?.suitableStandard?.length) {
      const stdSku = normalizeSku(cabinetData.suitableStandard[0]);
      const foundShelf = catalogData?.find((p: any) => normalizeSku(p.sku) === stdSku);
      if (foundShelf?.images?.[0]) return foundShelf.images[0];
      if (foundShelf?.imageURL) return foundShelf.imageURL;
    }
    return '';
  };

  const buildPreviewFromSlot = (slot: VisualSlot): EnrichedPreviewItem => {
    const isPreset = slot.type.startsWith('preset-');
    const acc = slot.accessoryRef || {};
    const sku = acc.sku || acc.pn || (isPreset ? 'כלול בארון' : '');
    const name = slot.name || acc.name || (isPreset ? 'ציוד מובנה' : 'ציוד בארון');
    const description = slot.description || acc.description || '';
    const spanU = slot.spanU || acc.uSize || 1;
    const uSize = slot.type === 'empty' ? 0 : spanU;
    const image = getAccessoryImage(acc) || (isPreset ? getAccessoryImage({ isShelf: slot.type === 'preset-shelf' }) : '');
    const price = acc.price || 0;
    const quantity = acc.quantity || 1;
    const zone = `מסילות U חזיתיות (U${slot.uIndex}${spanU > 1 ? ` - U${slot.uIndex - spanU + 1}` : ''})`;

    return {
      name,
      sku,
      description,
      image,
      uSize,
      spanU,
      price,
      quantity,
      zone,
      type: slot.type,
      optionalIdx: slot.optionalIdx,
      isPreset,
    };
  };

  const buildPreviewFromNonU = (item: any, zoneType: 'roof' | 'vertical' | 'plinth' | 'hardware'): EnrichedPreviewItem => {
    const acc = item.accessoryRef || item;
    const sku = acc.sku || acc.pn || item.sku || '';
    const name = item.name || acc.name || item.description || '';
    const description = item.description || acc.description || '';
    const image = getAccessoryImage(acc) || getAccessoryImage(item);
    const price = acc.price || item.price || 0;
    const quantity = item.quantity || 1;
    const zoneMap: Record<string, string> = {
      roof: 'תקרת הארון (Roof) · איוורור ותאורה',
      vertical: 'דופן ורטיקלית וצדית (Vertical Rails)',
      plinth: 'בסיס ותחתית הארון (Plinth / Base)',
      hardware: 'חומרת הרכבה וציוד נלווה (Hardware)',
    };

    return {
      name,
      sku,
      description,
      image,
      uSize: 0,
      price,
      quantity,
      zone: zoneMap[zoneType] || 'אביזר נלווה (0U)',
      type: 'optional-accessory',
      optionalIdx: item.optionalIdx,
      isPreset: false,
    };
  };




  const roofItems = nonUAccessories.filter(a => a.zone === 'roof');
  const verticalItems = nonUAccessories.filter(a => a.zone === 'vertical');
  const plinthItems = nonUAccessories.filter(a => a.zone === 'plinth');
  const hardwareItems = nonUAccessories.filter(a => a.zone === 'hardware');

  // --- Accessory grouping: search + accordion buckets (promoted grouped by BRAND) ---
  const _accPairs = compatibleAccessories.map((acc, idx) => ({ acc, idx }));
  const _q = accSearch.trim().toLowerCase();
  const _qTokens = _q.split(/[\s\-/,]+/).filter(Boolean);
  const _accMatch = ({ acc }: any) => {
    if (!_qTokens.length) return true;
    const hay = `${acc.pn || ''} ${acc.name || ''} ${acc.description || ''} ${acc.sku || ''}`.toLowerCase();
    return _qTokens.every((tok: string) => hay.includes(tok)); // all words, any order
  };
  const _filtered = _accPairs.filter(_accMatch);

  // Rubric 1: Shelves matching cabinet matrix
  const _bucketShelves = _filtered
    .filter(({ acc }: any) => acc.isShelf)
    .sort((a: any, b: any) => {
      const order: Record<string, number> = { 'סטנדרטי': 1, 'תלוי': 2, 'נשלף': 3 };
      const oa = order[a.acc.shelfType] || 4;
      const ob = order[b.acc.shelfType] || 4;
      if (oa !== ob) return oa - ob;
      return (a.acc.pn || '').localeCompare(b.acc.pn || '');
    });

  // Rubric 2: Additional equipment taking space (>0U)
  const _bucketTakesU = _filtered
    .filter(({ acc }: any) => !acc.isShelf && acc.uSize > 0)
    .sort((a: any, b: any) => {
      const rank = (x: any) => (x.acc._curated ? 0 : (x.acc._depth ? 1 : 2));
      const rDiff = rank(a) - rank(b);
      if (rDiff !== 0) return rDiff;
      return b.acc.uSize - a.acc.uSize;
    });

  // Rubric 3: Accessories taking no space (0U)
  const _bucketFree = _filtered
    .filter(({ acc }: any) => !acc.isShelf && acc.uSize === 0)
    .sort((a: any, b: any) => {
      const rank = (x: any) => (x.acc._curated ? 0 : 1);
      return rank(a) - rank(b);
    });
  
  const _illusPairs = ILLUSTRATION_ACCESSORIES
    .map((acc, i) => ({ acc, idx: 100000 + i }))
    .filter(({ acc }: any) => {
      if (!_qTokens.length) return true;
      const hay = `${acc.pn} ${acc.name} ${acc.description}`.toLowerCase();
      return _qTokens.every((tok: string) => hay.includes(tok));
    });
  const _bucketPromoted = _filtered.filter(({ acc }: any) => acc._promoted);
  const _promotedByBrand: Record<string, any[]> = {};
  _bucketPromoted.forEach((pair: any) => {
    const brand = String(pair.acc.brand || 'אחר').trim() || 'אחר';
    (_promotedByBrand[brand] = _promotedByBrand[brand] || []).push(pair);
  });

  const renderAccCard = (acc: any, idx: number) => {
    const catalogMatch = catalogData.find(pp => pp && pp.sku && (pp.sku === acc.pn || pp.sku === acc.sku));
    const showPrice = catalogMatch ? catalogMatch.price : (acc.price || 0);
    const fitsRemaining = acc.uSize === 0 || acc.uSize <= availableU;
    
    // Calculate if we actually have enough *contiguous* space.
    // The previous logic just checked total available U, but we need to check contiguous if uSize > 1.
    // To simplify and not run complex logic on every render, we rely on `fitsRemaining` primarily, but we can be specific.

  return (
      <div id={`acc-${acc.pn}`} key={idx} className={`flex flex-col p-3.5 border group transition-all relative rounded-none hover:shadow-sm ${fitsRemaining ? 'bg-slate-50 border-slate-100 hover:border-[#004387]' : 'bg-rose-50/20 border-rose-200'} ${highlightedSku === acc.pn ? 'ring-2 ring-[#fe8d00] bg-orange-50' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          {acc.image ? (
            <img referrerPolicy="no-referrer" src={acc.image} alt={acc.name || acc.description || acc.pn}
              className="w-12 h-12 object-contain bg-white border border-slate-200 rounded p-1 flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
             <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded p-1 flex-shrink-0 flex items-center justify-center text-slate-300">
               <Box size={24} />
             </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px] text-slate-900 group-hover:text-[#004387] transition-colors leading-tight mb-1" title={acc.name || acc.description}>{acc.name || acc.description || 'פריט ללא שם'}</p>
            <p className="text-[12px] text-gray-500 flex justify-start items-center gap-2" title={acc.pn}>
               <span dir="ltr" className="inline-block bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">{acc.pn}</span>
               {acc.uSize > 0 && <span className="font-semibold text-slate-600 border-r border-slate-300 pr-2">דורש {acc.uSize}U</span>}
               {acc.uSize === 0 && <span className="font-semibold text-slate-500 border-r border-slate-300 pr-2">0U (ללא נפח)</span>}
            </p>
          </div>
          {showPrice > 0 && (
            <span className="text-xs font-bold text-slate-800 bg-slate-200 py-0.5 px-1.5 rounded-none whitespace-nowrap font-mono h-5 flex items-center justify-center">
              ₪{showPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 gap-2">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 flex-1 flex-wrap">
            {acc.isShelf && acc.shelfType && (
              <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                מדף {acc.shelfType}
              </span>
            )}
            {!acc.isShelf && acc._curated && (
              <span className="text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded">✓ הותאם לארון</span>
            )}
            {acc._illustration && <span className="text-purple-600 font-bold bg-purple-50 px-1 py-0.5 rounded">להמחשה בלבד</span>}
            {acc.uSize > 0 && !fitsRemaining && <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded whitespace-nowrap">⚠️ חסר מקום פנוי</span>}
          </span>
          <button type="button" onClick={() => handleAddOptional(acc, idx)}
            className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 rounded-none hover:shadow-sm ${!fitsRemaining ? 'bg-slate-300 text-slate-600 cursor-not-allowed hover:bg-slate-300' : (addedIdx === idx ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-[#004387] text-white hover:bg-[#fe8d00]')}`}
            aria-label="Add Accessory">
            {addedIdx === idx ? (<><CheckCircle size={14} /><span>נוסף לארון</span></>) : (<><Plus size={14} /><span>הוסף לארון</span></>)}
          </button>
        </div>
      </div>
    );
  };

  const AccordionSection = (id: string, title: string, pairs: any[], tone: string, defaultOpen: boolean = true, logoUrl: string = '') => {
    if (!pairs.length) return null;
    const open = openSections[id] ?? defaultOpen;
    return (
      <div key={id} className="border border-slate-200 rounded-none mb-2.5">
        <button type="button" onClick={() => setOpenSections(s => ({ ...s, [id]: !( s[id] !== false) }))}
          className={`w-full flex items-center justify-between px-4 py-2 min-h-[50px] font-bold text-[15px] ${tone} active:opacity-80`}>
          <span className="flex items-center gap-4">{logoUrl ? <img src={logoUrl} alt="" className="h-20 max-w-[220px] -my-6 object-contain mix-blend-multiply" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} /> : null}<span>{title}{title ? ' ' : ''}<span className="opacity-70 font-mono">({pairs.length})</span></span></span>
          <ChevronDown size={22} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="space-y-3 p-2.5 max-h-[320px] overflow-y-auto">{pairs.map(({ acc, idx }: any) => renderAccCard(acc, idx))}</div>}
      </div>
    );
  };

  const pdfCabinetPrice = Math.round(Number(product?.price) || 0);
  const pdfOrderable = selectedOptionals.filter((o: any) => !o._illustration);
  const pdfAccessoriesTotal = pdfOrderable.reduce((s: number, o: any) => s + (Math.round(Number(o.price) || 0) * (o.quantity || 1)), 0);
  const pdfGrandTotal = pdfCabinetPrice + pdfAccessoriesTotal;

  // Build a self-contained HTML document and open it in a new window.
  // Reliable across desktop + mobile + PWA (unlike window.print() on the live page,
  // which iOS/PWA blocks and which clipped the layout on desktop).
  const handleDownloadPdf = (withPrice: boolean) => {
    setPdfWithPrice(withPrice);
    setShowPdfPreview(true);
  };

  return (
    <div className="@container mt-8 bg-white border-2 border-[#004387] shadow-sm relative overflow-hidden" dir="rtl">
      
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
          מקום פנוי (המחשה): {availableU}U / {totalSlotsU}U
        </div>
      </div>

      
      <div className="p-6 grid grid-cols-1 @4xl:grid-cols-3 gap-8">
        
        {/* Column 1: Interactive Server Rack Simulator (Right side) */}
        <div className="@4xl:col-span-1 space-y-3 lg:sticky lg:top-4 self-start max-h-[calc(100vh-2rem)] flex flex-col">
          <div className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-1 justify-between flex-wrap">
            <span className="flex items-center gap-1.5">
              <span>🖥️ הדמיית ארון תקשורת פיזי</span>
              <span className="text-xs font-normal text-slate-500">({totalSlotsU}U)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomMode(z => !z)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                title={zoomMode ? 'חזור לתצוגת ארון מלאה' : 'עבור לתצוגת תקריב מפורטת'}
              >
                {zoomMode ? '🔍 תצוגה מלאה' : '🔍 תקריב מפורט'}
              </button>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">1U = 44.45mm</span>
            </div>
          </div>

          {/* Quick Tip for Image Magnification */}
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-none font-medium">
            <span className="flex items-center gap-1.5">
              <ZoomIn size={14} className="text-amber-600 shrink-0" />
              <span>הצבע בעכבר או גע במסך על מוצר בארון להגדלת התמונה והפרטים</span>
            </span>
            <span className="text-[10px] bg-amber-200/70 text-amber-900 font-mono px-1.5 py-0.5 rounded shrink-0">
              תקריב פעיל
            </span>
          </div>

          {/* Visual Rack Container */}
          <div className={`relative border-4 bg-slate-950 p-2 sm:p-3 shadow-2xl flex flex-col flex-1 min-h-[440px] max-h-[calc(100vh-6rem)] overflow-hidden transition-all duration-300 ${chassisPulse ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700'}`}>
            
            {/* Floating Magnifier HUD (Desktop Hover) */}
            <AnimatePresence>
              {hoveredProduct && !inspectedProduct && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-2 left-2 z-40 w-52 sm:w-60 bg-slate-900/95 backdrop-blur-md border-2 border-amber-400 text-white p-2.5 shadow-2xl rounded-none pointer-events-none"
                >
                  <div className="flex items-center justify-between gap-1 pb-1 mb-1.5 border-b border-slate-700">
                    <span className="text-[10px] font-bold tracking-wider text-amber-400 flex items-center gap-1">
                      <ZoomIn size={12} /> תקריב מוצר
                    </span>
                    {hoveredProduct.uSize > 0 ? (
                      <span className="text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                        {hoveredProduct.uSize}U
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-indigo-900/80 text-indigo-200 px-1.5 py-0.5 rounded">
                        0U
                      </span>
                    )}
                  </div>

                  {/* Enlarged Image Container */}
                  <div className="w-full h-32 sm:h-36 bg-white rounded-none border border-slate-700/60 overflow-hidden flex items-center justify-center p-1.5 mb-1.5 relative shadow-inner">
                    {hoveredProduct.image ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={hoveredProduct.image}
                        alt={hoveredProduct.name}
                        className="w-full h-full object-contain filter drop-shadow-sm"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <RenderSchematicFallback item={hoveredProduct} />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-100 line-clamp-2 leading-tight">
                      {hoveredProduct.name}
                    </div>
                    {hoveredProduct.sku && (
                      <div className="text-[9.5px] font-mono text-slate-400 flex items-center justify-between">
                        <span>מק"ט: {hoveredProduct.sku}</span>
                        {hoveredProduct.price ? (
                          <span className="text-amber-300 font-bold">₪{hoveredProduct.price.toLocaleString('he-IL')}</span>
                        ) : null}
                      </div>
                    )}
                    <div className="text-[9px] text-amber-300/90 font-medium pt-1 border-t border-slate-800 flex items-center justify-center gap-1">
                      <span>👆 לחץ/גע להגדלה מלאה ופרטים</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulated Glass Door Gloss Effect */}
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/5 to-transparent pointer-events-none z-10 select-none"></div>
            
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

            {/* ROOF ZONE — fans physically sit in the cabinet ceiling, not the frontal U-rails */}
            {roofItems.length > 0 && (
              <div className="mx-3 mb-1 rounded-none border border-cyan-500/70 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 px-2.5 py-1.5 flex-shrink-0">
                <div className="text-[9px] font-black tracking-widest text-cyan-300/90 uppercase text-center mb-1 select-none">◄ תקרת הארון (Roof) · איוורור ותאורה ►</div>
                {roofItems.map((r, i) => {
                  const preview = buildPreviewFromNonU(r, 'roof');
                  return (
                    <div 
                      key={i} 
                      className="flex items-center justify-between text-cyan-100 text-[11px] py-0.5 hover:bg-cyan-900/40 px-1 rounded cursor-pointer transition-colors group"
                      onMouseEnter={() => setHoveredProduct(preview)}
                      onMouseLeave={() => setHoveredProduct(null)}
                      onClick={() => setInspectedProduct(preview)}
                      title="לחץ להגדלת תמונה ופרטים"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="inline-block animate-spin text-cyan-300" style={{ animationDuration: '4s' }}>🌀</span>
                        <span className="truncate">{r.description || r.name}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 group-hover:text-amber-300 transition-colors p-0.5"><ZoomIn size={12} /></span>
                        <span className="font-mono font-bold bg-cyan-900/60 px-1.5 rounded text-[10px] shrink-0 mr-1">{r.quantity}x</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chassis Interior: Full proportional view or scrollable zoom */}
            <div 
              className={zoomMode 
                ? "flex-1 overflow-y-auto overflow-x-hidden space-y-1 px-2 sm:px-3 py-1 relative z-0 custom-scrollbar pr-1" 
                : "flex-1 flex flex-col justify-between w-full h-full min-h-0 relative z-0 px-2 sm:px-3 py-1 space-y-0.5 overflow-hidden select-none"
              }
              style={{ contain: 'layout' }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
              {slots.map((slot, idx) => {
                const isEmpty = slot.type === 'empty';
                const isFan = slot.type === 'preset-fan';
                const isShelf = slot.type === 'preset-shelf';
                const isOptional = slot.type === 'optional-accessory';
                const isCont = isOptional && slot.isAnchor === false; // continuation row of a multi-U item

                if (isCont) return null; // merged into the anchor cell above (multi-U block)

                const nameLower = (slot.name || '').toLowerCase();
                const descLower = (slot.description || '').toLowerCase();

                const isBlank = isOptional && (nameLower.includes('עיוור') || descLower.includes('עיוור') || nameLower.includes('blank') || descLower.includes('blank'));
                const isBrush = isOptional && (nameLower.includes('מברשת') || descLower.includes('מברשת') || nameLower.includes('שערות') || descLower.includes('שערות') || nameLower.includes('brush') || descLower.includes('brush'));
                const isFanUpgrade = isOptional && (nameLower.includes('מאוורר') || descLower.includes('מאוורר') || nameLower.includes('fan') || descLower.includes('fan') || nameLower.includes('מפוח') || descLower.includes('מפוח'));
                const isPdu = isOptional && (nameLower.includes('שקע') || descLower.includes('שקע') || nameLower.includes('pdu') || descLower.includes('pdu') || nameLower.includes('כח') || descLower.includes('כוח') || nameLower.includes('כבילה'));
                const isShelfUpgrade = isOptional && (nameLower.includes('מדף') || descLower.includes('מדף') || nameLower.includes('shelf') || descLower.includes('shelf') || nameLower.includes('מגירה') || descLower.includes('sliding'));

                // Choose ClassNames based on type
                let slotStyles = 'bg-slate-900/30 hover:bg-slate-900/60 border-slate-800/60 text-slate-500 py-1.5 px-2.5 border-dashed hover:text-slate-300 hover:border-[#004387]/70 cursor-pointer';
                if (isFan || isFanUpgrade) {
                  slotStyles = 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 border-cyan-500/80 text-cyan-200 py-1.5 px-2.5 shadow-md hover:border-cyan-400';
                } else if (isShelf || isShelfUpgrade) {
                  slotStyles = 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-emerald-500/80 text-emerald-200 py-1.5 px-2.5 shadow-md hover:border-emerald-400';
                } else if (isBlank) {
                  slotStyles = 'bg-gradient-to-r from-neutral-800 via-neutral-900 to-neutral-800 border-neutral-600/80 text-neutral-300 py-1.5 px-2.5 shadow-sm hover:border-neutral-400';
                } else if (isBrush) {
                  slotStyles = 'bg-gradient-to-r from-black via-zinc-900 to-black border-amber-600/60 text-amber-200 py-1.5 px-2.5 shadow-sm hover:border-amber-400';
                } else if (isPdu) {
                  slotStyles = 'bg-gradient-to-r from-red-950/90 via-zinc-950 to-red-900 border-red-600/70 text-red-100 py-1.5 px-2.5 shadow-md hover:border-red-400';
                } else if (isOptional) {
                  slotStyles = 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 border-indigo-600/60 text-indigo-200 py-1.5 px-2.5 shadow-sm hover:border-indigo-400';
                }

                const spanU = slot.spanU || 1;
                const isMerged = isOptional && spanU > 1;
                const isNewlyAdded = slot.instanceId === lastAddedInstanceId;
                const isHighlighted = isNewlyAdded || (typeof slot.optionalIdx === 'number' && highlightedOptIdx === slot.optionalIdx);

                const slotKey = slot.instanceId || `slot-${slot.type}-${slot.uIndex}`;
                const isClickableProduct = !isEmpty;
                const slotPreview = isClickableProduct ? buildPreviewFromSlot(slot) : null;

                return (
                  <motion.div 
                    key={slotKey}
                    layout={prefersReducedMotion ? false : "position"}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      boxShadow: isHighlighted ? '0 0 14px rgba(251,191,36,0.85)' : 'none'
                    }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={zoomMode ? { minHeight: `${spanU * 48}px` } : { flex: `${spanU} ${spanU} 0px` }}
                    className={`group text-xs flex items-center justify-between transition-colors duration-150 border relative overflow-hidden ${slotStyles} ${isHighlighted ? 'ring-2 ring-amber-400 border-amber-400 z-30' : ''}`}
                    onMouseEnter={() => {
                      if (slotPreview) setHoveredProduct(slotPreview);
                    }}
                    onMouseLeave={() => {
                      setHoveredProduct(null);
                    }}
                    onClick={() => {
                      if (isEmpty) {
                        const el = document.getElementById('com-accessories-list');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else if (slotPreview) {
                        setInspectedProduct(slotPreview);
                        if (isOptional && slot.accessoryRef?.pn) {
                          setHighlightedSku(slot.accessoryRef.pn);
                          setTimeout(() => setHighlightedSku(null), 2000);
                        }
                      }
                    }}
                    title={isClickableProduct ? "לחץ או גע להגדלת תמונה ופרטים" : "חריץ פנוי בארון"}
                  >
                    {/* Position indicator */}
                    <div className={`font-mono font-bold text-[10px] tabular-nums bg-slate-800/90 text-slate-300 flex flex-col items-center justify-center rounded border border-slate-700/50 flex-shrink-0 relative z-20 ${isMerged ? 'w-11 py-0.5' : 'w-8 h-4 sm:h-5'}`}>
                      {isMerged ? (<><span>{slot.uIndex}-{slot.uIndex - spanU + 1}</span><span className="text-[8px] text-emerald-300">{spanU}U</span></>) : `${slot.uIndex}U`}
                    </div>

                    {/* Schematic shelf drawing */}
                    {(isShelf || isShelfUpgrade) && slot.isAnchor !== false && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-1 z-0" aria-hidden="true">
                        <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="w-full h-full opacity-90">
                          <defs>
                            <linearGradient id={`shelfGrad-${slot.uIndex}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0" stopColor="#64748b" />
                              <stop offset="0.55" stopColor="#475569" />
                              <stop offset="1" stopColor="#334155" />
                            </linearGradient>
                          </defs>
                          <rect x="10" y="8" width="8" height="26" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="0.7" />
                          <rect x="182" y="8" width="8" height="26" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="0.7" />
                          <circle cx="14" cy="13" r="1.5" fill="#0f172a" />
                          <circle cx="14" cy="29" r="1.5" fill="#0f172a" />
                          <circle cx="186" cy="13" r="1.5" fill="#0f172a" />
                          <circle cx="186" cy="29" r="1.5" fill="#0f172a" />
                          <rect x="16" y="11" width="168" height="21" rx="1.5" fill={`url(#shelfGrad-${slot.uIndex})`} stroke="#1e293b" strokeWidth="0.8" />
                          <rect x="16" y="28" width="168" height="4" fill="#1e293b" opacity="0.45" />
                          {Array.from({ length: 9 }).map((_, i) => (
                            <rect key={i} x={26 + i * 18} y="15" width="10" height="11" rx="1" fill="#1e293b" opacity="0.4" />
                          ))}
                        </svg>
                      </div>
                    )}

                    {/* Clean product representation */}
                    {isOptional && !isShelfUpgrade && slot.accessoryRef?.image && zoomMode && (
                      <div className="absolute inset-y-[2px] right-10 left-16 z-0 overflow-hidden flex items-center justify-center opacity-30 pointer-events-none">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={slot.accessoryRef.image} 
                          alt=""
                          className="h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
                        />
                      </div>
                    )}

                    {/* Content description */}
                    <div className="flex-1 min-w-0 pr-2 pl-1 text-right relative z-10">
                      <div className="flex items-center gap-1.5">
                        {/* Dynamic category icon */}
                        {(isFan || isFanUpgrade) && <span className="inline-block animate-spin text-cyan-400 mr-0.5" style={{ animationDuration: '5s' }}>🌀</span>}
                        {(isShelf || isShelfUpgrade) && <span className="text-emerald-400 text-xs">📥</span>}
                        {isBlank && <span className="text-neutral-400 text-xs">🔩</span>}
                        {isBrush && <span className="text-amber-400 font-bold text-xs">💈</span>}
                        {isPdu && <span className="text-red-400 animate-pulse text-xs">⚡</span>}
                        
                        <p className="font-semibold tracking-wide truncate leading-tight text-[11px] sm:text-xs">
                          {slot.name}
                        </p>
                      </div>

                      {isBrush && (
                        <div className="text-[7px] text-amber-500/80 font-mono tracking-widest select-none opacity-70">
                          ||||||||||||||||||||||||||||||||||||||||||||
                        </div>
                      )}
                      {isPdu && (
                        <div className="text-[7px] text-red-500/80 font-mono tracking-widest select-none opacity-80">
                          [::] [::] [::] [::] [::] [::]
                        </div>
                      )}

                      {slot.description && !isBrush && !isPdu && zoomMode && (
                        <p className="text-[10px] text-slate-400 font-normal truncate opacity-85 mt-0.5" title={slot.description}>
                          {slot.description}
                        </p>
                      )}
                    </div>

                    {/* Action buttons inside interactive slots */}
                    <div className="flex items-center gap-1 relative z-20 flex-shrink-0">
                      {isClickableProduct && (
                        <button
                          type="button"
                          title="הגדל תמונה ופרטי מוצר"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slotPreview) setInspectedProduct(slotPreview);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          <ZoomIn size={12} />
                        </button>
                      )}

                      {isOptional && typeof slot.optionalIdx === 'number' && (
                        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 px-1 py-0.5 rounded opacity-90 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            title="הוסף יחידה"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof slot.optionalIdx === 'number') handleIncrementQuantity(slot.optionalIdx);
                            }}
                            className="p-0.5 hover:bg-slate-800 rounded text-amber-300 cursor-pointer"
                          >
                            <Plus size={11} />
                          </button>
                          <span className="text-amber-400 px-0.5 font-bold font-mono text-[10px]">
                            {slot.accessoryRef.quantity}x
                          </span>
                          <button 
                            type="button"
                            title="הסר יחידה"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof slot.optionalIdx === 'number') handleRemoveOptional(slot.optionalIdx);
                            }}
                            className="p-0.5 hover:bg-slate-800 rounded text-red-400 cursor-pointer"
                          >
                            <Minus size={11} />
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
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>

            {/* Non-U Physical Accessory Zones */}
            <div className="mt-1 pt-1.5 border-t border-slate-800/80 space-y-1 flex-shrink-0">
              {/* 1. Vertical & Side Rails Zone */}
              {verticalItems.length > 0 && (
                <div className="rounded border border-indigo-500/40 bg-indigo-950/40 px-2 py-1">
                  <div className="text-[9px] font-black tracking-widest text-indigo-300 uppercase text-center mb-0.5 select-none">
                    ◄ דופן ורטיקלית וצדית (Vertical Rails) ►
                  </div>
                  <div className="space-y-0.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                    {verticalItems.map((item, i) => {
                      const preview = buildPreviewFromNonU(item, 'vertical');
                      return (
                        <div 
                          key={i} 
                          className="flex items-center justify-between text-[10px] text-slate-200 hover:bg-indigo-900/50 p-0.5 rounded cursor-pointer transition-colors group"
                          onMouseEnter={() => setHoveredProduct(preview)}
                          onMouseLeave={() => setHoveredProduct(null)}
                          onClick={() => setInspectedProduct(preview)}
                          title="לחץ להגדלת תמונה ופרטים"
                        >
                          <span className="truncate pr-1">⚡ {item.name || item.description}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-indigo-400 group-hover:text-amber-300 transition-colors p-0.5"><ZoomIn size={11} /></span>
                            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 border border-slate-700 rounded" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => handleIncrementQuantity(item.optionalIdx)} className="text-amber-300 hover:bg-slate-800 p-0.5 cursor-pointer"><Plus size={9} /></button>
                              <span className="font-mono text-amber-400 font-bold text-[9px]">{item.quantity}x</span>
                              <button type="button" onClick={() => handleRemoveOptional(item.optionalIdx)} className="text-red-400 hover:bg-slate-800 p-0.5 cursor-pointer"><Minus size={9} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Plinth & Base Zone (Wheels, Leveling Feet) */}
              {plinthItems.length > 0 && (
                <div className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-1">
                  <div className="text-[9px] font-black tracking-widest text-emerald-300 uppercase text-center mb-0.5 select-none">
                    ◄ בסיס ותחתית הארון (Plinth / Base) ►
                  </div>
                  <div className="space-y-0.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                    {plinthItems.map((item, i) => {
                      const preview = buildPreviewFromNonU(item, 'plinth');
                      return (
                        <div 
                          key={i} 
                          className="flex items-center justify-between text-[10px] text-slate-200 hover:bg-emerald-900/50 p-0.5 rounded cursor-pointer transition-colors group"
                          onMouseEnter={() => setHoveredProduct(preview)}
                          onMouseLeave={() => setHoveredProduct(null)}
                          onClick={() => setInspectedProduct(preview)}
                          title="לחץ להגדלת תמונה ופרטים"
                        >
                          <span className="truncate pr-1">🛞 {item.name || item.description}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-emerald-400 group-hover:text-amber-300 transition-colors p-0.5"><ZoomIn size={11} /></span>
                            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 border border-slate-700 rounded" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => handleIncrementQuantity(item.optionalIdx)} className="text-amber-300 hover:bg-slate-800 p-0.5 cursor-pointer"><Plus size={9} /></button>
                              <span className="font-mono text-amber-400 font-bold text-[9px]">{item.quantity}x</span>
                              <button type="button" onClick={() => handleRemoveOptional(item.optionalIdx)} className="text-red-400 hover:bg-slate-800 p-0.5 cursor-pointer"><Minus size={9} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Hardware & Mounting Zone (Screws, Support Rails) */}
              {hardwareItems.length > 0 && (
                <div className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1">
                  <div className="text-[9px] font-black tracking-widest text-amber-300 uppercase text-center mb-0.5 select-none">
                    ◄ חומרת הרכבה וציוד נלווה (Hardware) ►
                  </div>
                  <div className="space-y-0.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                    {hardwareItems.map((item, i) => {
                      const preview = buildPreviewFromNonU(item, 'hardware');
                      return (
                        <div 
                          key={i} 
                          className="flex items-center justify-between text-[10px] text-slate-200 hover:bg-amber-900/50 p-0.5 rounded cursor-pointer transition-colors group"
                          onMouseEnter={() => setHoveredProduct(preview)}
                          onMouseLeave={() => setHoveredProduct(null)}
                          onClick={() => setInspectedProduct(preview)}
                          title="לחץ להגדלת תמונה ופרטים"
                        >
                          <span className="truncate pr-1">🔩 {item.name || item.description}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-amber-400 group-hover:text-amber-200 transition-colors p-0.5"><ZoomIn size={11} /></span>
                            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 border border-slate-700 rounded" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => handleIncrementQuantity(item.optionalIdx)} className="text-amber-300 hover:bg-slate-800 p-0.5 cursor-pointer"><Plus size={9} /></button>
                              <span className="font-mono text-amber-400 font-bold text-[9px]">{item.quantity}x</span>
                              <button type="button" onClick={() => handleRemoveOptional(item.optionalIdx)} className="text-red-400 hover:bg-slate-800 p-0.5 cursor-pointer"><Minus size={9} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {unallocatedItems.length > 0 && (
              <div className="mx-2 mt-1.5 p-2 bg-red-950/80 border border-red-500/80 rounded text-red-200 text-[10px] text-center font-bold flex-shrink-0">
                שים לב: {unallocatedItems.length} פריטים לא הוצגו בשרטוט כיוון שאין עבורם רצף פנוי מספיק גדול.
              </div>
            )}

            {/* Simulated Server Room Floor Shadow */}
            <div className="mt-1 text-center text-[9px] font-semibold text-slate-500 tracking-wider select-none border-t border-slate-800/80 pt-1 uppercase font-mono flex-shrink-0">
              ◄ STEEL FRAME CHASSIS INTERLINKED ►
            </div>
          </div>
        </div>
        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}
        <div className="@4xl:col-span-2 flex flex-col gap-6">
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
                {includedItems.map((item, idx) => {
                  const isIncluded = !item.includes('לא כלול') && !item.includes('מידע לא זמין');
                  return (
                  <li key={idx} className={`flex items-center gap-3 border-b border-gray-100/60 pb-1.5 last:border-none ${isIncluded ? 'text-gray-700' : 'text-gray-400'}`}>
                    {isIncluded ? <CheckCircle size={18} className="text-green-500 flex-shrink-0" /> : <div className="w-[18px] h-[18px] flex items-center justify-center text-gray-300 font-bold flex-shrink-0">✕</div>}
                    <span className={`text-sm ${isIncluded ? 'font-semibold' : ''}`}>{item}</span>
                  </li>
                ) })}
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
                 <AnimatePresence initial={false}>
                 {selectedOptionals.map((item, idx) => {
                   const optPreview: EnrichedPreviewItem = {
                     name: item.name || item.description || item.pn,
                     sku: item.pn || item.sku || '',
                     description: item.description || '',
                     image: item.image || getAccessoryImage(item),
                     uSize: item.uSize || 0,
                     price: item.price || 0,
                     quantity: item.quantity || 1,
                     zone: item.uSize > 0 ? `תופס ${item.uSize * item.quantity}U בארון` : 'אביזר נלווה (0U)',
                     type: 'optional-accessory',
                     optionalIdx: idx,
                     isPreset: false,
                   };

                   return (
                   <motion.div 
                    key={item.sku || item.pn || item.id} 
                    id={`selected-opt-${idx}`}
                    layout={prefersReducedMotion ? false : "position"}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    onMouseEnter={() => setHoveredProduct(optPreview)}
                    onMouseLeave={() => setHoveredProduct(null)}
                    onClick={() => {
                      // Highlight in chassis and open preview modal
                      setHighlightedOptIdx(idx);
                      setInspectedProduct(optPreview);
                      setTimeout(() => setHighlightedOptIdx(null), 2000);
                    }}
                    className={`flex flex-col bg-white border p-3 rounded-none text-sm font-medium shadow-sm transition-all cursor-pointer group ${highlightedOptIdx === idx ? 'border-amber-500 ring-2 ring-amber-500/50 bg-amber-50/30' : 'border-[#b3d4f5] hover:border-[#004387]'}`}
                    title="לחץ או גע להגדלת תמונת המוצר ומפרט מלא"
                   >
                     <div className="flex items-start justify-between gap-2">
                       <div className="flex items-center gap-2 overflow-hidden">
                         <div 
                           className="relative w-8 h-8 flex-shrink-0 bg-white border border-slate-200 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#004387] transition-all"
                           onClick={(e) => {
                             e.stopPropagation();
                             setInspectedProduct(optPreview);
                           }}
                           title="הגדל תמונה"
                         >
                           {optPreview.image ? (
                             <img referrerPolicy="no-referrer" src={optPreview.image} alt="" className="w-full h-full object-contain p-0.5" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-400"><Box size={14} /></div>
                           )}
                           <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                             <ZoomIn size={12} />
                           </div>
                         </div>
                         <div className="min-w-0">
                           <span className="text-gray-800 font-bold leading-tight truncate inline-block" dir="ltr">
                              {item.pn}
                           </span>
                           {item.name && item.name !== item.pn && (
                             <div className="text-[11px] text-slate-500 truncate leading-none mt-0.5">
                               {item.name}
                             </div>
                           )}
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 shrink-0">
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             setInspectedProduct(optPreview);
                           }}
                           className="text-slate-400 hover:text-[#004387] p-1 rounded hover:bg-slate-100 transition-colors"
                           title="תקריב מוצר"
                         >
                           <ZoomIn size={14} />
                         </button>
                         <span className="text-xs text-[#004387] font-bold bg-[#e6f0fa] px-2 py-0.5 rounded-none font-mono whitespace-nowrap">
                           ₪{((item.price || 0) * item.quantity).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                         </span>
                       </div>
                     </div>
                     
                     <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed font-normal">
                       {item.description}
                     </p>
                     {unallocatedItems.some(i => i.pn === item.pn) && (
                       <p className="text-[10px] text-red-600 font-bold mt-1 bg-red-50 p-1 px-2 animate-pulse border border-red-100">⚠️ נדרש אימות התקנה (אין רצף פנוי מספיק)</p>
                     )}

                     <div className="flex items-center justify-between border-t border-gray-100 mt-2.5 pt-2">
                       <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1">
                         <span>{item.uSize > 0 ? `תופס: ${item.uSize * item.quantity}U מתוך הארון` : 'ללא נפח בארון'}</span>
                         <span className="text-amber-600 text-[10px] font-bold">• לחץ להגדלה</span>
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
                   </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm italic bg-white border border-[#b3d4f5]/60">
                טרם בחרתם אביזרים נוספים.
                <br/>
                בחרו אביזרי הרחבה בהמשך או לחצו על תאים פנויים בארון משמאל!
              </div>
            )}
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
                  className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-none focus:border-[#004387] outline-none" />
              </div>
              <div className="mb-3 text-[12px] font-bold text-slate-600">
                נותרו <span className="text-[#004387]">{availableU}U</span> פנויים — מלא עם אביזרים תואמים:
              </div>
              {_bucketShelves.length > 0 && AccordionSection('shelves', '🗄️ מדפים מתאימים לארון', _bucketShelves, 'bg-emerald-50 text-emerald-900', true)}
              {_bucketTakesU.length > 0 && AccordionSection('takesU', '📏 ציוד נוסף שתופס מקום בארון', _bucketTakesU, 'bg-[#e6f0fa] text-[#004387]', true)}
              {_bucketFree.length > 0 && AccordionSection('freeU', '🔌 אביזרים ללא תפיסת מקום', _bucketFree, 'bg-slate-50 text-slate-700', false)}
              {_illusPairs.length > 0 && AccordionSection('illus', '🧩 תצוגת הדמיה (ללא מחיר)', _illusPairs, 'bg-indigo-50 text-indigo-800', false)}
              {_filtered.length === 0 && _illusPairs.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 border border-gray-200 rounded-none text-sm">
                  {accSearch ? 'לא נמצאו פריטים התואמים לחיפוש שלך.' : 'אין אביזרים תואמים לארון זה.'}
                </div>
              )}
              <div className="border border-slate-200 bg-slate-50 p-3 mb-3 hidden">
                <div className="text-sm font-bold text-slate-700 mb-2">➕ הוסף פריט מותאם אישית לארון</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={customAccName} 
                    onChange={e => setCustomAccName(e.target.value)} 
                    placeholder="שם הפריט..." 
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded-none focus:outline-none focus:border-[#004387]" 
                    dir="rtl"
                  />
                  <select 
                    value={customAccU} 
                    onChange={e => setCustomAccU(parseInt(e.target.value))} 
                    className="w-16 px-1 py-1.5 text-sm border border-slate-300 rounded-none focus:outline-none"
                    dir="ltr"
                  >
                    {[1, 2, 3, 4, 5].map(u => <option key={u} value={u}>{u}U</option>)}
                  </select>
                  <button 
                    type="button" 
                    onClick={handleAddCustomIllustration}
                    disabled={!customAccName.trim() || customAccU > availableU}
                    className="px-3 py-1.5 bg-[#004387] text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#fe8d00] transition-colors"
                  >
                    הוסף
                  </button>
                </div>
                {customAccU > availableU && (
                  <div className="text-xs text-rose-500 mt-1">אין מספיק מקום פנוי בארון ({availableU}U נותר)</div>
                )}
              </div>
              {Object.keys(_promotedByBrand).sort().map(brand => {
                const logo = (_promotedByBrand[brand][0] as any)?.acc?.brandLogo || '';
                return AccordionSection('brand:' + brand, logo ? '' : ('⭐ ' + brand), _promotedByBrand[brand], 'bg-amber-50 text-amber-800', false, logo);
              })}
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

      {/* PDF export: two options — with prices / without */}
      <div className="mt-4 print:hidden">
        {/* With-price PDF is kept in code (handleDownloadPdf(true)) for future use; only the
            price-free "save my cabinet plan" button is shown to customers for now. */}
        <button type="button" onClick={() => handleDownloadPdf(false)}
          className="w-full flex items-center justify-center gap-1.5 py-3 bg-[#004387] text-white font-bold text-sm rounded-none hover:bg-[#0c2d57] transition-colors">
          <Download size={16} /> שמור תכנון ארון (PDF)
        </button>
      </div>

      {/* Printable spec sheet (hidden on screen, shown on print) */}
      {showPdfPreview && (
      <div className="fixed inset-0 z-[99999] bg-black/60 overflow-auto p-2 sm:p-6 print:bg-white print:p-0 print:static" onClick={() => setShowPdfPreview(false)}>
        <div className="bg-white w-full max-w-2xl mx-auto shadow-2xl print:shadow-none print:max-w-none" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 p-3 bg-[#0c2d57] text-white print:hidden sticky top-0 z-10">
            <button type="button" onClick={() => setShowPdfPreview(false)} className="flex items-center gap-1 px-3 py-2 bg-white/15 hover:bg-white/25 rounded font-bold text-sm active:scale-95">
              <X size={17} /> סגור
            </button>
            <span className="font-bold text-xs sm:text-sm">תצוגה מקדימה {pdfWithPrice ? '(עם מחירים)' : '(ללא מחירים)'}</span>
            <button type="button" onClick={() => { try { window.print(); } catch {} }} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 rounded font-bold text-sm active:scale-95">
              <Download size={17} /> שמור / הדפס
            </button>
          </div>
      <div id="printable-cabinet-area" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', color: '#111', padding: '24px', direction: 'rtl' }}>
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

        {/* Visual rack diagram — a print copy of the on-screen simulator */}
        {slots.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#004387', marginBottom: '6px' }}>תצוגת הארון (סכמה)</div>
            <div style={{ border: '3px solid #0c2d57', maxWidth: '360px', margin: '0 auto', borderRadius: '4px', overflow: 'hidden', background: '#0f172a', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
              {roofItems.length > 0 && (
                <div style={{ background: '#e0f2fe', borderBottom: '1px solid #94a3b8', padding: '4px 8px', fontSize: '10.5px', textAlign: 'center', fontWeight: 700, color: '#075985' }}>
                  ▲ תקרה: {roofItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                </div>
              )}
              {slots.slice().sort((a, b) => b.uIndex - a.uIndex).map((s) => {
                const occupied = s.type !== 'empty';
                const isOpt = s.type === 'optional-accessory';
                const isCont2 = isOpt && s.isAnchor === false;
                const isShelfItem = /מדף|shelf/.test(`${s.name || ''} ${s.description || ''}`);
                const img = (s.accessoryRef && s.accessoryRef.image) || '';
                const rowH = isOpt ? 40 : (occupied ? 20 : 15);
                const bg = !occupied ? '#0f172a' : (isOpt ? '#1e3a8a' : '#334155');
                if (isCont2) return null;
                return (
                  <div key={s.uIndex} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', minHeight: isOpt && s.spanU && s.spanU > 1 ? `${s.spanU * 40}px` : `${rowH}px`, background: bg, position: 'relative', overflow: 'hidden' } as any}>
                    <div style={{ width: '28px', textAlign: 'center', fontWeight: 700, fontSize: '8px', color: '#cbd5e1', borderLeft: '1px solid #1e293b', flexShrink: 0, position: 'relative', zIndex: 2 }}>{s.spanU && s.spanU > 1 ? `${s.uIndex}-${s.uIndex - s.spanU + 1}` : s.uIndex}</div>
                    {isOpt && img && !isShelfItem && (
                      <img src={img} referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.92 } as any} onError={(e: any) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    {isOpt && isShelfItem && (
                      <div style={{ position: 'absolute', left: '30px', right: '4px', top: '20%', bottom: '20%', background: 'linear-gradient(#64748b,#334155)', border: '1px solid #0f172a', borderRadius: '2px' } as any}></div>
                    )}
                    <div style={{ flex: 1, padding: '1px 6px', fontSize: '9px', color: occupied ? '#fff' : '#64748b', fontWeight: occupied ? 700 : 400, position: 'relative', zIndex: 2, textShadow: (isOpt && img) ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' } as any}>{!occupied ? '—' : (s.name + ((s.spanU && s.spanU > 1) ? `  (${s.spanU}U)` : ''))}</div>
                  </div>
                );
              })}
              {plinthItems.length > 0 && (
                <div style={{ background: '#f1f5f9', borderTop: '1px solid #94a3b8', padding: '4px 8px', fontSize: '10.5px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                  ▼ בסיס: {plinthItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                </div>
              )}
              {verticalItems.length > 0 && (
                <div style={{ background: '#fef2f2', borderTop: '1px solid #fca5a5', padding: '4px 8px', fontSize: '10.5px', textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>
                  ◄ ורטיקלי / צדי: {verticalItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                </div>
              )}
              {hardwareItems.length > 0 && (
                <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '4px 8px', fontSize: '10.5px', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>
                  ◄ חומרה וברגים: {hardwareItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                </div>
              )}
            </div>
          </div>
        )}

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
            {pdfOrderable.length === 0 ? (
              <tr><td colSpan={pdfWithPrice ? 5 : 4} style={{ padding: '10px', textAlign: 'center', color: '#888', border: '1px solid #e2e8f0' }}>לא נוספו אביזרים</td></tr>
            ) : pdfOrderable.map((o: any, i: number) => (
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
      </div>
      )}

      {/* Product Image Inspection Modal */}
      <AnimatePresence>
        {inspectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
            onClick={() => setInspectedProduct(null)}
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white border-2 border-[#004387] shadow-2xl overflow-hidden flex flex-col my-auto"
            >
              {/* Modal Header */}
              <div className="bg-[#004387] text-white px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 bg-white/10 rounded">
                    <Maximize2 size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight truncate">
                      תקריב מוצר: {inspectedProduct.name}
                    </h3>
                    <p className="text-[11px] text-white/80 font-mono">
                      {inspectedProduct.zone} {inspectedProduct.sku ? `· מק"ט: ${inspectedProduct.sku}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom controls */}
                  <div className="flex items-center bg-white/10 rounded border border-white/20 p-0.5" dir="ltr">
                    <button
                      type="button"
                      onClick={() => setModalZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                      className="px-2 py-0.5 text-xs hover:bg-white/20 rounded font-mono font-bold transition-colors cursor-pointer"
                      title="הקטן תקריב"
                    >
                      -
                    </button>
                    <span className="px-1.5 text-[11px] font-mono font-semibold min-w-[42px] text-center">
                      {Math.round(modalZoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                      className="px-2 py-0.5 text-xs hover:bg-white/20 rounded font-mono font-bold transition-colors cursor-pointer"
                      title="הגדל תקריב"
                    >
                      +
                    </button>
                    {modalZoomLevel !== 1 && (
                      <button
                        type="button"
                        onClick={() => setModalZoomLevel(1)}
                        className="px-1.5 text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
                      >
                        איפוס
                      </button>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setInspectedProduct(null)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="סגור (Esc)"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Main Image Stage */}
              <div className="relative w-full h-72 sm:h-96 bg-gradient-to-b from-slate-100 to-slate-200 border-b border-slate-200 overflow-hidden flex items-center justify-center p-4 select-none">
                {/* Subtle checkered pattern to emphasize transparency */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                <motion.div
                  animate={{ scale: modalZoomLevel }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="w-full h-full flex items-center justify-center relative z-10"
                >
                  {inspectedProduct.image ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={inspectedProduct.image}
                      alt={inspectedProduct.name}
                      className="max-w-full max-h-full object-contain filter drop-shadow-xl transition-all"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6">
                      <RenderSchematicFallback item={inspectedProduct} />
                    </div>
                  )}
                </motion.div>

                {/* Badge on bottom right of image */}
                <div className="absolute bottom-3 right-3 z-20 bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-2 border border-slate-700">
                  <Eye size={13} className="text-amber-400" />
                  <span>{inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U חזיתי` : 'אביזר נלווה (0U)'}</span>
                  {inspectedProduct.isPreset && (
                    <span className="text-emerald-400 font-bold border-r border-slate-700 pr-2">ציוד מובנה</span>
                  )}
                </div>
              </div>

              {/* Product Specifications & Details */}
              <div className="p-4 sm:p-5 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 leading-tight">
                      {inspectedProduct.name}
                    </h4>
                    {inspectedProduct.sku && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          מק"ט: {inspectedProduct.sku}
                        </span>
                        <span className="text-xs text-slate-500">
                          מיקום: <strong className="text-slate-700">{inspectedProduct.zone}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {inspectedProduct.price ? (
                    <div className="text-left shrink-0">
                      <div className="text-xs text-slate-400 font-medium">מחיר יחידה (לפני מע"מ)</div>
                      <div className="text-lg font-bold text-[#004387] font-mono">
                        ₪{inspectedProduct.price.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {inspectedProduct.description && (
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                    {inspectedProduct.description}
                  </p>
                )}

                {/* Interactive Configurator Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {typeof inspectedProduct.optionalIdx === 'number' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">כמות מוגדרת בארון:</span>
                      <div className="flex items-center border border-slate-300 rounded bg-slate-50">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof inspectedProduct.optionalIdx === 'number') {
                              handleIncrementQuantity(inspectedProduct.optionalIdx);
                              setInspectedProduct((prev) => prev ? { ...prev, quantity: prev.quantity + 1 } : null);
                            }
                          }}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-200 transition-colors font-bold text-sm"
                          title="הוסף יחידה"
                        >
                          +
                        </button>
                        <span className="px-3 py-1 font-mono font-bold text-xs bg-white border-x border-slate-200">
                          {inspectedProduct.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof inspectedProduct.optionalIdx === 'number') {
                              handleRemoveOptional(inspectedProduct.optionalIdx);
                              if (inspectedProduct.quantity <= 1) {
                                setInspectedProduct(null);
                              } else {
                                setInspectedProduct((prev) => prev ? { ...prev, quantity: prev.quantity - 1 } : null);
                              }
                            }
                          }}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 transition-colors font-bold text-sm"
                          title="הפחת יחידה"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      {inspectedProduct.isPreset ? '✓ פריט זה מותקן בארון כחלק מהתצורה הסטנדרטית' : 'פריט בהמחשה חזותית'}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectedProduct(null)}
                      className="px-4 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                    >
                      סגור תצוגה
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
