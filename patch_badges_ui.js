import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `    {sub.isComingSoon && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-1.5 select-none">
        <Fingerprint size={10} className="text-red-200 animate-pulse" />
        <span>בקרוב!</span>
      </div>
    )}`;
const r1 = `    {sub.isComingSoon && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-1.5 select-none">
        <Fingerprint size={10} className="text-red-200 animate-pulse" />
        <span>בקרוב!</span>
      </div>
    )}
    {sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-1.5 select-none">
        <Sparkles size={10} className="text-emerald-100 animate-pulse" />
        <span>חדש!</span>
      </div>
    )}`;

const t2 = `      {product.isComingSoon && (
        <div className="absolute top-3.5 left-[-33px] z-20 w-32 py-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-1.5 select-none">
          <Fingerprint size={10} className="text-red-200 animate-pulse" />
          <span>בקרוב!</span>
        </div>
      )}`;
const r2 = `      {product.isComingSoon && (
        <div className="absolute top-3.5 left-[-33px] z-20 w-32 py-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-1.5 select-none">
          <Fingerprint size={10} className="text-red-200 animate-pulse" />
          <span>בקרוב!</span>
        </div>
      )}
      {product.isNew && !product.isComingSoon && (
        <div className="absolute top-3.5 left-[-33px] z-20 w-32 py-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-1.5 select-none">
          <Sparkles size={10} className="text-emerald-100 animate-pulse" />
          <span>חדש!</span>
        </div>
      )}`;

const t3 = `                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-2 select-none">
                    <Fingerprint size={14} className="text-red-200 animate-pulse" />
                    <span>בקרוב!</span>
                  </div>`;
const r3 = `                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(220,38,38,0.45)] border-y border-red-500/50 flex items-center justify-center gap-2 select-none">
                    <Fingerprint size={14} className="text-red-200 animate-pulse" />
                    <span>בקרוב!</span>
                  </div>
                )}
                {selectedProduct.isNew && !selectedProduct.isComingSoon && (
                  <div className="absolute top-6 left-[-40px] z-20 w-40 py-1.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-xs sm:text-sm font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-2 select-none">
                    <Sparkles size={14} className="text-emerald-100 animate-pulse" />
                    <span>חדש!</span>
                  </div>`;


let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }
// Note: t3 might be slightly different. Let's find exactly what it looks like.
