import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function run() {
  const compCsv = await fetchSheetDataV4("1366808268");
  const compRows = (Papa.parse(compCsv, { header: false }).data) as any[][];
  console.log(`Comp rows total: ${compRows.length}`);
  compRows.forEach((r, idx) => {
    if (!r[0] || !r[0].trim()) return;
    console.log(`Row ${idx}: SKU: ${r[0]} | Name: ${r[1]} | Col2: ${r[2]} | Col3: ${r[3]} | Col4: ${r[4]} | Range: "${r[5]}"`);
  });
}
run();
