import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `                {/* Visual disclaimer overlay */}`;
const r1 = `                {selectedProduct.isComingSoon && (
                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-2 select-none pointer-events-none">
                    <Fingerprint size={14} className="text-red-200 animate-pulse" />
                    <span>בקרוב!</span>
                  </div>
                )}
                {selectedProduct.isNew && !selectedProduct.isComingSoon && (
                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-2 select-none pointer-events-none">
                    <Sparkles size={14} className="text-emerald-100 animate-pulse" />
                    <span>חדש!</span>
                  </div>
                )}
                {/* Visual disclaimer overlay */}`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
