import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The main button flex direction
const target1 = 'className={`group/makat inline-flex items-center justify-center gap-2.5 bg-gray-50';
const replacement1 = 'className={`group/makat inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 bg-gray-50';

// The span holding "Makat:"
const target2 = '<span className="text-gray-600 group-hover/makat:text-[#0c2d57] transition-colors text-base sm:text-sm font-bold flex items-center">';
const replacement2 = '<span className="text-gray-600 group-hover/makat:text-[#0c2d57] transition-colors text-sm sm:text-sm font-bold flex flex-wrap items-center justify-center text-center">';

// The span holding the sku itself
const target3 = '<span className="font-mono mr-1.5 tracking-wide text-gray-800 group-hover/makat:text-[#004387]">';
const replacement3 = '<span dir="ltr" className="font-mono mx-1 tracking-wide text-gray-800 group-hover/makat:text-[#004387] break-all">';

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);

fs.writeFileSync('src/App.tsx', content);
