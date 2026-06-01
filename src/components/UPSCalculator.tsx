import React, { useState } from 'react';
import { Bolt, Zap, Clock, PackageOpen, LayoutGrid, Info, ShieldAlert } from 'lucide-react';

const rawProducts = [
  { id: "p64", hebName: "אל-פסק 600VA (קו)", watts: 360, category: "ups-line", internalWh: 85, extPack: null, canExtend: false, model: "DS-UPS600(O-STD)EU", image: "https://assets.hikvision.com/prd/public/all/image/sm000075301/600_1000.jpg?f=webp", link: "https://drive.google.com/file/d/1ARD-dP4LtX-5eudcI4lpJOqOJY65Ph1-/view?usp=sharing" },
  { id: "p65", hebName: "אל-פסק 1000VA (קו)", watts: 600, category: "ups-line", internalWh: 108, extPack: null, canExtend: false, model: "DS-UPS1000(O-STD)EU", image: "https://assets.hikvision.com/prd/public/all/image/sm000075359/600_1000.jpg?f=webp", link: "https://drive.google.com/file/d/1SbXy9w20K8wtetspn8yyzPhOTQoqoxVZ/view?usp=sharing" },
  { id: "p66", hebName: "אל-פסק 2000VA (קו)", watts: 1200, category: "ups-line", internalWh: 216, extPack: null, canExtend: false, model: "DS-UPS2000", image: "https://assets.hikvision.com/prd/normal/all/image/m000086220/2000.jpg?f=webp", link: "https://drive.google.com/file/d/1CfwmiJ6W0nTF41TZAn0i5QwDebKwevAZ/view?usp=sharing" },
  { id: "p67", hebName: "אל-פסק 3000VA (קו)", watts: 1800, category: "ups-line", internalWh: 432, extPack: null, canExtend: false, model: "DS-UPS3000", image: "https://assets.hikvision.com/prd/public/all/image/m000086221/%E5%9B%BE%E7%89%87.jpg?f=webp", link: "https://drive.google.com/file/d/1oyHWIG_hyvcIuxjC9HtbJBxq4qCaP6xP/view?usp=sharing" },
  { id: "p68", hebName: "אל-פסק אונליין 1KVA (מגדל)", watts: 900, category: "ups-online", internalWh: 216, extPack: null, canExtend: false, model: "DS-UPS01K24-R/TS(O-STD)/EU/IEC", image: "https://assets.hikvision.com/prd/normal/all/image/m000162281/1k-%E5%B7%A6%E5%89%8D%E4%BE%A7.png?f=webp", link: "https://drive.google.com/file/d/14ZzKUKJ-zbsJzQs1s35h6fWYt9Xy6SRQ/view?usp=sharing" },
  { id: "p69", hebName: "אל-פסק אונליין 2KVA (מגדל)", watts: 1800, category: "ups-online", internalWh: 432, extPack: null, canExtend: false, model: "DS-UPS02K48-R/TS(O-STD)/EU/IEC", image: "https://assets.hikvision.com/prd/normal/all/image/m000162282/2k%263k-%E5%B7%A6%E5%89%8D%E4%BE%A7.png?f=webp", link: "https://drive.google.com/file/d/14ZzKUKJ-zbsJzQs1s35h6fWYt9Xy6SRQ/view?usp=drive_link" },
  { id: "p70", hebName: "אל-פסק אונליין 3KVA (מגדל)", watts: 2700, category: "ups-online", internalWh: 648, extPack: null, canExtend: false, model: "DS-UPS03K72-R/TS(O-STD)/EU/IEC", image: "https://assets.hikvision.com/prd/normal/all/image/m000162283/2k%263k-%E5%B7%A6%E5%89%8D%E4%BE%A71.png?f=webp", link: "https://drive.google.com/file/d/14ZzKUKJ-zbsJzQs1s35h6fWYt9Xy6SRQ/view?usp=drive_link" },
  { id: "p76", hebName: "אל-פסק אונליין 1KVA (ארון)", watts: 900, category: "ups-online", internalWh: 216, performanceMatrix: { 0: [[450,10],[675,4],[900,2]], 1: [[450,40],[675,20],[900,15]], 2: [[450,85],[675,50],[900,35]], 3: [[450,120],[675,75],[900,55]], 4: [[450,180],[675,105],[900,75]] }, extPack: { model: "DS-UPSB0924B-R/TJC", maxPacks: 4, image: "https://assets.hikvision.com/prd/normal/all/image/m000162284/2.png?f=webp", link: "https://drive.google.com/file/d/1K9kP8_lLh-YWBpoYnKIhdQ3dzIeK_gXK/view?usp=sharing" }, canExtend: true, model: "DS-UPS01K24-R/TJS(O-STD)/EU/IEC", image: "https://assets.hikvision.com/prd/normal/all/image/m000162284/2.png?f=webp", link: "https://drive.google.com/drive/folders/1oe4OSvUd1l5wVk2l3_hUUIR4M8QxGpbQ" },
  { id: "p77", hebName: "אל-פסק אונליין 2KVA (ארון)", watts: 1800, category: "ups-online", internalWh: 432, performanceMatrix: { 0: [[900,12],[1350,5],[1800,2.2]], 1: [[900,44],[1350,22],[1800,17.7]], 2: [[900,86],[1350,52],[1800,35]], 3: [[900,120],[1350,77],[1800,54]], 4: [[900,183],[1350,106],[1800,75.4]] }, extPack: { model: "DS-UPSB0948B-R/TJC", maxPacks: 4, image: "https://assets.hikvision.com/prd/normal/all/image/m000162301/6.png?f=webp", link: "https://drive.google.com/file/d/1K9kP8_lLh-YWBpoYnKIhdQ3dzIeK_gXK/view?usp=sharing" }, canExtend: true, model: "DS-UPS02K48-R/TJS(O-STD)/EU/IEC", image: "https://assets.hikvision.com/prd/normal/all/image/m000162285/2.png?f=webp", link: "https://drive.google.com/drive/folders/1oe4OSvUd1l5wVk2l3_hUUIR4M8QxGpbQ" },
  { id: "p78", hebName: "אל-פסק אונליין 3KVA (ארון)", watts: 2700, category: "ups-online", internalWh: 648, performanceMatrix: { 0: [[1350,10],[2025,5.5],[2700,2.7]], 1: [[1350,45],[2025,23],[2700,19]], 2: [[1350,87],[2025,55],[2700,35.7]], 3: [[1350,122],[2025,78],[2700,55]], 4: [[1350,185],[2025,108],[2700,75]] }, extPack: { model: "DS-UPSB0972B-R/TJC", maxPacks: 4, image: "https://assets.hikvision.com/prd/normal/all/image/m000162302/6.png?f=webp", link: "https://drive.google.com/file/d/1K9kP8_lLh-YWBpoYnKIhdQ3dzIeK_gXK/view?usp=sharing" }, canExtend: true, model: "DS-UPS03K72-R/TJS(O-STD)/EU/IEC", image: "https://assets.hikvision.com/prd/normal/all/image/m000162286/2.png?f=webp", link: "https://drive.google.com/drive/folders/1oe4OSvUd1l5wVk2l3_hUUIR4M8QxGpbQ" },
  { id: "p82", hebName: "אל-פסק אונליין 6KVA (ארון)", watts: 6000, category: "ups-online", internalWh: 0, performanceMatrix: { 1: [[3000,19],[4500,10],[6000,4.8]], 2: [[3000,56.1],[4500,31.3],[6000,19.9]], 3: [[3000,78],[4500,48.4],[6000,34.2]], 4: [[3000,108],[4500,66],[6000,49]] }, extPack: { model: "DS-UPSB09192A-R/TJ(O-STD)", maxPacks: 4, image: "https://assets.hikvision.com/prd/normal/all/image/m000162308/6.png?f=webp", link: "https://drive.google.com/file/d/14OGu3A5EVqVTx6BOuafIk8OOpatACgRa/view?usp=sharing" }, canExtend: true, model: "DS-UPS06K-R/TJL", image: "https://assets.hikvision.com/prd/normal/all/image/m000162290/2.png?f=webp", link: "https://drive.google.com/file/d/1NvAL_B5rfdMR5S2yDEuWxioDQ1qq-9NI/view?usp=sharing" },
  { id: "p83", hebName: "אל-פסק אונליין 10KVA (ארון)", watts: 10000, category: "ups-online", internalWh: 0, performanceMatrix: { 1: [[5000,10.2],[7500,5],[10000,3.5]], 2: [[5000,27.2],[7500,15.3],[10000,9.5]], 3: [[5000,45.4],[7500,24.3],[10000,16.7]], 4: [[5000,61],[7500,36.6],[10000,26]] }, extPack: { model: "DS-UPSB09240A-R/TJ(O-STD)", maxPacks: 4, image: "https://assets.hikvision.com/prd/normal/all/image/m000162308/6.png?f=webp", link: "https://drive.google.com/file/d/14OGu3A5EVqVTx6BOuafIk8OOpatACgRa/view?usp=sharing" }, canExtend: true, model: "DS-UPS10K-R/TJL", image: "https://assets.hikvision.com/prd/normal/all/image/m000162291/2.png?f=webp", link: "https://drive.google.com/file/d/1NvAL_B5rfdMR5S2yDEuWxioDQ1qq-9NI/view?usp=sharing" }
];

function calculateFromMatrix(load: number, matrixArray: number[][]) {
  if (!matrixArray || matrixArray.length === 0) return 0;
  if (load <= 0) return 0;
  
  if (load <= matrixArray[0][0]) {
      let p = matrixArray[0];
      return Math.floor((p[0] * p[1]) / load);
  }
  let last = matrixArray[matrixArray.length - 1];
  if (load >= last[0]) {
      return Math.floor((last[0] * last[1]) / load);
  }
  
  for (let i = 0; i < matrixArray.length - 1; i++) {
      let p1 = matrixArray[i];
      let p2 = matrixArray[i + 1];
      if (load >= p1[0] && load <= p2[0]) {
          let fraction = (load - p1[0]) / (p2[0] - p1[0]);
          let wm1 = p1[0] * p1[1]; 
          let wm2 = p2[0] * p2[1]; 
          let interpWm = wm1 + fraction * (wm2 - wm1); 
          return Math.floor(interpWm / load); 
      }
  }
  return 0;
}

function formatTime(mins: number) {
  if (mins < 1) return "פחות מדקה";
  if (mins < 60) return `${Math.floor(mins)} דק'`;
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return m === 0 ? `${h} שעות` : `${h} שעות ו-${m} דק'`;
}

export const UPSCalculator: React.FC<{ catalogData?: any[], onAddToCart?: (product: any) => void, onAskAdvisor?: (question: string) => void }> = ({ catalogData = [], onAddToCart, onAskAdvisor }) => {
  const [load, setLoad] = useState<number>(100);
  const [tech, setTech] = useState<'line' | 'online_std' | 'online_ext'>('line');

  let categoryFilter = tech === 'line' ? 'ups-line' : 'ups-online';
  const efficiency = tech === 'line' ? 0.6 : 0.8;

  let upsProducts = rawProducts.filter(p => p.category === categoryFilter);
  if (tech === 'online_std') upsProducts = upsProducts.filter(p => !p.canExtend);
  if (tech === 'online_ext') upsProducts = upsProducts.filter(p => p.canExtend);

  const results = upsProducts.map((ups: any) => {
    if (ups.watts < load) return null;
    let configs: any[] = [];
    
    // Look for matching product in catalogData for real price and images
    const matchingCatalogItem = catalogData.find(item => 
      item.sku === ups.model || 
      (item.name && item.name.includes(ups.model.replace('-R/TS(O-STD)/EU/IEC', '').replace('(O-STD)EU', '')))
    );

    const finalImage = matchingCatalogItem?.images?.[0] || ups.image;
    const finalPrice = matchingCatalogItem?.price || 0;
    const finalName = matchingCatalogItem?.name || ups.hebName;
    const finalPriceType = matchingCatalogItem ? matchingCatalogItem.priceType || 'POY' : 'POY';
    
    if (ups.performanceMatrix) {
        let startPack = ups.internalWh === 0 ? 1 : 0;
        let maxPacks = ups.extPack ? ups.extPack.maxPacks : 0;
        for (let i = startPack; i <= maxPacks; i++) {
            if (ups.performanceMatrix[i]) {
                configs.push({ packs: i, mins: calculateFromMatrix(load, ups.performanceMatrix[i]) });
            }
        }
    } else {
        if (ups.internalWh > 0) {
            configs.push({ packs: 0, mins: Math.floor((ups.internalWh * efficiency * 60) / load) });
        }
    }
    
    return configs.length > 0 ? { ...ups, configs, finalImage, finalPrice, finalName, finalPriceType, matchingCatalogItem } : null;
  }).filter(u => u).sort((a: any, b: any) => a.watts - b.watts);

  return (
    <div className="bg-white border-b border-gray-200 overflow-y-auto max-h-[60vh] text-sm flex flex-col hide-scroll">
      <div className="p-4 bg-slate-50/50">
        <div className="flex items-center gap-1.5 font-bold text-[#0c2d57] mb-3 text-base">
          <Bolt className="w-5 h-5 text-[#fe8d00] fill-current" />
          מחשבון אל-פסק חכם (HIKVISION)
        </div>
        
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">הספק צרכנים צפוי בחיבור לאל-פסק:</label>
          <div className="flex items-center relative">
            <input 
              type="number" 
              value={load || ''}
              onChange={(e) => setLoad(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full text-center text-3xl font-black text-[#0c2d57] border border-gray-300 bg-white focus:border-[#fe8d00] focus:ring-2 focus:ring-orange-100 rounded-lg py-3 transition-all outline-none"
            />
            <span className="absolute left-6 font-bold text-gray-400 select-none pointer-events-none text-xl">W</span>
          </div>
        </div>

        <div className="flex bg-white p-1 rounded-md mb-4 border border-gray-200 shadow-sm relative gap-1">
          <button 
            onClick={() => setTech('line')} 
            className={`flex-1 text-[11px] font-bold py-2.5 rounded transition-colors text-center ${tech === 'line' ? 'bg-[#004387] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            אל פסק רגיל
          </button>
          <button 
            onClick={() => setTech('online_std')} 
            className={`flex-1 text-[11px] font-bold py-2.5 rounded transition-colors text-center ${tech === 'online_std' ? 'bg-[#004387] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            אונליין (Tower)
          </button>
          <button 
            onClick={() => setTech('online_ext')} 
            className={`flex-1 text-[11px] font-bold py-2.5 rounded transition-colors text-center ${tech === 'online_ext' ? 'bg-[#004387] text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            אונליין (RM)
          </button>
        </div>

        {load <= 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-center text-gray-400">
             <Info className="w-8 h-8 mx-auto mb-2 opacity-30" />
             <p className="text-sm font-semibold">אנא הזן עומס צפוי ליצירת המלצה</p>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-red-50 border border-red-100 rounded-lg p-5 text-center text-red-500">
             <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
             <p className="text-sm font-bold">אין תוצאות מתאימות בקטגוריה זו</p>
             <p className="text-xs mt-1 text-red-500/80">העומס חורג מהקיבולת הנתמכת בקטגוריה.</p>
          </div>
        ) : (
          <div className="space-y-3">
             <div className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider">ראו המלצות לפי העומס הנדרש:</div>
             {results.map((r: any, idx: number) => (
                <div key={r.id} className={`bg-white rounded-xl p-3.5 relative overflow-hidden ${idx === 0 ? 'border-2 border-[#fe8d00] shadow-sm' : 'border border-gray-200 shadow-sm'}`}>
                   {idx === 0 && <span className="absolute top-0 right-0 left-0 bg-[#fe8d00]/10 text-transparent h-full pointer-events-none" />}
                   
                   <div className="flex gap-3 items-start mb-3 relative z-10">
                     {r.finalImage && (
                       <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1">
                         <img src={r.finalImage} alt={r.model} className="max-w-full max-h-full object-contain mix-blend-multiply drop-shadow-sm" />
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-[#0c2d57] text-sm sm:text-base leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{r.finalName}</h3>
                       <div className="flex flex-wrap items-center gap-1.5 mt-1">
                         <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-semibold" dir="ltr">{r.model}</span>
                         {r.link && (
                           <a href={r.link} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 hover:bg-blue-100 whitespace-nowrap hover:underline cursor-pointer">
                             מפרט טכני
                           </a>
                         )}
                       </div>
                     </div>
                     <div className="bg-[#004387]/5 text-[#004387] px-2.5 py-1.5 rounded-lg flex flex-col items-center justify-center font-black text-xs shrink-0 border border-[#004387]/10">
                       <span className="text-[8px] opacity-60 font-semibold mb-0.5">הספק מירבי</span>
                       <span>{r.watts}W</span>
                     </div>
                   </div>

                   <div className="bg-[#f8f9fa] rounded-lg border border-gray-100 overflow-hidden mt-1 relative z-10">
                     <div className="bg-gray-100/80 px-2.5 py-1.5 text-[10px] text-gray-500 font-bold flex items-center gap-1.5 border-b border-gray-200/50">
                       <Clock className="w-3.5 h-3.5" /> זמן גיבוי צפוי לעומס של {load}W:
                     </div>
                     <div className="p-2 space-y-1.5">
                       {r.configs.map((c: any, ci: number) => {
                         let label = c.packs === 0 ? (r.canExtend ? 'המכשיר עצמו (ללא הרחבה)' : 'זמן גיבוי סוללה פנימית') : (r.internalWh === 0 && c.packs === 1 ? 'עם 1 מארז חיצוני (מינימום נדרש)' : `הוספת ${c.packs} מארזי סוללות לארון`);
                         return (
                           <div key={ci} className="flex justify-between items-center bg-white px-2.5 py-2 rounded border border-gray-100 shadow-sm transition-all hover:border-[#fe8d00]/30">
                             <div className="flex items-center gap-2 min-w-0">
                               {(c.packs > 0) ? <LayoutGrid className="w-4 h-4 text-[#fe8d00]" /> : <Zap className="w-4 h-4 text-[#004387]" />}
                               <span className="text-[11px] text-gray-700 font-semibold truncate">{label}</span>
                             </div>
                             <span className="text-xs font-black text-[#004387] bg-blue-50 px-2 py-1 rounded ml-1 shrink-0 border border-blue-100/50">{formatTime(c.mins)}</span>
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   <div className="flex gap-2 w-full mt-3">
                     {onAddToCart && (
                       <button
                         onClick={() => {
                           if (r.matchingCatalogItem) {
                             onAddToCart(r.matchingCatalogItem);
                           } else {
                             onAddToCart({
                               id: r.id,
                               sku: r.model,
                               name: r.finalName,
                               price: r.finalPrice, 
                               priceType: r.finalPriceType,
                               images: r.finalImage ? [r.finalImage] : [],
                               brand: "HIKVISION",
                               category: "אל-פסק (UPS)",
                               subcategory: r.category === "ups-line" ? "Line Interactive" : "Online"
                             });
                           }
                         }}
                         className="flex-1 bg-white border border-[#004387]/30 text-[#004387] hover:bg-[#004387]/5 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer"
                       >
                         <PackageOpen size={14} /> הוסף לעגלה
                       </button>
                     )}
                     {onAskAdvisor && (
                       <button
                         onClick={() => onAskAdvisor(`היי, תוכל לתת לי חוות דעת על מערכת האל-פסק מדגם ${r.model} עבור עומס של ${load}W?`)}
                         className="flex-1 bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer"
                       >
                         <Info size={14} className="text-amber-600" /> שאל יועץ
                       </button>
                     )}
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}
