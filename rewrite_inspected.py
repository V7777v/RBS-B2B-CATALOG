import re

with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

# We'll just define the InspectedProduct content right before it's rendered, or we can just replace the `<AnimatePresence>` block with the new layout.

bad_pattern = r'      {/\* Product Image Inspection Modal \*/}.*?</AnimatePresence>'
good = '''      {/* Mobile Inspected Product Overlay */}
      <AnimatePresence>
        {!isDesktop && inspectedProduct && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            dir="rtl"
          >
            {/* Minimal Mobile View */}
            <div className="flex flex-col">
              <div className="bg-slate-900 text-white p-3 flex justify-between items-start gap-2">
                 <div>
                   <h4 className="font-bold text-sm leading-tight">{inspectedProduct.name}</h4>
                   <div className="flex gap-2 text-[10px] text-slate-300 mt-1">
                     <span>מק"ט: {inspectedProduct.sku || inspectedProduct.pn}</span>
                     <span>{inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U` : '0U'}</span>
                   </div>
                 </div>
                 <button onClick={() => setInspectedProduct(null)} className="p-1 rounded-full bg-white/10 text-white">
                   <X size={16} />
                 </button>
              </div>
              <div className="flex gap-3 p-3 bg-slate-50 items-center">
                 {inspectedProduct.image ? (
                   <img src={inspectedProduct.image} alt="" className="w-20 h-20 object-contain bg-white rounded border border-slate-200" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-20 h-20 bg-slate-200 flex items-center justify-center rounded border border-slate-300 font-mono text-slate-500">
                     {inspectedProduct.uSize}U
                   </div>
                 )}
                 <div className="flex-1 text-xs text-slate-600">
                   {inspectedProduct.description ? <p className="line-clamp-3">{inspectedProduct.description}</p> : <p>אין תיאור נוסף.</p>}
                   <div className="mt-2 font-bold text-slate-800">מיקום: {inspectedProduct.zone || (inspectedProduct.uSize === 0 ? 'אביזר נלווה' : `U${inspectedProduct.minU}-U${inspectedProduct.maxU}`)}</div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>'''

text = re.sub(bad_pattern, good, text, flags=re.DOTALL)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
