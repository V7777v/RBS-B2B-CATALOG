import fs from 'fs';

// 1. In _lib/googleSheets.ts, remove limit and offset logic from fetchSheetDataV4
let libCode = fs.readFileSync('api/_lib/googleSheets.ts', 'utf-8');

libCode = libCode.replace(
  /let dataRows = rows.slice\(1\);\s*if \(offset\) \{[\s\S]*?if \(limit\) \{[\s\S]*?\}\s*\}/,
  'let dataRows = rows.slice(1);'
);

fs.writeFileSync('api/_lib/googleSheets.ts', libCode);

// 2. In api/sheets.ts, add processProductsSheet and apply limit/offset manually
let sheetsCode = fs.readFileSync('api/sheets.ts', 'utf-8');

const newCode = `
const PRODUCTS_GID = "1506812668";

function isAllowedForGuest(colName: string): boolean {
  const clean = colName.trim().replace(/\\s+/g, " ").toLowerCase();
  
  // Exact matches
  const exactAllowed = [
    "sku", "id", "מק״ט", "מקט", "מק'ט",
    "name", "שם", "שם מוצר",
    "category", "קטגוריה", 
    "subcategory", "תת קטגוריה",
    "nested subcategory", "niche category",
    "images", "תמונות", "imagesjson", "imageurl",
    "price", "מחיר", "retailprice", "מחיר צרכן",
    "description", "תיאור",
    "brand", "מותג",
    "isnew", "coming soon", "cooming soon",
    "active", "פעיל",
    "manuallink", "videolink", "specslink",
    "סקירת מוצרים", "סקירת מוצר", "reviewlink",
    "אישורי מעבדה", "labcerts"
  ];
  if (exactAllowed.includes(clean)) return true;

  // Partial matches for sales & clearance
  if (
    clean.includes("מבצע חם") || clean.includes("מבצע_חם") || clean.includes("hot sale") || clean.includes("hotsale") || clean === "מבצע" || clean === "מבצעים" ||
    clean.includes("סוג מבצע") || clean.includes("sale type") || clean.includes("saletype") || clean.includes("סוג המבצע") ||
    clean.includes("ערך מבצע") || clean.includes("sale value") || clean.includes("salevalue") || clean.includes("ערך המבצע") || clean.includes("מחיר מבצע") ||
    clean.includes("מציאון") || clean.includes("clearance") || clean.includes("מציאון מחיר מיוחד") || clean.includes("מחיר מיוחד מציאון") || clean.includes("מחיר מציאון")
  ) {
    // Make sure we don't accidentally allow "cost price" if it has these words (though unlikely)
    if (clean.includes("עלות") || clean.includes("סיטונאות") || clean.includes("סיטונאי")) return false;
    return true;
  }

  return false;
}

function processProductsSheet(csv: string, isAgentView: boolean, limit?: string, offset?: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (rows.length < 1) return csv;
  const header = rows[0];
  
  let keepIdx = new Set<number>();
  let activeColIdx = -1;
  
  header.forEach((c, i) => {
    const clean = String(c).trim().toLowerCase();
    if (clean === "active" || clean === "פעיל") {
      activeColIdx = i;
    }
    if (isAgentView) {
      keepIdx.add(i);
    } else {
      if (isAllowedForGuest(clean)) {
        keepIdx.add(i);
      }
    }
  });

  let dataRows = rows.slice(1).filter(r => !(r.length === 1 && r[0] === ""));
  
  // Filter inactive for guests
  if (!isAgentView) {
    dataRows = dataRows.filter(row => {
      if (activeColIdx === -1) return true;
      const val = String(row[activeColIdx] || "").trim().toLowerCase();
      if (val === "false" || val === "no" || val === "0" || val === "לא" || val === "n" || val === "f" || val === "לא פעיל") {
        return false;
      }
      return true;
    });
  }

  // Apply offset and limit
  if (offset) {
    const off = parseInt(offset, 10);
    if (!isNaN(off) && off > 0) dataRows = dataRows.slice(off);
  }
  if (limit) {
    const lim = parseInt(limit, 10);
    if (!isNaN(lim) && lim > 0) dataRows = dataRows.slice(0, lim);
  }

  const outRows = [header, ...dataRows].map(r => r.filter((_, i) => keepIdx.has(i)));
  return Papa.unparse(outRows);
}

function processOtherSheet(csv: string, isAgentView: boolean, limit?: string, offset?: string): string {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []) as string[][];
  if (rows.length < 1) return csv;
  const header = rows[0];
  
  let dropIdx = new Set<number>();
  if (!isAgentView) {
    header.forEach((c, i) => { 
      if (SENSITIVE_COLS.includes(String(c).trim())) dropIdx.add(i); 
    });
  }

  let dataRows = rows.slice(1).filter(r => !(r.length === 1 && r[0] === ""));

  if (offset) {
    const off = parseInt(offset, 10);
    if (!isNaN(off) && off > 0) dataRows = dataRows.slice(off);
  }
  if (limit) {
    const lim = parseInt(limit, 10);
    if (!isNaN(lim) && lim > 0) dataRows = dataRows.slice(0, lim);
  }

  const outRows = [header, ...dataRows].map(r => r.filter((_, i) => !dropIdx.has(i)));
  return Papa.unparse(outRows);
}
`;

sheetsCode = sheetsCode.replace('// --- Sensitive columns removed for non-agents (cost / wholesale) ---', newCode + '\n// --- Sensitive columns removed for non-agents (cost / wholesale) ---');

sheetsCode = sheetsCode.replace(
  'let csvString = await fetchSheetDataV4(String(gid), limit as string, offset as string, requestId);\n    if (!isAgentView) csvString = stripSensitiveColumns(csvString);',
  `let csvString = await fetchSheetDataV4(String(gid), undefined, undefined, requestId);
    
    if (String(gid) === PRODUCTS_GID) {
      csvString = processProductsSheet(csvString, isAgentView, limit as string, offset as string);
    } else {
      csvString = processOtherSheet(csvString, isAgentView, limit as string, offset as string);
    }`
);

fs.writeFileSync('api/sheets.ts', sheetsCode);
