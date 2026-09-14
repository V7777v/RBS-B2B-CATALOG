import re
with open('src/components/Cabinet3D/AddSlotModal.tsx', 'r') as f:
    text = f.read()

bad_render = '''      <div 
        key={item.sku || item.pn} 
        className={`bg-white border p-2.5 rounded flex items-center justify-between gap-3 transition-colors ${placement?.type === 'direct' ? 'border-emerald-300 hover:border-emerald-500' : 'border-slate-200 hover:border-[#004387]'}`}
        onMouseEnter={() => handleProductHover(item)}
        onMouseLeave={() => handleProductHover(null)}
        onTouchStart={() => handleProductHover(item)}
      >
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
              <span>מק״ט: {item.sku || item.pn}</span>
              {item.price > 0 && <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>}
            </div>
            {placement?.type === 'direct' && (
              <div className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                <CheckCircle2 size={12} /> מקום פנוי ב-U{targetU}
              </div>
            )}
          </div>
        </div>
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
      </div>'''

good_render = '''      <div 
        key={item.sku || item.pn} 
        className={`bg-white border p-3 rounded flex flex-col gap-2 transition-colors ${placement?.type === 'direct' ? 'border-emerald-300 hover:border-emerald-500' : (placement?.type === 'rearrange' ? 'border-amber-300' : 'border-slate-200 hover:border-[#004387]')}`}
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
                <span>מק״ט: {item.sku || item.pn}</span>
                {item.price > 0 && <span className="font-bold text-slate-700">₪{item.price.toLocaleString('he-IL')}</span>}
              </div>
            </div>
          </div>
          
          {placement?.type === 'direct' || isAux ? (
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
        
        {!isAux && placement?.type === 'direct' && (
          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-bold flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} /> מותאם בדיוק למקום הפנוי (U{targetU})
          </div>
        )}
        
        {!isAux && placement?.type === 'alternative' && (
          <div className="mt-1 bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-700">
              <div className="font-bold text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> אין מספיק רצף ב-U{targetU}</div>
              <span className="mt-0.5 block">נמצא מקום חלופי ב-U{placement.alternativeU} (דורש {uSize}U רצופים)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onAddAccessoryAtSlot(item, placement.alternativeU);
                onClose();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold shrink-0"
            >
              הוסף ב-U{placement.alternativeU}
            </button>
          </div>
        )}
        
        {!isAux && placement?.type === 'rearrange' && placement.plan && (
          <div className="mt-1 bg-amber-50 p-2 rounded border border-amber-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                <ArrowLeftRight size={12} /> נדרש סידור מחדש
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onRequestRearrangement) onRequestRearrangement(placement.plan!, item);
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shrink-0"
              >
                בדוק ואשר סידור
              </button>
            </div>
            <div className="text-[10px] text-amber-800 space-y-0.5">
              <span>ההצעה (U{placement.plan.targetU}):</span>
              <ul className="list-disc list-inside opacity-90">
                {placement.plan.moves.map((m, idx) => (
                  <li key={idx}>הזזת <strong>{m.name}</strong> ל-U{m.toU}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {!isAux && placement?.type === 'impossible' && (
          <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-1.5 rounded mt-1 flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> הארון מלא, לא ניתן להוסיף ({uSize}U נדרשים)
          </div>
        )}
      </div>'''

text = text.replace(bad_render, good_render)
with open('src/components/Cabinet3D/AddSlotModal.tsx', 'w') as f:
    f.write(text)
