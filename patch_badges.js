import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `{isNew && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-1.5 select-none">
        <Sparkles size={10} className="text-emerald-100 animate-pulse" />
        <span>חדש!</span>
      </div>
    )}`;

const r1 = `{isNew && (
      <div className="absolute top-2 left-2 z-10 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1.5 select-none transition-transform hover:scale-105">
        <Sparkles size={12} className="text-emerald-600 animate-pulse" />
        <span>מוצרים חדשים</span>
      </div>
    )}`;

const t2 = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-1.5 select-none">
        <Sparkles size={10} className="text-emerald-100 animate-pulse" />
        <span>חדש!</span>
      </div>
    )}`;

const r2 = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-2 left-2 z-10 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1.5 select-none transition-transform hover:scale-105">
        <Sparkles size={12} className="text-emerald-600 animate-pulse" />
        <span>מוצרים חדשים</span>
      </div>
    )}`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
