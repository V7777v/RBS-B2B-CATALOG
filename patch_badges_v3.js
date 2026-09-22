import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `{isNew && (
      <div className="absolute top-2 left-2 z-10 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1.5 select-none transition-transform hover:scale-105">
        <Sparkles size={12} className="text-emerald-600 animate-pulse" />
        <span>מוצרים חדשים</span>
      </div>
    )}`;

const r1 = `{isNew && (
      <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-r from-emerald-600 to-green-500 text-white border border-emerald-400 text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transition-transform hover:scale-105">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="drop-shadow-sm">מוצרים חדשים</span>
      </div>
    )}`;

const t2 = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-2 left-2 z-10 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1.5 select-none transition-transform hover:scale-105">
        <Sparkles size={12} className="text-emerald-600 animate-pulse" />
        <span>מוצרים חדשים</span>
      </div>
    )}`;

const r2 = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-r from-emerald-600 to-green-500 text-white border border-emerald-400 text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transition-transform hover:scale-105">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="drop-shadow-sm">מוצרים חדשים</span>
      </div>
    )}`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
