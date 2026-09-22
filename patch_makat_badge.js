import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = 'className={`group/makat inline-flex items-center justify-center gap-2 bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border border-gray-200 hover:border-[#004387] active:border-[#002f5e] transition-all rounded-lg py-2.5 px-4 sm:py-1.5 sm:px-3 w-full sm:w-auto cursor-pointer focus:outline-none select-none ${className}`}';

const replacement = 'className={`group/makat inline-flex items-center justify-center gap-2.5 bg-gray-50 hover:bg-blue-50 active:bg-blue-100/80 border border-gray-200 hover:border-[#004387] active:border-[#002f5e] transition-all rounded-xl py-3.5 px-5 sm:py-2 sm:px-4 w-full sm:w-auto cursor-pointer focus:outline-none select-none touch-manipulation min-h-[48px] sm:min-h-[auto] ${className}`}';

const target2 = 'className="text-gray-600 group-hover/makat:text-[#0c2d57] transition-colors text-[16px] sm:text-[15px] font-bold flex items-center"';
const replacement2 = 'className="text-gray-600 group-hover/makat:text-[#0c2d57] transition-colors text-base sm:text-sm font-bold flex items-center"';

content = content.replace(target, replacement);
content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', content);
