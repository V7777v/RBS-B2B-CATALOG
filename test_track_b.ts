import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function run() {
  const prodCsv = await fetchSheetDataV4("1506812668");
  const prods = (Papa.parse(prodCsv, { header: true }).data) as any[];

  console.log("=== CHECK SUBCATEGORIES IN PRODUCTS_REACT ===");
  const subcats = new Set<string>();
  const nestedCats = new Set<string>();
  prods.forEach(p => {
    if (p.subcategory) subcats.add(String(p.subcategory).trim());
    const n = p['Nested subcategory'] || p.nestedSubcategory;
    if (n) nestedCats.add(String(n).trim());
  });
  console.log("Subcategories with ארון / אביזר / שקע:", Array.from(subcats).filter(s => s.includes('ארון') || s.includes('שקע')));
  console.log("Nested with ארון / אביזר / שקע:", Array.from(nestedCats).filter(s => s.includes('ארון') || s.includes('שקע')));

  console.log("\n=== ALL PRODUCTS IN 'ארונות תקשורת ואביזרים' ===");
  const cabProds = prods.filter(p => String(p.subcategory || '').trim() === 'ארונות תקשורת ואביזרים');
  console.log(`Total count: ${cabProds.length}`);
  
  const nestedCounts: Record<string, number> = {};
  cabProds.forEach(p => {
    const n = String(p['Nested subcategory'] || p.nestedSubcategory || 'EMPTY').trim();
    nestedCounts[n] = (nestedCounts[n] || 0) + 1;
  });
  console.log("Breakdown by nested subcategory:", nestedCounts);

  console.log("\n=== ALL PRODUCTS IN 'אביזרים לארונות תקשורת ' ===");
  const accs = cabProds.filter(p => String(p['Nested subcategory'] || p.nestedSubcategory || '').includes('אביזרים לארונות'));
  accs.forEach(p => {
    console.log(`SKU: ${p.sku} | Name: ${p.name} | Vol: "${p['נפח '] || p['נפח']}" | Suit: "${p['התאמה לארון '] || p['התאמה לארון']}"`);
  });

  console.log("\n=== ALL PRODUCTS IN 'פסי שקעים' ===");
  const pdus = prods.filter(p => {
    const hay = `${p.category || ''} ${p.subcategory || ''} ${p['Nested subcategory'] || ''} ${p.name || ''}`.toLowerCase();
    return hay.includes('פסי שקעים') || (String(p.subcategory || '').includes('ארונות') && hay.includes('שקע'));
  });
  pdus.forEach(p => {
    console.log(`SKU: ${p.sku} | Name: ${p.name} | Subcat: ${p.subcategory} | Nested: ${p['Nested subcategory']} | Vol: "${p['נפח '] || p['נפח']}"`);
  });
}
run();
