import React, { useState, useEffect } from 'react';
import { Server, Loader2, ExternalLink, ShoppingCart, CheckCircle2, BadgePercent, ArrowUpRight, HelpCircle, AlertCircle, Sparkles } from 'lucide-react';
import { CabinetConfigurator } from './CabinetConfigurator';
import * as XLSX from 'xlsx';

// Image helpers (must match local app definitions)
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = 'https://placehold.co/600x400/f3f4f6/a3a3a3?text=RBS+Telecom';
};

const transformImageLink = (url: string, size?: number) => {
  if (!url) return url;
  try {
    const trimmedUrl = url.trim();
    if (trimmedUrl.includes('drive.google.com/drive/folders/')) {
      return 'https://placehold.co/600x400/f3f4f6/000000?text=Drive+Folder';
    }

    let fileId = null;
    if (trimmedUrl.includes('drive.google.com/file/d/')) {
      const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    } else if (trimmedUrl.includes('id=')) {
      const match = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    } else if (trimmedUrl.includes('lh3.googleusercontent.com/d/')) {
      const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }

    if (fileId) {
      const validSize = (typeof size === 'number' && size > 10) ? size : 400;
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${validSize}`;
    }

    return trimmedUrl;
  } catch(e) { }
  return url;
};

interface CabinetSpec {
  u: string;
  fans: string;
  wheels: string;
  levelingFeet: string;
  shelvesQty: string;
}

interface AccessoryCabinetsProps {
  product: any;
  catalogData: any[];
  ProductCard: React.FC<any>;
  navigateToProduct?: (product: any) => void;
  addToCart?: (product: any, quantity?: number, optionals?: any[]) => void;
}

export const AccessoryCabinets: React.FC<AccessoryCabinetsProps> = ({ 
  product, 
  catalogData, 
  ProductCard,
  navigateToProduct,
  addToCart
}) => {
  const [loading, setLoading] = useState(true);
  const [compatibleCabinets, setCompatibleCabinets] = useState<any[]>([]);
  const [addedItemSinks, setAddedItemSinks] = useState<Record<string, boolean>>({});
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>('');
  const [bundleAdded, setBundleAdded] = useState(false);
  const [configuredOptionals, setConfiguredOptionals] = useState<any[]>([]);

  const handleConfiguredOptionalsChange = React.useCallback((optionals: any[]) => {
    setConfiguredOptionals(optionals);
  }, []);

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        setLoading(true);
        const MAIN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs/export?format=xlsx';
        const res = await fetch(MAIN_SHEET_URL);
        const buffer = await res.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });

        const cabinetsSheetName = wb.SheetNames.find(n => n.includes('ארונות')) || 'טבלת ארונות מעודכנת';

        if (!wb.Sheets[cabinetsSheetName]) {
           console.error('[AccessoryCabinets] Sheet not found:', cabinetsSheetName);
           setLoading(false);
           return;
        }

        const normalizeSku = (val: any): string => String(val ?? '').trim().toUpperCase();
        const productSkuNorm = normalizeSku(product.sku);

        const cabRows = XLSX.utils.sheet_to_json(wb.Sheets[cabinetsSheetName], { header: 1 }) as any[][];
        
        const compatibleSkus = new Set<string>();
        const specsMap = new Map<string, CabinetSpec>();

        // Start from row 2 (skipping header rows)
        for (let i = 2; i < cabRows.length; i++) {
           const row = cabRows[i];
           if (!row) continue;
           
           const cabSku = row[0];
           if (cabSku === undefined || cabSku === null) continue;

           const suitableStandard = row[12]?.toString() || '';
           const suitableHanging = row[13]?.toString() || '';
           const suitableSliding = row[14]?.toString() || '';

           const allSuitable = [
               ...suitableStandard.split(','),
               ...suitableHanging.split(','),
               ...suitableSliding.split(',')
           ].map(s => normalizeSku(s)).filter(s => s && s !== 'X');

           if (allSuitable.includes(productSkuNorm)) {
               const normalizedUnit = normalizeSku(cabSku);
               compatibleSkus.add(normalizedUnit);
               specsMap.set(normalizedUnit, {
                  u: row[2]?.toString() || 'N/A',
                  fans: row[8]?.toString() || 'X',
                  wheels: row[9]?.toString() || 'X',
                  levelingFeet: row[10]?.toString() || 'X',
                  shelvesQty: row[11]?.toString() || '0'
               });
           }
        }

        const matchedCabinets = catalogData
          .filter(p => compatibleSkus.has(normalizeSku(p.sku)))
          .map(cab => {
             const key = normalizeSku(cab.sku);
             return {
               ...cab,
               specDetails: specsMap.get(key) || null
             };
          });

        setCompatibleCabinets(matchedCabinets);
        if (matchedCabinets.length > 0) {
          setSelectedCabinetId(matchedCabinets[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching compatible cabinets:", error);
        setLoading(false);
      }
    };

    if (product) {
       fetchAndParse();
    }
  }, [product, catalogData]);

  const handleBuyTogether = (cabinet: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!addToCart) return;

    // Add cabinet with current accessory in its options!
    addToCart(cabinet, 1, [product]);
    
    // Trigger success feedback
    setAddedItemSinks(prev => ({ ...prev, [cabinet.id]: true }));
    setTimeout(() => {
      setAddedItemSinks(prev => ({ ...prev, [cabinet.id]: false }));
    }, 2000);
  };

  const handleBuyActiveBundle = () => {
    const activeCabinet = compatibleCabinets.find(c => c.id === selectedCabinetId);
    if (!activeCabinet || !addToCart) return;

    addToCart(activeCabinet, 1, [product]);

    setBundleAdded(true);
    setTimeout(() => {
      setBundleAdded(false);
    }, 2000);
  };

  const handleBuyConfiguredBundle = () => {
    const activeCabinet = compatibleCabinets.find(c => c.id === selectedCabinetId) || compatibleCabinets[0];
    if (!activeCabinet || !addToCart) return;

    addToCart(activeCabinet, 1, configuredOptionals);

    setBundleAdded(true);
    setTimeout(() => {
      setBundleAdded(false);
    }, 2500);
  };

  const handleGoToCabinet = (cabinet: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigateToProduct) {
      navigateToProduct(cabinet);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 bg-gray-50 border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[160px]" dir="rtl">
         <Loader2 className="animate-spin text-[#004387] mb-2" size={28} />
         <p className="text-gray-500 text-sm font-semibold">סורק תאימות ומאפייני ארונות רלוונטיים עבורכם...</p>
      </div>
    );
  }

  if (compatibleCabinets.length === 0) {
      return null;
  }

  const activeCabinetForBundle = compatibleCabinets.find(c => c.id === selectedCabinetId) || compatibleCabinets[0];

  return (
    <div className="mb-6 bg-gradient-to-br from-[#f8fbff] to-[#f0f6ff] border-2 border-[#b3d4f5] p-5 sm:p-6 shadow-sm rounded-none" dir="rtl">
      
      {/* Visual Badge + Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d1e5fa] pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#004387] p-2 text-white">
            <Server size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#004387] leading-tight">
              תאימות מובטחת למסדים וארונות תקשורת
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              האביזר <strong>{product.name}</strong> ({product.sku}) נמצא תואם לחלוטין להתקנה במספר דגמי ארונות.
            </p>
          </div>
        </div>
        
        <div className="bg-[#fe8d00]/10 border border-[#fe8d00]/30 text-[#e07500] px-3 py-1 text-xs font-bold self-start sm:self-auto flex items-center gap-1">
          <BadgePercent size={15} />
          <span>מומלץ: רכשו יחד כחבילה אחת!</span>
        </div>
      </div>

      {/* NEW: Interactive Combined Bundle Showcase Cockpit Widget */}
      {activeCabinetForBundle && (
        <div className="mb-6 bg-white border-2 border-[#fe8d00] p-4 p-5 shadow-md relative overflow-hidden transition-all duration-300">
          {/* Subtle neon connection glow background */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#004387] via-[#fe8d00] to-[#004387]" />
          
          <div className="text-[13px] font-extrabold text-[#fe8d00] flex items-center gap-1.5 uppercase mb-3.5 tracking-wider">
            <Sparkles size={16} className="text-[#fe8d00] fill-[#fe8d00]" />
            <span>סייען הרכבה מהיר: חבילה משולבת מומלצת להתקנה פיזית</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
            {/* Accessory description */}
            <div className="md:col-span-2 flex items-center gap-3 bg-slate-50/50 p-2.5 border border-slate-100">
              <div className="w-12 h-12 bg-white flex-shrink-0 flex items-center justify-center border p-1">
                <img 
                  referrerPolicy="no-referrer"
                  src={transformImageLink(product.images?.[0] || '', 80)} 
                  alt={product.name} 
                  onError={handleImageError}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-[#fe8d00] font-black uppercase">אביזר שבחרתם:</div>
                <h4 className="text-xs font-extrabold text-[#0c2d57] truncate" title={product.name}>{product.name}</h4>
                <div className="text-xs font-bold font-mono text-slate-800">₪{product.price?.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Connecting visual link */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-400 font-mono">LINKED</span>
              <div className="w-8 h-8 rounded-full bg-[#fe8d00]/10 text-[#fe8d00] flex items-center justify-center font-bold border border-[#fe8d00]/40 my-1 animate-bounce">
                +
              </div>
            </div>

            {/* Cabinet description */}
            <div className="md:col-span-2 flex items-center gap-3 bg-[#e6f0fa]/30 p-2.5 border border-[#b3d4f5]/30">
              <div className="w-12 h-12 bg-white flex-shrink-0 flex items-center justify-center border p-1">
                <img 
                  referrerPolicy="no-referrer"
                  src={transformImageLink(activeCabinetForBundle.images?.[0] || '', 80)} 
                  alt={activeCabinetForBundle.name} 
                  onError={handleImageError}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-[#004387] font-black uppercase">ארון מותאם לפריט:</div>
                <h4 className="text-xs font-extrabold text-[#0c2d57] truncate" title={activeCabinetForBundle.name}>{activeCabinetForBundle.name}</h4>
                <div className="text-xs font-bold font-mono text-slate-800">₪{activeCabinetForBundle.price?.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Total Combined Action button block */}
            <div className="md:col-span-2 flex flex-col justify-center border-t md:border-t-0 md:border-r border-gray-100 md:pr-4 pt-3 md:pt-0">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-semibold text-gray-500">מחיר משולב:</span>
                <span className="text-lg font-black text-[#fe8d00] font-mono">
                  ₪{((product.price || 0) + (activeCabinetForBundle.price || 0)).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[8px] text-gray-400 font-normal mr-1">(ללא מע"מ)</span>
              </div>
              
              <button
                type="button"
                onClick={handleBuyActiveBundle}
                className={`w-full py-2.5 px-4 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md rounded-none cursor-pointer
                  ${bundleAdded 
                    ? 'bg-green-600 text-white shadow-inner' 
                    : 'bg-[#fe8d00] hover:bg-[#004387] text-white hover:shadow-lg'
                  }`}
              >
                <ShoppingCart size={14} className={bundleAdded ? 'animate-ping' : ''} />
                {bundleAdded ? 'החבילה נוספה לסל ביחד! ✓' : 'הוסף ארון + אביזר זה כחבילה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid view of Compatible Cabinets */}
      <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2.5 justify-start">
        <span>🔎 לחצו על ארון כלשהו ברשימה כדי להרכיב ולצפות בחבילה המשולבת שלו:</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {compatibleCabinets.map(cabinet => {
          const spec = cabinet.specDetails;
          const isAdded = !!addedItemSinks[cabinet.id];
          const isCurrentlySelected = selectedCabinetId === cabinet.id;
          
          return (
            <div 
              key={cabinet.id} 
              onClick={() => setSelectedCabinetId(cabinet.id)}
              className={`flex flex-col bg-white border transition-all duration-200 hover:shadow-md cursor-pointer group text-right relative overflow-hidden flex-1
                ${isCurrentlySelected 
                  ? 'border-2 border-[#fe8d00] shadow-md ring-2 ring-[#fe8d00]/10 bg-gradient-to-b from-amber-50/5 to-white' 
                  : 'border-gray-200 hover:border-[#004387]'
                }`}
            >
              {/* Highlight ribbon representing active/selected states */}
              <div className={`absolute top-0 right-0 left-0 h-1 transition-colors
                ${isCurrentlySelected 
                  ? 'bg-gradient-to-r from-[#fe8d00] to-[#004387]' 
                  : 'bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-400 group-hover:from-[#004387] group-hover:to-[#fe8d00]'
                }`} 
              />

              {/* Upper Section */}
              <div className="p-4 flex gap-3 flex-1">
                {/* Thumb */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center p-1.5 overflow-hidden">
                  <img 
                    referrerPolicy="no-referrer"
                    src={transformImageLink(cabinet.images?.[0] || '', 160)} 
                    alt={cabinet.name} 
                    onError={handleImageError}
                    className="max-w-full max-h-full object-contain mix-blend-multiply"
                  />
                </div>

                {/* Brand, name, pricing */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tight truncate">
                        מק"ט: {cabinet.sku}
                      </span>
                      {isCurrentlySelected ? (
                        <span className="text-[9px] font-black bg-[#fe8d00] text-white px-1.5 rounded uppercase font-mono tracking-wider">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold bg-[#004387]/10 text-[#004387] px-1 rounded">
                          {cabinet.brand || 'RBS'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#0c2d57] leading-tight line-clamp-2 group-hover:text-[#004387] transition-colors">
                      {cabinet.name}
                    </h4>
                  </div>

                  <div className="mt-2 flex items-baseline justify-end gap-1">
                    <span className="text-xs text-gray-500 font-medium">מתקין:</span>
                    <span className="text-sm sm:text-base font-extrabold text-[#fe8d00]">
                      ₪{cabinet.price?.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] text-gray-400 font-normal">(ללא מע"מ)</span>
                  </div>
                </div>
              </div>

              {/* Specs Badges Section */}
              {spec && (
                <div className="bg-gray-50/70 border-t border-b border-gray-100 px-4 py-2 flex flex-wrap gap-1.5 text-[10px] sm:text-xs font-bold text-gray-600">
                  <span className="bg-blue-50 text-[#004387] px-2 py-0.5 border border-blue-100/40">
                    📐 {spec.u} קיבולת
                  </span>
                  {spec.shelvesQty !== '0' && spec.shelvesQty !== 'X' && (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100/40">
                      📼 {spec.shelvesQty} מדפים כלולים
                    </span>
                  )}
                  {spec.fans !== '0' && spec.fans !== 'X' && spec.fans !== '' && (
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-100/40">
                      🌬️ מאווררים: {spec.fans}
                    </span>
                  )}
                  {spec.wheels !== 'X' && spec.wheels !== '' && (
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5">
                      🛞 גלגלים כלולים
                    </span>
                  )}
                </div>
              )}

              {/* Creative Actions Row */}
              <div className="p-3 bg-gray-50 flex gap-2">
                {/* Buy together button */}
                <button
                  type="button"
                  onClick={(e) => handleBuyTogether(cabinet, e)}
                  disabled={isAdded}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold text-xs transition-all shadow-sm rounded-none border border-transparent cursor-pointer 
                    ${isAdded 
                      ? 'bg-green-600 text-white' 
                      : 'bg-[#004387] text-white hover:bg-[#fe8d00]'
                    }`}
                >
                  {isAdded ? (
                    <>
                      <CheckCircle2 size={14} className="animate-bounce" />
                      <span>נוספו יחד! ✓</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={13} />
                      <span>קנה ביחד כחבילה</span>
                    </>
                  )}
                </button>

                {/* View Details button */}
                <button
                  type="button"
                  onClick={(e) => handleGoToCabinet(cabinet, e)}
                  className="flex-shrink-0 flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:text-[#004387] hover:border-[#004387] p-2.5 hover:bg-gray-100 transition-all rounded-none"
                  title="ערוך קונפיגורציה מלאה לארון זה"
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Assembly Program Section with CabinetConfigurator */}
      {activeCabinetForBundle && (
        <div className="mt-8 border-t-2 border-[#b3d4f5] pt-6">
          <div className="bg-[#fe8d00]/5 border-r-4 border-[#fe8d00] p-4 mb-4">
            <h4 className="text-sm font-extrabold text-[#0c2d57] flex items-center gap-1.5">
              <span>🛠️ הדמיה ותוכנית הרכבה מלאה לארון {activeCabinetForBundle.name}</span>
              <span className="text-[10px] bg-[#fe8d05] text-white px-2 py-0.5 font-bold uppercase font-mono tracking-wide">LIVE COCKPIT</span>
            </h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              האביזר הנוכחי <strong className="text-[#004387]">{product.name}</strong> הוטען בצורה מבוקרת בסימולטור Rack של הארון הנבחר. כאן תוכלו להתקין פנלים עיוורים (Blank Panels) או פנלי מברשת (Brush Panels), מאווררים תקרה נוספים ופסי שקעים ישירות לארון, ולראות את ההדמיה הוויזואלית משתנה בזמן אמת.
            </p>
          </div>

          <CabinetConfigurator 
            product={activeCabinetForBundle} 
            catalogData={catalogData} 
            initialAccessory={product}
            onOptionalsChange={handleConfiguredOptionalsChange}
          />

          <div className="mt-5 p-5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="min-w-0 pr-1">
              <div className="text-[10px] text-gray-400 font-extrabold uppercase">סיכום החבילה המשודרגת:</div>
              <p className="text-sm font-bold text-[#0c2d57] truncate mt-0.5">
                ארון {activeCabinetForBundle.name} + {configuredOptionals.length} פריטים ורכיבי אבזור מתקינים.
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xs text-gray-500">מחיר חבילה כולל:</span>
                <span className="text-xl font-black text-[#fe8d00] font-mono">
                  ₪{(activeCabinetForBundle.price + configuredOptionals.reduce((accPrice, val) => {
                    const matchedItem = catalogData.find(item => item.sku === val.pn);
                    return accPrice + (matchedItem?.price || 0);
                  }, 0)).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-gray-400 font-normal">(ללא מע"מ)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyConfiguredBundle}
              className={`w-full md:w-auto py-3 px-6 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md rounded-none cursor-pointer text-white border border-transparent
                ${bundleAdded 
                  ? 'bg-green-600 shadow-inner' 
                  : 'bg-[#fe8d00] hover:bg-[#004387] hover:shadow-lg'
                }`}
            >
              <ShoppingCart size={15} className={bundleAdded ? 'animate-bounce' : ''} />
              {bundleAdded ? 'כל החבילה המשודרגת נוספה לסל! ✓' : 'הוסף ארון + כל האביזרים המשודרגים כחבילה'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
