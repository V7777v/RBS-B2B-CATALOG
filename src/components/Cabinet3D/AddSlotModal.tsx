import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { VisualSlot } from '../CabinetConfigurator';
import {
  analyzeCabinetSpace,
  classifyItemPlacement,
  RearrangementPlan,
} from '../../utils/cabinetPlacementEngine';
import {
  groupAccessoriesForDisplay,
  GroupedRubric,
} from '../../utils/cabinetData';

interface AddSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetU: number | null; // 1-based, e.g. 8 for U8
  totalU: number;
  slots: VisualSlot[];
  availableU: number;
  compatibleAccessories: any[];
  onAddAccessoryAtSlot: (acc: any, targetU: number | null) => void;
  onRequestRearrangement?: (plan: RearrangementPlan, item: any) => void;
  isAuxiliaryMode?: boolean;
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
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'alternative' | 'rearrange' | 'auxiliary'>('direct');
  const [searchFilter, setSearchFilter] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Reset search filter and accordion sections when modal opens or targetU changes
  useEffect(() => {
    if (isOpen) {
      setSearchFilter('');
      setActiveTab(isAuxiliaryMode ? 'auxiliary' : 'direct');
      setOpenSections({});
    }
  }, [isOpen, targetU, isAuxiliaryMode]);

  // Space analysis using placement engine
  const analysis = useMemo(() => {
    return analyzeCabinetSpace(totalU, slots, targetU);
  }, [totalU, slots, targetU]);

  // Classify all compatible accessories
  const classifiedItems = useMemo(() => {
    const direct: any[] = [];
    const alternative: { item: any; altStartU: number; altEndU: number }[] = [];
    const rearrange: { item: any; plan: RearrangementPlan }[] = [];
    const aux0U: any[] = [];

    compatibleAccessories.forEach((acc: any) => {
      const uSize = acc.uSize ?? 1;
      if (uSize === 0) {
        aux0U.push(acc);
        return;
      }

      // If item uSize exceeds total remaining free capacity in cabinet, it is hidden completely!
      if (uSize > analysis.totalFreeU) {
        return;
      }

      const res = classifyItemPlacement(acc, analysis, targetU, slots);

      if (res.category === 'direct') {
        direct.push(acc);
      } else if (res.category === 'alternative' && res.alternateTargetU) {
        alternative.push({
          item: acc,
          altStartU: res.alternateTargetU,
          altEndU: res.alternateEndU || (res.alternateTargetU + uSize - 1),
        });
      } else if (res.category === 'rearrange' && res.rearrangementPlan) {
        rearrange.push({
          item: acc,
          plan: res.rearrangementPlan,
        });
      }
    });

    return { direct, alternative, rearrange, aux0U };
  }, [compatibleAccessories, analysis, targetU, slots]);

  // Group candidate items using groupAccessoriesForDisplay
  const directRubrics = useMemo(() => {
    return groupAccessoriesForDisplay(classifiedItems.direct, searchFilter, analysis.totalFreeU);
  }, [classifiedItems.direct, searchFilter, analysis.totalFreeU]);

  const auxRubrics = useMemo(() => {
    return groupAccessoriesForDisplay(classifiedItems.aux0U, searchFilter);
  }, [classifiedItems.aux0U, searchFilter]);

  // Filter alternatives by search query
  const filteredAlternatives = useMemo(() => {
    const qTokens = searchFilter.trim().toLowerCase().split(/[\s\-/,]+/).filter(Boolean);
    return classifiedItems.alternative.filter(({ item }) => {
      if (qTokens.length === 0) return true;
      const hay = `${item.pn || ''} ${item.sku || ''} ${item.name || ''} ${item.description || ''} ${item.brand || ''}`.toLowerCase();
      return qTokens.every(tok => hay.includes(tok));
    });
  }, [classifiedItems.alternative, searchFilter]);

  // Filter rearrangements by search query
  const filteredRearrangements = useMemo(() => {
    const qTokens = searchFilter.trim().toLowerCase().split(/[\s\-/,]+/).filter(Boolean);
    return classifiedItems.rearrange.filter(({ item }) => {
      if (qTokens.length === 0) return true;
      const hay = `${item.pn || ''} ${item.sku || ''} ${item.name || ''} ${item.description || ''} ${item.brand || ''}`.toLowerCase();
      return qTokens.every(tok => hay.includes(tok));
    });
  }, [classifiedItems.rearrange, searchFilter]);

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const currentTab = isAuxiliaryMode ? 'auxiliary' : activeTab;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch justify-start bg-black/40 backdrop-blur-xs md:backdrop-blur-none pointer-events-auto animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-slot-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white border-t-2 md:border-t-0 md:border-r-2 border-[#004387] shadow-2xl w-full md:w-[500px] max-h-[90vh] md:max-h-full h-auto md:h-full flex flex-col overflow-hidden text-right rounded-t-2xl md:rounded-none z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#004387] text-white p-3.5 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Box size={20} className="text-amber-400 shrink-0" />
            <div>
              <h3 id="add-slot-modal-title" className="text-base font-bold leading-tight">
                {isAuxiliaryMode ? (
                  'הוספת ציוד נלווה / 0U'
                ) : (
                  <>הוספה ממיקום U{targetU}</>
                )}
              </h3>
              <div className="text-[11px] text-white/90 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>פנוי בארון: <strong className="text-amber-300 font-mono">{analysis.totalFreeU}U</strong></span>
                {!isAuxiliaryMode && targetU && (
                  <>
                    <span>•</span>
                    <span>רצף פנוי מ-U{targetU}: <strong className="text-amber-300 font-mono">{analysis.contiguousFreeAtTarget}U</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded transition-colors text-white cursor-pointer"
            aria-label="סגור חלונית"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation (strictly separates Direct, Alternative, Rearrange, Auxiliary) */}
        {!isAuxiliaryMode ? (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'direct'
                  ? 'border-[#004387] text-[#004387] bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>מתאים ישירות ב-U{targetU}</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full font-mono">
                {classifiedItems.direct.length}
              </span>
            </button>

            {classifiedItems.alternative.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('alternative')}
                className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'alternative'
                    ? 'border-[#004387] text-[#004387] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>מקום חלופי</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-mono">
                  {classifiedItems.alternative.length}
                </span>
              </button>
            )}

            {classifiedItems.rearrange.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('rearrange')}
                className={`flex-1 py-2.5 px-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'rearrange'
                    ? 'border-[#004387] text-[#004387] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>סידור מחדש</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-mono">
                  {classifiedItems.rearrange.length}
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-1.5">
            <Info size={14} className="shrink-0 text-amber-600" />
            <span>התקנה ייעודית בארון (גג, בסיס, דפנות וכו') ללא תפיסת מסילות 19".</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200">
          <input
            type="text"
            placeholder="חיפוש לפי שם, מק״ט או מותג..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 px-3 py-1.5 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#004387]"
          />
        </div>

        {/* Tab Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* TAB 1: DIRECT PLACEMENT */}
          {currentTab === 'direct' && (
            <div>
              {directRubrics.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  {classifiedItems.direct.length === 0
                    ? `לא נמצא ציוד שנכנס ברצף של ${analysis.contiguousFreeAtTarget}U החל מ-U${targetU}. עיין בלשונית "מקום חלופי" או "סידור מחדש".`
                    : 'לא נמצאו תוצאות התואמות את החיפוש.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {directRubrics.map((rubric: GroupedRubric) => {
                    const isOpenSection = openSections[rubric.id] ?? false; // closed by default
                    return (
                      <div key={rubric.id} className="border border-slate-200 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(rubric.id)}
                          className={`w-full p-2.5 flex items-center justify-between text-xs font-bold cursor-pointer transition-colors ${rubric.tone}`}
                        >
                          <div className="flex items-center gap-2">
                            {rubric.brandLogo && (
                              <img
                                referrerPolicy="no-referrer"
                                src={rubric.brandLogo}
                                alt={rubric.brand || ''}
                                className="h-4 object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <span>{rubric.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/70 text-slate-700">
                              {rubric.items.length} מוצרים
                            </span>
                          </div>
                          {isOpenSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>

                        {isOpenSection && (
                          <div className="p-2 space-y-2 bg-slate-50/50">
                            {rubric.items.map((item: any, idx: number) => {
                              const uSize = item.uSize ?? 1;
                              return (
                                <div
                                  key={item.sku || item.pn || idx}
                                  className="bg-white border border-slate-200 p-2.5 rounded flex items-center justify-between gap-3 hover:border-[#004387] transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {item.image ? (
                                      <img
                                        referrerPolicy="no-referrer"
                                        src={item.image}
                                        alt=""
                                        className="w-11 h-11 object-contain border border-slate-200 bg-white p-0.5 rounded shrink-0"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 text-xs font-mono font-bold shrink-0">
                                        {uSize}U
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-slate-800 leading-tight">
                                          {item.name || item.description}
                                        </span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 shrink-0">
                                          {uSize}U
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-3">
                                        <span>מק״ט: {item.sku || item.pn}</span>
                                        {item.price > 0 && (
                                          <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      onAddAccessoryAtSlot(item, targetU);
                                      onClose();
                                    }}
                                    className="px-3 py-1.5 bg-[#004387] hover:bg-[#003166] text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                                  >
                                    <Plus size={14} />
                                    <span>התקן מ-U{targetU}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALTERNATIVE LOCATION */}
          {currentTab === 'alternative' && (
            <div className="space-y-2.5">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-900 flex items-start gap-2">
                <Info size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  ב-U{targetU} פנויות {analysis.contiguousFreeAtTarget}U בלבד. למוצרים שלהלן קיים רצף פנוי מספיק במיקום אחר בארון ללא צורך בהזזת ציוד.
                </span>
              </div>

              {filteredAlternatives.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  לא נמצאו מוצרים עם מיקום חלופי התואמים את החיפוש.
                </div>
              ) : (
                filteredAlternatives.map(({ item, altStartU, altEndU }, idx: number) => {
                  const uSize = item.uSize ?? 1;
                  return (
                    <div
                      key={item.sku || item.pn || idx}
                      className="bg-white border border-slate-200 p-3 rounded hover:border-[#004387] transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.image ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={item.image}
                              alt=""
                              className="w-11 h-11 object-contain border border-slate-200 bg-white p-0.5 rounded shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 text-xs font-mono font-bold shrink-0">
                              {uSize}U
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-800 leading-tight">
                                {item.name || item.description}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 shrink-0">
                                {uSize}U
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-3">
                              <span>מק״ט: {item.sku || item.pn}</span>
                              {item.price > 0 && (
                                <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onAddAccessoryAtSlot(item, altStartU);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                        >
                          <Plus size={14} />
                          <span>התקן ב-U{altStartU}</span>
                        </button>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded text-[11px] text-slate-700 flex items-center gap-1.5 font-sans">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>
                          כאן פנוי {analysis.contiguousFreeAtTarget}U. למוצר דרושים {uSize}U. ניתן להתקין ב-<strong>U{altStartU}{uSize > 1 ? `–U${altEndU}` : ''}</strong> ללא הזזת ציוד.
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: REARRANGEMENT OPTIONS */}
          {currentTab === 'rearrange' && (
            <div className="space-y-2.5">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-xs text-amber-900 flex items-start gap-2">
                <SlidersHorizontal size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  הקיבולת הכוללת בארון מאפשרת את הוספת הציוד, אך נדרש סידור מחדש של מיקומי הציוד הקיים.
                </span>
              </div>

              {filteredRearrangements.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  לא נמצאו הצעות סידור מחדש התואמות את החיפוש.
                </div>
              ) : (
                filteredRearrangements.map(({ item, plan }, idx: number) => {
                  const uSize = item.uSize ?? 1;
                  return (
                    <div
                      key={item.sku || item.pn || idx}
                      className="bg-white border border-slate-200 p-3 rounded hover:border-[#004387] transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.image ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={item.image}
                              alt=""
                              className="w-11 h-11 object-contain border border-slate-200 bg-white p-0.5 rounded shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 text-xs font-mono font-bold shrink-0">
                              {uSize}U
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-800 leading-tight">
                                {item.name || item.description}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 shrink-0">
                                {uSize}U
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-3">
                              <span>מק״ט: {item.sku || item.pn}</span>
                              {item.price > 0 && (
                                <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onRequestRearrangement) {
                              onRequestRearrangement(plan, item);
                            } else {
                              onAddAccessoryAtSlot(item, plan.targetU);
                            }
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                        >
                          <ArrowLeftRight size={14} />
                          <span>בדוק ואשר סידור</span>
                        </button>
                      </div>

                      {/* Move summary */}
                      <div className="bg-amber-50/70 border border-amber-200/80 p-2 rounded text-[11px] text-amber-950 space-y-1">
                        <div className="font-bold text-amber-900 flex items-center gap-1">
                          <span>הצעה לפריסה ב-U{plan.targetU}{uSize > 1 ? `–U${plan.targetU + uSize - 1}` : ''}:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[10.5px]">
                          {plan.moves.map((m, mIdx) => (
                            <li key={mIdx}>
                              הזזת <strong>{m.name}</strong> מ-U{m.fromU} ל-U{m.toU}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: AUXILIARY / 0U ITEMS */}
          {currentTab === 'auxiliary' && (
            <div>
              {auxRubrics.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  לא נמצאו אביזרי 0U מתאימים.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auxRubrics.map((rubric: GroupedRubric) => {
                    const isOpenSection = openSections[rubric.id] ?? false; // closed by default
                    return (
                      <div key={rubric.id} className="border border-slate-200 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(rubric.id)}
                          className={`w-full p-2.5 flex items-center justify-between text-xs font-bold cursor-pointer transition-colors ${rubric.tone}`}
                        >
                          <div className="flex items-center gap-2">
                            {rubric.brandLogo && (
                              <img
                                referrerPolicy="no-referrer"
                                src={rubric.brandLogo}
                                alt={rubric.brand || ''}
                                className="h-4 object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <span>{rubric.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/70 text-slate-700">
                              {rubric.items.length} מוצרים
                            </span>
                          </div>
                          {isOpenSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>

                        {isOpenSection && (
                          <div className="p-2 space-y-2 bg-slate-50/50">
                            {rubric.items.map((item: any, idx: number) => (
                              <div
                                key={item.sku || item.pn || idx}
                                className="bg-white border border-slate-200 p-2.5 rounded flex items-center justify-between gap-3 hover:border-[#004387] transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {item.image ? (
                                    <img
                                      referrerPolicy="no-referrer"
                                      src={item.image}
                                      alt=""
                                      className="w-11 h-11 object-contain border border-slate-200 bg-white p-0.5 rounded shrink-0"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="w-11 h-11 bg-indigo-50 border border-indigo-200 rounded flex items-center justify-center text-indigo-700 text-xs font-mono font-bold shrink-0">
                                      0U
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs text-slate-800 leading-tight">
                                        {item.name || item.description}
                                      </span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-indigo-100 text-indigo-700 shrink-0">
                                        0U
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-3">
                                      <span>מק״ט: {item.sku || item.pn}</span>
                                      {item.price > 0 && (
                                        <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onAddAccessoryAtSlot(item, null);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 bg-[#004387] hover:bg-[#003166] text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                                >
                                  <Plus size={14} />
                                  <span>הוסף</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>התאמה מלאה למטריצת הארון ולמגבלות הנפח</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded text-xs cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
