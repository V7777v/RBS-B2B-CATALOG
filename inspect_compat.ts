import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const csv = await fetchSheetDataV4("1366808268");
  const parsed = Papa.parse(csv, { header: false, skipEmptyLines: false });
  console.log('Total rows in 1366808268:', parsed.data.length);
  parsed.data.forEach((r, idx) => {
    if (idx < 25) console.log(idx, JSON.stringify(r));
  });
}
test();
