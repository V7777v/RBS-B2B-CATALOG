import fs from 'fs';
let content = fs.readFileSync('api/sheets.ts', 'utf-8');

const target = `"sku", "id", "מק״ט", "מקט", "מק'ט",`;
const replacement = `"", "sku", "id", "מק״ט", "מקט", "מק'ט",`;

content = content.replace(target, replacement);

fs.writeFileSync('api/sheets.ts', content);
