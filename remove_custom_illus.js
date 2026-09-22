import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

const customLogicOld = `              <div className="border border-slate-200 bg-slate-50 p-3 mb-3">
                <div className="text-sm font-bold text-slate-700 mb-2">➕ הוסף פריט מותאם אישית לארון</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={customAccName} 
                    onChange={e => setCustomAccName(e.target.value)} 
                    placeholder="שם הפריט..." 
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded-none focus:outline-none focus:border-[#004387]" 
                    dir="rtl"
                  />
                  <select 
                    value={customAccU} 
                    onChange={e => setCustomAccU(parseInt(e.target.value))} 
                    className="w-16 px-1 py-1.5 text-sm border border-slate-300 rounded-none focus:outline-none"
                    dir="ltr"
                  >
                    {[1, 2, 3, 4, 5].map(u => <option key={u} value={u}>{u}U</option>)}
                  </select>
                  <button 
                    type="button" 
                    onClick={handleAddCustomIllustration}
                    className="px-3 py-1.5 bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors"
                  >
                    הוסף
                  </button>
                </div>
              </div>`;

content = content.replace(customLogicOld, "");
fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
