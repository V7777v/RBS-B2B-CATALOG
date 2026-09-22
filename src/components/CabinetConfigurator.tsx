import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Plus,
  Minus,
  X,
  Server,
  Download,
  MessageCircle,
  Box,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  ZoomIn,
  Eye,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Info,
  Award,
  Layers,
  ShieldCheck,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  Undo2,
  GripVertical
} from 'lucide-react';
import Papa from 'papaparse';
import { CabinetMatrixData, GroupedRubric, KNOWN_MATRIX_SHELF_SKUS, GENERIC_SHELF_IMAGE, checkAccessoryFitsCabinet, deriveBrand, extractAllMatrixShelfSkus, fetchCabinetMatrix, fetchCompatMap, groupAccessoriesForDisplay, isAccessoryAShelf, isCabinetProduct, isProductShelf, normalizeSku, parseAccessoryCount, parseCabinetDepthFromName, parseCompatRange, parseCompatibleSkus, parseDepthMmLocal } from '../utils/cabinetData';
import { 
  analyzeCabinetSpace,
  classifyItemPlacement,
  findRearrangementPlan,
  RearrangementPlan
} from '../utils/cabinetPlacementEngine';
import { 
  VERIFIED_ZERO_U_EXCEPTIONS, 
  isFlaggedForCabinetSuitability, 
  parseNormalizedVolume, 
  resolveUConsumption, 
  checkTrackBAccessoryCompatibility 
} from '../utils/cabinetRules';
import { getToken as getAppCheckToken } from 'firebase/app-check';
import { appCheck } from '../firebase';
import { Cabinet3DErrorBoundary } from './Cabinet3D/Cabinet3DErrorBoundary';
import { AddSlotModal } from './Cabinet3D/AddSlotModal';
import { isCabinetBoost42U, isCabinet221221 } from './Cabinet3D/CabinetModelBuilder';
import { CabinetWorkspace } from './Cabinet3D/CabinetWorkspace';
import { OrderSummaryTable, OrderLine, OrderTotals } from './OrderSummaryTable';
export type { OrderLine, OrderTotals };
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Cabinet3DViewer = React.lazy(() =>
  import('./Cabinet3D/Cabinet3DViewer').then(m => ({ default: m.Cabinet3DViewer }))
);

export interface VisualSlot {
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
  zone?: string;
  category?: string;
  _pdu?: boolean;
  _curated?: boolean;
  _promoted?: boolean;
  _depth?: number;
  _illustration?: boolean;
  isShelf?: boolean;
  shelfType?: string;
  _source?: string;
  targetU?: number;
  id?: string;
}

// Only items belonging to Infrastructure pricelist / categories should appear as cabinet accessories (Track 2)
const isInfrastructureItem = (pp: any): boolean => {
  if (!pp) return false;
  const rawSku = String(pp.sku || pp.pn || '');
  const normSku = normalizeSku(rawSku);
  // Explicitly disallow hand tools / non-accessory products
  if (normSku === '111014') return false;

  const cat = String(pp.category || '').toLowerCase();
  const sub = String(pp.subcategory || '').toLowerCase();
  const nested = String(pp['Nested subcategory'] || pp.nestedSubcategory || '').toLowerCase();
  const name = String(pp.name || '').toLowerCase();

  // Explicit exclude non-infrastructure products like vacuum cleaners, keypads, intercoms, alarms, etc.
  if (
    sub.includes('שואב') || cat.includes('שואב') || name.includes('שואב') ||
    sub.includes('קודן') || cat.includes('קודן') || name.includes('קודן') ||
    sub.includes('אינטרקום') || cat.includes('אינטרקום') ||
    sub.includes('אזעק') || cat.includes('אזעק')
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

  const desc = String(pp.description || '').toLowerCase();
  const isRackmount = 
    name.includes('rackmount') || desc.includes('rackmount') || cat.includes('rackmount') || sub.includes('rackmount') || nested.includes('rackmount') ||
    name.includes('rackmout') || desc.includes('rackmout') || cat.includes('rackmout') || sub.includes('rackmout') || nested.includes('rackmout'); // Handling user typo RACKMOUT

  return isInfraCategory || isInfraSub || isRackmount;
};

export type PhysicalZone = 'roof' | 'rear' | 'rear-top' | 'rear-middle' | 'rear-bottom' | 'plinth' | 'vertical' | 'hardware';

const getPhysicalZone = (sku: string, name: string, desc: string): PhysicalZone => {
  const norm = normalizeSku(sku);
  const s = `${name || ''} ${desc || ''}`.toLowerCase();
  if (/פס שקע|שקעים|pdu/.test(s)) return 'rear';
  if (norm && VERIFIED_ZERO_U_EXCEPTIONS[norm]) {
    const z = VERIFIED_ZERO_U_EXCEPTIONS[norm].zone;
    if (z === 'vertical' && /שקע|pdu/.test(s)) return 'rear';
    return z as PhysicalZone;
  }
  if (/מאוורר|fan|מפוח|איוורור|נורת|נורה|led|לד|תאורה|light|כניסה עליונה/.test(s)) return 'roof';
  if (/תעלה|מסתיר|ורטיקל|vertical/.test(s)) return 'vertical';
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
    if (!normSku || normSku === productSkuNorm || normSku === '111014') return;

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

    // Filter out built-in zero-U items to prevent duplicate incompatible additions
    const itemHay = `${pp.name || ''} ${pp.description || ''}`.toLowerCase();
    const uSizeCheck = resolveUConsumption(pp).u;
    
    if (uSizeCheck === 0) {
      if (/מאוורר|fan|מפוח/i.test(itemHay) && cabinet && parseAccessoryCount(cabinet.fans) > 0) {
        return; // Cabinet already has built-in fans and no extra roof bays are available
      }
      if (/גלגל|caster|wheel/i.test(itemHay) && cabinet && parseAccessoryCount(cabinet.wheels) > 0) {
        return; // Cabinet already has casters
      }
    }

    // Validate physical compatibility with cabinet
    const compatResult = checkTrackBAccessoryCompatibility(pp, cabinet, compatMap);
    if (!compatResult.fits) return;

    if (itemsMap.has(normSku)) {
      // Enrich existing record if needed
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      if (pp.price && (!existing.price || existing.price === 0)) {
        existing.price = parseFloat(String(pp.price).replace(/,/g, '')) || 0;
      }
      const newBrand = deriveBrand(pp);
      if (newBrand !== 'כללי' && existing.brand === 'כללי') {
        existing.brand = newBrand;
      }
      if (!existing.brandLogo && typeof pp.brand === 'string' && pp.brand.startsWith('http')) {
        existing.brandLogo = pp.brand;
      }
      return;
    }

    let uSize = resolveUConsumption(pp).u;
    if (normSku === '821410') uSize = 1;
    const isPdu = nested.includes('פסי שקעים') || /פס שקע|שקעים|pdu/i.test(`${pp.name || ''} ${pp.description || ''}`);
    if (isPdu) uSize = 0;
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
    if (compSku === productSkuNorm || compSku === '111014' || itemsMap.has(compSku)) return;

    // Any item identified as a shelf in compatMap is excluded here!
    if (isProductShelf(compSku, catalogMap, allMatrixShelves)) return;

    const catProd = catalogMap.get(compSku);
    if (catProd && (isCabinetProduct(catProd) || (!isInfrastructureItem(catProd) && !isFlaggedForCabinetSuitability(catProd)))) return;

    const compatResult = checkTrackBAccessoryCompatibility({ sku: compSku }, cabinet, compatMap);
    if (!compatResult.fits) return;

    let uSize = resolveUConsumption({ sku: compSku }).u;
    if (compSku === '821410') uSize = 1;
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

    // Check active status
    if (pp.status === false || pp.status === 'false' || pp.active === false || pp.active === 'false') return;

    // RULE: Shelf classification precedes suitability approval.
    // "התאמה לארון", brand or category CANNOT override the cabinet matrix for shelves.
    if (isProductShelf(pp, catalogMap, allMatrixShelves)) return;

    // Business entry condition: item must be explicitly flagged "התאמה לארון"
    const flagged = isFlaggedForCabinetSuitability(pp);
    if (!flagged) return;

    // Exclude the cabinet itself and other cabinets
    if (isCabinetProduct(pp)) return;

    const nameDesc = `${pp.name || ''} ${pp.description || ''}`.toLowerCase();
    if (/מחלץ|extractor|כלי\b|tool\b/.test(nameDesc)) return;

    // Explicit physical constraints: Depth check
    const itemDepth = parseDepthMmLocal(nameDesc);
    if (cabinet && cabinet.depth !== null && itemDepth > 0 && itemDepth > cabinet.depth + 40) {
      return;
    }

    if (itemsMap.has(normSku)) {
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      if (!existing.price && pp.price) {
        existing.price = parseFloat(String(pp.price).replace(/,/g, '')) || 0;
      }
      const newBrand = deriveBrand(pp);
      if (newBrand !== 'כללי' && existing.brand === 'כללי') {
        existing.brand = newBrand;
      }
      if (!existing.brandLogo && typeof pp.brand === 'string' && pp.brand.startsWith('http')) {
        existing.brandLogo = pp.brand;
      }
      return;
    }

    let uSize = resolveUConsumption(pp, true).u;
    const isPdu = String(pp.nestedSubcategory || '').includes('פסי שקעים') || /פס שקע|שקעים|pdu/i.test(nameDesc);
    if (isPdu) uSize = 0;
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
  // 1. Cabinets must NEVER be in accessories list!
  // 2. Shelves can ONLY exist if they are listed in inMatrixShelves for this cabinet!
  const finalUnified: Accessory[] = [];
  for (const item of itemsMap.values()) {
    if (isCabinetProduct(item)) continue;
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
  instanceId?: string;
  name: string;
  sku?: string;
  pn?: string;
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
  minU?: number;
  maxU?: number;
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
          <RotateCcw className="animate-spin text-cyan-400" size={32} style={{ animationDuration: "3s" }} />
          <RotateCcw className="animate-spin text-cyan-400" size={32} style={{ animationDuration: "3s" }} />
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
        <div className="text-emerald-400 flex items-center justify-center"><CheckCircle2 size={36} className="text-emerald-400" /></div>
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
  onOptionalsChange?: (optionals: OrderLine[]) => void;
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
  const [selectedOptionals, setSelectedOptionals] = useState<(Accessory & { quantity: number; id: string; targetU?: number; instanceId?: string })[]>(() => (CABINET_CFG_STORE[product?.sku] as any) ?? []);

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

  // Ensure that when switching cabinets or updating cabinetData, no incompatible accessory or shelf remains selected!
  // "שינוי ארון לא ישאיר מוצר לא מתאים כתוספת מאושרת."
  useEffect(() => {
    if (!cabinetData || !product?.sku || compatibleAccessories.length === 0) return;
    const allowedSkus = new Set(compatibleAccessories.map(a => normalizeSku(a.sku || a.pn)));

    setSelectedOptionals(prev => {
      if (!prev || prev.length === 0) return prev;
      let changed = false;
      const filtered = prev.filter(item => {
        const skuNorm = normalizeSku(item.sku || item.pn);
        if (item._illustration) {
          return (item.uSize || 1) <= (totalU || 42);
        }
        const isShelf = isProductShelf(item, catalogMapRef.current, allMatrixShelvesRef.current);
        if (isShelf) {
          const isAllowedShelf = inMatrixShelvesRef.current.has(skuNorm);
          if (!isAllowedShelf) {
            console.warn(`[CabinetConfigurator] Sanitized: removed incompatible shelf ${skuNorm} on cabinet ${cabinetData.sku}`);
            changed = true;
            return false;
          }
        }
        if (!allowedSkus.has(skuNorm)) {
          console.warn(`[CabinetConfigurator] Sanitized: removed incompatible accessory ${skuNorm} on cabinet ${cabinetData.sku}`);
          changed = true;
          return false;
        }
        return true;
      });

      return changed ? filtered : prev;
    });
  }, [cabinetData, compatibleAccessories, totalU, product?.sku]);

  // Overrides for movable preset shelves (e.g. from rearrangement)
  const [presetOverrides, setPresetOverrides] = useState<Record<string, number>>({});

  // Reset preset overrides and accordion rubrics when switching cabinet
  useEffect(() => {
    setPresetOverrides({});
    setOpenSections({});
  }, [product?.sku]);

  // ACCURACY: availableU is DERIVED (never mutated incrementally) so the counter
  // can never drift — always = total − built-in − sum(selected U × qty).
  
  const { usedU, slots, nonUAccessories, unallocatedItems } = React.useMemo(() => {
    const totalSlotsU = totalU || 0;
    const visualSlotsAlloc = new Array(totalSlotsU).fill(null);
    const shelfPositions: { u: number; instanceId: string }[] = [];
    const unallocatedItems: any[] = [];
    
    // 1. Included Shelves
    let shelvesQty = 0;
    const rawShelvesQty = cabinetData?.shelvesQty?.trim();
    if (rawShelvesQty && rawShelvesQty !== 'X') {
      shelvesQty = parseAccessoryCount(rawShelvesQty);
    } else if (!rawShelvesQty || rawShelvesQty === '') {
      // Missing data -> try to extract from included items or description
      if (Array.isArray(includedItems)) {
        const shelfItem = includedItems.find(it => it.includes('מדפ') || it.includes('מדפים'));
        if (shelfItem) shelvesQty = parseAccessoryCount(shelfItem);
      }
      if (shelvesQty === 0 && product?.description) {
        const m = String(product.description).match(/(\d+)\s*מדפ/i);
        if (m) shelvesQty = parseInt(m[1], 10);
      }
    }
    if (shelvesQty > 0) {
      for (let s = 1; s <= shelvesQty; s++) {
        const shelfKey = `builtin-shelf-${s}`;
        const overridePos = presetOverrides[shelfKey];
        const defaultPos = Math.round((s * totalSlotsU) / (shelvesQty + 1));
        const pos = (overridePos !== undefined && overridePos >= 1 && overridePos <= totalSlotsU)
          ? overridePos
          : defaultPos;

        if (pos >= 1 && pos <= totalSlotsU && visualSlotsAlloc[pos - 1] === null) {
          visualSlotsAlloc[pos - 1] = 'shelf';
          shelfPositions.push({ u: pos, instanceId: shelfKey });
        } else {
          let placed = false;
          for (let offset = 1; offset < totalSlotsU; offset++) {
            if (pos + offset <= totalSlotsU && visualSlotsAlloc[pos + offset - 1] === null) {
              visualSlotsAlloc[pos + offset - 1] = 'shelf';
              shelfPositions.push({ u: pos + offset, instanceId: shelfKey });
              placed = true;
              break;
            }
            if (pos - offset >= 1 && visualSlotsAlloc[pos - offset - 1] === null) {
              visualSlotsAlloc[pos - offset - 1] = 'shelf';
              shelfPositions.push({ u: pos - offset, instanceId: shelfKey });
              placed = true;
              break;
            }
          }
          if (!placed) shelfPositions.push({ u: pos, instanceId: shelfKey });
        }
      }
    }

    // 2. Optional accessories added by user (Contiguous allocation)
    const optionalItemsAssignment: { uIndex: number; name: string; description: string; accessoryRef: any; optionalIdx: number; isAnchor: boolean; spanU: number; error?: string; instanceId?: string }[] = [];
    const nonUAccessories: { name: string; sku: string; quantity: number; description: string; accessoryRef: any; optionalIdx: number; zone: PhysicalZone; instanceId?: string }[] = [];
    
    // Pass 1: only items with opt.targetU (pinned)
    selectedOptionals.forEach((opt: any, optIdx: number) => {
      if (!opt.targetU || opt.uSize === 0) return;
      const size = Math.max(1, Math.ceil(Number(opt.uSize) || 1));
      let foundStart = -1;
      const prefStart = opt.targetU - 1; // 0-based
      if (prefStart >= 0 && prefStart + size <= totalSlotsU) {
        let fits = true;
        for (let j = 0; j < size; j++) {
          if (visualSlotsAlloc[prefStart + j] !== null) {
            fits = false;
            break;
          }
        }
        if (fits) {
          foundStart = prefStart;
        }
      }

      if (foundStart !== -1) {
        const instId = opt.instanceId || opt.id || `${opt.sku || opt.pn}-unit-0`;
        for (let j = 0; j < size; j++) {
          visualSlotsAlloc[foundStart + j] = 'opt';
          const currentU = foundStart + j + 1;
          optionalItemsAssignment.push({
            uIndex: currentU,
            name: opt.name || opt.pn,
            description: opt.description || '',
            accessoryRef: opt,
            optionalIdx: optIdx,
            isAnchor: j === size - 1,
            spanU: size,
            instanceId: instId
          });
        }
      } else {
        unallocatedItems.push(opt);
        console.warn('Could not find contiguous space for accessory at target position:', opt.pn);
      }
    });

    // Pass 2: items without targetU (and units q >= 1 of pinned items)
    selectedOptionals.forEach((opt: any, optIdx: number) => {
      if (opt.uSize === 0) {
        nonUAccessories.push({
          name: opt.name || opt.pn,
          sku: opt.sku || opt.pn,
          quantity: Math.max(1, Number(opt.quantity) || 1),
          description: opt.description || opt.name || '',
          accessoryRef: opt,
          optionalIdx: optIdx,
          zone: opt.zone || getPhysicalZone(opt.sku || opt.pn, opt.name || '', opt.description || ''),
          instanceId: opt.instanceId || opt.id,
        });
        return;
      }
      const qty = Math.max(1, Number(opt.quantity) || 1);
      const size = Math.max(1, Math.ceil(Number(opt.uSize) || 1));
      const startQ = opt.targetU ? 1 : 0;

      for (let q = startQ; q < qty; q++) {
        let foundStart = -1;
        // Search from top down to find a contiguous block of 'size'
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
          const instId = opt.instanceId || opt.id || `${opt.sku || opt.pn}-unit-${q}`;
          for (let j = 0; j < size; j++) {
            visualSlotsAlloc[foundStart + j] = 'opt';
            const currentU = foundStart + j + 1;
            optionalItemsAssignment.push({
              uIndex: currentU,
              name: opt.name || opt.pn,
              description: opt.description || '',
              accessoryRef: opt,
              optionalIdx: optIdx,
              isAnchor: j === size - 1,
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
      const shelfEntry = shelfPositions.find(s => s.u === u);
      if (shelfEntry) {
        builtSlots.push({
          uIndex: u,
          type: 'preset-shelf',
          name: 'מדף קבוע בעומס כבד (כלול בארון)',
          description: 'מדף קבוע בעומס כבד מאוורר 19 אינץ׳ (דגם 117914). חלק מתצורת היצרן. ניתן לשינוי מיקום.',
          spanU: 1,
          isAnchor: true,
          instanceId: shelfEntry.instanceId,
          accessoryRef: {
            name: 'מדף קבוע בעומס כבד מאוורר 19 אינץ׳',
            sku: '117914',
            isPreset: true,
            isLocked: false,
            price: 0,
            uSize: 1,
            description: 'מדף קבוע בעומס כבד מאוורר 19 אינץ׳ (דגם 117914). חלק מתצורת היצרן.'
          }
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
  }, [totalU, includedItems, selectedOptionals, cabinetData, presetOverrides]);

  // --- DYNAMIC SLOT CALCULATION FOR VISUAL CHASSIS & ORDER SUMMARY ---
  const getAccessoryImage = (acc: any): string => {
    if (!acc) return '';
    const isShelf = acc.type === 'preset-shelf' || acc.isShelf || /מדף|shelf/i.test(acc.name || acc.description || '');
    if (isShelf) {
      return GENERIC_SHELF_IMAGE;
    }
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
    return '';
  };

  const getRealProductImage = (acc: any): string => {
    if (!acc) return '';
    const targetSku = normalizeSku(acc.sku || acc.pn || acc.accessoryRef?.sku || acc.accessoryRef?.pn || '');
    if (targetSku && catalogData && Array.isArray(catalogData)) {
      const found = catalogData.find((p: any) => normalizeSku(p.sku) === targetSku);
      if (found) {
        if (found.images && Array.isArray(found.images) && found.images[0]) return found.images[0];
        if (found.imageURL) return found.imageURL;
        if (found.image) return found.image;
      }
    }
    const isShelf = acc.type === 'preset-shelf' || acc.isShelf || /מדף|shelf/i.test(acc.name || acc.description || '');
    if (isShelf && catalogData && Array.isArray(catalogData)) {
      if (cabinetData?.suitableStandard?.length) {
        for (const stdSku of cabinetData.suitableStandard) {
          const foundStd = catalogData.find((p: any) => normalizeSku(p.sku) === normalizeSku(stdSku));
          if (foundStd?.images?.[0]) return foundStd.images[0];
          if (foundStd?.imageURL) return foundStd.imageURL;
        }
      }
      const anyRealShelf = catalogData.find((p: any) => 
        /מדף|shelf/i.test(p.name || p.description || p.sku || '') && 
        ((p.images && p.images[0]) || p.imageURL)
      );
      if (anyRealShelf?.images?.[0]) return anyRealShelf.images[0];
      if (anyRealShelf?.imageURL) return anyRealShelf.imageURL;
    }
    if (acc.image && typeof acc.image === 'string' && acc.image.trim() !== '') return acc.image;
    if (acc.accessoryRef?.image && typeof acc.accessoryRef.image === 'string' && acc.accessoryRef.image.trim() !== '') {
      return acc.accessoryRef.image;
    }
    return '';
  };

  const orderLines = React.useMemo<OrderLine[]>(() => {
    const groupMap = new Map<string, {
      sku: string;
      name: string;
      description: string;
      image: string;
      uSize: number;
      qty: number;
      unitPrice: number;
      items: any[];
    }>();

    (selectedOptionals || []).forEach((opt: any) => {
      if ((opt as any)?._illustration) return;
      const rawKey = String(opt.sku || opt.pn || '').trim();
      if (!rawKey) return;
      const key = normalizeSku(rawKey) || rawKey;
      const quantity = Math.max(1, Number(opt.quantity) || 1);
      const existing = groupMap.get(key);

      const catalogMatch = (catalogData || []).find((pp: any) =>
        pp && pp.sku && (
          pp.sku === rawKey ||
          pp.sku === opt.pn ||
          pp.sku === opt.sku ||
          normalizeSku(pp.sku) === key
        )
      );

      const optImage = getRealProductImage(opt) || getAccessoryImage(opt) || (catalogMatch?.images && catalogMatch.images[0]) || catalogMatch?.imageURL || opt.image || '';
      const optDesc = opt.description || catalogMatch?.description || '';
      const optName = opt.name || catalogMatch?.name || opt.description || opt.pn || rawKey;
      const optPrice = Number(opt.price) || Number(catalogMatch?.price) || 0;
      const optUSize = Number(opt.uSize) || Number(catalogMatch?.u) || 0;

      if (!existing) {
        groupMap.set(key, {
          sku: opt.sku || opt.pn || rawKey,
          name: optName,
          description: optDesc,
          image: optImage,
          uSize: optUSize,
          qty: quantity,
          unitPrice: optPrice,
          items: [opt],
        });
      } else {
        existing.qty += quantity;
        existing.items.push(opt);
        if (!existing.image && optImage) existing.image = optImage;
        if (!existing.description && optDesc) existing.description = optDesc;
      }
    });

    const lines: OrderLine[] = [];

    groupMap.forEach((group, key) => {
      const normGroupKey = normalizeSku(group.sku) || key;

      // Anchor slots in `slots` (type 'optional-accessory', isAnchor !== false)
      const anchorSlots = (slots || [])
        .filter((s: any) => {
          if (s.type !== 'optional-accessory' || s.isAnchor === false) return false;
          const refKey = String(s.accessoryRef?.sku || s.accessoryRef?.pn || '').trim();
          return refKey === group.sku || (Boolean(refKey) && normalizeSku(refKey) === normGroupKey);
        })
        .map((s: any) => Number(s.uIndex))
        .filter((u: number) => !isNaN(u) && u > 0)
        .sort((a: number, b: number) => a - b)
        .map((u: number) => `U${u}`);

      // Check if item appears in unallocatedItems
      const appearsInUnallocated = (unallocatedItems || []).some((item: any) => {
        const itemKey = String(item.sku || item.pn || '').trim();
        return itemKey === group.sku || (Boolean(itemKey) && normalizeSku(itemKey) === normGroupKey);
      });

      let status: 'unplaced' | 'aux' | 'placed';
      let positions: string[];

      if (group.uSize === 0) {
        status = 'aux';
        positions = ['0U'];
      } else if (appearsInUnallocated) {
        status = 'unplaced';
        positions = anchorSlots.length > 0 ? [...anchorSlots, 'לא שובץ'] : ['לא שובץ'];
      } else if (anchorSlots.length > 0) {
        status = 'placed';
        positions = anchorSlots;
      } else {
        status = 'unplaced';
        positions = ['לא שובץ'];
      }

      const zoneStr = positions.length > 0 && positions[0] !== 'לא שובץ' && positions[0] !== '0U'
        ? `מסילות U חזיתיות (${positions.join(', ')})`
        : (group.uSize === 0 ? 'שלד הארון (0U)' : 'לא שובץ במסד');

      const enrichedItem: EnrichedPreviewItem = {
        sku: group.sku,
        name: group.name,
        description: group.description,
        image: group.image,
        uSize: group.uSize,
        price: group.unitPrice,
        quantity: group.qty,
        zone: zoneStr,
        type: 'optional-accessory',
      };

      lines.push({
        sku: group.sku,
        name: group.name,
        description: group.description,
        image: group.image,
        uSize: group.uSize,
        qty: group.qty,
        unitPrice: group.unitPrice,
        lineTotal: group.unitPrice * group.qty,
        positions,
        status,
        enrichedItem,
      });
    });

    return lines;
  }, [selectedOptionals, slots, nonUAccessories, unallocatedItems, catalogData]);

  const orderTotals = React.useMemo<OrderTotals>(() => {
    const accessoriesTotal = orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const cabinetPrice = Number(product?.price) || 0;
    const grandTotal = cabinetPrice + accessoriesTotal;
    const unplacedCount = unallocatedItems.length > 0
      ? unallocatedItems.length
      : orderLines.filter(line => line.status === 'unplaced').reduce((sum, line) => sum + (line.qty || 1), 0);
    const extraCount = orderLines.reduce((sum, line) => sum + line.qty, 0);

    return {
      accessoriesTotal,
      cabinetPrice,
      grandTotal,
      unplacedCount,
      extraCount,
    };
  }, [orderLines, product?.price, unallocatedItems.length]);

  const totalSlotsU = totalU || 0;
  const availableU = totalU - usedU;

  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningModalMessage, setWarningModalMessage] = useState<string>('');
  const [pendingAccessory, setPendingAccessory] = useState<Accessory | null>(null);
  const [addedIdx, setAddedIdx] = useState<number | null>(null);
  const [highlightedOptIdx, setHighlightedOptIdx] = useState<number | null>(null);
  const [lastAddedInstanceId, setLastAddedInstanceId] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState<EnrichedPreviewItem | null>(null);
  const [inspectedProduct, setInspectedProduct] = useState<EnrichedPreviewItem | null>(null);
  const [movingInstanceId, setMovingInstanceId] = useState<string | null>(null);
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

  // Global escape key handler to dismiss popup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedProduct) setInspectedProduct(null);
        if (movingInstanceId) setMovingInstanceId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedProduct, movingInstanceId]);

  const [a11yMessage, setA11yMessage] = useState<string>('');
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [chassisPulse, setChassisPulse] = useState(false);
  const [pdfWithPrice, setPdfWithPrice] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfSnapshot, setPdfSnapshot] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [accSearch, setAccSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const [customAccName, setCustomAccName] = useState('');
  const [customAccU, setCustomAccU] = useState<number>(1);

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const snapshot3DRef = useRef<(() => string | null) | null>(null);

  useEffect(() => {
    if (viewMode === '2d') {
      snapshot3DRef.current = null;
    }
  }, [viewMode]);
  const [isWideLayout, setIsWideLayout] = useState<boolean>(true);
  const [isStudioMode, setIsStudioMode] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [activeMediumTab, setActiveMediumTab] = useState<'catalog' | 'contents' | 'inspected'>('catalog');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<'none' | 'catalog' | 'contents' | 'inspected'>('none');

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const check = () => setWindowWidth(window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isWideDesktop = windowWidth >= 1280;
  const isMedium = windowWidth >= 768 && windowWidth < 1280;
  const isMobile = windowWidth < 768;
  const isDesktop = windowWidth >= 1024;

  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [addSlotTargetU, setAddSlotTargetU] = useState<number | null>(null);
  const [previewAddSlotSpanU, setPreviewAddSlotSpanU] = useState<number>(1);
  const [isAuxiliaryModalOpen, setIsAuxiliaryModalOpen] = useState(false);
  const [isPduModalOpen, setIsPduModalOpen] = useState(false);
  const [globalPendingPduItem, setGlobalPendingPduItem] = useState<any | null>(null);

  // Drag and Drop & Floating Hover Cursor Tracker
  const [draggedSlot, setDraggedSlot] = useState<VisualSlot | null>(null);
  const [dragOverU, setDragOverU] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track mouse coordinates for the floating hover window
  useEffect(() => {
    if (!hoveredProduct) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredProduct]);

  const handleMoveSlotToU = (draggedItem: VisualSlot, targetU: number) => {
    if (!draggedItem || !targetU || draggedItem.uIndex === targetU) return;

    if (draggedItem.type === 'preset-shelf') {
      const shelfKey = draggedItem.instanceId || 'builtin-shelf-1';
      setPresetOverrides(prev => ({ ...prev, [shelfKey]: targetU }));
      setA11yMessage(`המדף המובנה הועבר בהצלחה ל-U${targetU}`);
      setChassisPulse(true);
      setTimeout(() => setChassisPulse(false), 1000);
      return;
    }

    if (draggedItem.type === 'optional-accessory') {
      let optIdx = draggedItem.optionalIdx;
      if (optIdx === undefined || optIdx < 0 || optIdx >= selectedOptionals.length) {
        // Fallback: match by instanceId or id
        const found = selectedOptionals.findIndex(
          o => (draggedItem.instanceId && (o.instanceId === draggedItem.instanceId || o.id === draggedItem.instanceId)) ||
               ((o.sku || o.pn) === (draggedItem.accessoryRef?.sku || draggedItem.accessoryRef?.pn))
        );
        if (found !== -1) optIdx = found;
      }
      if (optIdx === undefined || optIdx < 0 || optIdx >= selectedOptionals.length) return;

      const currentOpt = selectedOptionals[optIdx];
      const spanU = draggedItem.spanU || currentOpt.uSize || 1;
      const clampedBaseU = Math.min(totalSlotsU - spanU + 1, Math.max(1, targetU));

      if ((currentOpt.quantity || 1) > 1) {
        setSelectedOptionals(prev => {
          const next = [...prev];
          next[optIdx] = { ...currentOpt, quantity: currentOpt.quantity - 1 };
          next.push({
            ...currentOpt,
            quantity: 1,
            targetU: clampedBaseU,
            id: `moved-${currentOpt.sku || currentOpt.pn}-${Date.now()}`
          });
          return next;
        });
      } else {
        setSelectedOptionals(prev => {
          return prev.map((item, i) => {
            if (i === optIdx) {
              return { ...item, targetU: clampedBaseU };
            }
            if (item.targetU === clampedBaseU) {
              return { ...item, targetU: draggedItem.uIndex };
            }
            return item;
          });
        });
      }

      setA11yMessage(`האביזר ${draggedItem.name} הועבר בהצלחה ל-U${clampedBaseU}`);
      setHighlightedSku(currentOpt.sku || currentOpt.pn || null);
      setChassisPulse(true);
      setTimeout(() => {
        setHighlightedSku(null);
        setChassisPulse(false);
      }, 1400);
    }
  };

  // State signature helper
  const computeStateSignature = (
    cabSku: string,
    totU: number,
    opts: any[],
    presets: Record<string, number>
  ): string => {
    return JSON.stringify({
      cabSku,
      totU,
      opts: opts.map(o => ({
        id: o.instanceId || o.id,
        sku: o.sku || o.pn,
        targetU: o.targetU,
        quantity: Math.max(1, Number(o.quantity) || 1)
      })),
      presets
    });
  };

  // Rearrangement engine proposals and undo snapshot
  const [pendingRearrangementPlan, setPendingRearrangementPlan] = useState<{ plan: RearrangementPlan; item: any; stateSignature?: string } | null>(null);
  const [undoState, setUndoState] = useState<{
    previousOptionals: (Accessory & { quantity: number; id: string; instanceId?: string })[];
    previousPresetOverrides: Record<string, number>;
    actionAddedInstanceId: string;
    stateSignatureAfter?: string;
    message: string;
  } | null>(null);

  const handleConfirmRearrangement = () => {
    if (!pendingRearrangementPlan) return;
    const { plan, item, stateSignature } = pendingRearrangementPlan;
    
    // Validate state hasn't changed since proposal
    const currentSignature = computeStateSignature(
      product?.sku || '',
      totalSlotsU,
      selectedOptionals,
      presetOverrides
    );
    if (stateSignature && stateSignature !== currentSignature) {
      alert("מצב הארון השתנה מאז חישוב ההצעה. אנא נסה שוב.");
      setPendingRearrangementPlan(null);
      return;
    }

    // Re-verify that the plan is still valid
    const freshAnalysis = analyzeCabinetSpace(totalSlotsU, slots, plan.targetU);
    const recheckPlan = findRearrangementPlan(item, plan.targetU, freshAnalysis, slots);
    if (!recheckPlan) {
      alert("לא ניתן לבצע את הסידור במצב הנוכחי של הארון.");
      setPendingRearrangementPlan(null);
      return;
    }

    // Prepare updated states
    const targetNewInstId = `${item.sku || item.pn}-U${plan.targetU}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const updatedOptionals = selectedOptionals.map(opt => {
      const optId = opt.instanceId || opt.id;
      const move = plan.moves.find(m => m.instanceId === optId || (opt.id && opt.id === m.instanceId));
      if (move) {
        return {
          ...opt,
          targetU: move.toU,
        };
      }
      return opt;
    });

    const updatedPresets = { ...presetOverrides };
    plan.moves.forEach(m => {
      if (m.instanceId.startsWith('builtin-shelf-')) {
        updatedPresets[m.instanceId] = m.toU;
      }
    });

    const newEntry = {
      ...item,
      quantity: 1,
      targetU: plan.targetU,
      id: targetNewInstId,
      instanceId: targetNewInstId,
    };

    const finalOptionals = [...updatedOptionals, newEntry];
    const signatureAfter = computeStateSignature(
      product?.sku || '',
      totalSlotsU,
      finalOptionals,
      updatedPresets
    );

    // Save previous state for undo
    setUndoState({
      previousOptionals: JSON.parse(JSON.stringify(selectedOptionals)),
      previousPresetOverrides: { ...presetOverrides },
      actionAddedInstanceId: targetNewInstId,
      stateSignatureAfter: signatureAfter,
      message: `בוצע סידור מחדש של ${plan.moves.length} פריטים והותקן ${item.name || item.description || item.pn} ב-U${plan.targetU}`,
    });

    setSelectedOptionals(finalOptionals);
    setPresetOverrides(updatedPresets);
    setPendingRearrangementPlan(null);
    setLastAddedInstanceId(targetNewInstId);
    setChassisPulse(true);

    setTimeout(() => {
      setLastAddedInstanceId(null);
      setChassisPulse(false);
    }, 1400);
  };

  const handleUndoLastAction = () => {
    if (!undoState) return;
    const currentSig = computeStateSignature(
      product?.sku || '',
      totalSlotsU,
      selectedOptionals,
      presetOverrides
    );

    if (!undoState.stateSignatureAfter || currentSig === undoState.stateSignatureAfter) {
      if (undoState.previousOptionals) {
        setSelectedOptionals(undoState.previousOptionals);
      }
      if (undoState.previousPresetOverrides) {
        setPresetOverrides(undoState.previousPresetOverrides);
      }
    } else {
      // Revert moves and remove added instance while retaining independent additions
      setSelectedOptionals(current => {
        const filtered = current.filter(c => (c.instanceId || c.id) !== undoState.actionAddedInstanceId);
        return filtered.map(item => {
          const orig = undoState.previousOptionals?.find((p: any) => (p.instanceId || p.id) === (item.instanceId || item.id));
          if (orig) {
            return { ...item, targetU: orig.targetU, quantity: orig.quantity };
          }
          return item;
        });
      });
      if (undoState.previousPresetOverrides) {
        setPresetOverrides(undoState.previousPresetOverrides);
      }
    }

    setUndoState(null);
    setChassisPulse(true);
    setTimeout(() => setChassisPulse(false), 1400);
  };

  // Unified validation and addition processor
  const validateAndProcessAdd = (
    acc: Accessory,
    requestedTargetU: number | null = null,
    sourceIdx: number = -1
  ) => {
    const normSku = normalizeSku(acc.sku || acc.pn);
    const isShelf = isProductShelf(acc, catalogMapRef.current, allMatrixShelvesRef.current);
    if (isShelf && !inMatrixShelvesRef.current.has(normSku)) {
      console.warn(`[CabinetConfigurator] Shelf ${normSku} is not permitted for cabinet ${cabinetData?.sku}. Blocked.`);
      alert(`מדף ${normSku} אינו נתמך עבור ארון ${cabinetData?.sku || product?.sku} לפי המטריצה.`);
      return;
    }

    const uSize = acc.uSize ?? 1;

    // 0U items (accessories that don't occupy U space)
    if (uSize === 0) {
      if (acc.zone && acc.zone.startsWith('rear-')) {
        // Check rear occupancy
        const occupiedRear = selectedOptionals.find(opt => opt.uSize === 0 && opt.zone === acc.zone);
        if (occupiedRear) {
          setWarningModalMessage(`המיקום האחורי המבוקש תפוס כבר על ידי: ${occupiedRear.name || occupiedRear.pn}. אין אפשרות לחפיפה בהתקנה אחורית.`);
          setPendingAccessory(acc);
          setWarningModalOpen(true);
          return;
        }
      }
      const newInstId = `${acc.sku || acc.pn}-0U-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setSelectedOptionals(prev => [
        ...prev,
        { ...acc, quantity: 1, id: newInstId, instanceId: newInstId, targetU: undefined }
      ]);
      setChassisPulse(true);
      if (sourceIdx >= 0) {
        setAddedIdx(sourceIdx);
        setHighlightedOptIdx(sourceIdx);
        setTimeout(() => {
          setAddedIdx(null);
          setHighlightedOptIdx(null);
        }, 2200);
      }
      setTimeout(() => setChassisPulse(false), 1400);
      return;
    }

    // Capacity check
    if (uSize > availableU) {
      setWarningModalMessage(`אין מספיק מקום פנוי כולל בארון עבור פריט זה (${uSize}U נדרשים, ${availableU}U פנויים).`);
      setPendingAccessory(acc);
      setWarningModalOpen(true);
      return;
    }

    // Placement engine analysis
    const analysis = analyzeCabinetSpace(totalSlotsU, slots, requestedTargetU);
    const placementRes = classifyItemPlacement(acc, analysis, requestedTargetU, slots);

    if (placementRes.category === 'infeasible') {
      setWarningModalMessage(
        requestedTargetU !== null
          ? `המיקום שנבחר ב-U${requestedTargetU} תפוס ולא נמצאה תוכנית סידור אפשרית לפינויו.`
          : `לא נמצאה הצעת סידור: לא ניתן ליצור רצף פנוי של ${uSize}U עבור פריט זה.`
      );
      setPendingAccessory(acc);
      setWarningModalOpen(true);
      return;
    }

    if (placementRes.category === 'rearrange' && placementRes.rearrangementPlan) {
      const currentSignature = computeStateSignature(
        product?.sku || '',
        totalSlotsU,
        selectedOptionals,
        presetOverrides
      );
      setPendingRearrangementPlan({
        plan: placementRes.rearrangementPlan,
        item: acc,
        stateSignature: currentSignature
      });
      return;
    }

    // Direct placement (or alternative target if general add)
    const targetU = requestedTargetU !== null ? requestedTargetU : placementRes.alternateTargetU;
    const newInstId = `${acc.sku || acc.pn}-${targetU ? `U${targetU}` : 'unit'}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    setSelectedOptionals(prev => [
      ...prev,
      {
        ...acc,
        quantity: 1,
        id: newInstId,
        instanceId: newInstId,
        targetU: targetU || undefined
      }
    ]);

    setLastAddedInstanceId(newInstId);
    setChassisPulse(true);
    if (sourceIdx >= 0) {
      setAddedIdx(sourceIdx);
      setHighlightedOptIdx(sourceIdx);
      setTimeout(() => {
        setAddedIdx(null);
        setHighlightedOptIdx(null);
      }, 2200);
    }

    setTimeout(() => {
      setLastAddedInstanceId(null);
      setChassisPulse(false);
    }, 1400);
  };

  const handleSlotAction = (uIndex: number) => {
    if (movingInstanceId) {
      const itemToMoveIndex = selectedOptionals.findIndex(o => o.instanceId === movingInstanceId || o.id === movingInstanceId);
      if (itemToMoveIndex !== -1) {
        let item = selectedOptionals[itemToMoveIndex];
        // If moving a rear PDU to a front U slot, convert to 1U
        if (item.uSize === 0 && item.zone?.startsWith('rear')) {
          item = { ...item, uSize: 1, zone: undefined };
        }
        const newOptionals = [...selectedOptionals];
        newOptionals.splice(itemToMoveIndex, 1);
        setSelectedOptionals(newOptionals);
        setMovingInstanceId(null);
        setTimeout(() => {
          validateAndProcessAdd(item, uIndex, -1);
        }, 100);
      }
    } else {
      setAddSlotTargetU(uIndex);
      setIsAddSlotModalOpen(true);
    }
  };

  const handleAddOptionalAtSlot = (acc: Accessory, targetU: number | null) => {
    setUndoState({
      previousOptionals: [...selectedOptionals],
      previousPresetOverrides: { ...presetOverrides },
      actionAddedInstanceId: '',
      message: `נוסף פריט: ${acc.name || acc.description || acc.sku || ''}${targetU ? ` ב-U${targetU}` : ''}`,
    } as any);
    validateAndProcessAdd(acc, targetU);
  };

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
    
    validateAndProcessAdd(newAcc, null, -1);
    setCustomAccName('');
    setCustomAccU(1);
  };

  const handleIncrementQuantity = (target: number | string) => {
    let item: any = null;
    if (typeof target === 'number') {
      item = selectedOptionals[target];
    } else {
      const norm = normalizeSku(target);
      item = selectedOptionals.find(p => {
        const pSku = String(p.sku || p.pn || '').trim();
        return pSku === target || (Boolean(pSku) && normalizeSku(pSku) === norm);
      });
    }
    if (!item) return;
    validateAndProcessAdd(item, null, -1);
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

        // Dedicated handling for SKU 447510T based on manufacturer technical drawing
        if (productSkuNorm === '447510T') {
          const spec447510T: CabinetMatrixData = {
            sku: '447510T',
            model: '44U 75 X 100-Floor Standing Rack Boost',
            u: 44,
            width: 750,
            depth: 1000,
            frontDoor: 'דלת כפולה מחוררת עם מנעול קפיצי (Spring Lock)',
            rearDoor: 'דלת כפולה מחוררת עם מנעול קפיצי (Spring Lock)',
            color: 'RAL9005 Black',
            fans: '4',
            wheels: '4',
            levelingFeet: '4',
            shelvesQty: '2',
            suitableStandard: ['117914'],
            suitableHanging: [],
            suitableSliding: []
          };
          setCabinetData(spec447510T);
          setTotalU(44);
          let initialAvailableU = 44;
          const inMatrixShelves = new Set<string>(['117914']);
          inMatrixShelvesRef.current = inMatrixShelves;
          setIncludedItems([
            'דלת קדמית כפולה מחוררת עם מנעול קפיצי',
            'דלת אחורית כפולה מחוררת עם מנעול קפיצי',
            'יחידת 4 מאווררי גג בפלטה אחת עם כבל',
            '4 גלגלים כבדים + 4 רגליות פילוס',
            '2 מדפים קבועים 470*650*48 (מק״ט 117914)',
            '2 תעלות כבילה אנכיות 400 מ״מ',
            'פס הארקה ראשי מנחושת וכבלים',
            'דלתות צד פריקות עם מנעול עגול',
            '50 סטים ברגים ודיסקיות Cage Nuts',
            'קופסת חיבור ייעודית לפס 12 שקעים PDU'
          ]);
          setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, spec447510T, compatMap, allMatrixShelves));
          setLoading(false);
          return;
        }

        // Dedicated handling for Boost RackMount 42U based on manufacturer specification
        if (productSkuNorm === 'BOOST-42U' || productSkuNorm === '42U-BOOST' || productSkuNorm === '42U' || isCabinetBoost42U(product, null)) {
          const specBoost42U: CabinetMatrixData = {
            sku: productSkuNorm || 'BOOST-42U',
            model: '42U Floor Standing Cabinet Boost RackMount',
            u: 42,
            width: product?.width || 600,
            depth: product?.depth || 1000,
            frontDoor: 'דלת קדמית זכוכית מחוסמת 5 מ״מ עם מסגרת פלדה SPCC ומנעול ידית',
            rearDoor: 'דלת אחורית פלדה SPCC עם מנעול עגול',
            color: 'RAL9005 Black SPCC Cold Rolled Steel',
            fans: '4',
            wheels: '4',
            levelingFeet: '4',
            shelvesQty: '1',
            suitableStandard: ['117914'],
            suitableHanging: [],
            suitableSliding: []
          };
          setCabinetData(specBoost42U);
          setTotalU(42);
          const inMatrixShelves = new Set<string>(['117914']);
          inMatrixShelvesRef.current = inMatrixShelves;
          setIncludedItems([
            'דלת קדמית זכוכית מחוסמת 5.0 מ״מ עם מסגרת פלדה SPCC ומנעול ידית (2 מפתחות)',
            'דלת אחורית פלדה SPCC 1.2 מ״מ עם מנעול עגול (2 מפתחות)',
            '2 דלתות צד פריקות SPCC 1.0 מ״מ עם בריחי נעילה מהירים',
            'יחידת גג 4 מאווררים תעשייתיים 120*120*38 מ״מ (Fan Unit SPCC 1.2mm)',
            '4 גלגלי נסיעה כבדים (Castors)',
            '4 רגליות פילוס מתכווננות M10 (Adjustable Feet)',
            '6 קורות עומק Mounting Angles בעובי 1.2 מ״מ עם חריצי כיוונון (3 מכל צד)',
            '4 פרופילי עמודים 19" בעובי 2.0 מ״מ SPCC עם סימוני U וחורי כלוב',
            'מכסי פתחי כבילה עליונים ותחתונים (Top & Bottom Cover Boards)',
            '20 סטים של ברגי M6 ואומי כלוב (M6 Cage Nuts & Screws Zinc Coated)',
            'כבלים ומחברי הארקה (Grounding Kit)'
          ]);
          setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, specBoost42U, compatMap, allMatrixShelves));
          setLoading(false);
          return;
        }

        // Dedicated handling for SKU 221221 (Boost RackMount 4U Single Section Wall Cabinet) based on manufacturer blueprint
        if (productSkuNorm === '221221' || productSkuNorm === '221-221' || isCabinet221221(product, null)) {
          const spec221221: CabinetMatrixData = {
            sku: '221221',
            model: 'Boost RackMount 4U Single Section Wall Cabinet (550*400*200)',
            u: 4,
            width: 550,
            depth: 400,
            frontDoor: 'דלת קדמית זכוכית מחוסמת 4.0 מ״מ עם מסגרת פלדה SPCC ומנעול עגול',
            rearDoor: 'ללא דלת אחורית (גב פלדה SPCC 0.8 מ״מ לתלייה על קיר)',
            color: 'RAL9005 Black SPCC Cold Rolled Steel',
            fans: '1 (מגרעת בגג להרכבת מאוורר 120 מ״מ)',
            wheels: '0',
            levelingFeet: '0',
            shelvesQty: '0',
            suitableStandard: [],
            suitableHanging: [],
            suitableSliding: []
          };
          setCabinetData(spec221221);
          setTotalU(4);
          inMatrixShelvesRef.current = new Set<string>();
          setIncludedItems([
            'גוף ארון מודולרי SPCC Cold Rolled Steel תקן 19 אינץ׳ (ANSI/EIA RS-310-D)',
            'דלת קדמית זכוכית מחוסמת 4.0 מ״מ עם מסגרת פלדה SPCC 1.0 מ״מ ומנעול עגול קטן עם מפתחות',
            'גב פלדה SPCC 0.8 מ״מ לתלייה על הקיר עם חורי מפתח ופתח כבילה ייעודי',
            '2 דלתות צד פריקות SPCC 0.8 מ״מ עם פתחי אוורור (Louvers) ובריחי נעילה מהירים',
            'מגרעת עליונה (Fan Cutout) להרכבת מאוורר 120 מ״מ בגג הארון',
            'פתחי כבילה עליון ותחתון עם פלטת Knockout נשלפת',
            'זוג עמודי מונטינג קדמיים 19" בעובי 1.2 מ״מ SPCC עם סימוני 4U וחורי כלוב',
            'ערכת ברגים, דיסקיות ואומי כלוב M6 Cage Nuts',
            'הכנה וברגי הארקה (Grounding Studs)'
          ]);
          setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, spec221221, compatMap, allMatrixShelves));
          setLoading(false);
          return;
        }

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
           const desc = product.description || '';
           const fallbackCabinet: CabinetMatrixData = {
             sku: productSkuNorm,
             u: parsedTotalU,
             depth: parseCabinetDepthFromName(product.name || ''),
             width: null,
             frontDoor: '',
             rearDoor: '',
             color: '',
             fans: desc.match(/(\d+)\s*(?:מאוורר|מאווררים|fan|fans)/i)?.[1] || '',
             wheels: desc.match(/(\d+)\s*(?:גלגל|גלגלים|wheel|wheels)/i)?.[1] || '',
             levelingFeet: desc.match(/(\d+)\s*(?:רגל|רגליות|רגליים|feet)/i)?.[1] || '',
             shelvesQty: desc.match(/(\d+)\s*(?:מדף|מדפים|shelf)/i)?.[1] || '',
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
        const desc = product.description || '';
        const data: CabinetMatrixData = {
           sku: cabRow[0]?.toString() || '',
           u: parseInt(cabRow[2]?.toString() || '0', 10),
           width: isNaN(widthVal) ? null : widthVal,
           depth: isNaN(depthVal) ? null : depthVal,
           frontDoor: String(cabRow[5] ?? '').trim(),
           rearDoor: String(cabRow[6] ?? '').trim(),
           color: String(cabRow[7] ?? '').trim(),
           fans: (cabRow[8]?.toString() && cabRow[8].toString().toUpperCase() !== 'X' && cabRow[8].toString().trim() !== '') ? cabRow[8].toString() : (desc.match(/(\d+)\s*(?:מאוורר|מאווררים|fan|fans)/i)?.[1] || 'X'),
           wheels: (cabRow[9]?.toString() && cabRow[9].toString().toUpperCase() !== 'X' && cabRow[9].toString().trim() !== '') ? cabRow[9].toString() : (desc.match(/(\d+)\s*(?:גלגל|גלגלים|wheel|wheels)/i)?.[1] || 'X'),
           levelingFeet: (cabRow[10]?.toString() && cabRow[10].toString().toUpperCase() !== 'X' && cabRow[10].toString().trim() !== '') ? cabRow[10].toString() : (desc.match(/(\d+)\s*(?:רגל|רגליות|רגליים|feet)/i)?.[1] || 'X'),
           shelvesQty: (cabRow[11]?.toString() && cabRow[11].toString().toUpperCase() !== 'X' && cabRow[11].toString().trim() !== '') ? cabRow[11].toString() : (desc.match(/(\d+)\s*(?:מדף|מדפים|shelf)/i)?.[1] || 'X'),
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
        
        const parseIncluded = (val: string | undefined, name: string) => {
          if (!val) return null;
          const str = String(val).trim();
          const upper = str.toUpperCase();
          if (
            upper === 'X' ||
            upper === '0' ||
            upper === '-' ||
            upper === '--' ||
            upper.includes('לא כלול') ||
            upper.includes('ללא') ||
            upper.includes('אין') ||
            upper.includes('מידע לא זמין') ||
            upper.includes('NONE') ||
            upper.includes('NO') ||
            upper.includes('N/A') ||
            upper.includes('NA')
          ) {
            return null;
          }
          const numMatch = str.match(/\d+/);
          if (numMatch) {
            const count = parseInt(numMatch[0], 10);
            if (count <= 0) return null;
            return `${name}: ${count} יחידות כלולות`;
          }
          return `${name}: ${str}`;
        };

        const fanItem = parseIncluded(data.fans, 'מאווררים');
        if (fanItem) included.push(fanItem);
        const wheelItem = parseIncluded(data.wheels, 'גלגלים');
        if (wheelItem) included.push(wheelItem);
        const feetItem = parseIncluded(data.levelingFeet, 'רגליות פילוס');
        if (feetItem) included.push(feetItem);
        const shelfItem = parseIncluded(data.shelvesQty, 'מדפים');
        if (shelfItem) included.push(shelfItem);

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
      onOptionalsChangeRef.current(orderLines);
    }
  }, [orderLines]);

  const handleAddOptional = (acc: Accessory, idx: number) => {
    setUndoState({
      previousOptionals: [...selectedOptionals],
      previousPresetOverrides: { ...presetOverrides },
      actionAddedInstanceId: '',
      message: `נוסף פריט: ${acc.name || acc.description || acc.sku || ''}`,
    } as any);
    const itemText = `${acc.name || ''} ${acc.description || ''}`.toLowerCase();
    const isItemPdu = acc._pdu || /פס שקע|שקעים|pdu/i.test(itemText) || String(acc.category || '').includes('פסי שקעים');
    
    if (isItemPdu) {
      setAddSlotTargetU(null);
      setGlobalPendingPduItem({ ...acc, _pdu: true });
      setIsPduModalOpen(true);
    } else {
      validateAndProcessAdd(acc, null, idx);
    }
  };

  const handleRemoveOptional = (target: number | string, fullyRemove = false) => {
    let item: any = null;
    let targetIndex = -1;

    if (typeof target === 'number') {
      targetIndex = target;
      item = selectedOptionals[targetIndex];
    } else {
      const norm = normalizeSku(target);
      for (let i = selectedOptionals.length - 1; i >= 0; i--) {
        const pSku = String(selectedOptionals[i].sku || selectedOptionals[i].pn || '').trim();
        if (pSku === target || (Boolean(pSku) && normalizeSku(pSku) === norm)) {
          targetIndex = i;
          item = selectedOptionals[i];
          break;
        }
      }
    }

    if (!item) return;

    setUndoState({
      previousOptionals: [...selectedOptionals],
      previousPresetOverrides: { ...presetOverrides },
      actionAddedInstanceId: '',
      message: `הוסר פריט: ${item.name || item.description || item.sku || ''}`,
    } as any);

    setSelectedOptionals(prev => {
      if (typeof target === 'string') {
        const norm = normalizeSku(target);
        if (fullyRemove) {
          return prev.filter(p => {
            const pSku = String(p.sku || p.pn || '').trim();
            return pSku !== target && normalizeSku(pSku) !== norm;
          });
        }
        let matchIdx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          const pSku = String(prev[i].sku || prev[i].pn || '').trim();
          if (pSku === target || (Boolean(pSku) && normalizeSku(pSku) === norm)) {
            matchIdx = i;
            break;
          }
        }
        if (matchIdx === -1) return prev;
        const targetItem = prev[matchIdx];
        if (Number(targetItem.quantity) > 1) {
          const next = [...prev];
          next[matchIdx] = { ...targetItem, quantity: Number(targetItem.quantity) - 1 };
          return next;
        }
        return prev.filter((_, i) => i !== matchIdx);
      }

      if (fullyRemove) {
        const itemToRemove = prev[target];
        if (!itemToRemove) return prev;
        const norm = normalizeSku(itemToRemove.sku || itemToRemove.pn);
        return prev.filter(p => normalizeSku(p.sku || p.pn) !== norm);
      }
      return prev.filter((_, i) => i !== target);
    });
  };

  const handleRemoveUnplaced = () => {
    // Identify lines that are unplaced
    const unplacedLines = orderLines.filter(line => line.status === 'unplaced');
    if (unplacedLines.length === 0 && unallocatedItems.length === 0) return;

    // Track placed anchor count for each unplaced SKU
    const placedCountsByNormSku = new Map<string, number>();
    unplacedLines.forEach(line => {
      const normKey = normalizeSku(line.sku) || line.sku;
      const placedCount = (slots || []).filter((s: any) => {
        if (s.type !== 'optional-accessory' || s.isAnchor === false) return false;
        const refKey = String(s.accessoryRef?.sku || s.accessoryRef?.pn || '').trim();
        return refKey === line.sku || (Boolean(refKey) && normalizeSku(refKey) === normKey);
      }).length;
      placedCountsByNormSku.set(normKey, placedCount);
    });

    // Also include any items specifically in unallocatedItems
    (unallocatedItems || []).forEach((item: any) => {
      const rawSku = String(item.sku || item.pn || '').trim();
      const normKey = normalizeSku(rawSku) || rawSku;
      if (!placedCountsByNormSku.has(normKey)) {
        const placedCount = (slots || []).filter((s: any) => {
          if (s.type !== 'optional-accessory' || s.isAnchor === false) return false;
          const refKey = String(s.accessoryRef?.sku || s.accessoryRef?.pn || '').trim();
          return refKey === rawSku || (Boolean(refKey) && normalizeSku(refKey) === normKey);
        }).length;
        placedCountsByNormSku.set(normKey, placedCount);
      }
    });

    setUndoState({
      previousOptionals: [...selectedOptionals],
      previousPresetOverrides: { ...presetOverrides },
      actionAddedInstanceId: '',
      message: 'הוסרו פריטים שלא שובצו בארון',
    } as any);

    setSelectedOptionals(prev => {
      const remainingPlaced = new Map(placedCountsByNormSku);
      const next: any[] = [];

      prev.forEach(opt => {
        if ((opt as any)?._illustration) {
          next.push(opt);
          return;
        }
        if (opt.uSize === 0) {
          next.push(opt);
          return;
        }
        const optSku = String(opt.sku || opt.pn || '').trim();
        const normKey = normalizeSku(optSku) || optSku;

        if (!remainingPlaced.has(normKey)) {
          next.push(opt);
          return;
        }

        const allowed = remainingPlaced.get(normKey) || 0;
        const optQty = Math.max(1, Number(opt.quantity) || 1);

        if (allowed <= 0) {
          // Zero units placed, completely remove
          return;
        } else if (optQty <= allowed) {
          next.push(opt);
          remainingPlaced.set(normKey, allowed - optQty);
        } else {
          // Partial placement: keep only placed units
          next.push({ ...opt, quantity: allowed });
          remainingPlaced.set(normKey, 0);
        }
      });

      return next;
    });
  };

  const forceAddPending = () => {
    setWarningModalOpen(false);
    setPendingAccessory(null);
  };

  const buildPreviewFromSlot = (slot: any): EnrichedPreviewItem => {
    if (!slot) {
      return {
        name: 'ציוד לא זוהה',
        sku: '',
        description: '',
        uSize: 0,
        price: 0,
        quantity: 1,
        zone: 'ארון תקשורת',
        type: 'empty',
      };
    }

    const isPreset = slot.isPreset || slot.isIncluded || slot.type?.startsWith('preset-') || slot.accessoryRef?.isPreset || slot.accessoryRef?.isIncluded;
    const acc = slot.accessoryRef || slot;
    const sku = slot.sku || acc.sku || acc.pn || (isPreset ? (acc.sku || 'כלול בארון') : '');
    const name = slot.name || acc.name || (isPreset ? 'ציוד מובנה בארון' : 'ציוד בארון');
    const description = slot.description || acc.description || '';
    const spanU = slot.spanU || slot.uSpan || acc.uSize || acc.spanU || 1;
    const uSize = slot.type === 'empty' ? 0 : spanU;
    const image = getRealProductImage(acc) || getRealProductImage(slot) || getAccessoryImage(acc) || slot.image || '';
    const price = isPreset ? 0 : (slot.price || acc.price || 0);
    const quantity = slot.quantity || acc.quantity || 1;
    
    let zone = slot.zone;
    if (!zone) {
      const uPos = slot.uIndex || slot.uStart;
      if (uPos && uPos > 0) {
        zone = `מסילות U חזיתיות (U${uPos}${spanU > 1 ? ` - U${uPos - spanU + 1}` : ''})`;
      } else if (slot.type === 'fan' || /מאוורר|fan/i.test(name)) {
        zone = 'תקרת הארון (יחידת מאווררי גג מובנית)';
      } else if (slot.type === 'door' || /דלת|רשת|זכוכית/i.test(name)) {
        zone = 'דלתות קדמיות / אחוריות';
      } else if (slot.type === 'pdu' || /שקע|pdu/i.test(name)) {
        zone = 'רלס אחורי עליון (פס שקעים PDU 0U)';
      } else if (slot.type === 'tray' || /כבילה|tray/i.test(name)) {
        zone = 'תעלות כבילה ורטיקליות 400 מ״מ';
      } else if (slot.type === 'ground' || /הארקה/i.test(name)) {
        zone = 'פס הארקה נחושת אנכי מובנה';
      } else if (slot.type === 'caster' || /גלגל/i.test(name)) {
        zone = 'בסיס הארון (סט גלגלים מחוזקים)';
      } else if (slot.type === 'feet' || /פילוס/i.test(name)) {
        zone = 'בסיס הארון (סט רגלי פילוס מתכווננות)';
      } else if (slot.type === 'hardware' || /כלוב|בורג|אומי/i.test(name)) {
        zone = 'ערכת חומרה (50 אומי כלוב + ברגים)';
      } else {
        zone = 'אביזר נלווה / שלד הארון';
      }
    }

    let finalSku = sku;
    let finalImage = image;
    let finalDesc = description;

    if (slot.sku === 'BUILTIN-FAN' || slot.sku === 'OPTIONAL-FAN') {
      const isOpt = slot.sku === 'OPTIONAL-FAN';
      const actualFan = isOpt 
         ? selectedOptionals.find(o => /מאוורר|fan/i.test(`${o.name} ${o.description}`)) 
         : catalogData?.find((p: any) => /מאוורר|fan/i.test(`${p.name} ${p.description}`) && p.images?.length > 0);
      
      if (actualFan) {
        finalSku = actualFan.sku || actualFan.pn || finalSku;
        finalImage = actualFan.images?.[0] || actualFan.imageURL || finalImage;
        if (isOpt) finalDesc = actualFan.description || finalDesc;
      }
    } else if (slot.sku === 'WHEELS' || slot.type === 'caster') {
      const casterProd = catalogData?.find((p: any) => /גלגל|casters/i.test(`${p.name} ${p.description}`) && p.images?.length > 0);
      if (casterProd) {
        finalSku = casterProd.sku || casterProd.pn || finalSku;
        finalImage = casterProd.images?.[0] || casterProd.imageURL || finalImage;
      }
    } else if (slot.sku === 'FEET' || slot.type === 'feet') {
      const feetProd = catalogData?.find((p: any) => /פילוס/i.test(`${p.name} ${p.description}`) && p.images?.length > 0);
      if (feetProd) {
        finalSku = feetProd.sku || feetProd.pn || finalSku;
        finalImage = feetProd.images?.[0] || feetProd.imageURL || finalImage;
      }
    }

    return {
      instanceId: slot.instanceId || slot.id || '',
      name,
      sku: finalSku,
      description: finalDesc,
      image: finalImage,
      uSize,
      spanU,
      price,
      quantity,
      zone,
      type: slot.type || 'active',
      optionalIdx: slot.optionalIdx,
      isPreset,
    };
  };

  const getIncludedPreviewItem = (itemText: string, idx: number): EnrichedPreviewItem => {
    const isShelf = /מדף|shelf|117914/i.test(itemText);
    const isFan = /מאוורר|fan|איוורור/i.test(itemText);
    const isWheels = /גלגל|casters/i.test(itemText);
    const isFeet = /פילוס|feet/i.test(itemText);
    const isNuts = /אומי|כלוב|ברגים|nuts/i.test(itemText);
    const isGround = /הארקה|ground/i.test(itemText);
    const isDoors = /דלת|רשת/i.test(itemText);
    const isTrays = /תעלות|כבילה|400/i.test(itemText);

    let sku = 'כלול בארון';
    let image = '';
    let description = itemText;
    let zone = 'ציוד מובנה בארון';

    if (isShelf) {
      sku = '117914';
      zone = 'מסילות U חזיתיות (U19-U20)';
      description = 'מדף קבוע בעומס כבד מאוורר 19 אינץ׳ (דגם 117914) כולל פתחי איוורור מקבילים וחיזוקי פלדה כפולים.';
      const shelfProd = catalogData?.find((p: any) => normalizeSku(p.sku) === '117914');
      image = shelfProd?.images?.[0] || shelfProd?.imageURL || '';
    } else if (isFan) {
      zone = 'תקרת הארון (Roof Unit)';
      description = 'יחידת 4 מאווררי יניקה שקטים מובנים בגג הארון לסירקולציית אוויר וקירור מיטבי.';
      const fanProd = catalogData?.find((p: any) => /מאוורר|fan/i.test(`${p.name} ${p.description}`) && p.images && p.images.length > 0);
      if (fanProd) {
        sku = fanProd.sku || sku;
        image = fanProd.images?.[0] || fanProd.imageURL || '';
      }
    } else if (isDoors) {
      zone = 'חזית וגב הארון';
      description = 'דלת קדמית ואחורית עם רשת מחוררת 71% אוורור וידיות נעילה בריח.';
    } else if (isTrays) {
      zone = 'דפנות צדדיות';
      description = 'זוג תעלות כבילה ורטיקליות ברוחב 400 מ״מ לניהול כבלי תקשורת ונתיבי סיבים אופטיים.';
    } else if (isGround) {
      zone = 'דופן ורטיקלית';
      description = 'פס הארקה נחושת אנכי מובנה עם נקודות חיבור מוארקות לכל רכיבי המסד.';
    } else if (isWheels) {
      zone = 'בסיס הארון';
      description = 'סט 4 גלגלים כבדים (2 עם מעצור) לשינוע קל ובטוח של הארון.';
      const casterProd = catalogData?.find((p: any) => /גלגל|casters/i.test(`${p.name} ${p.description}`) && p.images && p.images.length > 0);
      if (casterProd) {
        sku = casterProd.sku || sku;
        image = casterProd.images?.[0] || casterProd.imageURL || '';
      }
    } else if (isFeet) {
      zone = 'בסיס הארון';
      description = 'סט 4 רגלי פילוס מתכווננות בגובה לקיבוע יציב ומפולס.';
    } else if (isNuts) {
      zone = 'ערכת התקנה נלווית';
      description = 'שקית התקנה עם 50 אומי כלוב M6, ברגים וטבעות פלסטיק להרכבת ציוד במסילות.';
    }

    return {
      instanceId: `included-item-${idx}`,
      name: itemText,
      sku,
      description,
      image,
      uSize: isShelf ? 1 : 0,
      price: 0,
      quantity: 1,
      zone,
      type: 'preset-included',
      isPreset: true,
    };
  };

  const buildPreviewFromNonU = (item: any, zoneType: PhysicalZone): EnrichedPreviewItem => {
    const acc = item.accessoryRef || item;
    const sku = acc.sku || acc.pn || item.sku || '';
    const name = item.name || acc.name || item.description || '';
    const description = item.description || acc.description || '';
    const image = getAccessoryImage(acc) || getAccessoryImage(item);
    const price = acc.price || item.price || 0;
    const quantity = Math.max(1, Number(item.quantity) || Number(acc.quantity) || 1);
    const zoneMap: Record<PhysicalZone, string> = {
      roof: 'תקרת הארון (Roof) · איוורור ותאורה',
      rear: 'רלסים אחוריים (Rear Rails) · פס שקעים (0U)',
      'rear-top': 'רלס אחורי עליון (Rear Rails - Top) · פס שקעים (0U)',
      'rear-middle': 'רלס אחורי אמצעי (Rear Rails - Middle) · פס שקעים (0U)',
      'rear-bottom': 'רלס אחורי תחתון (Rear Rails - Bottom) · פס שקעים (0U)',
      vertical: 'דופן ורטיקלית וצדית (Vertical Rails)',
      plinth: 'בסיס ותחתית הארון (Plinth / Base)',
      hardware: 'חומרת הרכבה וציוד נלווה (Hardware)',
    };

    return {
      instanceId: item.instanceId || item.id || `0U-${sku}`,
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
  const rearPduItems = nonUAccessories.filter(a => a.zone?.startsWith('rear'));
  const verticalItems = nonUAccessories.filter(a => a.zone === 'vertical');
  const plinthItems = nonUAccessories.filter(a => a.zone === 'plinth');
  const hardwareItems = nonUAccessories.filter(a => a.zone === 'hardware');

  // --- Accessory grouping: unified single candidate list divided into disjoint display rubrics ---
  const _q = accSearch.trim().toLowerCase();
  const _qTokens = _q.split(/[\s\-/,]+/).filter(Boolean);
  
  const _illusPairs = ILLUSTRATION_ACCESSORIES
    .map((acc, i) => ({ acc, idx: 100000 + i }))
    .filter(({ acc }: any) => {
      if (!_qTokens.length) return true;
      const hay = `${acc.pn} ${acc.name} ${acc.description}`.toLowerCase();
      return _qTokens.every((tok: string) => hay.includes(tok));
    });

  const groupedRubrics = useMemo(() => {
    return groupAccessoriesForDisplay(compatibleAccessories, accSearch, availableU);
  }, [compatibleAccessories, accSearch, availableU]);

  const renderAccCard = (acc: any, idx: number) => {
    const catalogMatch = catalogData.find(pp => pp && pp.sku && (pp.sku === acc.pn || pp.sku === acc.sku));
    const showPrice = catalogMatch ? catalogMatch.price : (acc.price || 0);
    const fitsRemaining = acc.uSize === 0 || acc.uSize <= availableU;
    const isShelf = acc.isShelf || acc.type === 'preset-shelf' || /מדף|shelf/i.test(acc.name || acc.description || '');
    const cardImg = getAccessoryImage(acc);
    const realImg = getRealProductImage(acc);

    const cardPreview: EnrichedPreviewItem = {
      name: acc.name || acc.description || acc.pn || 'פריט ללא שם',
      sku: acc.pn || acc.sku || '',
      description: acc.description || catalogMatch?.description || '',
      uSize: acc.uSize ?? (isShelf ? 1 : 0),
      spanU: acc.uSize || (isShelf ? 1 : 1),
      price: showPrice,
      image: realImg || cardImg,
      zone: acc.zone || (acc.uSize > 0 ? `מסילות U (${acc.uSize}U)` : (isShelf ? 'מסילות קדמיות ואחוריות (מדף)' : 'אביזר נלווה ללא תפיסת U')),
      quantity: 1,
      type: isShelf ? 'shelf' : 'optional-accessory',
      optionalIdx: idx,
      isPreset: false,
    };

    return (
      <div
        id={`acc-${acc.pn}`}
        key={idx}
        onMouseEnter={(e) => {
          setMousePos({ x: e.clientX, y: e.clientY });
          setHoveredProduct(cardPreview);
        }}
        onMouseMove={(e) => {
          setMousePos({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setHoveredProduct(null)}
        className={`flex flex-col p-3.5 border group transition-all relative rounded-none hover:shadow-md cursor-pointer ${
          fitsRemaining ? 'bg-slate-50 border-slate-100 hover:border-[#004387]' : 'bg-rose-50/20 border-rose-200'
        } ${highlightedSku === acc.pn ? 'ring-2 ring-[#fe8d00] bg-orange-50' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          {cardImg ? (
            <div
              className="relative shrink-0 cursor-zoom-in"
              onClick={() => setInspectedProduct(cardPreview)}
              title="לחץ לצפייה במפרט ותמונה מוגדלת"
            >
              <img
                referrerPolicy="no-referrer"
                src={cardImg}
                alt={acc.name || acc.description || acc.pn}
                className="w-12 h-12 object-contain bg-white border border-slate-200 rounded p-1 group-hover:border-[#004387] transition-colors"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              {isShelf && (
                <span className="absolute -bottom-1 -right-1 bg-sky-600 text-white text-[8px] font-bold px-1 rounded shadow">
                  מדף
                </span>
              )}
            </div>
          ) : (
             <div
               className="w-12 h-12 bg-slate-100 border border-slate-200 rounded p-1 flex-shrink-0 flex items-center justify-center text-slate-300 cursor-zoom-in"
               onClick={() => setInspectedProduct(cardPreview)}
             >
               <Box size={24} />
             </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-[14px] text-slate-900 group-hover:text-[#004387] transition-colors leading-tight mb-1 cursor-pointer"
              title={acc.name || acc.description}
              onClick={() => setInspectedProduct(cardPreview)}
            >
              {acc.name || acc.description || 'פריט ללא שם'}
            </p>
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

  const AccordionSection = (id: string, title: string, items: any[], tone: string, defaultOpen: boolean = false, logoUrl: string = '') => {
    if (!items || !items.length) return null;
    const open = openSections[id] ?? defaultOpen;
    return (
      <div key={id} className="border border-slate-200 rounded-none mb-2.5">
        <button
          type="button"
          id={`accordion-btn-${id}`}
          aria-expanded={open}
          aria-controls={`accordion-content-${id}`}
          onClick={() => setOpenSections(s => ({ ...s, [id]: !(s[id] ?? defaultOpen) }))}
          className={`w-full flex items-center justify-between px-4 py-2 min-h-[50px] font-bold text-[15px] ${tone} active:opacity-80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#004387] cursor-pointer`}
        >
          <span className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-20 max-w-[220px] -my-6 object-contain mix-blend-multiply"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
            <span>
              {title}{title ? ' ' : ''}
              <span className="opacity-70 font-mono">({items.length})</span>
            </span>
          </span>
          <ChevronDown
            size={22}
            className={`transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div
            id={`accordion-content-${id}`}
            role="region"
            aria-labelledby={`accordion-btn-${id}`}
            className="space-y-3 p-2.5 max-h-[320px] overflow-y-auto"
          >
            {items.map((item: any, i: number) => {
              const acc = item.acc || item;
              const idx = item.idx !== undefined ? item.idx : i;
              return renderAccCard(acc, idx);
            })}
          </div>
        )}
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
    setPdfSnapshot(snapshot3DRef.current ? snapshot3DRef.current() : null);
    setShowPdfPreview(true);
  };

  const buildPdfBlob = async (): Promise<Blob> => {
    const el = document.getElementById('cabinet-pdf-doc');
    if (!el) {
      throw new Error('Document element cabinet-pdf-doc not found');
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const pdfWidth = 210;
    const pdfPageHeight = 297;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfPageHeight;

    while (heightLeft > 0) {
      position -= pdfPageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfPageHeight;
    }

    return pdf.output('blob');
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdfFile = async () => {
    try {
      setIsGeneratingPdf(true);
      const blob = await buildPdfBlob();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const yyyymmdd = `${year}${month}${day}`;
      const sku = product?.sku || cabinetData?.sku || 'CABINET';
      const fileName = `RBS-ארון-${sku}-${yyyymmdd}.pdf`;

      downloadBlob(blob, fileName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      setIsSharingWhatsApp(true);
      const blob = await buildPdfBlob();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const yyyymmdd = `${year}${month}${day}`;
      const sku = product?.sku || cabinetData?.sku || 'CABINET';
      const fileName = `RBS-ארון-${sku}-${yyyymmdd}.pdf`;

      const file = new File([blob], fileName, { type: 'application/pdf' });
      const text = `הצעת תצורה לארון ${product?.name || cabinetData?.model || 'תקשורת'} (${sku}) — ${orderTotals.extraCount} אביזרים, סה"כ ₪${orderTotals.grandTotal.toLocaleString('he-IL')}`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'הצעת תצורה RBS', text });
      } else {
        // desktop fallback: download the file, then open WhatsApp with the text
        downloadBlob(blob, fileName);
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n(הקובץ ירד למחשב — צרף אותו לשיחה)')}`, '_blank');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to share to WhatsApp:', err);
      }
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  if (loading) return <div className="p-8 mt-8 bg-gray-50 text-center text-gray-500 border border-gray-200">טוען קונפיגורטור ארון מותאם אישית...</div>;
  if (errorMsg) return <div className="p-8 mt-8 bg-red-50 text-center text-red-700 border border-red-200" dir="rtl">{errorMsg}</div>;

  const canUndo = !!undoState;

  if (isStudioMode) {
    return (
      <CabinetWorkspace
        product={product}
        cabinetData={cabinetData}
        totalSlotsU={totalSlotsU}
        availableU={availableU}
        usedU={usedU}
        slots={slots}
        selectedOptionals={selectedOptionals}
        includedItems={includedItems}
        nonUAccessories={nonUAccessories}
        unallocatedItems={unallocatedItems}
        compatibleAccessories={compatibleAccessories}
        groupedRubrics={groupedRubrics}
        illustrationAccessories={_illusPairs}
        catalogData={catalogData}
        accSearch={accSearch}
        setAccSearch={setAccSearch}
        openSections={openSections}
        setOpenSections={setOpenSections}
        viewMode={viewMode}
        setViewMode={setViewMode}
        inspectedProduct={inspectedProduct}
        setInspectedProduct={setInspectedProduct}
        hoveredProduct={hoveredProduct}
        setHoveredProduct={setHoveredProduct}
        addSlotTargetU={addSlotTargetU}
        setAddSlotTargetU={setAddSlotTargetU}
        previewAddSlotSpanU={previewAddSlotSpanU}
        setPreviewAddSlotSpanU={setPreviewAddSlotSpanU}
        highlightedOptIdx={highlightedOptIdx}
        setHighlightedOptIdx={setHighlightedOptIdx}
        lastAddedInstanceId={lastAddedInstanceId}
        pdfGrandTotal={pdfGrandTotal}
        onCloseStudio={() => setIsStudioMode(false)}
        onDownloadPdf={handleDownloadPdf}
        onAddOptional={handleAddOptional}
        onAddOptionalAtSlot={handleAddOptionalAtSlot}
        onIncrementQuantity={handleIncrementQuantity}
        onRemoveOptional={handleRemoveOptional}
        addedIdx={addedIdx}
        highlightedSku={highlightedSku}
        getIncludedPreviewItem={getIncludedPreviewItem}
        buildPreviewFromSlot={buildPreviewFromSlot}
        buildPreviewFromNonU={buildPreviewFromNonU}
        getAccessoryImage={getAccessoryImage}
        onSnapshotReady={(fn) => { snapshot3DRef.current = fn; }}
      />
    );
  }

  return (
    <div className="@container mt-8 bg-white border-2 border-[#004387] shadow-sm relative overflow-hidden" dir="rtl">
      {/* Moving Mode Banner */}
      {movingInstanceId && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2 flex items-center justify-between shadow-md z-40 sticky top-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>מצב הזזת ציוד פעיל: אנא בחרו חריץ U חדש בארון להעברת הציוד.</span>
          </div>
          <button 
            type="button" 
            onClick={() => setMovingInstanceId(null)}
            className="bg-black/10 hover:bg-black/20 font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
          >
            ביטול העברה
          </button>
        </div>
      )}
      
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
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* U Capacity Tracker Badge */}
          <div className={`px-4 py-2 font-bold text-sm tracking-wide shadow-inner flex items-center gap-2 flex-shrink-0 border border-white/20 rounded-none ${availableU > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white animate-pulse'}`}>
            <Box size={16} />
            מקום פנוי (המחשה): {availableU}U / {totalSlotsU}U
          </div>
          {canUndo && (
            <button type="button" onClick={handleUndoLastAction}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-white/40 text-white hover:bg-white/10"
              title="בטל את הפעולה האחרונה">
              <Undo2 size={14} /> בטל פעולה אחרונה
            </button>
          )}
        </div>
      </div>

      {normalizeSku(product?.sku) === '447510T' && (
        <div className="bg-amber-500/10 border-b border-amber-500/40 p-3 px-4 flex items-center justify-between gap-3 text-amber-950 flex-wrap">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <Award size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>הדמיית תלת-ממד ייעודית לפי מפרט יצרן רשמי (מק״ט 447510T Boost):</strong> שוחזרו דלתות כפולות מחוררות (Spring Lock), 4 מאווררי גג, תעלות כבילה אנכיות 400 מ״מ, גלגלים, רגליות ומדפי PN 117914.
            </span>
          </div>
          <span className="text-[11px] bg-amber-600 text-white font-bold px-2 py-0.5 shadow-xs">
            מפרט רשמי 44U 75x100
          </span>
        </div>
      )}

      {(isCabinetBoost42U(product, cabinetData) || normalizeSku(product?.sku) === 'BOOST-42U' || normalizeSku(product?.sku) === '42U-BOOST' || normalizeSku(product?.sku) === '42U') && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/40 p-3 px-4 flex items-center justify-between gap-3 text-emerald-950 flex-wrap">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <Award size={18} className="text-emerald-600 shrink-0" />
            <span>
              <strong>הדמיית תלת-ממד ייעודית לפי מפרט יצרן רשמי (Boost RackMount מפרט ארונות 42U):</strong> דלת קדמית זכוכית מחוסמת 5 מ״מ עם מנעול ידית, דלת אחורית פלדה SPCC עם מנעול עגול, 6 קורות עומק Mounting Angles, יחידת גג 4 מאווררים 120 מ״מ, גלגלים, רגליות פילוס M10 ו-20 סטים של ברגי כלוב M6.
            </span>
          </div>
          <span className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 shadow-xs">
            מפרט רשמי Boost 42U
          </span>
        </div>
      )}

      
      <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        
        {/* Column 1: Server Rack Simulator (Right side) - Strictly 2D and 3D */}
        <div className="w-full lg:w-[54%] xl:w-[56%] 2xl:w-[58%] shrink-0 space-y-3 lg:sticky lg:top-4 self-start flex flex-col transition-all duration-300 relative">
          <div className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-1 justify-between flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5"><Box size={16} className="text-[#004387]" /><span>הדמיית ארון תקשורת פיזי</span></span>
              <span className="text-xs font-normal text-slate-500">({totalSlotsU}U)</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Only 2 modes: 2D Front View and 3D Interactive */}
              <div className="inline-flex rounded-sm border border-slate-300 bg-slate-100 p-0.5 text-xs font-bold shadow-xs" role="group" aria-label="בורר מבט הדמיה">
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1.5 transition-colors cursor-pointer rounded-xs flex items-center gap-1.5 font-bold ${
                    viewMode === '2d'
                      ? 'bg-[#004387] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                  aria-pressed={viewMode === '2d'}
                >
                  <Layers size={13} />
                  <span>2D מבט חזיתי מפורט</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1.5 transition-colors cursor-pointer rounded-xs flex items-center gap-1.5 font-bold ${
                    viewMode === '3d'
                      ? 'bg-[#004387] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                  aria-pressed={viewMode === '3d'}
                >
                  <Box size={13} />
                  <span>3D תלת־ממד אינטראקטיבי</span>
                  <span className="text-[9px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-black">3D</span>
                </button>
              </div>

              <span className="text-xs text-gray-400 font-mono hidden sm:inline">1U = 44.45mm</span>
            </div>
          </div>

          {/* View Container: 3D or 2D */}

          {viewMode === '3d' ? (
            <Cabinet3DErrorBoundary onFallbackTo2D={() => setViewMode('2d')}>
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[480px] bg-slate-950 text-slate-300 space-y-3 border-4 border-slate-700 p-8 text-center">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-mono">טוען מודל תלת־ממדי פרמטרי...</span>
                </div>
              }>
                <Cabinet3DViewer
                  product={product}
                  cabinetData={cabinetData}
                  totalU={totalSlotsU}
                  slots={slots}
                  selectedOptionals={selectedOptionals}
                  nonUAccessories={nonUAccessories}
                  unallocatedItems={unallocatedItems}
                  includedItems={includedItems}
                  availableU={availableU}
                  usedU={usedU}
                  highlightedOptIdx={highlightedOptIdx}
                  lastAddedInstanceId={lastAddedInstanceId}
                  selectedSlotU={addSlotTargetU}
                  previewSpanU={previewAddSlotSpanU}
                  hoveredProduct={hoveredProduct}
                  inspectedProduct={inspectedProduct}
                  selectedInstanceId={inspectedProduct ? (inspectedProduct.instanceId || inspectedProduct.sku) : undefined}
                  onProductHover={(slot) => setHoveredProduct(slot ? buildPreviewFromSlot(slot) : null)}
                  onProductInspect={(slot) => setInspectedProduct(buildPreviewFromSlot(slot))}
                  onSlotClickToAdd={handleSlotAction}
                  onProductMoveRequested={(instanceId, newU) => {
                    const itemToMoveIndex = selectedOptionals.findIndex(o => o.instanceId === instanceId || o.id === instanceId);
                    if (itemToMoveIndex !== -1) {
                      let item = selectedOptionals[itemToMoveIndex];
                      // If it's a 0U PDU being dragged to a front U slot, convert it back to a 1U front item
                      if (item.uSize === 0 && newU !== null && item.zone?.startsWith('rear')) {
                         item = { ...item, uSize: 1, zone: undefined };
                      }
                      const newOptionals = [...selectedOptionals];
                      newOptionals.splice(itemToMoveIndex, 1);
                      setSelectedOptionals(newOptionals);
                      setTimeout(() => {
                        validateAndProcessAdd(item, newU, -1);
                      }, 100);
                    }
                  }}
                  onOpenAuxiliaryModal={() => {
                    setAddSlotTargetU(null);
                    setIsAuxiliaryModalOpen(true);
                  }}
                  onOpenPduModal={() => {
                    setAddSlotTargetU(null);
                    setIsPduModalOpen(true);
                  }}
                  onIncrementQuantity={handleIncrementQuantity}
                  onRemoveOptional={handleRemoveOptional}
                  onFallbackTo2D={() => setViewMode('2d')}
                  onSnapshotReady={(fn) => { snapshot3DRef.current = fn; }}
                />
              </React.Suspense>
            </Cabinet3DErrorBoundary>
          ) : (
            <>
              {/* Quick Tip for Drag & Drop and Floating Popup */}
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-none font-medium">
                <span className="flex items-center gap-1.5">
                  <ZoomIn size={14} className="text-amber-600 shrink-0" />
                  <span>הצבע על מוצר לפתיחת חלון צף | גרור אביזר מ-U ל-U לשינוי מיקום בארון</span>
                </span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 font-mono px-1.5 py-0.5 rounded shrink-0">
                  גרירה וחלון צף פעילים
                </span>
              </div>

              {/* Visual Rack Container */}
              <div className={`relative border-4 bg-slate-950 p-2 sm:p-3 shadow-2xl flex flex-col flex-1 min-h-[580px] max-h-[820px] overflow-hidden transition-all duration-300 ${chassisPulse ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700'}`}>

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
                      onMouseEnter={(e) => {
                        setMousePos({ x: e.clientX, y: e.clientY });
                        setHoveredProduct(preview);
                      }}
                      onMouseMove={(e) => {
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredProduct(null)}
                      onClick={() => setInspectedProduct(preview)}
                      title="לחץ להגדלת תמונה ופרטים"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <RotateCcw className="inline-block animate-spin text-cyan-300 shrink-0" size={13} style={{ animationDuration: "4s" }} />
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

            {/* TOP REAR RAIL ZONE — 0U PDU (פס שקעים מותקן ברלס אחורי עליון) */}
            {rearPduItems.length > 0 ? (
              <div className="mx-3 mb-1.5 rounded border border-amber-500/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-2.5 py-1.5 flex-shrink-0 shadow-md">
                <div className="flex items-center justify-between text-[9px] font-black tracking-wider text-amber-300 uppercase mb-1 border-b border-slate-800 pb-0.5 select-none">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>רלסים אחוריים (Rear Rails) · פסי שקעים</span>
                  </span>
                  <span className="bg-amber-400/20 text-amber-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-amber-500/30">
                    אינם תופסים מקום חזיתי (0U)
                  </span>
                </div>
                {rearPduItems.map((item, i) => {
                  const preview = buildPreviewFromNonU(item, 'rear');
                  const itemPrice = preview.price ? preview.price * preview.quantity : 0;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-slate-100 text-[11px] py-1 hover:bg-slate-800/80 px-1.5 rounded cursor-pointer transition-colors group bg-slate-900/60 border border-slate-800 mb-1 last:mb-0"
                      onMouseEnter={(e) => {
                        setMousePos({ x: e.clientX, y: e.clientY });
                        setHoveredProduct(preview);
                      }}
                      onMouseMove={(e) => {
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredProduct(null)}
                      onClick={() => setInspectedProduct(preview)}
                      title="לחץ להגדלת תמונה ופרטים"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Authentic PDU graphical sockets bar */}
                        <div className="hidden sm:flex items-center gap-0.5 bg-black/60 px-1.5 py-1 rounded border border-slate-700 shrink-0">
                          {/* Rocker switch */}
                          <div className="w-2.5 h-3.5 bg-red-600 rounded-[1px] border border-red-400 flex items-center justify-center text-[5px] text-white font-bold leading-none select-none">
                            I
                          </div>
                          {/* Green protected LED */}
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399] mx-0.5"></div>
                          {/* Sockets */}
                          <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <div key={si} className="w-2 h-2 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center">
                                <div className="w-0.5 h-0.5 rounded-full bg-black"></div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-amber-200 truncate">{preview.name || preview.description}</span>
                          <span className="text-[9px] text-amber-500/80 mr-1 mt-0.5">
                            {item.zone === 'rear-top' ? 'מיקום: עליון' : item.zone === 'rear-middle' ? 'מיקום: אמצעי' : item.zone === 'rear-bottom' ? 'מיקום: תחתון' : 'מיקום: כללי'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {itemPrice > 0 && (
                          <span className="font-mono text-amber-400 font-bold text-xs">
                            ₪{itemPrice.toLocaleString('he-IL')}
                          </span>
                        )}
                        <span className="text-amber-400 group-hover:text-amber-200 transition-colors p-0.5">
                          <ZoomIn size={13} />
                        </span>
                        <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 border border-slate-700 rounded" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleIncrementQuantity(item.optionalIdx)}
                            className="text-amber-300 hover:bg-slate-800 p-0.5 rounded cursor-pointer"
                            title="הוסף 1"
                          >
                            <Plus size={10} />
                          </button>
                          <span className="font-mono text-amber-400 font-bold text-[10px] px-0.5">{preview.quantity}x</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptional(item.optionalIdx)}
                            className="text-red-400 hover:bg-slate-800 p-0.5 rounded cursor-pointer"
                            title="הפחת / הסר"
                          >
                            <Minus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                onClick={() => {
                  setActiveMediumTab('catalog');
                  setMobileDrawerOpen('catalog');
                }}
                className="mx-3 mb-1.5 rounded border border-dashed border-slate-700 bg-slate-950/40 hover:bg-slate-900/60 px-2.5 py-1 flex items-center justify-between text-slate-400 text-[10px] cursor-pointer transition-colors group flex-shrink-0"
                title="לחץ לבחירת פס שקעים מהקטלוג"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-amber-400 transition-colors"></span>
                  <span className="font-medium text-slate-400 group-hover:text-amber-200 transition-colors">
                    רלס אחורי עליון (Rear Rails - Top) — פנוי להתקנת פס שקעים PDU (0U)
                  </span>
                </div>
                <span className="text-amber-400/80 group-hover:text-amber-300 font-bold text-[9px] flex items-center gap-0.5">
                  <Plus size={10} />
                  <span>הוסף פס שקעים</span>
                </span>
              </div>
            )}

            {/* Chassis Interior: Expanded U height with scrollable container */}
            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden space-y-1.5 px-2 sm:px-3 py-1 relative z-0 custom-scrollbar pr-1"
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
                let slotStyles = 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80 text-slate-400 py-1 px-2 border-dashed hover:text-slate-200 hover:border-[#004387] cursor-pointer';
                if (isFan || isFanUpgrade) {
                  slotStyles = 'bg-gradient-to-r from-cyan-950/90 via-slate-900 to-cyan-950/90 border-cyan-500/80 text-cyan-200 py-1 px-2 shadow-md hover:border-cyan-400';
                } else if (isShelf || isShelfUpgrade) {
                  slotStyles = 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-emerald-500/80 text-emerald-200 py-1 px-2 shadow-md hover:border-emerald-400';
                } else if (isBlank) {
                  slotStyles = 'bg-gradient-to-r from-neutral-800 via-neutral-900 to-neutral-800 border-neutral-600/80 text-neutral-300 py-1 px-2 shadow-sm hover:border-neutral-400';
                } else if (isBrush) {
                  slotStyles = 'bg-gradient-to-r from-black via-zinc-900 to-black border-amber-600/70 text-amber-200 py-1 px-2 shadow-sm hover:border-amber-400';
                } else if (isPdu) {
                  slotStyles = 'bg-gradient-to-r from-red-950/90 via-zinc-950 to-red-900 border-red-600/70 text-red-100 py-1 px-2 shadow-md hover:border-red-400';
                } else if (isOptional) {
                  slotStyles = 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border-indigo-600/70 text-indigo-200 py-1 px-2 shadow-sm hover:border-indigo-400';
                }

                const spanU = slot.spanU || 1;
                const isMerged = isOptional && spanU > 1;
                const isNewlyAdded = slot.instanceId === lastAddedInstanceId;
                const isHighlighted = isNewlyAdded || (typeof slot.optionalIdx === 'number' && highlightedOptIdx === slot.optionalIdx);
                const isDragTarget = dragOverU === slot.uIndex;

                const slotKey = slot.instanceId || `slot-${slot.type}-${slot.uIndex}`;
                const isClickableProduct = !isEmpty;
                const slotPreview = isClickableProduct ? buildPreviewFromSlot(slot) : null;
                const slotImage = isClickableProduct ? (getAccessoryImage(slot.accessoryRef) || slot.accessoryRef?.image || (slotPreview?.image ?? '')) : '';

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
                    style={{ minHeight: `${Math.max(48, spanU * 50)}px` }}
                    className={`group text-xs flex items-center justify-between transition-all duration-150 border relative overflow-hidden rounded-xs ${slotStyles} ${
                      isDragTarget ? 'ring-2 ring-emerald-400 bg-emerald-950/95 border-emerald-400 scale-[1.01] z-40 shadow-xl' : ''
                    } ${isHighlighted ? 'ring-2 ring-amber-400 border-amber-400 z-30' : ''}`}
                    draggable={!isEmpty}
                    onDragStart={(e: any) => {
                      e.dataTransfer?.setData('text/plain', slotKey);
                      setDraggedSlot(slot);
                    }}
                    onDragEnd={() => {
                      setDraggedSlot(null);
                      setDragOverU(null);
                    }}
                    onDragOver={(e: any) => {
                      e.preventDefault?.();
                      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                      if (dragOverU !== slot.uIndex) {
                        setDragOverU(slot.uIndex);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverU === slot.uIndex) {
                        setDragOverU(null);
                      }
                    }}
                    onDrop={(e: any) => {
                      e.preventDefault?.();
                      if (draggedSlot) {
                        handleMoveSlotToU(draggedSlot, slot.uIndex);
                        setDraggedSlot(null);
                        setDragOverU(null);
                      }
                    }}
                    onMouseEnter={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                      if (slotPreview) setHoveredProduct(slotPreview);
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredProduct(null);
                    }}
                    onClick={() => {
                      if (isEmpty) {
                        handleSlotAction(slot.uIndex);
                      } else if (slotPreview) {
                        setInspectedProduct(slotPreview);
                        if (isOptional && slot.accessoryRef?.pn) {
                          setHighlightedSku(slot.accessoryRef.pn);
                          setTimeout(() => setHighlightedSku(null), 2000);
                        }
                      }
                    }}
                    title={isClickableProduct ? "גרור כדי להעביר ל-U אחר | לחץ להגדלת תמונה ופרטים" : "חריץ פנוי בארון — לחץ להוספה או שחרר פריט נגרר"}
                  >
                    {/* Position indicator and Drag Handle */}
                    <div className="flex items-center gap-1.5 relative z-20 flex-shrink-0">
                      <div className={`font-mono font-bold text-[10px] tabular-nums bg-slate-800/90 text-slate-300 flex flex-col items-center justify-center rounded border border-slate-700/60 flex-shrink-0 ${isMerged ? 'w-12 py-0.5' : 'w-9 h-6'}`}>
                        {isMerged ? (<><span>{slot.uIndex}-{slot.uIndex - spanU + 1}</span><span className="text-[8px] text-emerald-300 font-bold">{spanU}U</span></>) : `${slot.uIndex}U`}
                      </div>

                      {!isEmpty && (
                        <div 
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-amber-300 transition-colors shrink-0" 
                          title="גרור כדי להעביר ל-U אחר"
                        >
                          <GripVertical size={15} />
                        </div>
                      )}
                    </div>

                    {/* Drag target indicator banner */}
                    {isDragTarget ? (
                      <div className="flex-1 text-center font-bold text-emerald-300 text-xs animate-pulse flex items-center justify-center gap-2 z-20 px-2">
                        <ArrowLeftRight size={14} className="text-emerald-400 shrink-0" />
                        <span className="truncate">שחרר כאן להעברת {draggedSlot?.name || 'פריט'} ל-U{slot.uIndex}</span>
                      </div>
                    ) : (
                      /* Slot Content: High-Resolution Thumbnail + Name & Specifications */
                      <div className="flex-1 flex items-center min-w-0 px-2 z-10">
                        {slotImage ? (
                          <div className="w-13 h-10 sm:w-14 sm:h-11 bg-white rounded border border-slate-700/80 p-0.5 shrink-0 flex items-center justify-center overflow-hidden mr-1.5 shadow-sm">
                            <img 
                              referrerPolicy="no-referrer" 
                              src={slotImage} 
                              alt=""
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
                            />
                          </div>
                        ) : null}

                        {/* Product details & tags */}
                        {isClickableProduct ? (
                          <div className="flex-1 min-w-0 pr-2 pl-1 text-right">
                            <div className="flex items-center gap-2">
                              <p className="font-bold tracking-wide truncate leading-tight text-xs text-slate-100">
                                {slot.name}
                              </p>
                              {slot.accessoryRef?.sku && (
                                <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                  {slot.accessoryRef.sku}
                                </span>
                              )}
                            </div>
                            {slot.description && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-tight">
                                {slot.description}
                              </p>
                            )}
                          </div>
                        ) : (
                          /* Empty slot prompt */
                          <div className="flex-1 text-center text-slate-500 group-hover:text-slate-300 text-[11px] font-medium transition-colors">
                            {draggedSlot ? `🎯 שחרר כאן להעברת ${draggedSlot.name} ל-U${slot.uIndex}` : `+ לחץ להוספת ציוד (U${slot.uIndex})`}
                          </div>
                        )}

                        {/* Schematic graphics for accessories without a photo */}
                        {!slotImage && (isShelf || isShelfUpgrade) && slot.isAnchor !== false && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12 z-0 opacity-40" aria-hidden="true">
                            <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="w-full h-8">
                              <rect x="10" y="10" width="180" height="20" rx="2" fill="#334155" stroke="#475569" strokeWidth="1" />
                              {Array.from({ length: 8 }).map((_, i) => (
                                <rect key={i} x={25 + i * 20} y="15" width="10" height="10" rx="1" fill="#1e293b" />
                              ))}
                            </svg>
                          </div>
                        )}

                        {!slotImage && isBrush && (
                          <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-amber-500/40 tracking-widest pointer-events-none select-none z-0">
                            ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
                          </div>
                        )}

                        {!slotImage && isPdu && (
                          <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-red-400/40 tracking-widest pointer-events-none select-none z-0">
                            [::] [::] [::] [::] [::] [::] [::] [::]
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons inside interactive slots */}
                    <div className="flex items-center gap-1.5 relative z-20 flex-shrink-0 mr-1">
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
                          <ZoomIn size={14} />
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
                              <span className="font-mono text-amber-400 font-bold text-[9px]">{1}x</span>
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
                          <span className="truncate pr-1 flex items-center gap-1"><Layers size={11} className="text-emerald-400 shrink-0" /><span>{item.name || item.description}</span></span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-emerald-400 group-hover:text-amber-300 transition-colors p-0.5"><ZoomIn size={11} /></span>
                            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 border border-slate-700 rounded" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => handleIncrementQuantity(item.optionalIdx)} className="text-amber-300 hover:bg-slate-800 p-0.5 cursor-pointer"><Plus size={9} /></button>
                              <span className="font-mono text-amber-400 font-bold text-[9px]">{1}x</span>
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
                          <span className="truncate pr-1 flex items-center gap-1"><Layers size={11} className="text-emerald-400 shrink-0" /><span>{item.name || item.description}</span></span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-amber-400 group-hover:text-amber-200 transition-colors p-0.5"><ZoomIn size={11} /></span>
                            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 border border-slate-700 rounded" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => handleIncrementQuantity(item.optionalIdx)} className="text-amber-300 hover:bg-slate-800 p-0.5 cursor-pointer"><Plus size={9} /></button>
                              <span className="font-mono text-amber-400 font-bold text-[9px]">{1}x</span>
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
          </>
        )}
        </div>

        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}
        <div className="w-full flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Add Slot Panel (When Active on Desktop - replaces Column 2 content seamlessly) */}
          {isDesktop && (isAddSlotModalOpen || isAuxiliaryModalOpen || isPduModalOpen) ? (
            <div className="w-full h-[600px] sm:h-[680px] lg:h-[740px] flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
              <AddSlotModal
                isOpen={true}
                onClose={() => {
                  setIsAddSlotModalOpen(false);
                  setIsAuxiliaryModalOpen(false);
                  setIsPduModalOpen(false);
                  setAddSlotTargetU(null);
                  setPreviewAddSlotSpanU(1);
                  setGlobalPendingPduItem(null);
                }}
                targetU={addSlotTargetU}
                totalU={totalSlotsU}
                slots={slots}
                availableU={availableU}
                compatibleAccessories={compatibleAccessories}
                onAddAccessoryAtSlot={handleAddOptionalAtSlot}
                onRequestRearrangement={(plan, item) => {
                  setIsAddSlotModalOpen(false);
                  setIsAuxiliaryModalOpen(false);
                  setIsPduModalOpen(false);
                  setAddSlotTargetU(null);
                  setPreviewAddSlotSpanU(1);
                  setGlobalPendingPduItem(null);
                  const currentSignature = computeStateSignature(
                    product?.sku || '',
                    totalSlotsU,
                    selectedOptionals,
                    presetOverrides
                  );
                  setPendingRearrangementPlan({ plan, item, stateSignature: currentSignature });
                }}
                isAuxiliaryMode={isAuxiliaryModalOpen}
                initialSubView={isPduModalOpen ? 'pdu' : isAuxiliaryModalOpen ? 'aux' : 'slots'}
                initialPendingPduItem={globalPendingPduItem}
                mode="desktop-sidebar"
                onHoverProductItem={(uSize) => setPreviewAddSlotSpanU(uSize || 1)}
              />
            </div>
          ) : (
            <>
              {/* Desktop Inspected Product Panel */}
              {isDesktop && inspectedProduct && (
                <div className="bg-white border-2 border-indigo-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                  <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-indigo-900">{inspectedProduct.name}</h3>
                      <div className="flex gap-3 text-xs text-indigo-700/80 mt-1 font-mono">
                        <span>מק"ט: <span dir="ltr" className="inline-block">{inspectedProduct.sku || inspectedProduct.pn}</span></span>
                        <span>{inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U` : '0U'}</span>
                        <span>מיקום: {inspectedProduct.zone || (inspectedProduct.uSize === 0 ? 'אביזר נלווה' : `U${inspectedProduct.minU}-U${inspectedProduct.maxU}`)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inspectedProduct.optionalIdx !== undefined && inspectedProduct.optionalIdx !== null && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMovingInstanceId(inspectedProduct.instanceId || inspectedProduct.sku || null);
                              setInspectedProduct(null);
                            }}
                            className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors cursor-pointer"
                          >
                            הזז ציוד
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveOptional(inspectedProduct.optionalIdx!);
                              setInspectedProduct(null);
                            }}
                            className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors cursor-pointer"
                          >
                            הסר ציוד
                          </button>
                        </>
                      )}
                      <button onClick={() => setInspectedProduct(null)} className="p-1 hover:bg-indigo-200 rounded text-indigo-600 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex p-4 gap-4 bg-white">
                    <div className="w-1/3 shrink-0 flex items-center justify-center border border-slate-100 bg-slate-50 p-2 rounded">
                      {inspectedProduct.image ? (
                        <img src={inspectedProduct.image} alt="" className="max-w-full max-h-40 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="font-mono text-slate-400 text-sm">{inspectedProduct.uSize}U</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="text-sm text-slate-600 leading-relaxed">
                        {inspectedProduct.description || 'ללא תיאור'}
                      </div>
                      {inspectedProduct.price > 0 && (
                        <div className="mt-4 font-bold text-lg text-emerald-700">
                          ₪{inspectedProduct.price.toLocaleString('he-IL')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Column 2: Selected Optionals & Included Items (Middle side) */}
              <div className="flex-1 min-w-0 space-y-6">
                
                {/* Included Items */}
                <div className="bg-gray-50 p-5 border border-gray-200">
                  <h3 className="text-lg font-bold text-[#0c2d57] mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      <span>פריטי אבזור כלולים (חלק מהמארז)</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 rounded-none text-slate-700">ללא עלות נוספת</span>
                  </h3>
                  {includedItems.length > 0 ? (
                    <ul className="space-y-2">
                      {includedItems.map((item, idx) => {
                        const incPreview = getIncludedPreviewItem(item, idx);
                        return (
                          <li 
                            key={idx} 
                            className="flex items-center justify-between border-b border-gray-100/80 pb-2 last:border-none text-gray-800 hover:bg-amber-50/60 p-1.5 rounded transition-colors cursor-pointer group"
                            onMouseEnter={() => setHoveredProduct(incPreview)}
                            onMouseLeave={() => setHoveredProduct(null)}
                            onClick={() => setInspectedProduct(incPreview)}
                            title="לחץ לצפייה במפרט מלא ותמונה מוגדלת"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CheckCircle size={17} className="text-green-500 flex-shrink-0" />
                              <span className="text-sm font-semibold truncate">{item}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0">
                              <span className="text-[11px] font-medium hidden sm:inline">מפרט</span>
                              <Eye size={14} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-gray-500 italic text-sm py-2 bg-slate-100/60 p-3 border border-slate-200/60">
                      ארון זה מגיע ללא אביזרים כלולים מראש (ניתן לבחור אביזרים להרכבה מהקטלוג).
                    </div>
                  )}
                </div>

                {/* Selected Optionals Review Area */}
                <div className="bg-[#e6f0fa]/30 border border-[#b3d4f5] p-5 shadow-sm">
                  <h3 className="text-[15px] font-bold text-[#004387] mb-4 uppercase tracking-wider flex items-center justify-between border-b border-[#b3d4f5] pb-2">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={16} className="text-blue-600" />
                      <span>אביזרים ששדרגתם לארון</span>
                    </span>
                    <span className="bg-[#004387] text-white text-xs px-2.5 py-0.5 rounded-none font-mono">
                      {orderTotals.extraCount} EXTRA
                    </span>
                  </h3>

                  {orderTotals.unplacedCount > 0 && (
                    <div
                      id="unplaced-items-banner"
                      className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-xs"
                      dir="rtl"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-600 shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{orderTotals.unplacedCount} פריטים לא שובצו — פנה מקום או הסר אותם</span>
                      </div>
                      <button
                        type="button"
                        id="btn-remove-unplaced-items"
                        onClick={handleRemoveUnplaced}
                        className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                      >
                        הסר לא משובצים
                      </button>
                    </div>
                  )}
                  
                  <OrderSummaryTable
                    lines={orderLines}
                    totals={orderTotals}
                    withPrice={true}
                    readOnly={false}
                    onIncrement={(sku) => handleIncrementQuantity(sku)}
                    onDecrement={(sku) => handleRemoveOptional(sku, false)}
                    onRemove={(sku) => handleRemoveOptional(sku, true)}
                    onProductHover={(item, e) => {
                      if (e) {
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }
                      setHoveredProduct(item);
                    }}
                    onProductClick={(item) => {
                      setHoveredProduct(null);
                      setInspectedProduct(item);
                    }}
                  />
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
              <div className="flex items-center justify-between mb-3 text-[12px] font-bold text-slate-600">
                <span>נותרו <span className="text-[#004387]">{availableU}U</span> פנויים — מלא עם אביזרים תואמים:</span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState: Record<string, boolean> = {};
                      groupedRubrics.forEach((r: any) => { nextState[r.id] = true; });
                      nextState["illus"] = true;
                      setOpenSections(nextState);
                    }}
                    className="text-[#004387] hover:underline font-bold cursor-pointer"
                  >
                    פתח הכל
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState: Record<string, boolean> = {};
                      groupedRubrics.forEach((r: any) => { nextState[r.id] = false; });
                      nextState["illus"] = false;
                      setOpenSections(nextState);
                    }}
                    className="text-slate-500 hover:underline font-bold cursor-pointer"
                  >
                    סגור הכל
                  </button>
                </div>
              </div>
              {groupedRubrics.map((rubric: GroupedRubric, rIdx: number) =>
                AccordionSection(rubric.id, rubric.title, rubric.items, rubric.tone, rIdx === 0 || !!accSearch, rubric.brandLogo)
              )}
              {_illusPairs.length > 0 && AccordionSection("illus", "תצוגת הדמיה", _illusPairs, "bg-indigo-50 text-indigo-800", !!accSearch)}
              {groupedRubrics.length === 0 && _illusPairs.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 border border-gray-200 rounded-none text-sm">
                  {accSearch ? 'לא נמצאו פריטים התואמים לחיפוש שלך.' : 'אין אביזרים תואמים לארון זה.'}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 px-6 bg-gray-50 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-none leading-relaxed">
              לא נמצאו אביזרי שדרוג נוספים תואמים לבחירה,
              או שקיבולת הארון כבר נוצלה וכל האביזרים מסונכרנים.
            </div>
          )}
        </div>
        </>
      )}
      </div>
      </div>
      {/* WARNING MODAL */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white max-w-md w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200 border-t-4 border-amber-500 rounded-none">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">אזהרת קיבולת / התקנה</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              {warningModalMessage || `הגעת לניצול מלא של נפח הארון (${totalSlotsU}U). לא נותר מספיק מקום פנוי עבור ${pendingAccessory?.name || pendingAccessory?.pn}.`}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                type="button"
                onClick={() => {
                  setWarningModalOpen(false);
                  setPendingAccessory(null);
                  setWarningModalMessage('');
                }}
                className="w-full px-5 py-2.5 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold transition-all text-sm rounded-none shadow-sm"
              >
                הבנתי, סגור
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
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print { display: none !important; }
            @page { size: A4; margin: 12mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        ` }} />
        <div className="bg-white w-full max-w-[794px] mx-auto shadow-2xl print:shadow-none print:max-w-none" onClick={(e) => e.stopPropagation()}>
          <div className="no-print flex items-center justify-between gap-2 p-3 bg-[#0c2d57] text-white print:hidden sticky top-0 z-10">
            <button type="button" onClick={() => setShowPdfPreview(false)} className="no-print flex items-center gap-1 px-3 py-2 bg-white/15 hover:bg-white/25 rounded font-bold text-sm active:scale-95">
              <X size={17} /> סגור
            </button>
            <span className="font-bold text-xs sm:text-sm">תצוגה מקדימה {pdfWithPrice ? '(עם מחירים)' : '(ללא מחירים)'}</span>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={handleShareWhatsApp} 
                disabled={isSharingWhatsApp || isGeneratingPdf}
                className="no-print flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold text-sm active:scale-95 transition-all shadow-sm"
              >
                <MessageCircle size={17} /> {isSharingWhatsApp ? 'משתף...' : 'שלח בוואטסאפ'}
              </button>
              <button 
                type="button" 
                onClick={handleDownloadPdfFile} 
                disabled={isGeneratingPdf || isSharingWhatsApp}
                className="no-print flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold text-sm active:scale-95 transition-all shadow-sm"
              >
                <Download size={17} /> {isGeneratingPdf ? 'מייצר PDF...' : 'הורד PDF'}
              </button>
              <button 
                type="button" 
                onClick={() => { try { window.print(); } catch {} }} 
                className="no-print flex items-center gap-1 px-2.5 py-2 bg-white/15 hover:bg-white/25 rounded font-semibold text-xs active:scale-95 transition-all"
                title="הדפסה ישירה דרך הדפדפן"
              >
                הדפס
              </button>
            </div>
          </div>
          <div id="cabinet-pdf-doc" dir="rtl" className="bg-white text-slate-900 font-sans p-8 max-w-[794px] mx-auto [direction:rtl]">
            {/* 1. Header: RBS Telecom logo (left), title "הצעת תצורה — ארון תקשורת", today's date (he-IL), cabinet name + SKU */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #004387', paddingBottom: '12px', marginBottom: '16px', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0c2d57' }}>הצעת תצורה — ארון תקשורת</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{new Date().toLocaleDateString('he-IL')}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  <span>{product?.name || cabinetData?.model || 'ארון תקשורת'}</span>
                  {product?.sku && <span style={{ marginRight: '8px', color: '#64748b', fontWeight: 500 }}>(מק״ט: {product.sku})</span>}
                </div>
              </div>
              <img 
                src="https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png" 
                alt="RBS Telecom" 
                style={{ height: '42px', objectFit: 'contain' }} 
              />
            </div>

            {/* 2. Cabinet section, two columns */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
              {/* Right: the 3D snapshot <img src={pdfSnapshot}> (max-height 300px, object-contain). If pdfSnapshot is null, show the existing 2D U-map instead */}
              <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                {pdfSnapshot ? (
                  <img
                    src={pdfSnapshot}
                    alt="3D Cabinet Snapshot"
                    style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc', padding: '4px' }}
                  />
                ) : (
                  slots.length > 0 && (
                    <div style={{ border: '3px solid #0c2d57', width: '100%', maxWidth: '320px', margin: '0 auto', borderRadius: '4px', overflow: 'hidden', background: '#0f172a', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
                      {roofItems.length > 0 && (
                        <div style={{ background: '#e0f2fe', borderBottom: '1px solid #94a3b8', padding: '3px 6px', fontSize: '9.5px', textAlign: 'center', fontWeight: 700, color: '#075985' }}>
                          ▲ תקרה: {roofItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                        </div>
                      )}
                      {slots.slice().sort((a, b) => b.uIndex - a.uIndex).map((s) => {
                        const occupied = s.type !== 'empty';
                        const isOpt = s.type === 'optional-accessory';
                        const isCont2 = isOpt && s.isAnchor === false;
                        const isShelfItem = /מדף|shelf/.test(`${s.name || ''} ${s.description || ''}`);
                        const img = (s.accessoryRef && s.accessoryRef.image) || '';
                        const rowH = isOpt ? 32 : (occupied ? 18 : 13);
                        const bg = !occupied ? '#0f172a' : (isOpt ? '#1e3a8a' : '#334155');
                        if (isCont2) return null;
                        return (
                          <div key={s.uIndex} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', minHeight: isOpt && s.spanU && s.spanU > 1 ? `${s.spanU * 32}px` : `${rowH}px`, background: bg, position: 'relative', overflow: 'hidden' } as any}>
                            <div style={{ width: '26px', textAlign: 'center', fontWeight: 700, fontSize: '8px', color: '#cbd5e1', borderLeft: '1px solid #1e293b', flexShrink: 0, position: 'relative', zIndex: 2 }}>{s.spanU && s.spanU > 1 ? `${s.uIndex}-${s.uIndex - s.spanU + 1}` : s.uIndex}</div>
                            {isOpt && img && !isShelfItem && (
                              <img src={img} referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.92 } as any} onError={(e: any) => { e.currentTarget.style.display = 'none'; }} />
                            )}
                            {isOpt && isShelfItem && (
                              <div style={{ position: 'absolute', left: '26px', right: '4px', top: '20%', bottom: '20%', background: 'linear-gradient(#64748b,#334155)', border: '1px solid #0f172a', borderRadius: '2px' } as any}></div>
                            )}
                            <div style={{ flex: 1, padding: '1px 6px', fontSize: '8.5px', color: occupied ? '#fff' : '#64748b', fontWeight: occupied ? 700 : 400, position: 'relative', zIndex: 2, textShadow: (isOpt && img) ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' } as any}>{!occupied ? '—' : (s.name + ((s.spanU && s.spanU > 1) ? `  (${s.spanU}U)` : ''))}</div>
                          </div>
                        );
                      })}
                      {plinthItems.length > 0 && (
                        <div style={{ background: '#f1f5f9', borderTop: '1px solid #94a3b8', padding: '3px 6px', fontSize: '9.5px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                          ▼ בסיס: {plinthItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                        </div>
                      )}
                      {verticalItems.length > 0 && (
                        <div style={{ background: '#fef2f2', borderTop: '1px solid #fca5a5', padding: '3px 6px', fontSize: '9.5px', textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>
                          ◄ ורטיקלי / צדי: {verticalItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                        </div>
                      )}
                      {hardwareItems.length > 0 && (
                        <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '3px 6px', fontSize: '9.5px', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>
                          ◄ חומרה וברגים: {hardwareItems.map((r: any) => `${r.description || r.name} ×${r.quantity}`).join(' · ')}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Left: spec card with rows: U, מידות (רוחב×עומק), דלת קדמית, דלת אחורית, מאווררים, גלגלים/רגליות, and the "כלול בארון" items as a compact checklist (✓ per item) */}
              <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <div className="border border-slate-300 rounded-md bg-slate-50 text-[12px] p-2.5">
                  <div className="text-sm font-bold uppercase tracking-wide text-[#0c2d57] border-b-2 border-[#c2410c] pb-1 mb-2">
                    מפרט ארון
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, width: '35%', color: '#334155' }}>U</td>
                        <td style={{ padding: '4px 6px', color: '#0f172a' }}>{totalU}U</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: '#334155' }}>מידות (רוחב×עומק)</td>
                        <td style={{ padding: '4px 6px', color: '#0f172a' }}>
                          {cabinetData?.width && cabinetData?.depth ? `${cabinetData.width} × ${cabinetData.depth} מ״מ` : '—'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: '#334155' }}>דלת קדמית</td>
                        <td style={{ padding: '4px 6px', color: '#0f172a' }}>{cabinetData?.frontDoor || 'דלת זכוכית מחוסמת / פלדה'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: '#334155' }}>דלת אחורית</td>
                        <td style={{ padding: '4px 6px', color: '#0f172a' }}>{cabinetData?.rearDoor || 'דלת פלדה / גב תלייה'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: '#334155' }}>מאווררים</td>
                        <td style={{ padding: '4px 6px', color: '#0f172a' }}>{cabinetData?.fans || 'יחידת אוורור בגג הארון'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: '#334155' }}>גלגלים/רגליות</td>
                        <td style={{ padding: '4px 6px', color: '#0f172a' }}>
                          {[
                            cabinetData?.wheels && `גלגלים: ${cabinetData.wheels}`,
                            cabinetData?.levelingFeet && `רגליות: ${cabinetData.levelingFeet}`
                          ].filter(Boolean).join(' · ') || '4 גלגלים + 4 רגליות פילוס'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {includedItems && includedItems.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#0c2d57', marginBottom: '3px' }}>כלול בארון:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#334155' }}>
                        {includedItems.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.25' }}>
                            <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Section BOM, then clean styled BOM table */}
            <div style={{ marginBottom: '16px' }}>
              <div className="text-sm font-bold uppercase tracking-wide text-[#0c2d57] border-b-2 border-[#c2410c] pb-1 mb-2">
                ציוד שנוסף (BOM)
              </div>
              {orderLines.length === 0 ? (
                <div className="py-3 text-center text-slate-500 text-[12px] italic bg-slate-50 border border-slate-300 rounded-md">
                  לא נבחרו אביזרים נוספים
                </div>
              ) : (
                <div className="border border-slate-300 rounded-md overflow-hidden bg-white">
                  <table className="w-full text-right border-collapse text-[12px]" dir="rtl">
                    <thead>
                      <tr className="bg-[#0c2d57] text-white">
                        <th className="py-1.5 px-2.5 text-right font-bold">מוצר</th>
                        <th className="py-1.5 px-2.5 text-right font-bold">מק״ט</th>
                        <th className="py-1.5 px-2.5 text-center font-bold">כמות</th>
                        <th className="py-1.5 px-2.5 text-right font-bold">מיקום</th>
                        {pdfWithPrice && <th className="py-1.5 px-2.5 text-left font-bold tabular-nums">מחיר יח׳</th>}
                        {pdfWithPrice && <th className="py-1.5 px-2.5 text-left font-bold tabular-nums">סה״כ</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {orderLines.map((line, idx) => {
                        const isUnplaced = line.status === 'unplaced';
                        return (
                          <tr
                            key={line.sku || idx}
                            className={`border-b ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} ${
                              isUnplaced ? 'bg-red-50 text-red-950' : 'text-slate-800'
                            }`}
                          >
                            <td className="py-1.5 px-2.5 font-medium text-slate-900 leading-tight">
                              {line.name}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap" dir="ltr">
                              {line.sku}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-800 tabular-nums">
                              {line.qty}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap">
                              {isUnplaced ? (
                                <span className="text-red-700 font-semibold text-[11px]">
                                  לא שובץ
                                </span>
                              ) : (
                                <span className="font-mono text-[11px] font-medium text-slate-700">
                                  {line.positions.join(', ')}
                                </span>
                              )}
                            </td>
                            {pdfWithPrice && (
                              <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap tabular-nums text-left" dir="ltr">
                                ₪{line.unitPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                              </td>
                            )}
                            {pdfWithPrice && (
                              <td className="py-1.5 px-2.5 font-mono text-[11px] font-bold text-[#0c2d57] whitespace-nowrap tabular-nums text-left" dir="ltr">
                                ₪{line.lineTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. Totals box, right-aligned, rendered only when pdfWithPrice is true */}
            {pdfWithPrice && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-start' }}>
                <div className="w-[280px] border border-slate-300 rounded-md bg-slate-50 p-3 text-[12px]">
                  <div className="text-sm font-bold uppercase tracking-wide text-[#0c2d57] border-b-2 border-[#c2410c] pb-1 mb-2">
                    סיכום עלויות
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
                    <span>ארון:</span>
                    <span className="font-mono font-semibold tabular-nums text-left" dir="ltr">₪{orderTotals.cabinetPrice.toLocaleString('he-IL')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
                    <span>אביזרים:</span>
                    <span className="font-mono font-semibold tabular-nums text-left" dir="ltr">₪{orderTotals.accessoriesTotal.toLocaleString('he-IL')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', paddingTop: '4px', borderTop: '1px solid #e2e8f0', fontWeight: 700, color: '#1e293b' }}>
                    <span>סה"כ לפני מע"מ:</span>
                    <span className="font-mono tabular-nums text-left" dir="ltr">₪{orderTotals.grandTotal.toLocaleString('he-IL')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
                    <span>מע"מ 18%:</span>
                    <span className="font-mono font-semibold tabular-nums text-left" dir="ltr">₪{Math.round(orderTotals.grandTotal * 0.18).toLocaleString('he-IL')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '2px solid #004387', fontWeight: 800, fontSize: '13px', color: '#0c2d57' }}>
                    <span>סה"כ כולל מע"מ:</span>
                    <span className="font-mono tabular-nums text-left" dir="ltr">₪{(orderTotals.grandTotal + Math.round(orderTotals.grandTotal * 0.18)).toLocaleString('he-IL')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Footer */}
            <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
              המחירים בש״ח לפני מע״מ, תקפים ל-14 יום · rbs-telecom.com
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Universal Product Inspection Popup Modal (חלון פופאפ מפרט מוצר) */}
      <AnimatePresence>
        {!isDesktop && inspectedProduct && (
          <div 
            className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            onClick={() => setInspectedProduct(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspected-product-title"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded font-mono">
                      {inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U` : '0U מובנה'}
                    </span>
                    {inspectedProduct.sku && (
                      <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        מק"ט: {inspectedProduct.sku}
                      </span>
                    )}
                    {inspectedProduct.isPreset && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                        כלול בארון
                      </span>
                    )}
                  </div>
                  <h3 id="inspected-product-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                    {inspectedProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedProduct(null)}
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="סגור חלון"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  {/* Large Product Image Container */}
                  <div className="w-full sm:w-48 h-48 sm:h-44 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-3 shrink-0 shadow-inner">
                    {inspectedProduct.image ? (
                      <img
                        src={inspectedProduct.image}
                        alt={inspectedProduct.name}
                        className="w-full h-full object-contain filter drop-shadow-sm"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 rounded p-2 text-center">
                        <Box size={32} className="text-slate-400 mb-1" />
                        <span className="font-mono text-xs font-bold text-slate-700">{inspectedProduct.sku || 'N/A'}</span>
                        <span className="text-[10px] text-slate-500">{inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U חומרה` : 'ציוד היקפי'}</span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-2.5 text-sm text-slate-700 w-full">
                    {/* Location in Rack */}
                    <div className="bg-slate-100/80 p-2.5 rounded border border-slate-200/80 flex items-start gap-2">
                      <span className="text-slate-500 font-semibold text-xs shrink-0">מיקום בארון:</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {inspectedProduct.zone || (inspectedProduct.uSize > 0 ? `מסילות U חזיתיות (${inspectedProduct.uSize}U)` : 'שלד הארון')}
                      </span>
                    </div>

                    {/* Price & Quantity */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">מחיר ליחידה: </span>
                        {inspectedProduct.price ? (
                          <span className="font-bold text-emerald-700 text-sm">₪{inspectedProduct.price.toLocaleString('he-IL')}</span>
                        ) : (
                          <span className="font-bold text-emerald-600">כלול במפרט הארון (ללא תוספת תשלום)</span>
                        )}
                      </div>
                      {inspectedProduct.quantity && inspectedProduct.quantity > 1 && (
                        <span className="font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                          כמות: {inspectedProduct.quantity}
                        </span>
                      )}
                    </div>

                    {/* Technical Description */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800">תיאור ומפרט טכני:</span>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-2.5 rounded border border-slate-100">
                        {inspectedProduct.description || 'מוצר מקורי תואם מסד תקשורת 19 אינץ׳.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info size={14} className="text-slate-400" />
                  <span>לחץ במקום כלשהו או ESC לסגירה</span>
                </div>
                <div className="flex items-center gap-2">
                  {inspectedProduct.optionalIdx !== undefined && inspectedProduct.optionalIdx !== null && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMovingInstanceId(inspectedProduct.instanceId || inspectedProduct.sku || null);
                          setInspectedProduct(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                      >
                        הזז / שנה מיקום
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleRemoveOptional(inspectedProduct.optionalIdx!);
                          setInspectedProduct(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors cursor-pointer"
                      >
                        הסר מסל הארון
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectedProduct(null)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#004387] hover:bg-[#003366] rounded transition-colors cursor-pointer shadow-xs"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal / Drawer (Add Slot / Auxiliary / PDU) - Mobile only */}
      {!isDesktop && (
        <AddSlotModal
          isOpen={isAddSlotModalOpen || isAuxiliaryModalOpen || isPduModalOpen}
          onClose={() => {
            setIsAddSlotModalOpen(false);
            setIsAuxiliaryModalOpen(false);
            setIsPduModalOpen(false);
            setAddSlotTargetU(null);
            setPreviewAddSlotSpanU(1);
            setGlobalPendingPduItem(null);
          }}
          targetU={addSlotTargetU}
          totalU={totalSlotsU}
          slots={slots}
          availableU={availableU}
          compatibleAccessories={compatibleAccessories}
          onAddAccessoryAtSlot={handleAddOptionalAtSlot}
          onRequestRearrangement={(plan, item) => {
            setIsAddSlotModalOpen(false);
            setIsAuxiliaryModalOpen(false);
            setIsPduModalOpen(false);
            setAddSlotTargetU(null);
            setPreviewAddSlotSpanU(1);
            setGlobalPendingPduItem(null);
            const currentSignature = computeStateSignature(
              product?.sku || '',
              totalSlotsU,
              selectedOptionals,
              presetOverrides
            );
            setPendingRearrangementPlan({ plan, item, stateSignature: currentSignature });
          }}
          isAuxiliaryMode={isAuxiliaryModalOpen}
          initialSubView={isPduModalOpen ? 'pdu' : isAuxiliaryModalOpen ? 'aux' : 'slots'}
          initialPendingPduItem={globalPendingPduItem}
          mode="mobile-drawer"
          onHoverProductItem={(uSize) => setPreviewAddSlotSpanU(uSize || 1)}
        />
      )}

      {/* Rearrangement Approval Modal */}
      {pendingRearrangementPlan && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white max-w-lg w-full p-6 text-right shadow-2xl border-t-4 border-[#fe8d00] rounded-none">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 border border-amber-200 rounded-full flex items-center justify-center shrink-0">
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">הצעת סידור מחדש של הארון</h3>
                <p className="text-xs text-slate-500">קיים מספיק מקום פנוי כולל, אך נדרשת הזזת פריטים קיימים ליצירת רצף</p>
              </div>
            </div>

            <div className="mb-4 bg-amber-50/70 border border-amber-200 p-3.5 rounded text-sm text-amber-900">
              <p className="font-bold mb-1">
                התקנת {pendingRearrangementPlan.item.name || pendingRearrangementPlan.item.description || pendingRearrangementPlan.item.pn} ({pendingRearrangementPlan.item.uSize || 1}U):
              </p>
              <p className="text-xs text-amber-800">
                הפריט יותקן במיקום <strong>U{pendingRearrangementPlan.plan.targetU}</strong>. כדי לפנות רצף זה, יבוצעו ההזזות הבאות:
              </p>
            </div>

            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {pendingRearrangementPlan.plan.moves.map((move, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 border border-slate-200 rounded">
                  <span className="font-bold text-slate-800">{move.name || move.sku}</span>
                  <div className="flex items-center gap-2 font-mono" dir="ltr">
                    <span className="text-slate-500 line-through">U{move.fromU}</span>
                    <span className="text-amber-600 font-bold">→</span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">U{move.toU}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingRearrangementPlan(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmRearrangement}
                className="px-5 py-2 text-xs font-bold bg-[#004387] hover:bg-[#fe8d00] text-white rounded transition-colors flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 size={15} />
                <span>אשר סידור מחדש והוסף</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING HOVER POPUP (חלון צף לפרטי מוצר ומפרט מוגדל בעת הצבעה) */}
      <AnimatePresence>
        {hoveredProduct && (mousePos.x > 0 || mousePos.y > 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[99999] pointer-events-none select-none shadow-2xl"
            style={{
              left: `${mousePos.x + 24 + 320 > window.innerWidth ? Math.max(12, mousePos.x - 336) : mousePos.x + 24}px`,
              top: `${Math.max(12, Math.min(window.innerHeight - 380, mousePos.y - 30))}px`,
              width: '320px',
            }}
            dir="rtl"
          >
            <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/90 shadow-2xl rounded-lg p-3.5 space-y-2.5 ring-1 ring-white/10">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-amber-300 leading-tight truncate">
                    {hoveredProduct.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 font-mono">
                    {hoveredProduct.sku && (
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-200">
                        מק"ט: {hoveredProduct.sku}
                      </span>
                    )}
                    <span className="bg-[#004387] text-white px-1.5 py-0.5 rounded font-bold">
                      {hoveredProduct.uSize > 0 ? `${hoveredProduct.uSize}U` : '0U (ללא תפיסת U)'}
                    </span>
                  </div>
                </div>
                <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded shrink-0">
                  <Info size={16} />
                </div>
              </div>

              {/* High-Resolution Image */}
              {hoveredProduct.image ? (
                <div className="w-full h-36 bg-white rounded flex items-center justify-center p-2 border border-slate-700 overflow-hidden shadow-inner">
                  <img
                    src={hoveredProduct.image}
                    alt={hoveredProduct.name}
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="w-full h-24 bg-slate-800/80 rounded flex flex-col items-center justify-center text-slate-400 p-2 border border-slate-700 font-mono text-xs">
                  <Box size={28} className="mb-1 text-slate-500" />
                  <span>הדמיה סכמטית 19 אינץ'</span>
                </div>
              )}

              {/* Description */}
              {hoveredProduct.description && (
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {hoveredProduct.description}
                </p>
              )}

              {/* Location / Zone & Price */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800">
                <span className="truncate">
                  📍 {hoveredProduct.zone || 'מסילות ארון 19"'}
                </span>
                {hoveredProduct.price > 0 && (
                  <span className="font-bold text-amber-400 font-mono text-xs shrink-0">
                    ₪{Number(hoveredProduct.price).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Drag & drop or action hint */}
              <div className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/60 rounded px-2 py-1 text-center flex items-center justify-center gap-1.5">
                <span>💡 ניתן לגרור אביזר זה מ-U ל-U או להקליק להגדלה</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Notification Banner */}
      <AnimatePresence>
        {undoState && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[260] bg-slate-900 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-4 border border-slate-700"
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="text-sm font-medium">{undoState.message}</span>
            </div>
            <button
              type="button"
              onClick={handleUndoLastAction}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>בטל שינויים</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoState(null)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
