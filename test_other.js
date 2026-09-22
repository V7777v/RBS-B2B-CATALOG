import Papa from "papaparse";

const csv = "A,B,C,מחיר עלות\n1,2,3,4\n5,6,7,8";
const SENSITIVE_COLS = ["מחיר עלות", "מחיר סיטונאות", "מחיר סיטונאי"];

function processOtherSheet(csv, isAgentView, limit, offset) {
  const parsed = Papa.parse(csv, { skipEmptyLines: false });
  const rows = (parsed.data || []);
  if (rows.length < 1) return csv;
  const header = rows[0];
  
  let dropIdx = new Set();
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

console.log(processOtherSheet(csv, false, "1", "1"));
