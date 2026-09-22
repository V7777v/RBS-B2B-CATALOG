import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const prodCsv = await fetchSheetDataV4("1506812668");
  const parsed = Papa.parse(prodCsv, { header: true });
  const rows = parsed.data as any[];

  const testSkus = ['1024', '150461', '8215', '8214', '2233', '2232', '806121111', '101008', 'DS-3E1518P-EI_M'];
  rows.filter(r => testSkus.includes(String(r.sku).trim())).forEach(r => {
    console.log(`SKU: ${r.sku} | subcat: "${r.subcategory}" | nested: "${r['Nested subcategory']}" | suit: "${r['התאמה לארון ']}" | vol: "${r['נפח ']}"`);
  });
}
test();
