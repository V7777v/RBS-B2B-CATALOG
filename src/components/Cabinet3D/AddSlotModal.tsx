import React, { useState, useMemo } from 'react';
import { X, Plus, Box, Info, Layers, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { VisualSlot } from '../CabinetConfigurator';

interface AddSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetU: number | null; // 1-based, e.g. 8 for U8
  totalU: number;
  slots: VisualSlot[];
  availableU: number;
  compatibleAccessories: any[];
  onAddAccessoryAtSlot: (acc: any, targetU: number | null) => void;
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
  isAuxiliaryMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'shelves' | 'uItems' | 'auxiliary'>('shelves');
  const [searchFilter, setSearchFilter] = useState('');

  // Calculate contiguous free slots starting from targetU and proceeding upwards
  const contiguousFreeCount = useMemo(() => {
    if (!targetU) return 0;
    let count = 0;
    // Slots in `slots` array are ordered from top to bottom (totalU down to 1)
    // Let's find slot by uIndex
    const slotMap = new Map<number, VisualSlot>();
    slots.forEach(s => slotMap.set(s.uIndex, s));

    for (let u = targetU; u <= totalU; u++) {
      const s = slotMap.get(u);
      if (s && s.type === 'empty') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [targetU, totalU, slots]);

  // Separate candidates
  const { shelves, uItems, zeroUItems } = useMemo(() => {
    const sh: any[] = [];
    const ui: any[] = [];
    const zu: any[] = [];

    compatibleAccessories.forEach((acc: any) => {
      const uSize = acc.uSize ?? 1;
      if (uSize === 0) {
        zu.push(acc);
      } else if (acc.isShelf) {
        sh.push(acc);
      } else {
        ui.push(acc);
      }
    });

    return { shelves: sh, uItems: ui, zeroUItems: zu };
  }, [compatibleAccessories]);

  if (!isOpen) return null;

  const currentTab = isAuxiliaryMode ? 'auxiliary' : activeTab;

  const filteredItems = (
    currentTab === 'shelves' ? shelves : currentTab === 'uItems' ? uItems : zeroUItems
  ).filter((item: any) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.sku || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  });

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
        className="bg-white border-t-2 md:border-t-0 md:border-r-2 border-[#004387] shadow-2xl w-full md:w-[480px] max-h-[85vh] md:max-h-full h-auto md:h-full flex flex-col overflow-hidden text-right rounded-t-2xl md:rounded-none z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#004387] text-white p-3.5 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Box size={20} className="text-amber-400 shrink-0" />
            <div>
              <h3 id="add-slot-modal-title" className="text-base font-bold leading-tight">
                {isAuxiliaryMode ? (
                  'הוספת ציוד נלווה / 0U (ללא תפיסת מסילות)'
                ) : (
                  <>הוספה החל מ-U{targetU} <span className="text-xs font-normal text-amber-300">({contiguousFreeCount}U רציפות פנויות)</span></>
                )}
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5">
                {isAuxiliaryMode
                  ? 'ציוד נלווה המותקן בגג, בסיס, דפנות או אזור ציוד (ללא שימוש ב-U)'
                  : `ההקצאה מתחילה ב-U${targetU} וממשיכה כלפי מעלה לפי גובה הציוד`}
              </p>
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

        {/* Tab Navigation - strictly separates Shelves and U-Items for slot clicks; 0U is separate */}
        {!isAuxiliaryMode ? (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('shelves')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'shelves'
                  ? 'border-[#004387] text-[#004387] bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📥 מדפים מורשים (מטריצה)</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full">{shelves.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('uItems')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'uItems'
                  ? 'border-[#004387] text-[#004387] bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⚡ ציוד ופנלים (תופס U)</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full">{uItems.length}</span>
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-1.5">
            <Info size={14} className="shrink-0 text-amber-600" />
            <span>התקנה ייעודית מחוץ למסילת ה-19" (גג, בסיס, דפנות, ערכות חומרה).</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200">
          <input
            type="text"
            placeholder="חיפוש לפי שם, מק״ט או תיאור..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 px-3 py-1.5 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#004387]"
          />
        </div>

        {/* Candidate Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[50vh]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              לא נמצאו מוצרים מתאימים בקטגוריה זו.
            </div>
          ) : (
            filteredItems.map((item: any, idx: number) => {
              const uSize = item.uSize ?? (isAuxiliaryMode ? 0 : 1);
              const isZeroU = uSize === 0;
              const hasContiguousSpace = isZeroU || uSize <= contiguousFreeCount;
              const hasOverallSpace = isZeroU || uSize <= availableU;
              const canInstallHere = hasContiguousSpace && hasOverallSpace;

              let blockReason = '';
              if (!hasOverallSpace) {
                blockReason = `אין מספיק מקום פנוי בארון (נותרו ${availableU}U, נדרשות ${uSize}U)`;
              } else if (!hasContiguousSpace) {
                blockReason = `דרושות ${uSize}U רציפות החל מ-U${targetU}, אך פנויות רק ${contiguousFreeCount}U ברצף`;
              }

              return (
                <div
                  key={item.sku || item.pn || idx}
                  className={`border p-2.5 flex items-center justify-between gap-3 transition-colors ${
                    canInstallHere
                      ? 'border-slate-200 hover:border-[#004387] bg-white'
                      : 'border-slate-200 bg-slate-50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.image ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={item.image}
                        alt=""
                        className="w-12 h-12 object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-mono shrink-0">
                        {isZeroU ? '0U' : `${uSize}U`}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 leading-tight">
                          {item.name || item.description}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            isZeroU
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isZeroU ? '0U' : `${uSize}U`}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>מק״ט: {item.sku || item.pn}</span>
                        {item.price > 0 && (
                          <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>
                        )}
                      </div>
                      {!canInstallHere && (
                        <div className="text-[10.5px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>{blockReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={!canInstallHere}
                      onClick={() => {
                        onAddAccessoryAtSlot(item, isZeroU ? null : targetU);
                        onClose();
                      }}
                      className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        canInstallHere
                          ? 'bg-[#004387] hover:bg-[#003166] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                      title={canInstallHere ? 'התקן מוצר' : blockReason}
                    >
                      <Plus size={14} />
                      <span>{isZeroU ? 'הוסף' : `התקן מ-U${targetU}`}</span>
                    </button>
                  </div>
                </div>
              );
            })
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
