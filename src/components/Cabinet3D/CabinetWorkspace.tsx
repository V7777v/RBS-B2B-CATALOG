import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Box,
  Plus,
  Minus,
  X,
  Search,
  ZoomIn,
  Eye,
  Download,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Award,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { GroupedRubric, normalizeSku } from '../../utils/cabinetData';
import { VisualSlot, EnrichedPreviewItem } from '../CabinetConfigurator';
import { Cabinet3DErrorBoundary } from './Cabinet3DErrorBoundary';
import { Cabinet3DViewer } from './Cabinet3DViewer';

export interface CabinetWorkspaceProps {
  product: any;
  cabinetData?: any;
  totalSlotsU: number;
  availableU: number;
  usedU: number;
  slots: VisualSlot[];
  selectedOptionals: any[];
  includedItems: string[];
  nonUAccessories: any[];
  unallocatedItems: any[];
  compatibleAccessories: any[];
  groupedRubrics: GroupedRubric[];
  illustrationAccessories: any[];
  catalogData: any[];
  accSearch: string;
  setAccSearch: (val: string) => void;
  openSections: Record<string, boolean>;
  setOpenSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  viewMode: '2d' | '3d';
  setViewMode: (mode: '2d' | '3d') => void;
  inspectedProduct: EnrichedPreviewItem | null;
  setInspectedProduct: (item: EnrichedPreviewItem | null) => void;
  hoveredProduct: EnrichedPreviewItem | null;
  setHoveredProduct: (item: EnrichedPreviewItem | null) => void;
  addSlotTargetU: number | null;
  setAddSlotTargetU: (u: number | null) => void;
  previewAddSlotSpanU: number;
  setPreviewAddSlotSpanU: (u: number) => void;
  highlightedOptIdx: number | null;
  setHighlightedOptIdx: (idx: number | null) => void;
  lastAddedInstanceId: string | null;
  pdfGrandTotal: number;
  onCloseStudio: () => void;
  onDownloadPdf: (withPrice: boolean) => void;
  onAddOptional: (acc: any, idx: number) => void;
  onAddOptionalAtSlot: (acc: any, targetU: number) => void;
  onIncrementQuantity: (idx: number) => void;
  onRemoveOptional: (idx: number, all?: boolean) => void;
  addedIdx: number | null;
  highlightedSku: string | null;
  getIncludedPreviewItem: (itemText: string, idx: number) => EnrichedPreviewItem;
  buildPreviewFromSlot: (slot: VisualSlot) => EnrichedPreviewItem;
  buildPreviewFromNonU: (item: any, zoneType: 'roof' | 'vertical' | 'plinth' | 'hardware') => EnrichedPreviewItem;
  getAccessoryImage: (item: any) => string;
}

export const CabinetWorkspace: React.FC<CabinetWorkspaceProps> = ({
  product,
  cabinetData,
  totalSlotsU,
  availableU,
  usedU,
  slots,
  selectedOptionals,
  includedItems,
  nonUAccessories,
  unallocatedItems,
  compatibleAccessories,
  groupedRubrics,
  illustrationAccessories,
  catalogData,
  accSearch,
  setAccSearch,
  openSections,
  setOpenSections,
  viewMode,
  setViewMode,
  inspectedProduct,
  setInspectedProduct,
  hoveredProduct,
  setHoveredProduct,
  addSlotTargetU,
  setAddSlotTargetU,
  previewAddSlotSpanU,
  setPreviewAddSlotSpanU,
  highlightedOptIdx,
  setHighlightedOptIdx,
  lastAddedInstanceId,
  pdfGrandTotal,
  onCloseStudio,
  onDownloadPdf,
  onAddOptional,
  onAddOptionalAtSlot,
  onIncrementQuantity,
  onRemoveOptional,
  addedIdx,
  highlightedSku,
  getIncludedPreviewItem,
  buildPreviewFromSlot,
  buildPreviewFromNonU,
  getAccessoryImage,
}) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [activeMediumTab, setActiveMediumTab] = useState<'catalog' | 'contents' | 'inspected'>('catalog');
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'catalog' | 'contents' | 'inspected'>('none');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isWide = windowWidth >= 1280;
  const isMedium = windowWidth >= 768 && windowWidth < 1280;
  const isMobile = windowWidth < 768;

  const roofItems = nonUAccessories.filter(a => a.zone === 'roof');
  const verticalItems = nonUAccessories.filter(a => a.zone === 'vertical');
  const plinthItems = nonUAccessories.filter(a => a.zone === 'plinth');

  // Render individual accessory card in catalog
  const renderAccessoryCard = (acc: any, idx: number) => {
    const catalogMatch = catalogData.find(pp => pp && pp.sku && (pp.sku === acc.pn || pp.sku === acc.sku));
    const showPrice = catalogMatch ? catalogMatch.price : (acc.price || 0);
    const fitsRemaining = acc.uSize === 0 || acc.uSize <= availableU;
    const isTargeted = addSlotTargetU !== null;

    const handleCardAdd = () => {
      if (isTargeted) {
        onAddOptionalAtSlot(acc, addSlotTargetU!);
        setAddSlotTargetU(null);
      } else {
        onAddOptional(acc, idx);
      }
    };

    const isShelf = acc.isShelf || acc.type === 'preset-shelf' || /מדף|shelf/i.test(acc.name || acc.description || '');

    // Resolve real photo from catalog for hover preview & inspection
    let realImage = '';
    const targetSku = normalizeSku(acc.sku || acc.pn || '');
    if (targetSku && catalogData && Array.isArray(catalogData)) {
      const found = catalogData.find((p: any) => normalizeSku(p.sku) === targetSku);
      if (found) {
        if (found.images && Array.isArray(found.images) && found.images[0]) realImage = found.images[0];
        else if (found.imageURL) realImage = found.imageURL;
        else if (found.image) realImage = found.image;
      }
    }
    if (!realImage && isShelf && catalogData && Array.isArray(catalogData)) {
      if (cabinetData?.suitableStandard?.length) {
        for (const stdSku of cabinetData.suitableStandard) {
          const foundStd = catalogData.find((p: any) => normalizeSku(p.sku) === normalizeSku(stdSku));
          if (foundStd?.images?.[0]) { realImage = foundStd.images[0]; break; }
          if (foundStd?.imageURL) { realImage = foundStd.imageURL; break; }
        }
      }
      if (!realImage) {
        const anyRealShelf = catalogData.find((p: any) => 
          /מדף|shelf/i.test(p.name || p.description || p.sku || '') && 
          ((p.images && p.images[0]) || p.imageURL)
        );
        if (anyRealShelf?.images?.[0]) realImage = anyRealShelf.images[0];
        else if (anyRealShelf?.imageURL) realImage = anyRealShelf.imageURL;
      }
    }

    const cardImg = getAccessoryImage(acc);

    const optPreview: EnrichedPreviewItem = {
      name: acc.name || acc.description || acc.pn,
      sku: acc.pn || acc.sku || '',
      description: acc.description || '',
      image: realImage || acc.image || cardImg,
      uSize: acc.uSize || 0,
      price: showPrice,
      quantity: 1,
      zone: acc.uSize > 0 ? `תופס ${acc.uSize}U` : (isShelf ? 'מסילות קדמיות ואחוריות (מדף)' : '0U מובנה'),
      type: 'optional-accessory',
      optionalIdx: idx,
      isPreset: false,
    };

    return (
      <div
        id={`workspace-acc-${acc.pn}`}
        key={idx}
        className={`p-3 rounded border transition-all ${
          fitsRemaining
            ? 'bg-white border-slate-200 hover:border-[#004387] hover:bg-blue-50/30 text-slate-800 shadow-xs'
            : 'bg-rose-50/60 border-rose-200 opacity-80 text-slate-700'
        } ${highlightedSku === acc.pn ? 'ring-2 ring-[#004387] bg-blue-50/50' : ''}`}
        onMouseEnter={() => setHoveredProduct(optPreview)}
        onMouseLeave={() => setHoveredProduct(null)}
      >
        <div className="flex items-start justify-between gap-2.5">
          {acc.image || getAccessoryImage(acc) ? (
            <img
              referrerPolicy="no-referrer"
              src={acc.image || getAccessoryImage(acc)}
              alt=""
              className="w-11 h-11 object-contain bg-white rounded p-1 shrink-0 border border-slate-200"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-11 h-11 bg-slate-100 rounded p-1 shrink-0 flex items-center justify-center text-slate-600 font-mono text-[10px] border border-slate-200">
              {acc.uSize > 0 ? `${acc.uSize}U` : '0U'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4
              className="font-bold text-xs text-slate-900 hover:text-[#004387] transition-colors leading-snug cursor-pointer line-clamp-2"
              onClick={() => setInspectedProduct(optPreview)}
              title={acc.name || acc.description}
            >
              {acc.name || acc.description || acc.pn}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
              <span dir="ltr" className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200 font-semibold">
                {acc.pn}
              </span>
              <span>{acc.uSize > 0 ? `${acc.uSize}U` : '0U'}</span>
            </div>
          </div>

          {showPrice > 0 && (
            <span className="text-xs font-bold text-[#c2410c] font-mono shrink-0">
              ₪{showPrice.toLocaleString('he-IL')}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 gap-2">
          <span className="text-[10px] text-slate-500 truncate">
            {acc.isShelf && <span className="text-emerald-700 font-semibold">מדף {acc.shelfType || ''}</span>}
            {!acc.isShelf && acc._curated && <span className="text-emerald-700 font-semibold">✓ מותאם</span>}
            {acc._illustration && <span className="text-purple-700 font-semibold">להמחשה</span>}
          </span>

          <button
            type="button"
            onClick={handleCardAdd}
            disabled={!fitsRemaining}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 cursor-pointer ${
              !fitsRemaining
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : addedIdx === idx
                ? 'bg-emerald-600 text-white'
                : isTargeted
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                : 'bg-[#004387] hover:bg-[#0c2d57] text-white shadow-xs'
            }`}
          >
            {addedIdx === idx ? (
              <>
                <CheckCircle size={13} />
                <span>נוסף!</span>
              </>
            ) : isTargeted ? (
              <>
                <Plus size={13} />
                <span>הוסף ל-U{addSlotTargetU}</span>
              </>
            ) : (
              <>
                <Plus size={13} />
                <span>הוסף לארון</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render Right Panel (Catalog & Accessories)
  const renderCatalogPanel = () => (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-800">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-200 space-y-2 shrink-0 bg-slate-50/80">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
            <Plus size={15} className="text-[#004387]" />
            <span>הוספת ציוד ושדרוגים</span>
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${availableU > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'}`}>
            {availableU}U פנויים
          </span>
        </div>

        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={accSearch}
            onChange={(e) => setAccSearch(e.target.value)}
            dir="rtl"
            placeholder="חיפוש לפי שם או מק״ט..."
            className="w-full pr-8 pl-7 py-1.5 text-xs bg-white border border-slate-300 text-slate-800 rounded placeholder-slate-400 focus:border-[#004387] focus:ring-1 focus:ring-[#004387] outline-none transition-colors"
          />
          {accSearch && (
            <button
              type="button"
              onClick={() => setAccSearch('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {addSlotTargetU !== null && (
          <div className="bg-amber-50 border border-amber-300 rounded p-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-amber-900 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>הוספה ממוקדת לתא <strong>U{addSlotTargetU}</strong></span>
            </span>
            <button
              type="button"
              onClick={() => setAddSlotTargetU(null)}
              className="text-[11px] text-amber-800 underline hover:text-amber-950 cursor-pointer font-medium"
            >
              הצג הכל
            </button>
          </div>
        )}
      </div>

      {/* Catalog Rubrics List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {compatibleAccessories.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-1">
              <span>{compatibleAccessories.length} פריטים תואמים</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    groupedRubrics.forEach(r => { next[r.id] = true; });
                    next['illus'] = true;
                    setOpenSections(next);
                  }}
                  className="text-[#004387] hover:underline font-bold cursor-pointer"
                >
                  פתח הכל
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    groupedRubrics.forEach(r => { next[r.id] = false; });
                    next['illus'] = false;
                    setOpenSections(next);
                  }}
                  className="text-slate-500 hover:underline font-bold cursor-pointer"
                >
                  סגור הכל
                </button>
              </div>
            </div>
            {groupedRubrics.map((rubric) => {
              const isOpen = openSections[rubric.id] ?? true;
              return (
                <div key={rubric.id} className="border border-slate-200 rounded overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setOpenSections(s => ({ ...s, [rubric.id]: !isOpen }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-100/80 hover:bg-slate-200/80 font-bold text-xs text-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {rubric.brandLogo && (
                        <img
                          src={rubric.brandLogo}
                          alt=""
                          className="h-4 max-w-[60px] object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span>{rubric.title} ({rubric.items.length})</span>
                    </span>
                    <span className="text-slate-500 text-[10px]">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="p-2 space-y-2 bg-slate-50/50 max-h-72 overflow-y-auto custom-scrollbar">
                      {rubric.items.map((item, i) => renderAccessoryCard(item.acc || item, item.idx !== undefined ? item.idx : i))}
                    </div>
                  )}
                </div>
              );
            })}

            {illustrationAccessories.length > 0 && (
              <div className="border border-purple-200 rounded overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenSections(s => ({ ...s, illus: !(s.illus ?? false) }))}
                  className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 hover:bg-purple-100 font-bold text-xs text-purple-900 transition-colors cursor-pointer"
                >
                  <span>תצוגת הדמיה ({illustrationAccessories.length})</span>
                  <span className="text-purple-600 text-[10px]">{openSections.illus ? '▲' : '▼'}</span>
                </button>
                {openSections.illus && (
                  <div className="p-2 space-y-2 bg-purple-50/30 max-h-72 overflow-y-auto custom-scrollbar">
                    {illustrationAccessories.map(({ acc, idx }) => renderAccessoryCard(acc, idx))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-300 rounded p-4">
            לא נמצאו אביזרי שדרוג תואמים.
          </div>
        )}
      </div>
    </div>
  );

  // Render Left Panel (Contents & Inspected item)
  const renderContentsPanel = () => (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-800">
      {/* Inspected Product Card if active */}
      {inspectedProduct && (
        <div className="p-3 border-b border-indigo-200 bg-indigo-50/70 text-slate-900 shrink-0 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded font-mono">
                {inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U` : '0U מובנה'}
              </span>
              <h4 className="text-xs font-bold mt-1 line-clamp-2 leading-tight text-slate-900">
                {inspectedProduct.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setInspectedProduct(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-indigo-100"
              title="סגור מפרט"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex gap-2.5 items-center">
            <div className="w-14 h-14 rounded border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center">
              {inspectedProduct.image ? (
                <img
                  src={inspectedProduct.image}
                  alt=""
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Box size={18} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-[11px] space-y-0.5">
              <div className="text-slate-500 font-mono">
                מק"ט: <span dir="ltr" className="font-semibold text-slate-800">{inspectedProduct.sku || inspectedProduct.pn}</span>
              </div>
              <div className="text-slate-600 truncate">
                מיקום: {inspectedProduct.zone || (inspectedProduct.uSize === 0 ? 'אביזר נלווה' : 'מסילות U')}
              </div>
              {inspectedProduct.price > 0 && (
                <div className="font-bold text-emerald-700 font-mono text-xs">
                  ₪{inspectedProduct.price.toLocaleString('he-IL')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgraded Optionals and Included items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Selected Upgrades */}
        <div>
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#004387]">
              <Sparkles size={14} className="text-[#004387]" />
              <span>אביזרים ששדרגתם לארון</span>
            </span>
            <span className="text-[10px] font-mono bg-blue-100 text-[#004387] px-1.5 py-0.5 rounded font-bold">
              {selectedOptionals.reduce((acc, curr) => acc + curr.quantity, 0)} פריטים
            </span>
          </div>

          {selectedOptionals.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {selectedOptionals.map((item, idx) => {
                  const itemQty = Math.max(1, Number(item.quantity) || 1);
                  const optPreview: EnrichedPreviewItem = {
                    name: item.name || item.description || item.pn,
                    sku: item.pn || item.sku || '',
                    description: item.description || '',
                    image: item.image || getAccessoryImage(item),
                    uSize: item.uSize || 0,
                    price: item.price || 0,
                    quantity: itemQty,
                    zone: item.uSize > 0 ? `תופס ${item.uSize * itemQty}U` : '0U מובנה',
                    type: 'optional-accessory',
                    optionalIdx: idx,
                    isPreset: false,
                  };

                  return (
                    <motion.div
                      key={item.instanceId || item.id || `${item.sku || item.pn}-${idx}`}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        setHighlightedOptIdx(idx);
                        setInspectedProduct(optPreview);
                        setTimeout(() => setHighlightedOptIdx(null), 2000);
                      }}
                      className={`p-2 rounded border transition-all cursor-pointer ${
                        highlightedOptIdx === idx
                          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {optPreview.image ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={optPreview.image}
                              alt=""
                              className="w-7 h-7 object-contain bg-white rounded p-0.5 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-slate-600 shrink-0 font-mono text-[9px] border border-slate-200">
                              {item.uSize > 0 ? `${item.uSize}U` : '0U'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs block truncate text-slate-900" dir="ltr">
                              {item.pn}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate block">
                              {item.name || item.description}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-[#c2410c] shrink-0">
                          ₪{((item.price || 0) * itemQty).toLocaleString('he-IL')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 mt-2 pt-1.5">
                        <span className="text-[10px] font-mono text-slate-500">
                          {item.uSize > 0 ? `${item.uSize * itemQty}U נפח` : '0U'}
                        </span>

                        <div className="flex items-center border border-slate-300 rounded overflow-hidden h-5 bg-white">
                          <button
                            type="button"
                            title="הוסף 1"
                            onClick={(e) => { e.stopPropagation(); onIncrementQuantity(idx); }}
                            className="px-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Plus size={10} />
                          </button>
                          <span className="w-5 flex items-center justify-center border-x border-slate-200 text-[11px] font-bold text-slate-800 font-mono bg-slate-50">
                            {itemQty}
                          </span>
                          <button
                            type="button"
                            title="הפחת 1"
                            onClick={(e) => { e.stopPropagation(); onRemoveOptional(idx); }}
                            className="px-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100"
                          >
                            <Minus size={10} />
                          </button>
                          <button
                            type="button"
                            title="הסר לחלוטין"
                            onClick={(e) => { e.stopPropagation(); onRemoveOptional(idx, true); }}
                            className="px-1.5 border-r border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded">
              טרם נבחרו אביזרי הרחבה.
            </div>
          )}
        </div>

        {/* Included Items */}
        <div>
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>פריטים כלולים בארון</span>
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
              כלול
            </span>
          </div>

          {includedItems.length > 0 ? (
            <ul className="space-y-1">
              {includedItems.map((item, idx) => {
                const incPreview = getIncludedPreviewItem(item, idx);
                return (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 cursor-pointer group transition-colors border border-slate-100"
                    onClick={() => setInspectedProduct(incPreview)}
                    onMouseEnter={() => setHoveredProduct(incPreview)}
                    onMouseLeave={() => setHoveredProduct(null)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                      <span className="truncate font-medium">{item}</span>
                    </div>
                    <Eye size={12} className="text-slate-400 group-hover:text-emerald-700 shrink-0" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-200">
              ארון זה מגיע ללא אביזרים מובנים.
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">סה״כ ארון + אביזרים:</span>
          <span className="text-sm font-bold font-mono text-emerald-700">
            ₪{pdfGrandTotal.toLocaleString('he-IL')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDownloadPdf(false)}
          className="w-full py-2 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Download size={13} />
          <span>שמור תכנון (PDF)</span>
        </button>
      </div>
    </div>
  );

  // Center Simulation
  const renderSimulation = () => (
    <div className="flex-1 min-w-0 h-full flex flex-col relative bg-slate-100 overflow-hidden">
      {/* Spec Notice Banner */}
      {normalizeSku(product?.sku) === '447510T' && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1 flex items-center justify-between gap-2 text-amber-900 text-xs shrink-0 z-10">
          <span className="flex items-center gap-1.5 truncate">
            <Award size={13} className="text-amber-600 shrink-0" />
            <strong className="truncate">מפרט 447510T Boost:</strong> דלתות מחוררות כפולות, 4 מאווררים, תעלות 400 מ״מ ומדפי 117914.
          </span>
          <span className="text-[10px] bg-amber-200/60 text-amber-900 font-mono px-1.5 py-0.2 rounded shrink-0">44U 75x100</span>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 w-full h-full min-h-0 relative">
        {/* Floating Magnifier Preview on Hover */}
        <AnimatePresence>
          {hoveredProduct && !inspectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute top-3 left-3 z-40 w-56 bg-white/95 backdrop-blur-md border-2 border-[#004387] text-slate-900 p-2.5 shadow-xl rounded pointer-events-none"
            >
              <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-slate-200 text-[10px]">
                <span className="font-bold text-[#004387] flex items-center gap-1">
                  <ZoomIn size={12} /> תצוגה מקדימה
                </span>
                <span className="font-mono text-slate-700 font-bold">
                  {hoveredProduct.uSize > 0 ? `${hoveredProduct.uSize}U` : '0U'}
                </span>
              </div>
              <div className="w-full h-24 bg-white rounded border border-slate-200 overflow-hidden flex items-center justify-center p-1.5 mb-1.5">
                {hoveredProduct.image ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={hoveredProduct.image}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Box size={24} className="text-slate-400" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-900 truncate">
                {hoveredProduct.name}
              </div>
              {hoveredProduct.price ? (
                <div className="text-[11px] font-bold text-[#c2410c] font-mono">
                  ₪{hoveredProduct.price.toLocaleString('he-IL')}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === '3d' ? (
          <Cabinet3DErrorBoundary onFallbackTo2D={() => setViewMode('2d')}>
            <React.Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 space-y-2 p-4 text-center">
                <div className="w-7 h-7 border-3 border-[#004387] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono">טוען מודל תלת־ממדי...</span>
              </div>
            }>
              <Cabinet3DViewer
                product={product}
                cabinetData={cabinetData}
                catalogData={catalogData}
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
                onProductInspect={(slot) => {
                  const preview = buildPreviewFromSlot(slot);
                  setInspectedProduct(preview);
                  if (isMedium) setActiveMediumTab('inspected');
                  if (isMobile) setMobileDrawer('inspected');
                }}
                onSlotClickToAdd={(uIndex) => {
                  setAddSlotTargetU(uIndex);
                  if (isMedium) setActiveMediumTab('catalog');
                  if (isMobile) setMobileDrawer('catalog');
                }}
                onOpenAuxiliaryModal={() => {
                  setAddSlotTargetU(null);
                  if (isMedium) setActiveMediumTab('catalog');
                  if (isMobile) setMobileDrawer('catalog');
                }}
                onIncrementQuantity={onIncrementQuantity}
                onRemoveOptional={onRemoveOptional}
                onFallbackTo2D={() => setViewMode('2d')}
              />
            </React.Suspense>
          </Cabinet3DErrorBoundary>
        ) : (
          <div className="w-full h-full flex flex-col p-3 bg-slate-100 overflow-hidden">
            <div className="relative border-4 bg-slate-900 p-2 shadow-xl flex flex-col flex-1 h-full overflow-hidden border-slate-700 rounded-sm">
              {roofItems.length > 0 && (
                <div className="mx-2 mb-1 rounded border border-cyan-500/70 bg-cyan-950/80 px-2 py-0.5 text-center text-cyan-200 text-xs shrink-0">
                  ◄ תקרת הארון: {roofItems.map((r: any) => `${r.description || r.name} x${r.quantity}`).join(' · ')} ►
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between w-full h-full min-h-0 px-2 py-1 space-y-0.5 overflow-hidden select-none">
                {slots.map((slot) => {
                  const isEmpty = slot.type === 'empty';
                  const isCont = slot.type === 'optional-accessory' && slot.isAnchor === false;
                  if (isCont) return null;

                  const slotPreview = !isEmpty ? buildPreviewFromSlot(slot) : null;
                  return (
                    <div
                      key={slot.uIndex}
                      onClick={() => {
                        if (isEmpty) {
                          setAddSlotTargetU(slot.uIndex);
                          if (isMedium) setActiveMediumTab('catalog');
                          if (isMobile) setMobileDrawer('catalog');
                        } else if (slotPreview) {
                          setInspectedProduct(slotPreview);
                        }
                      }}
                      onMouseEnter={() => slotPreview && setHoveredProduct(slotPreview)}
                      onMouseLeave={() => setHoveredProduct(null)}
                      className={`flex items-center justify-between px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                        isEmpty
                          ? 'bg-slate-900/40 hover:bg-slate-800 text-slate-400 border border-dashed border-slate-700'
                          : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-100 border border-indigo-700'
                      }`}
                    >
                      <span className="font-bold">U{slot.uIndex}</span>
                      <span className="truncate flex-1 mx-2">{slot.name || 'תא פנוי'}</span>
                      <span>{slot.spanU ? `${slot.spanU}U` : '1U'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] bg-slate-100 text-slate-900 flex flex-col overflow-hidden font-sans select-none" dir="rtl">
      {/* Top Header Bar */}
      <header className="h-14 sm:h-16 shrink-0 bg-[#004387] border-b border-[#0c2d57] px-3 sm:px-5 flex items-center justify-between gap-3 text-white z-20 shadow-md">
        {/* Right: Back Button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCloseStudio}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#004387] hover:bg-slate-100 text-xs sm:text-sm font-bold rounded shadow-sm transition-all cursor-pointer shrink-0"
            title="חזור לדף המוצר"
          >
            <ArrowRight size={16} />
            <span>חזרה לתצוגה בדף</span>
          </button>

          <div className="h-6 w-px bg-white/30 hidden sm:block shrink-0"></div>

          <div className="min-w-0 flex items-center gap-2">
            <Server size={20} className="text-amber-300 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold truncate leading-tight">
                {product.name}
              </h1>
              <span className="text-[10px] font-mono text-white/80 block truncate">
                מק״ט: {product.sku} · {totalSlotsU}U
              </span>
            </div>
          </div>
        </div>

        {/* Center: Capacity Tracker & View Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className={`px-2.5 py-1 font-bold text-xs flex items-center gap-1.5 rounded ${availableU > 0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white animate-pulse'}`}>
            <Box size={14} />
            <span className="hidden sm:inline">מקום פנוי:</span>
            <span className="font-mono">{availableU}U / {totalSlotsU}U</span>
          </div>

          <div className="inline-flex rounded border border-white/30 bg-black/20 p-0.5 text-xs font-bold" role="group">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === '2d' ? 'bg-white text-[#004387] shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              2D חזית
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === '3d' ? 'bg-white text-[#004387] shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              <span>3D תלת־ממד</span>
            </button>
          </div>
        </div>

        {/* Left: Price & PDF & Collapsible controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-[10px] text-white/80">סה״כ לתצורה</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-amber-300">
              ₪{pdfGrandTotal.toLocaleString('he-IL')}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDownloadPdf(false)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span className="hidden sm:inline">שמור (PDF)</span>
          </button>

          {isWide && (
            <div className="hidden lg:flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
              <button
                type="button"
                onClick={() => setIsRightCollapsed(c => !c)}
                className={`p-1.5 rounded transition-colors ${isRightCollapsed ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                title={isRightCollapsed ? 'הצג פאנל קטלוג' : 'הסתר פאנל קטלוג'}
              >
                {isRightCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsLeftCollapsed(c => !c)}
                className={`p-1.5 rounded transition-colors ${isLeftCollapsed ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                title={isLeftCollapsed ? 'הצג פאנל תכולה' : 'הסתר פאנל תכולה'}
              >
                {isLeftCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        {isWide ? (
          /* A. 3-COLUMN DESKTOP */
          <div className="flex-1 flex w-full h-full overflow-hidden">
            <aside className={`${isRightCollapsed ? 'w-10' : 'w-80 xl:w-96 2xl:w-[410px]'} shrink-0 border-l border-slate-200 bg-white flex flex-col h-full z-10 transition-all duration-300 shadow-xs`}>
              {isRightCollapsed ? (
                <div className="w-full h-full flex flex-col items-center py-4 space-y-4 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsRightCollapsed(false)}
                    className="p-2 text-slate-600 hover:text-[#004387] hover:bg-slate-200 rounded cursor-pointer"
                  >
                    <PanelRightOpen size={18} />
                  </button>
                  <span className="[writing-mode:vertical-rl] text-xs font-bold text-slate-600 tracking-wider">
                    קטלוג והוספת ציוד
                  </span>
                </div>
              ) : (
                renderCatalogPanel()
              )}
            </aside>

            {renderSimulation()}

            <aside className={`${isLeftCollapsed ? 'w-10' : 'w-80 xl:w-96 2xl:w-[410px]'} shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-10 transition-all duration-300 shadow-xs`}>
              {isLeftCollapsed ? (
                <div className="w-full h-full flex flex-col items-center py-4 space-y-4 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsLeftCollapsed(false)}
                    className="p-2 text-slate-600 hover:text-[#004387] hover:bg-slate-200 rounded cursor-pointer"
                  >
                    <PanelLeftOpen size={18} />
                  </button>
                  <span className="[writing-mode:vertical-rl] text-xs font-bold text-slate-600 tracking-wider">
                    תכולת הארון ומפרט
                  </span>
                </div>
              ) : (
                renderContentsPanel()
              )}
            </aside>
          </div>
        ) : isMedium ? (
          /* B. 2-COLUMN TABLET WITH TABS */
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {renderSimulation()}

            <aside className="w-80 sm:w-96 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-10 shadow-md">
              <div className="flex border-b border-slate-200 bg-slate-100 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMediumTab('catalog')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${
                    activeMediumTab === 'catalog' ? 'bg-[#004387] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Plus size={13} />
                  <span>הוספה</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediumTab('contents')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${
                    activeMediumTab === 'contents' ? 'bg-[#004387] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Box size={13} />
                  <span>תכולה ({selectedOptionals.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediumTab('inspected')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${
                    activeMediumTab === 'inspected' ? 'bg-[#004387] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Eye size={13} />
                  <span>מפרט</span>
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeMediumTab === 'catalog' && renderCatalogPanel()}
                {activeMediumTab === 'contents' && renderContentsPanel()}
                {activeMediumTab === 'inspected' && renderContentsPanel()}
              </div>
            </aside>
          </div>
        ) : (
          /* C. MOBILE FULL VIEW + BOTTOM DRAWER */
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden relative">
            {renderSimulation()}

            <div className="h-14 bg-white border-t border-slate-200 px-3 flex items-center justify-around gap-2 shrink-0 z-30 shadow-md">
              <button
                type="button"
                onClick={() => setMobileDrawer('catalog')}
                className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 ${
                  mobileDrawer === 'catalog' ? 'bg-[#004387] text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Plus size={14} className="text-[#004387]" />
                <span>הוסף ציוד</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileDrawer('contents')}
                className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 ${
                  mobileDrawer === 'contents' ? 'bg-[#004387] text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Box size={14} className="text-slate-600" />
                <span>תכולה ({selectedOptionals.length})</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadPdf(false)}
                className="p-2 bg-emerald-600 text-white rounded text-xs font-bold flex items-center justify-center hover:bg-emerald-700"
              >
                <Download size={15} />
              </button>
            </div>

            <AnimatePresence>
              {mobileDrawer !== 'none' && (
                <div
                  className="fixed inset-0 z-[150] bg-black/50 flex flex-col justify-end"
                  onClick={() => setMobileDrawer('none')}
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white border-t-2 border-[#004387] rounded-t-2xl max-h-[82vh] h-[75vh] flex flex-col overflow-hidden text-slate-900 shadow-2xl"
                    dir="rtl"
                  >
                    <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                      <span className="font-bold text-sm text-slate-900">
                        {mobileDrawer === 'catalog' && '➕ קטלוג שדרוגים והוספת ציוד'}
                        {mobileDrawer === 'contents' && '📦 תכולת הארון ואביזרים'}
                        {mobileDrawer === 'inspected' && '🔍 מפרט מוצר נבחר'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMobileDrawer('none')}
                        className="p-1.5 rounded-full bg-slate-200 text-slate-700 hover:text-slate-950"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                      {mobileDrawer === 'catalog' && renderCatalogPanel()}
                      {mobileDrawer === 'contents' && renderContentsPanel()}
                      {mobileDrawer === 'inspected' && renderContentsPanel()}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};
