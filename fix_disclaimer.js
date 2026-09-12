import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `          {/* Visual disclaimer overlay */}
          <div className="absolute bottom-2 left-2 bg-white/90 border border-gray-200/80 rounded px-1.5 py-0.5 text-[8px] sm:text-[9px] text-gray-500 font-semibold shadow-2xs select-none pointer-events-none">
            תמונות להמחשה בלבד
          </div>`;

const replacement = `          {/* Visual disclaimer overlay - Moved to top left to avoid overlap with action buttons */}
          <div className="absolute top-2 left-2 z-10 bg-white/90 border border-gray-200/80 rounded px-1.5 py-0.5 text-[8px] sm:text-[9px] text-gray-500 font-semibold shadow-2xs select-none pointer-events-none">
            תמונות להמחשה בלבד
          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
