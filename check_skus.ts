import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const compCsv = await fetchSheetDataV4("1366808268");
  const compRows = (Papa.parse(compCsv, { header: false }).data) as any[][];
  const compSkus = new Map<string, { desc: string; range: string }>();
  for (const r of compRows) {
    const sku = String(r[0] ?? '').trim();
    if (sku && /^[0-9]/.test(sku)) {
      compSkus.set(sku, { desc: String(r[1] ?? '').trim(), range: String(r[5] ?? '').trim() });
    }
  }

  const prodCsv = await fetchSheetDataV4("1506812668");
  const prodRows = (Papa.parse(prodCsv, { header: true }).data) as any[];
  const prodMap = new Map<string, any>();
  prodRows.forEach(r => {
    if (r.sku) prodMap.set(String(r.sku).trim(), r);
  });

  const cabCsv = await fetchSheetDataV4("250535112");
  const cabRows = (Papa.parse(cabCsv, { header: false }).data) as any[][];
  const matrixShelves = new Set<string>();
  for (let i = 2; i < cabRows.length; i++) {
    const r = cabRows[i];
    if (!r) continue;
    [r[12], r[13], r[14]].forEach(cell => {
      const s = String(cell ?? '').trim();
      if (s && s !== 'X') {
        s.split(/[\s,;\n]+/).forEach(x => {
          if (x && x !== 'X') matrixShelves.add(x.trim());
        });
      }
    });
  }

  console.log('Matrix shelves unique SKUs:', Array.from(matrixShelves));
  console.log('Compat sheet SKUs:', Array.from(compSkus.keys()));

  console.log('\nCheck if matrix shelves are in compat sheet:');
  for (const s of matrixShelves) {
    console.log(`Shelf ${s}: in compat? ${compSkus.has(s)}, in Products_React? ${prodMap.has(s)}`);
  }

  console.log('\nCheck if compat sheet SKUs are in Products_React:');
  for (const [s, data] of compSkus.entries()) {
    console.log(`Compat SKU ${s} (${data.desc}): in Products_React? ${prodMap.has(s)}, in Matrix? ${matrixShelves.has(s)}`);
  }
}
test();
