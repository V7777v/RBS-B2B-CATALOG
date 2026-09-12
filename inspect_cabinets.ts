import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const csv = await fetchSheetDataV4("250535112");
  const parsed = Papa.parse(csv, { header: false, skipEmptyLines: false });
  console.log('Total rows in 250535112:', parsed.data.length);
  parsed.data.forEach((r, idx) => {
    if (idx < 6) console.log(idx, JSON.stringify(r));
  });
}
test();
