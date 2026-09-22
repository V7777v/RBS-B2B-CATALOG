import { fetchSheetDataV4 } from "./api/_lib/googleSheets.js";
import Papa from 'papaparse';

async function test() {
  const csv = await fetchSheetDataV4("1506812668");
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: false });
  const rows = parsed.data as any[];
  console.log('Total rows in Products_React:', rows.length);

  const flagValues = new Map<string, number>();
  const volValues = new Map<string, number>();
  
  let flaggedCount = 0;
  const flaggedProducts: any[] = [];
  const nonFlaggedWithVol: any[] = [];

  rows.forEach((r, idx) => {
    // Find the suitability column
    let suitVal = '';
    for (const k of Object.keys(r)) {
      if (k.trim() === 'התאמה לארון' || k.trim() === 'התאמה לארון ') {
        suitVal = r[k];
        break;
      }
    }
    const cleanSuit = String(suitVal ?? '').trim();
    flagValues.set(cleanSuit, (flagValues.get(cleanSuit) || 0) + 1);

    // Find the volume column
    let volVal = '';
    for (const k of Object.keys(r)) {
      if (k.trim() === 'נפח' || k.trim() === 'נפח בארון') {
        volVal = r[k];
        break;
      }
    }
    const cleanVol = String(volVal ?? '').trim();
    if (cleanVol !== '') {
      volValues.set(cleanVol, (volValues.get(cleanVol) || 0) + 1);
    }

    const isMatchFlag = /^(true|yes|כן|v|1)$/i.test(cleanSuit);
    if (isMatchFlag) {
      flaggedCount++;
      flaggedProducts.push({
        sku: r.sku,
        name: r.name,
        category: r.category,
        subcategory: r.subcategory,
        suitVal: cleanSuit,
        volVal: cleanVol
      });
    } else if (cleanVol !== '') {
      nonFlaggedWithVol.push({
        sku: r.sku,
        name: r.name,
        category: r.category,
        suitVal: cleanSuit,
        volVal: cleanVol
      });
    }
  });

  console.log('\n--- Flag values distribution ---');
  for (const [v, c] of flagValues.entries()) {
    console.log(`"${v}": ${c}`);
  }

  console.log('\n--- Volume values distribution ---');
  for (const [v, c] of volValues.entries()) {
    console.log(`"${v}": ${c}`);
  }

  console.log(`\nTotal flagged products: ${flaggedCount}`);
  flaggedProducts.forEach(p => console.log(`[FLAGGED] SKU: ${p.sku} | Name: ${p.name} | Vol: "${p.volVal}" | Cat: ${p.category} > ${p.subcategory}`));

  console.log(`\nTotal non-flagged with volume: ${nonFlaggedWithVol.length}`);
  nonFlaggedWithVol.forEach(p => console.log(`[NON-FLAGGED W/ VOL] SKU: ${p.sku} | Name: ${p.name} | Vol: "${p.volVal}" | Flag: "${p.suitVal}"`));
}
test();
