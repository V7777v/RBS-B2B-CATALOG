import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function run() {
  const prodCsv = await fetchSheetDataV4("1506812668");
  const prods = (Papa.parse(prodCsv, { header: true }).data) as any[];

  const compCsv = await fetchSheetDataV4("1366808268");
  const compRows = (Papa.parse(compCsv, { header: false }).data) as any[][];

  console.log("=== CHECK SPECIFIC SKUs ===");
  const targetSkus = ['2232', '831010'];
  for (const t of targetSkus) {
    const foundProd = prods.find((p: any) => String(p.sku || '').trim() === t);
    console.log(`\nProduct in Products_React for ${t}:`, foundProd ? {
      sku: foundProd.sku,
      name: foundProd.name,
      category: foundProd.category,
      subcategory: foundProd.subcategory,
      nested: foundProd['Nested subcategory'] || foundProd.nestedSubcategory,
      active: foundProd.active,
      vol: foundProd['נפח '] || foundProd['נפח'] || foundProd['נפח בארון'],
      suit: foundProd['התאמה לארון '] || foundProd['התאמה לארון'] || foundProd.tags
    } : 'NOT FOUND');

    const foundComp = compRows.filter(r => String(r[0] || '').trim() === t);
    console.log(`Rows in comp sheet (1366808268) for ${t}:`, foundComp);
  }

  console.log("\n=== CHECK PDU / פסי שקעים IN Products_React ===");
  const pduProds = prods.filter((p: any) => {
    const hay = `${p.category || ''} ${p.subcategory || ''} ${p['Nested subcategory'] || ''} ${p.name || ''}`.toLowerCase();
    return hay.includes('שקע') || hay.includes('pdu');
  });
  console.log(`Found ${pduProds.length} items with שקע/pdu in Products_React.`);
  pduProds.forEach(p => {
    console.log(`- SKU: ${p.sku} | Name: ${p.name} | Subcat: ${p.subcategory} | Nested: ${p['Nested subcategory']} | Suit: ${p['התאמה לארון '] || p['התאמה לארון']} | Vol: ${p['נפח '] || p['נפח']}`);
  });

  console.log("\n=== CHECK ALL ITEMS in Subcat 'אביזרים לארונות תקשורת' or category with ארונות ===");
  const cabAccProds = prods.filter((p: any) => {
    const sub = String(p.subcategory || '').trim();
    const cat = String(p.category || '').trim();
    return sub.includes('אביזרים') || cat.includes('ארונות');
  });
  console.log(`Total in sub/cat: ${cabAccProds.length}`);
  const sample = cabAccProds.slice(0, 15);
  sample.forEach(p => {
    console.log(`- SKU: ${p.sku} | Name: ${p.name} | Subcat: ${p.subcategory} | Nested: ${p['Nested subcategory']} | Suit: ${p['התאמה לארון '] || p['התאמה לארון']} | Vol: ${p['נפח '] || p['נפח']}`);
  });
}
run();
