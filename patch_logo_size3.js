import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `                {/* 4. Clickable RBS Logo / Home Button */}
                <button 
                  id="mobile-nav-home"
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    navigateHome();
                  }}
                  className="flex items-center justify-center h-16 w-24 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"
                  aria-label="דף הבית"
                  title="דף הבית - RBS"
                >
                  <img 
                    referrerPolicy="no-referrer" 
                    src="/new-logo.png" 
                    alt="RBS Logo" 
                    className="h-14 w-20 object-contain select-none" 
                  />
                </button>`;

const r1 = `                {/* 4. Clickable RBS Logo / Home Button */}
                <button 
                  id="mobile-nav-home"
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    navigateHome();
                  }}
                  className="flex items-center justify-center h-20 w-32 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-all duration-200 active:scale-90 flex-shrink-0"
                  aria-label="דף הבית"
                  title="דף הבית - RBS"
                >
                  <img 
                    referrerPolicy="no-referrer" 
                    src="/new-logo.png" 
                    alt="RBS Logo" 
                    className="h-16 w-28 object-contain select-none" 
                  />
                </button>`;

const t2 = `              {/* Breadcrumb style path indicator with inline breadcrumbs on desktop */}
              <div className="hidden md:flex items-center text-sm text-[#0c2d57] opacity-85 whitespace-nowrap gap-2">
                <img 
                  referrerPolicy="no-referrer" 
                  src="/new-logo.png" 
                  alt="RBS Logo" 
                  className="h-20 w-auto object-contain cursor-pointer hover:opacity-80 active:scale-95 transition-all" 
                  onClick={() => {`;

const r2 = `              {/* Breadcrumb style path indicator with inline breadcrumbs on desktop */}
              <div className="hidden md:flex items-center text-sm text-[#0c2d57] opacity-85 whitespace-nowrap gap-2">
                <img 
                  referrerPolicy="no-referrer" 
                  src="/new-logo.png" 
                  alt="RBS Logo" 
                  className="h-28 w-auto object-contain cursor-pointer hover:opacity-80 active:scale-95 transition-all" 
                  onClick={() => {`;

let fails = 0;
if (content.includes(t1)) {
  content = content.replace(t1, r1);
} else {
  console.log("t1 not found");
  fails++;
}
if (content.includes(t2)) {
  content = content.replace(t2, r2);
} else {
  console.log("t2 not found");
  fails++;
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
}
