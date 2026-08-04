import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `{product.isNew && !product.isComingSoon && (
        <div className="absolute top-3.5 left-[-33px] z-20 w-32 py-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-1.5 select-none">
          <Sparkles size={10} className="text-emerald-100 animate-pulse" />
          <span>חדש!</span>
        </div>
      )}`;

const r1 = `{product.isNew && !product.isComingSoon && (
        <div className="absolute top-3 right-3 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[2px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transform rotate-3 hover:rotate-0 hover:scale-105 transition-all">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="drop-shadow-md tracking-wide">חדש!</span>
        </div>
      )}`;

const t2 = `{selectedProduct.isNew && !selectedProduct.isComingSoon && (
                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-2 select-none pointer-events-none">
                    <Sparkles size={14} className="text-emerald-100 animate-pulse" />
                    <span>חדש!</span>
                  </div>
                )}`;

const r2 = `{selectedProduct.isNew && !selectedProduct.isComingSoon && (
                  <div className="absolute top-4 right-4 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[3px] border-white text-[12px] sm:text-[14px] font-black px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2.5 select-none transform rotate-2 animate-pulse pointer-events-none">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <span className="drop-shadow-md tracking-wide">מוצר חדש!</span>
                  </div>
                )}`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
