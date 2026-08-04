import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetBadge1 = `{isNew && (
      <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-r from-emerald-600 to-green-500 text-white border border-emerald-400 text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transition-transform hover:scale-105">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="drop-shadow-sm">מוצרים חדשים</span>
      </div>
    )}`;

const replacement1 = `{isNew && (
      <div className="absolute -top-3 -left-2 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[3px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_6px_15px_rgba(16,185,129,0.5)] flex items-center gap-2 select-none transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all origin-bottom-left animate-pulse">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <span className="drop-shadow-md tracking-wide">מוצרים חדשים!</span>
      </div>
    )}`;

const targetBadge2 = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-r from-emerald-600 to-green-500 text-white border border-emerald-400 text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transition-transform hover:scale-105">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="drop-shadow-sm">מוצרים חדשים</span>
      </div>
    )}`;

const replacement2 = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute -top-3 -left-2 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[3px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_6px_15px_rgba(16,185,129,0.5)] flex items-center gap-2 select-none transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all origin-bottom-left animate-pulse">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <span className="drop-shadow-md tracking-wide">מוצרים חדשים!</span>
      </div>
    )}`;

let fails = 0;
if (content.includes(targetBadge1)) { content = content.replace(targetBadge1, replacement1); } else { console.log('t1 failed'); fails++; }
if (content.includes(targetBadge2)) { content = content.replace(targetBadge2, replacement2); } else { console.log('t2 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
