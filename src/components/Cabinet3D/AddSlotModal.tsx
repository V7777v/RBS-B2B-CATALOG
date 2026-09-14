import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import {
  X, Plus, Box, Info, ChevronDown, ChevronUp, AlertCircle, ArrowLeftRight, ShieldCheck, CheckCircle2, SlidersHorizontal, Maximize2, Minimize2, Search
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
  isOpen, onClose, targetU, totalU, slots, availableU,
  compatibleAccessories, onAddAccessoryAtSlot, onRequestRearrangement,
  isAuxiliaryMode = false, mode = 'mobile-drawer', onHoverProductItem
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'direct' | 'auxiliary'>('direct');

  const spaceAnalysis = useMemo(() => {
    return analyzeCabinetSpace(totalU, slots, targetU);
  }, [totalU, slots, targetU]);

  const unifiedRubrics = useMemo(() => {
    // We filter compatible accessories depending on the mode.
    // If it has no tabs, it just shows EVERYTHING from compatibleAccessories, appropriately grouped by groupAccessoriesForDisplay!
    const items = compatibleAccessories;
    return groupAccessoriesForDisplay(items, searchFilter, isAuxiliaryMode ? undefined : (targetU ? undefined : availableU));
  }, [compatibleAccessories, searchFilter, isAuxiliaryMode, targetU, availableU]);

  useEffect(() => {
    if (searchFilter.length > 1) {
      const allOpen: Record<string, boolean> = {};
      unifiedRubrics.forEach(g => allOpen[g.id] = true);
      setOpenSections(allOpen);
    }
  }, [searchFilter, unifiedRubrics]);


  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProductHover = (acc: any | null) => {
    if (onHoverProductItem) {
      onHoverProductItem(acc ? (acc.uSize || 1) : null);
    }
  };

  const renderProductItem = (item: any, isAux = false) => {
    const uSize = item.uSize ?? (isAux ? 0 : 1);
    const placement = !isAux && targetU ? classifyItemPlacement(item, spaceAnalysis, targetU, slots) : null;
    
    return (
      <div 
        key={item.sku || item.pn} 
        className={`bg-white border p-3 rounded flex flex-col gap-2 transition-colors ${placement?.category === 'direct' ? 'border-emerald-300 hover:border-emerald-500' : (placement?.category === 'rearrange' ? 'border-amber-300' : 'border-slate-200 hover:border-[#004387]')}`}
        onMouseEnter={() => handleProductHover(item)}
        onMouseLeave={() => handleProductHover(null)}
        onTouchStart={() => handleProductHover(item)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {item.image ? (
               <img src={item.image} alt="" className="w-12 h-12 object-contain border border-slate-200 p-0.5 rounded shrink-0 bg-white" referrerPolicy="no-referrer" />
            ) : (
               <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-400 text-xs font-mono shrink-0">{uSize}U</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[13px] text-slate-800 leading-tight">{item.name || item.description}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${uSize === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{uSize}U</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5 break-all flex items-center gap-2">
                <span>מק״ט: <span dir="ltr" className="inline-block">{item.sku || item.pn}</span></span>
                {item.price > 0 && <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>}
              </div>
            </div>
          </div>
          
          {placement?.category === 'direct' || isAux ? (
            <button
              type="button"
              onClick={() => {
                onAddAccessoryAtSlot(item, isAux ? null : targetU);
                onClose();
                handleProductHover(null);
              }}
              className="px-3 py-2 bg-[#004387] hover:bg-[#003166] text-white rounded text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus size={16} /> הוסף
            </button>
          ) : null}
        </div>
        
        {!isAux && placement?.category === 'direct' && (
          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-bold flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} /> מותאם בדיוק למקום הפנוי (U{targetU})
          </div>
        )}
        
        {!isAux && placement?.category === 'alternative' && placement.alternateTargetU && (
          <div className="mt-1 bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-700">
              <div className="font-bold text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> אין מספיק רצף ב-U{targetU}</div>
              <span className="mt-0.5 block">נמצא מקום חלופי ב-U{placement.alternateTargetU} (דורש {uSize}U רצופים)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onAddAccessoryAtSlot(item, placement.alternateTargetU);
                onClose();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold shrink-0"
            >
              הוסף ב-U{placement.alternateTargetU}
            </button>
          </div>
        )}
        
        {!isAux && placement?.category === 'rearrange' && placement.rearrangementPlan && (
          <div className="mt-1 bg-amber-50 p-2 rounded border border-amber-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                <ArrowLeftRight size={12} /> נדרש סידור מחדש
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onRequestRearrangement) onRequestRearrangement(placement.rearrangementPlan!, item);
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shrink-0"
              >
                בדוק ואשר סידור
              </button>
            </div>
            <div className="text-[10px] text-amber-800 space-y-0.5">
              <span>ההצעה (U{placement.rearrangementPlan.targetU}):</span>
              <ul className="list-disc list-inside opacity-90">
                {placement.rearrangementPlan.moves.map((m, idx) => (
                  <li key={idx}>הזזת <strong>{m.name}</strong> ל-U{m.toU}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {!isAux && placement?.category === 'infeasible' && (
          <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-1.5 rounded mt-1 flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> הארון מלא, לא ניתן להוסיף ({uSize}U נדרשים)
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-white" dir="rtl">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
            <Plus size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[15px] sm:text-base leading-none">הוספת ציוד</h3>
            {targetU && !isAuxiliaryMode ? (
              <p className="text-[11px] sm:text-xs text-blue-200 mt-1">
                מיקום נבחר: U{targetU} <span className="text-white/40 px-1">|</span> פנוי בארון: {availableU}U
              </p>
            ) : (
              <p className="text-[11px] sm:text-xs text-blue-200 mt-1">
                אביזרי 0U וציוד נלווה
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'mobile-drawer' && (
            <button 
              onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
              className="p-1.5 text-white/70 hover:text-white bg-white/10 rounded cursor-pointer transition-colors"
              title={isDrawerExpanded ? "צמצם לתצוגת ארון" : "הרחב רשימה"}
            >
              {isDrawerExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <button onClick={() => { handleProductHover(null); onClose(); }} className="p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-red-500/80 rounded cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Search & Tabs */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="חיפוש לפי שם, מק״ט או מותג..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        

      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 relative">
        {unifiedRubrics.length === 0 ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <Box size={32} className="text-slate-300 mb-3" />
            <span className="font-bold">לא נמצא ציוד מתאים</span>
            {searchFilter && <span className="text-xs mt-1">נסה לשנות את מילות החיפוש</span>}
          </div>
        ) : (
          unifiedRubrics.map(rubric => {
             const isOpenSection = openSections[rubric.id] ?? false;
             return (
               <div key={rubric.id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSection(rubric.id)}
                    className={`w-full p-3 flex items-center justify-between text-sm font-bold cursor-pointer transition-colors ${rubric.tone}`}
                  >
                    <div className="flex items-center gap-2">
                      {rubric.brandLogo && <img referrerPolicy="no-referrer" src={rubric.brandLogo} alt="" className="h-4 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
                      <span>{rubric.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/80 text-slate-700">{rubric.items.length}</span>
                    </div>
                    {isOpenSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpenSection && (
                    <div className="p-2 space-y-2 bg-slate-50/80 border-t border-slate-100">
                      {rubric.items.map((item: any) => renderProductItem(item, item.uSize === 0))}
                    </div>
                  )}
               </div>
             );
          })
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-slate-100 p-3 border-t border-slate-200 flex items-center justify-center text-xs text-slate-600 shrink-0">
         <ShieldCheck size={14} className="text-emerald-600 ml-1.5" />
         <span>התאמה מלאה למטריצת הארון</span>
      </div>
    </div>
  );

  if (!isOpen) return null;

  if (mode === 'desktop-sidebar') {
    return (
      <div className="w-full h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
        {renderContent()}
      </div>
    );
  }

  // Mobile Drawer
  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end pointer-events-none" dir="rtl">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => { handleProductHover(null); onClose(); }}
      />
      
      {/* Drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0, height: isDrawerExpanded ? '85dvh' : '40dvh' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full bg-white rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden pointer-events-auto flex flex-col relative z-10"
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};
