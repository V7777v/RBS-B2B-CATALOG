import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function run() {
  const prodCsv = await fetchSheetDataV4("1506812668");
  const prods = (Papa.parse(prodCsv, { header: true }).data) as any[];

  const compCsv = await fetchSheetDataV4("1366808268");
  const compRows = (Papa.parse(compCsv, { header: false }).data) as any[][];

  console.log("Searching for 2232:");
  const p2232 = prods.filter(p => String(p.sku || '').includes('2232'));
  console.log("Products_React matches for 2232:", p2232);
  const c2232 = compRows.filter(r => String(r[0] || '').includes('2232'));
  console.log("Comp sheet matches for 2232:", c2232);

  console.log("\nSearching for 831010:");
  const p831010 = prods.filter(p => String(p.sku || '').includes('831010'));
  console.log("Products_React matches for 831010:", p831010);
  const c831010 = compRows.filter(r => String(r[0] || '').includes('831010'));
  console.log("Comp sheet matches for 831010:", c831010);

  console.log("\nSearching for LED / תאורה in Products_React:");
  const leds = prods.filter(p => `${p.name || ''} ${p.description || ''}`.includes('תאור'));
  console.log("LED/lighting products in Products_React:", leds.map(p => ({
    sku: p.sku, name: p.name, subcategory: p.subcategory, nested: p['Nested subcategory'] || p.nestedSubcategory,
    suit: p['התאמה לארון '] || p['התאמה לארון'], vol: p['נפח '] || p['נפח']
  })));

  console.log("\nSearching for LED / תאורה in Comp sheet (1366808268):");
  const compLeds = compRows.filter(r => `${r[0] || ''} ${r[1] || ''}`.includes('תאור') || `${r[0] || ''} ${r[1] || ''}`.includes('LED') || `${r[0] || ''}`.includes('831010'));
  console.log("LED/lighting in comp sheet:", compLeds);
}
run();
