import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace isClearance block
content = content.replace(
  "{selectedProduct.isClearance && (",
  "{!isGuest && selectedProduct.isClearance && ("
);

// Replace isHotSale block
content = content.replace(
  "{selectedProduct.isHotSale && (",
  "{!isGuest && selectedProduct.isHotSale && ("
);

// Replace oldPrice block
content = content.replace(
  "{selectedProduct.oldPrice && currentOptionals.length === 0 && (",
  "{!isGuest && selectedProduct.oldPrice && currentOptionals.length === 0 && ("
);

// Add guest button in the action area
const targetBtn = `                  {!isGuest && (selectedProduct.isComingSoon ? (`;
const replaceBtn = `                  {isGuest ? (
                    <button onClick={() => { window.dispatchEvent(new Event('rbs_trigger_login')); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold transition-all shadow-md text-sm sm:text-base h-[48px]">
                      <Lock size={18} className="sm:w-5 sm:h-5" />
                      כניסת מפיצים להזמנה
                    </button>
                  ) : (selectedProduct.isComingSoon ? (`;
content = content.replace(targetBtn, replaceBtn);

fs.writeFileSync('src/App.tsx', content);
