import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the AddToCart button area
const target = `                    {!isGuest && (product.isComingSoon ? (
            <div className="w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200">
              <span className="text-xs sm:text-sm font-bold">בקרוב</span>
            </div>
          ) : isSelectedForBulk ? (
            <div className="w-full flex items-center justify-between border-2 border-[#004387] bg-blue-50 py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
               <button onClick={(e) => updateBulkQuantity(e, -1)} className="p-1 sm:p-1.5 text-[#004387] hover:bg-white rounded transition-colors" title="הפחת כמות"><Minus size={16}/></button>
               <span className="font-bold text-[#004387] text-xs sm:text-sm flex flex-col items-center leading-none">
                 <span>{bulkQuantity}</span>
                 <span className="text-[9px] sm:text-[10px] font-normal mt-0.5">סומנו להוספה</span>
               </span>
               <button onClick={(e) => updateBulkQuantity(e, 1)} className="p-1 sm:p-1.5 text-[#004387] hover:bg-white rounded transition-colors" title="הוסף כמות"><Plus size={16}/></button>
            </div>
          ) : (
            <button onClick={handleAddClick} className={\`w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 transition-all duration-300 \${isAdded ? 'bg-green-600 text-white rounded-none hover:bg-green-600' : theme.button}\`}>
              <ShoppingCart size={15} className={\`w-3.5 h-3.5 sm:w-4 sm:h-4 \${isAdded ? 'animate-bounce' : ''}\`} />
              <span className="text-xs sm:text-sm font-bold">{isAdded ? 'נוסף! ✓' : 'הוספה'}</span>
            </button>
          ))}`;

const replacement = `          {isGuest ? (
            <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new Event('rbs_trigger_login')); }} className="w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold transition-all duration-300">
              <Lock size={15} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-bold whitespace-nowrap">כניסת מפיצים להזמנה</span>
            </button>
          ) : (product.isComingSoon ? (
            <div className="w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200">
              <span className="text-xs sm:text-sm font-bold">בקרוב</span>
            </div>
          ) : isSelectedForBulk ? (
            <div className="w-full flex items-center justify-between border-2 border-[#004387] bg-blue-50 py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
               <button onClick={(e) => updateBulkQuantity(e, -1)} className="p-1 sm:p-1.5 text-[#004387] hover:bg-white rounded transition-colors" title="הפחת כמות"><Minus size={16}/></button>
               <span className="font-bold text-[#004387] text-xs sm:text-sm flex flex-col items-center leading-none">
                 <span>{bulkQuantity}</span>
                 <span className="text-[9px] sm:text-[10px] font-normal mt-0.5">סומנו להוספה</span>
               </span>
               <button onClick={(e) => updateBulkQuantity(e, 1)} className="p-1 sm:p-1.5 text-[#004387] hover:bg-white rounded transition-colors" title="הוסף כמות"><Plus size={16}/></button>
            </div>
          ) : (
            <button onClick={handleAddClick} className={\`w-full flex justify-center items-center gap-1.5 py-2.5 px-2 sm:px-4 transition-all duration-300 \${isAdded ? 'bg-green-600 text-white rounded-none hover:bg-green-600' : theme.button}\`}>
              <ShoppingCart size={15} className={\`w-3.5 h-3.5 sm:w-4 sm:h-4 \${isAdded ? 'animate-bounce' : ''}\`} />
              <span className="text-xs sm:text-sm font-bold">{isAdded ? 'נוסף! ✓' : 'הוספה'}</span>
            </button>
          ))}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Successfully replaced ProductCard buttons");
} else {
  console.log("Could not find target string in ProductCard");
}
