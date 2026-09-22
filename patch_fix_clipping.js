import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `absolute -top-3 -left-2 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[3px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_6px_15px_rgba(16,185,129,0.5)] flex items-center gap-2 select-none transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all origin-bottom-left`;
const replacement1 = `absolute top-3 left-3 z-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white border-[2px] border-white text-[11px] sm:text-[12px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] flex items-center gap-2 select-none transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all`;

let fails = 0;
if (content.includes(target1)) { 
    content = content.replaceAll(target1, replacement1); 
} else { 
    console.log('t1 failed'); fails++; 
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
