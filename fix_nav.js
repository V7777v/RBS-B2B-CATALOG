import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Menu
content = content.replace(
  'className="flex items-center justify-center w-12 h-12 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg shadow-sm transition-all duration-200 active:scale-95 flex-shrink-0"',
  'className="flex items-center justify-center w-[42px] h-[42px] sm:w-12 sm:h-12 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg shadow-sm transition-all duration-200 active:scale-95 flex-shrink-0"'
);

// Menu Icon
content = content.replace(
  '<Menu size={30} className="stroke-[2.5]" />',
  '<Menu size={26} className="stroke-[2.5] sm:w-[30px] sm:h-[30px]" />'
);

// Back
content = content.replace(
  'className="flex items-center justify-center w-12 h-12 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"',
  'className="flex items-center justify-center w-[42px] h-[42px] sm:w-12 sm:h-12 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"'
);

// Back Icon
content = content.replace(
  '<ChevronRight size={28} className="stroke-[2.5]" />',
  '<ChevronRight size={26} className="stroke-[2.5] sm:w-[28px] sm:h-[28px]" />'
);

// Forward
content = content.replace(
  'className="flex items-center justify-center w-12 h-12 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"',
  'className="flex items-center justify-center w-[42px] h-[42px] sm:w-12 sm:h-12 bg-white hover:bg-gray-100 text-[#004387] border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"'
);

// Forward Icon
content = content.replace(
  '<ChevronLeft size={28} className="stroke-[2.5]" />',
  '<ChevronLeft size={26} className="stroke-[2.5] sm:w-[28px] sm:h-[28px]" />'
);

// Home
content = content.replace(
  'className="flex items-center justify-center h-20 w-32 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"',
  'className="flex items-center justify-center h-[42px] w-[88px] sm:h-12 sm:w-28 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"'
);

// Home Icon
content = content.replace(
  'className="h-16 w-28 object-contain select-none"',
  'className="h-[32px] w-[72px] sm:h-10 sm:w-24 object-contain select-none"'
);

fs.writeFileSync('src/App.tsx', content);
