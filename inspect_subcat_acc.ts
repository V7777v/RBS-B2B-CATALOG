import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const csv = await fetchSheetDataV4("1506812668");
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: false });
  const rows = parsed.data as any[];

  rows.forEach(r => {
    const sc = String(r.subcategory || '').trim();
    if (sc === 'ארונות תקשורת ואביזרים') {
      console.log(`SKU: ${r.sku} | Name: ${r.name} | Nested: ${r['Nested subcategory'] || r.nestedSubcategory} | Niche: ${r['Niche Category'] || r.nicheCategory}`);
    }
  });
}
test();
