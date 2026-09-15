import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Box,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Search,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { VisualSlot } from '../CabinetConfigurator';
import { analyzeCabinetSpace, classifyItemPlacement, RearrangementPlan } from '../../utils/cabinetPlacementEngine';
import { groupAccessoriesForDisplay, GroupedRubric, normalizeSku } from '../../utils/cabinetData';

export interface AddSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetU: number | null;
  totalU: number;
  slots: VisualSlot[];
  availableU: number;
  compatibleAccessories: any[];
  onAddAccessoryAtSlot: (acc: any, targetU: number | null) => void;
  onRequestRearrangement?: (plan: RearrangementPlan, item: any) => void;
  isAuxiliaryMode?: boolean;
  mode?: 'desktop-sidebar' | 'mobile-drawer';
  onHoverProductItem?: (uSize: number | null) => void;
}

export const AddSlotModal: React.FC<AddSlotModalProps> = ({
  isOpen,
  onClose,
  targetU,
  totalU,
  slots,
  availableU,
  compatibleAccessories,
  onAddAccessoryAtSlot,
  onRequestRearrangement,
  isAuxiliaryMode = false,
  mode = 'mobile-drawer',
  onHoverProductItem,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset search filter and expansion whenever modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setSearchFilter('');
      // Focus search input after a brief delay for mount
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, targetU, isAuxiliaryMode]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onHoverProductItem) onHoverProductItem(null);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onHoverProductItem]);

  const spaceAnalysis = useMemo(() => {
    return analyzeCabinetSpace(totalU, slots, targetU);
  }, [totalU, slots, targetU]);

  // Filter candidates strictly based on capacity and mode
  const { directItems, alternativeItems, rearrangementItems, zeroUItems } = useMemo(() => {
    // 1. In 0U auxiliary mode: ONLY return 0U accessories
    if (isAuxiliaryMode) {
      const zItems = compatibleAccessories.filter(acc => {
        const uSize = acc.uSize ?? 0;
        return uSize === 0;
      });
      return {
        directItems: [],
        alternativeItems: [],
        rearrangementItems: [],
        zeroUItems: zItems,
      };
    }

    // 2. In U slot mode: filter out items that physically exceed total available U
    const candidates = compatibleAccessories.filter(acc => {
      const uSize = acc.uSize ?? 1;
      if (uSize === 0) return false; // 0U items are in auxiliary mode
      return uSize <= availableU; // strictly hide items larger than total available space
    });

    if (!targetU) {
      // If no targetU specified, all candidates are direct candidates
      return {
        directItems: candidates,
        alternativeItems: [],
        rearrangementItems: [],
        zeroUItems: [],
      };
    }

    const direct: any[] = [];
    const alt: Array<{ item: any; alternateTargetU: number }> = [];
    const rearr: Array<{ item: any; plan: RearrangementPlan }> = [];

    candidates.forEach(item => {
      const placement = classifyItemPlacement(item, spaceAnalysis, targetU, slots);
      if (placement.category === 'direct') {
        direct.push(item);
      } else if (placement.category === 'alternative' && placement.alternateTargetU) {
        alt.push({ item, alternateTargetU: placement.alternateTargetU });
      } else if (placement.category === 'rearrange' && placement.rearrangementPlan && placement.rearrangementPlan.moves.length > 0) {
        rearr.push({ item, plan: placement.rearrangementPlan });
      }
    });

    return {
      directItems: direct,
      alternativeItems: alt,
      rearrangementItems: rearr,
      zeroUItems: [],
    };
  }, [compatibleAccessories, isAuxiliaryMode, targetU, availableU, spaceAnalysis, slots]);

  // Group direct items for display (Matrix Shelves, Brand groups, Takes U)
  const groupedDirectRubrics = useMemo(() => {
    const itemsToGroup = isAuxiliaryMode ? zeroUItems : directItems;
    return groupAccessoriesForDisplay(
      itemsToGroup,
      searchFilter,
      isAuxiliaryMode ? undefined : availableU
    );
  }, [isAuxiliaryMode, zeroUItems, directItems, searchFilter, availableU]);

  // Filter alternative items by search
  const filteredAlternativeItems = useMemo(() => {
    if (alternativeItems.length === 0) return [];
    const q = searchFilter.trim().toLowerCase();
    if (!q) return alternativeItems;
    return alternativeItems.filter(({ item }) => {
      const hay = `${item.name || ''} ${item.description || ''} ${item.sku || ''} ${item.pn || ''} ${item.brand || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [alternativeItems, searchFilter]);

  // Filter rearrangement items by search
  const filteredRearrangementItems = useMemo(() => {
    if (rearrangementItems.length === 0) return [];
    const q = searchFilter.trim().toLowerCase();
    if (!q) return rearrangementItems;
    return rearrangementItems.filter(({ item }) => {
      const hay = `${item.name || ''} ${item.description || ''} ${item.sku || ''} ${item.pn || ''} ${item.brand || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rearrangementItems, searchFilter]);

  // Auto-expand sections when user types a search filter
  useEffect(() => {
    if (searchFilter.length > 1) {
      const allOpen: Record<string, boolean> = {
        'section-alternative': true,
        'section-rearrange': true,
      };
      groupedDirectRubrics.forEach(g => {
        allOpen[g.id] = true;
      });
      setOpenSections(allOpen);
    }
  }, [searchFilter, groupedDirectRubrics]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProductHover = (acc: any | null) => {
    if (onHoverProductItem) {
      onHoverProductItem(acc ? (acc.uSize || 1) : null);
    }
  };

  const contiguousFreeCount = spaceAnalysis.contiguousFreeAtTarget;

  const renderProductCard = (item: any, options?: { isAux?: boolean; customAction?: React.ReactNode; badge?: React.ReactNode }) => {
    const uSize = item.uSize ?? (options?.isAux ? 0 : 1);
    return (
      <div
        key={item.sku || item.pn || item.id}
        className="bg-white border border-slate-200 hover:border-[#004387] p-3 rounded-lg flex flex-col gap-2 transition-all shadow-2xs hover:shadow-xs group"
        onMouseEnter={() => handleProductHover(item)}
        onMouseLeave={() => handleProductHover(null)}
        onTouchStart={() => handleProductHover(item)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="w-12 h-12 object-contain border border-slate-200 p-0.5 rounded-md shrink-0 bg-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center text-slate-500 text-xs font-mono font-bold shrink-0">
                {uSize}U
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[13px] text-slate-900 leading-tight">
                  {item.name || item.description}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    uSize === 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {uSize}U
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  מק״ט: <span dir="ltr" className="inline-block font-semibold text-slate-700">{item.sku || item.pn}</span>
                </span>
                {item.price > 0 && (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                    ₪{item.price.toLocaleString('he-IL')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {options?.customAction ? (
            options.customAction
          ) : (
            <button
              type="button"
              onClick={() => {
                onAddAccessoryAtSlot(item, options?.isAux ? null : targetU);
                onClose();
                handleProductHover(null);
              }}
              className="px-3 py-2 bg-[#004387] hover:bg-[#003166] text-white rounded-md text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              <Plus size={15} />
              <span>הוסף</span>
            </button>
          )}
        </div>

        {options?.badge}
      </div>
    );
  };

  const totalResultsCount = isAuxiliaryMode
    ? zeroUItems.length
    : groupedDirectRubrics.reduce((acc, r) => acc + r.items.length, 0) +
      filteredAlternativeItems.length +
      filteredRearrangementItems.length;

  const renderContent = () => (
    <div className="flex flex-col h-full bg-slate-50 min-h-0" dir="rtl">
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
            {isAuxiliaryMode ? <Layers size={19} /> : <Plus size={19} />}
          </div>
          <div>
            <h3 className="font-bold text-[15px] sm:text-base leading-none">
              {isAuxiliaryMode ? 'הוספת ציוד נלווה (0U)' : 'הוספת ציוד ומדפים'}
            </h3>
            {targetU && !isAuxiliaryMode ? (
              <div className="text-[11px] sm:text-xs text-blue-200 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="bg-blue-800/80 px-1.5 py-0.5 rounded font-mono font-bold text-white">
                  מיקום: U{targetU}
                </span>
                <span className="text-white/40">|</span>
                <span>פנוי ברצף: <strong>{contiguousFreeCount}U</strong></span>
                <span className="text-white/40">|</span>
                <span>סך הכל פנוי: <strong>{availableU}U</strong></span>
              </div>
            ) : isAuxiliaryMode ? (
              <p className="text-[11px] sm:text-xs text-indigo-200 mt-1">
                אביזרי גג, דפנות, בסיס וחומרה (ללא תפיסת גובה U)
              </p>
            ) : (
              <p className="text-[11px] sm:text-xs text-blue-200 mt-1">
                פנוי בארון: <strong>{availableU}U</strong>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'mobile-drawer' && (
            <button
              type="button"
              onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
              className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md cursor-pointer transition-colors"
              title={isDrawerExpanded ? 'צמצם תצוגה' : 'הרחב תצוגה'}
            >
              {isDrawerExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              handleProductHover(null);
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-rose-600 rounded-md cursor-pointer transition-colors"
            title="סגור חלון (Escape)"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Auxiliary 0U Informative Banner */}
      {isAuxiliaryMode && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-3.5 py-2 flex items-center gap-2 text-indigo-900 text-xs shrink-0">
          <Info size={14} className="text-indigo-600 shrink-0" />
          <span>
            מוצגים אביזרי 0U בלבד. <strong>לציוד שתופס U — לחץ על מקום פנוי בארון</strong>.
          </span>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-slate-200 bg-white shrink-0">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="חיפוש לפי שם, מק״ט, מותג או גודל U..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="נקה חיפוש"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Product List Content Area with Smooth Scrolling */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 min-h-0 bg-slate-50">
        {totalResultsCount === 0 ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center">
            <Box size={36} className="text-slate-300 mb-2.5" />
            <span className="font-bold text-sm text-slate-700">לא נמצא ציוד מתאים</span>
            {searchFilter ? (
              <span className="text-xs text-slate-500 mt-1">נסה לשנות את מילות החיפוש</span>
            ) : availableU < 1 && !isAuxiliaryMode ? (
              <span className="text-xs text-rose-600 mt-1 font-semibold">הארון מלא. אין מספיק יחידות U פנויות.</span>
            ) : null}
          </div>
        ) : (
          <>
            {/* 1. Direct Compatible Groups (Fit starting from targetU) */}
            {groupedDirectRubrics.map((rubric) => {
              const isOpenSection = openSections[rubric.id] ?? true;
              return (
                <div
                  key={rubric.id}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(rubric.id)}
                    className={`w-full p-3 flex items-center justify-between text-sm font-bold cursor-pointer transition-colors ${rubric.tone}`}
                  >
                    <div className="flex items-center gap-2">
                      {rubric.brandLogo && (
                        <img
                          referrerPolicy="no-referrer"
                          src={rubric.brandLogo}
                          alt=""
                          className="h-4 max-w-[80px] object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span>{rubric.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/90 text-slate-800 shadow-2xs">
                        {rubric.items.length}
                      </span>
                    </div>
                    {isOpenSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpenSection && (
                    <div className="p-2.5 space-y-2 bg-slate-50/50 border-t border-slate-100">
                      {rubric.items.map((item: any) =>
                        renderProductCard(item, {
                          isAux: isAuxiliaryMode || item.uSize === 0,
                          badge: targetU && !isAuxiliaryMode ? (
                            <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1 w-fit">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>מתאים ישירות ב-U{targetU}</span>
                            </div>
                          ) : null,
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Alternative Positions (Fits in another free block without moving anything) */}
            {filteredAlternativeItems.length > 0 && (
              <div className="border border-blue-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('section-alternative')}
                  className="w-full p-3 flex items-center justify-between text-sm font-bold cursor-pointer transition-colors bg-blue-50 text-blue-900"
                >
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-blue-600" />
                    <span>מתאים במיקום פנוי אחר בארון</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/90 text-blue-800 shadow-2xs">
                      {filteredAlternativeItems.length}
                    </span>
                  </div>
                  {openSections['section-alternative'] ?? true ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {(openSections['section-alternative'] ?? true) && (
                  <div className="p-2.5 space-y-2.5 bg-blue-50/30 border-t border-blue-100">
                    <p className="text-[11px] text-blue-800 px-1">
                      הפריטים הבאים דורשים רצף רחב יותר מ-U{targetU}, אך יש עבורם מקום פנוי קיים ללא הזזות:
                    </p>
                    {filteredAlternativeItems.map(({ item, alternateTargetU }) =>
                      renderProductCard(item, {
                        customAction: (
                          <button
                            type="button"
                            onClick={() => {
                              onAddAccessoryAtSlot(item, alternateTargetU);
                              onClose();
                              handleProductHover(null);
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer shadow-xs"
                          >
                            <Plus size={14} />
                            <span>הוסף ב-U{alternateTargetU}</span>
                          </button>
                        ),
                        badge: (
                          <div className="text-[10.5px] text-slate-700 bg-slate-100 px-2 py-1 rounded flex items-center gap-1 font-mono">
                            <span className="text-blue-600 font-bold">מיקום חלופי: U{alternateTargetU}</span>
                            <span>(דורש {item.uSize || 1}U רצופים)</span>
                          </div>
                        ),
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Rearrangement Options (Requires verified automated shifting) */}
            {filteredRearrangementItems.length > 0 && (
              <div className="border border-amber-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('section-rearrange')}
                  className="w-full p-3 flex items-center justify-between text-sm font-bold cursor-pointer transition-colors bg-amber-50 text-amber-900"
                >
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight size={16} className="text-amber-600" />
                    <span>אפשרויות לסידור מחדש של הארון</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/90 text-amber-800 shadow-2xs">
                      {filteredRearrangementItems.length}
                    </span>
                  </div>
                  {openSections['section-rearrange'] ?? true ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {(openSections['section-rearrange'] ?? true) && (
                  <div className="p-2.5 space-y-2.5 bg-amber-50/30 border-t border-amber-100">
                    <p className="text-[11px] text-amber-900 px-1">
                      הפריטים הבאים יותקנו ב-U{targetU} על ידי הזזת פריטים קיימים למיקומים פנויים:
                    </p>
                    {filteredRearrangementItems.map(({ item, plan }) =>
                      renderProductCard(item, {
                        customAction: (
                          <button
                            type="button"
                            onClick={() => {
                              if (onRequestRearrangement) {
                                onRequestRearrangement(plan, item);
                              }
                              onClose();
                              handleProductHover(null);
                            }}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer shadow-xs"
                          >
                            <ArrowLeftRight size={14} />
                            <span>בדוק ואשר סידור</span>
                          </button>
                        ),
                        badge: (
                          <div className="text-[10.5px] text-amber-800 bg-amber-100/60 p-1.5 rounded space-y-0.5">
                            <span className="font-bold">הזזות מוצעות:</span>
                            <ul className="list-disc list-inside">
                              {plan.moves.map((m, idx) => (
                                <li key={idx}>
                                  הזזת <strong>{m.name}</strong> מ-U{m.fromU} ל-U{m.toU}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ),
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-emerald-600" />
          <span className="font-medium">התאמה מלאה למטריצת הארון</span>
        </div>
        <button
          type="button"
          onClick={() => {
            handleProductHover(null);
            onClose();
          }}
          className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline cursor-pointer"
        >
          סגור חלון
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  if (mode === 'desktop-sidebar') {
    return (
      <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in-50 duration-200">
        {renderContent()}
      </div>
    );
  }

  // Mobile Bottom Drawer
  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end pointer-events-none" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs pointer-events-auto"
        onClick={() => {
          handleProductHover(null);
          onClose();
        }}
      />

      {/* Animated Drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0, height: isDrawerExpanded ? '88dvh' : '55dvh' }}
        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        className="w-full bg-white rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col relative z-10 max-h-[92dvh] pb-[env(safe-area-inset-bottom)]"
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};
