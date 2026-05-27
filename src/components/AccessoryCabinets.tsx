import React, { useState, useEffect } from 'react';
import { Server, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AccessoryCabinetsProps {
  product: any;
  catalogData: any[];
  ProductCard: React.FC<{ product: any }>;
}

export const AccessoryCabinets: React.FC<AccessoryCabinetsProps> = ({ product, catalogData, ProductCard }) => {
  const [loading, setLoading] = useState(true);
  const [compatibleCabinets, setCompatibleCabinets] = useState<any[]>([]);

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        setLoading(true);
        const MAIN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs/export?format=xlsx';
        const res = await fetch(MAIN_SHEET_URL);
        const buffer = await res.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });

        console.log('[AccessoryCabinets] Available sheets:', wb.SheetNames);
        const cabinetsSheetName = wb.SheetNames.find(n => n.includes('ארונות')) || 'טבלת ארונות מעודכנת';

        if (!wb.Sheets[cabinetsSheetName]) {
           console.error('[AccessoryCabinets] Sheet not found:', cabinetsSheetName, 'Available:', wb.SheetNames);
           setLoading(false);
           return;
        }

        const normalizeSku = (val: any): string => String(val ?? '').trim().toUpperCase();
        const productSkuNorm = normalizeSku(product.sku);

        const cabRows = XLSX.utils.sheet_to_json(wb.Sheets[cabinetsSheetName], { header: 1 }) as any[][];
        
        const compatibleSkus = new Set<string>();

        // Start from row 2
        for (let i = 2; i < cabRows.length; i++) {
           const row = cabRows[i];
           if (!row) continue;
           
           const cabSku = row[0];
           if (cabSku === undefined || cabSku === null) continue;

           const suitableStandard = row[12]?.toString() || '';
           const suitableHanging = row[13]?.toString() || '';
           const suitableSliding = row[14]?.toString() || '';

           const allSuitable = [
               ...suitableStandard.split(','),
               ...suitableHanging.split(','),
               ...suitableSliding.split(',')
           ].map(s => normalizeSku(s)).filter(s => s && s !== 'X');

           if (allSuitable.includes(productSkuNorm)) {
               compatibleSkus.add(normalizeSku(cabSku));
           }
        }

        const matchedCabinets = catalogData.filter(p => compatibleSkus.has(normalizeSku(p.sku)));
        setCompatibleCabinets(matchedCabinets);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching compatible cabinets:", error);
        setLoading(false);
      }
    };

    fetchAndParse();
  }, [product, catalogData]);

  if (loading) {
    return (
      <div className="mb-6 bg-gray-50 border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[150px]">
         <Loader2 className="animate-spin text-[#004387] mb-2" size={24} />
         <p className="text-gray-500 text-sm">בודק תאימות לארונות תקשורת...</p>
      </div>
    );
  }

  if (compatibleCabinets.length === 0) {
      return null;
  }

  return (
    <div className="mb-6 bg-[#e6f0fa]/30 border border-[#b3d4f5] p-6 shadow-sm animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-[#004387] mb-2 flex items-center gap-2">
        <Server size={24} />
        מתאים לסוגי ארונות ולמסדים אלו:
      </h3>
      <p className="text-gray-600 mb-6 font-medium">
        פריט זה ({product.name}) נמצא מתאים וניתן להתקנה במגוון ארונות תקשורת ומסדים:
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {compatibleCabinets.slice(0, 12).map(cabinet => (
           <ProductCard key={cabinet.id} product={cabinet} />
        ))}
      </div>
      {compatibleCabinets.length > 12 && (
          <p className="text-xs text-center mt-4 text-gray-500">ו- {compatibleCabinets.length - 12} ארונות נוספים...</p>
      )}
    </div>
  );
};
