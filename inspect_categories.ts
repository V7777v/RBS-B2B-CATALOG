import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const csv = await fetchSheetDataV4("1506812668");
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: false });
  const rows = parsed.data as any[];

  const catMap = new Map<string, number>();
  const subcatMap = new Map<string, number>();
  
  rows.forEach(r => {
    const c = String(r.category || '').trim();
    const sc = String(r.subcategory || '').trim();
    catMap.set(c, (catMap.get(c) || 0) + 1);
    subcatMap.set(sc, (subcatMap.get(sc) || 0) + 1);
  });

  console.log('Categories:');
  for (const [k, v] of catMap.entries()) {
    if (k.includes('ארון') || k.includes('אביזר') || k.includes('מדף') || k.includes('תקשורת') || v < 10) {
      console.log(`Cat: "${k}" (${v})`);
    }
  }

  console.log('\nSubcategories related to cabinets/accessories:');
  for (const [k, v] of subcatMap.entries()) {
    if (k.includes('ארון') || k.includes('אביזר') || k.includes('מדף') || k.includes('פס') || k.includes('שקע') || k.includes('אוורור') || k.includes('מסד')) {
      console.log(`Subcat: "${k}" (${v})`);
    }
  }
}
test();
