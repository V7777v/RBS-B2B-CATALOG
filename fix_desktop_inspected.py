import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = '''        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}
        <div className="w-full flex-1 flex flex-col gap-6 min-w-0">'''

good = '''        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}
        <div className="w-full flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Desktop Inspected Product Panel */}
          {isDesktop && inspectedProduct && (
            <div className="bg-white border-2 border-indigo-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-2">
              <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-indigo-900">{inspectedProduct.name}</h3>
                  <div className="flex gap-3 text-xs text-indigo-700/80 mt-1 font-mono">
                    <span>מק"ט: {inspectedProduct.sku || inspectedProduct.pn}</span>
                    <span>{inspectedProduct.uSize > 0 ? `${inspectedProduct.uSize}U` : '0U'}</span>
                    <span>מיקום: {inspectedProduct.zone || (inspectedProduct.uSize === 0 ? 'אביזר נלווה' : `U${inspectedProduct.minU}-U${inspectedProduct.maxU}`)}</span>
                  </div>
                </div>
                <button onClick={() => setInspectedProduct(null)} className="p-1 hover:bg-indigo-200 rounded text-indigo-600 transition-colors">
                  <X size={18} />
                </button>
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
          )}'''

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
