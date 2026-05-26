import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle, Plus, X, Server, Download, Box, AlertTriangle } from 'lucide-react';

interface Accessory {
  pn: string;
  description: string;
  uSize: number;
}

interface CabinetData {
  u: string;
  fans: string;
  wheels: string;
  levelingFeet: string;
  shelvesQty: string;
  suitableStandard: string;
  suitableHanging: string;
  suitableSliding: string;
}

interface CabinetConfiguratorProps {
  product: any;
}

export const CabinetConfigurator: React.FC<CabinetConfiguratorProps> = ({ product }) => {
  const [loading, setLoading] = useState(true);
  const [cabinetData, setCabinetData] = useState<CabinetData | null>(null);
  const [accessoriesDb, setAccessoriesDb] = useState<any[]>([]);
  
  const [totalU, setTotalU] = useState<number>(0);
  const [availableU, setAvailableU] = useState<number>(0);
  
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [compatibleAccessories, setCompatibleAccessories] = useState<Accessory[]>([]);
  const [selectedOptionals, setSelectedOptionals] = useState<Accessory[]>([]);
  
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [pendingAccessory, setPendingAccessory] = useState<Accessory | null>(null);

  // Constants for Data Fetching
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1pQdm3zM96oexFtATifE1wSBnIcJhIUcfCu-hbB8gslE/gviz/tq?tqx=out:csv';
  // TODO: Update these GIDs to the correct ones for your specific sheet tabs.
  const CABINETS_GID = 'YOUR_CABINETS_GID'; // e.g., '123456789'
  const ACCESSORIES_GID = '0'; // Assuming Accessories is the first sheet

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        setLoading(true);

        // Fetch Accessories Table
        const accRes = await fetch(`${SHEET_URL}&gid=${ACCESSORIES_GID}`);
        const accText = await accRes.text();
        const accData = Papa.parse(accText, { header: true }).data as any[];
        setAccessoriesDb(accData);

        // Fetch Cabinets Table
        // Note: For demonstration, if we cannot fetch the Cabinets GID, we will map 
        // the global product data assuming it has these fields, or simulate it.
        // If your original product object already contains these CSV columns, we use that directly:
        const cabData: CabinetData = {
          u: product['U'] || product['u'] || '0U',
          fans: product['Fans'] || '0',
          wheels: product['Wheels'] || 'No',
          levelingFeet: product['Leveling Feets'] || 'No',
          shelvesQty: product['Shelves'] || '0',
          suitableStandard: product['Suitable Shelves Standard'] || product['Suitable Shelves'] || '',
          suitableHanging: product['Suitable Shelves Hanging'] || '',
          suitableSliding: product['Suitable Shelves Sliding'] || ''
        };

        setCabinetData(cabData);

        // 1. Calculate U Capacity
        const uMatch = cabData.u.match(/(\d+)/);
        const parsedTotalU = uMatch ? parseInt(uMatch[1]) : 0;
        setTotalU(parsedTotalU);

        // Calculate used U from included items
        const shelvesQty = parseInt(cabData.shelvesQty) || 0;
        const initialUsedU = shelvesQty * 1; // Assuming each shelf is 1U
        setAvailableU(parsedTotalU - initialUsedU);

        // 2. Determine "What's in the Box" (Included Accessories)
        const included: string[] = [];
        if (cabData.fans && cabData.fans.toLowerCase() !== 'no' && cabData.fans !== '0' && cabData.fans !== '') included.push(`מאווררים: ${cabData.fans}`);
        if (cabData.wheels && cabData.wheels.toLowerCase() !== 'no' && cabData.wheels !== '') included.push('גלגלים');
        if (cabData.levelingFeet && cabData.levelingFeet.toLowerCase() !== 'no' && cabData.levelingFeet !== '') included.push('רגליות פילוס');
        if (shelvesQty > 0) included.push(`מדפים: ${shelvesQty}`);
        setIncludedItems(included);

        // 3. Strict Compatibility & EXCLUSION Filtering
        const allowedPNs = [
           ...cabData.suitableStandard.split(',').map(s => s.trim()),
           ...cabData.suitableHanging.split(',').map(s => s.trim()),
           ...cabData.suitableSliding.split(',').map(s => s.trim())
        ].filter(Boolean);

        // Convert the fetched accessories DB into compatible typed objects
        const filteredAccs = accData
          .filter(row => allowedPNs.includes(row['Shelves information P/N'] || row['P/N']))
          .map(row => ({
            pn: row['Shelves information P/N'] || row['P/N'] || '',
            description: row['Description'] || '',
            uSize: 1 // Default accessory U size. Can be mapped from a column if exists.
          }))
          .filter(acc => {
            // EXCLUSION RULE: DO NOT offer things already included.
            const desc = acc.description.toLowerCase();
            // If the accessory is a Wheel and we already have Wheels
            if (desc.includes('wheel') && included.some(i => i.includes('גלגלים'))) return false;
            // If the accessory is a Fan and we already have Fans
            if (desc.includes('fan') && included.some(i => i.includes('מאוורר'))) return false;
            // If the accessory is a Feet and we already have Feet
            if ((desc.includes('feet') || desc.includes('leveling')) && included.some(i => i.includes('רגליות'))) return false;
            
            return true;
          });

        setCompatibleAccessories(filteredAccs);
        setLoading(false);
        
      } catch (error) {
        console.error("Configurator Error:", error);
        setLoading(false);
      }
    };

    if (product) fetchAndParse();
  }, [product]);

  const handleAddOptional = (acc: Accessory) => {
    if (availableU - acc.uSize < 0) {
      setPendingAccessory(acc);
      setWarningModalOpen(true);
      return;
    }
    
    setSelectedOptionals(prev => [...prev, acc]);
    setAvailableU(prev => prev - acc.uSize);
  };

  const handleRemoveOptional = (index: number) => {
    const item = selectedOptionals[index];
    setSelectedOptionals(prev => prev.filter((_, i) => i !== index));
    setAvailableU(prev => prev + item.uSize);
  };

  const forceAddPending = () => {
    if (pendingAccessory) {
      setSelectedOptionals(prev => [...prev, pendingAccessory]);
      setAvailableU(prev => prev - pendingAccessory.uSize);
    }
    setWarningModalOpen(false);
    setPendingAccessory(null);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">טוען קונפיגורטור ארון...</div>;

  return (
    <div className="mt-8 bg-white border-2 border-[#004387] shadow-sm relative overflow-hidden" dir="rtl">
      
      {/* Header */}
      <div className="bg-[#004387] text-white p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Server size={24} />
          קונפיגורטור ארון תקשורת ({product.name})
        </h2>
        
        {/* U Capacity Tracker Badge */}
        <div className={`px-4 py-1 rounded-full font-bold text-sm tracking-wide shadow-inner flex items-center gap-2 ${availableU > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
          <Box size={16} />
          מקום פנוי: {availableU}U / {totalU}U
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* RULE 1: Included Accessories */}
        <div className="bg-gray-50 p-5 border border-gray-200">
          <h3 className="text-lg font-bold text-[#0c2d57] mb-4 border-b border-gray-200 pb-2">📦 כלול במארז (What's in the Box)</h3>
          {includedItems.length > 0 ? (
            <ul className="space-y-3">
              {includedItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">אין פריטים נלווים מוגדרים לארון זה.</p>
          )}
        </div>

        {/* RULE 2: Optional Accessories (Compatible & Excluded) */}
        <div className="border border-gray-200 p-5 bg-white">
           <h3 className="text-lg font-bold text-[#0c2d57] mb-4 border-b border-gray-200 pb-2">➕ שדרוגים ואביזרים תואמים</h3>
           {compatibleAccessories.length > 0 ? (
             <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
               {compatibleAccessories.map((acc, idx) => {
                 const isAdded = selectedOptionals.includes(acc);
                 return (
                   <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 hover:border-[#004387] transition-colors group">
                     <div>
                       <p className="font-semibold text-sm text-gray-800">{acc.pn}</p>
                       <p className="text-xs text-gray-500 truncate max-w-[200px]">{acc.description}</p>
                     </div>
                     <button 
                       onClick={() => handleAddOptional(acc)}
                       className="bg-[#004387] text-white p-2 rounded-full hover:bg-[#fe8d00] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004387]"
                       aria-label="Add Accessory"
                     >
                       <Plus size={16} />
                     </button>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="text-center p-6 bg-gray-50 text-gray-500 text-sm">
               לא נמצאו אביזרים תואמים לבחירה, או שכל התוספות כבר כלולות.
             </div>
           )}
        </div>

      </div>

      {/* Selected Optionals Review Area */}
      {selectedOptionals.length > 0 && (
        <div className="px-6 pb-6 mt-2">
          <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">תוספות שנבחרו:</h4>
          <div className="flex flex-wrap gap-2">
             {selectedOptionals.map((item, idx) => (
               <div key={idx} className="flex items-center gap-2 bg-[#e6f0fa] text-[#004387] border border-[#b3d4f5] px-3 py-1.5 rounded text-sm font-medium animate-in zoom-in duration-200">
                 <span>{item.pn} ({item.uSize}U)</span>
                 <button onClick={() => handleRemoveOptional(idx)} className="text-[#004387] hover:text-red-500 ml-2">
                   <X size={14} />
                 </button>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* WARNING MODAL (Rule 3) */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-md w-full p-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200 border-t-4 border-red-500">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">אזהרת קיבולת (U)</h3>
            <p className="text-gray-600 mb-6 text-sm">
              הארון מלא. הגעת לקיבולת המקסימלית של {totalU}U.
              <br/><br/>
              האם אתה בטוח שברצונך להוסיף את הפריט <strong>{pendingAccessory?.pn}</strong>? יתכן ולא יישאר מקום פיזי בארון עבורו.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setWarningModalOpen(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={forceAddPending}
                className="px-5 py-2 bg-red-500 text-white hover:bg-red-600 font-semibold transition-colors shadow-sm"
              >
                הוסף בכל זאת (חריגה)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

