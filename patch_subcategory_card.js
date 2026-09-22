import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const tSoon = `{sub.isComingSoon && (
      <div className="absolute top-3 left-3 z-20 bg-gradient-to-br from-red-500 to-rose-700 text-white border-[2px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.45)] flex items-center gap-2 select-none transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all">
        <Fingerprint size={14} className="text-red-100 animate-pulse" />
        <span className="drop-shadow-md tracking-wide">בקרוב!</span>
      </div>
    )}`;
    
const tNew = `{sub.isNew && !sub.isComingSoon && (
      <div className="absolute top-3 left-3 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[2px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <span className="drop-shadow-md tracking-wide">מוצרים חדשים!</span>
      </div>
    )}`;

const targetTextContainer = `<div className="p-3 sm:p-5 flex flex-col flex-grow bg-white text-center justify-between relative">`;

const rSoon = `{sub.isComingSoon && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-br from-red-500 to-rose-700 text-white border-[2px] border-white text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(220,38,38,0.4)] flex items-center gap-1.5 select-none hover:scale-105 transition-all">
          <Fingerprint size={12} className="text-red-100 animate-pulse" />
          <span className="drop-shadow-md tracking-wide">בקרוב!</span>
        </div>
      )}`;

const rNew = `{sub.isNew && !sub.isComingSoon && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[2px] border-white text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(16,185,129,0.4)] flex items-center gap-1.5 select-none hover:scale-105 transition-all">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="drop-shadow-md tracking-wide">מוצרים חדשים!</span>
        </div>
      )}`;

if (content.includes(tSoon) && content.includes(tNew)) {
    content = content.replace(tSoon, '');
    content = content.replace(tNew, '');
    content = content.replace(targetTextContainer, targetTextContainer + '\\n      ' + rSoon + '\\n      ' + rNew);
    fs.writeFileSync('src/App.tsx', content);
    console.log('SUCCESS SubcategoryCard');
} else {
    console.log('FAILED to find SubcategoryCard badges');
}
