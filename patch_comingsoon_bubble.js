import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `{sub.isComingSoon && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-1.5 select-none">
        <Fingerprint size={10} className="text-red-200 animate-pulse" />
        <span>בקרוב!</span>
      </div>
    )}`;

const r1 = `{sub.isComingSoon && (
      <div className="absolute top-3 left-3 z-20 bg-gradient-to-br from-red-500 to-rose-700 text-white border-[2px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.45)] flex items-center gap-2 select-none transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all">
        <Fingerprint size={14} className="text-red-100 animate-pulse" />
        <span className="drop-shadow-md tracking-wide">בקרוב!</span>
      </div>
    )}`;

const t2 = `{product.isComingSoon && (
        <div className="absolute top-3.5 left-[-33px] z-20 w-32 py-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-1.5 select-none">
          <Fingerprint size={10} className="text-red-200 animate-pulse" />
          <span>בקרוב!</span>
        </div>
      )}`;

const r2 = `{product.isComingSoon && (
        <div className="absolute top-3 left-3 z-20 bg-gradient-to-br from-red-500 to-rose-700 text-white border-[2px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.45)] flex items-center gap-2 select-none transform rotate-3 hover:rotate-0 hover:scale-105 transition-all">
          <Fingerprint size={14} className="text-red-100 animate-pulse" />
          <span className="drop-shadow-md tracking-wide">בקרוב!</span>
        </div>
      )}`;

const t3 = `{selectedProduct.isComingSoon && (
                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-2 select-none pointer-events-none">
                    <Fingerprint size={14} className="text-red-200 animate-pulse" />
                    <span>בקרוב!</span>
                  </div>
                )}`;

const r3 = `{selectedProduct.isComingSoon && (
                  <div className="absolute top-4 left-4 z-20 bg-gradient-to-br from-red-500 to-rose-700 text-white border-[3px] border-white text-[12px] sm:text-[14px] font-black px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.45)] flex items-center gap-2.5 select-none transform rotate-2 pointer-events-none">
                    <Fingerprint size={16} className="text-red-100 animate-pulse" />
                    <span className="drop-shadow-md tracking-wide">בקרוב!</span>
                  </div>
                )}`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }
if (content.includes(t3)) { content = content.replace(t3, r3); } else { console.log('t3 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
