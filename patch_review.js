import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `  const isClearance = clearanceVal === 'TRUE' || clearanceVal === 'YES' || clearanceVal === 'כן' || clearanceVal === '1' || clearanceVal === 'V' || clearanceVal === 'Y' || clearanceVal === 'פעיל' || clearanceVal === 'במבצע' || (subcategoryName && subcategoryName.includes('מציאון'));
  const clearancePrice = clearancePriceKey && row[clearancePriceKey as keyof typeof row] ? parsePrice(row[clearancePriceKey as keyof typeof row]) : null;

  // Parse Lab Certs
  const labCertsRaw = row['אישורי מעבדה'] || row.labCerts || row['labCerts'] || '';
  let labCerts: string[] = [];`;

const r1 = `  const isClearance = clearanceVal === 'TRUE' || clearanceVal === 'YES' || clearanceVal === 'כן' || clearanceVal === '1' || clearanceVal === 'V' || clearanceVal === 'Y' || clearanceVal === 'פעיל' || clearanceVal === 'במבצע' || (subcategoryName && subcategoryName.includes('מציאון'));
  const clearancePrice = clearancePriceKey && row[clearancePriceKey as keyof typeof row] ? parsePrice(row[clearancePriceKey as keyof typeof row]) : null;

  // Parse Product Review link (new sheet column: "סקירת מוצרים")
  const reviewRaw = row['סקירת מוצרים'] || row['סקירת מוצר'] || row.reviewLink || '';
  const reviewLink = (typeof reviewRaw === 'string' && reviewRaw.trim().startsWith('http')) ? reviewRaw.trim() : '';

  // Parse Lab Certs
  const labCertsRaw = row['אישורי מעבדה'] || row.labCerts || row['labCerts'] || '';
  let labCerts: string[] = [];`;

const t2 = `
  return {
    ...row,
    category: categoryName,
    subcategory: subcategoryName,
    nestedSubcategory: nestedSubcategoryName,`;

const r2 = `
  return {
    ...row,
    reviewLink: reviewLink,
    category: categoryName,
    subcategory: subcategoryName,
    nestedSubcategory: nestedSubcategoryName,`;

const t3 = `                  <h3 className="font-bold text-[#0c2d57] mb-4 text-base sm:text-lg border-[#004387]/15 border-b pb-2 text-right">מידע נוסף ומסמכים להורדה</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* SPECS LINK */}
                    {selectedProduct.specsLink && (
                      <div className="relative flex flex-col w-full">`;

const r3 = `                  <h3 className="font-bold text-[#0c2d57] mb-4 text-base sm:text-lg border-[#004387]/15 border-b pb-2 text-right">מידע נוסף ומסמכים להורדה</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* PRODUCT REVIEW LINK — opens in a new tab (no iframe, so no CSP entry is ever needed) */}
                    {selectedProduct.reviewLink && (
                      <div className="relative flex flex-col w-full">
                        <a
                          href={selectedProduct.reviewLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-3.5 bg-amber-50/60 border-2 border-amber-200 hover:border-amber-400 p-4 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer group w-full text-right"
                          style={{ minHeight: '80px' }}
                        >
                          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-amber-100 rounded-lg">
                            <Star size={24} className="text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#0c2d57] text-sm mb-0.5">סקירת מוצר</div>
                            <div className="text-[11px] text-gray-500 truncate">כתבה וסקירה מקצועית — נפתח בחלון חדש</div>
                          </div>
                        </a>
                      </div>
                    )}

                    {/* SPECS LINK */}
                    {selectedProduct.specsLink && (
                      <div className="relative flex flex-col w-full">`;

let fails = 0;
const pairs = [[t1, r1], [t2, r2], [t3, r3]];

for (let i = 0; i < pairs.length; i++) {
  if (content.includes(pairs[i][0])) {
    content = content.replace(pairs[i][0], pairs[i][1]);
    console.log("Replaced t" + (i+1) + " successfully.");
  } else {
    console.log("t" + (i+1) + " not found!");
    fails++;
  }
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find some blocks.");
}
