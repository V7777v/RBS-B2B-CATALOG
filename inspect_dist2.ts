import fs from 'fs';

const code = fs.readFileSync('dist/assets/CabinetConfigurator-BccCGWX8.js', 'utf-8');
const matches = code.match(/[a-zA-Z0-9_$]+CatalogAccessories|[a-zA-Z0-9_$]+Accessories/g);
console.log('Matches:', Array.from(new Set(matches || [])));

const idx = code.indexOf('אביזרים לארונות תקשורת');
if (idx !== -1) {
  console.log('Context around אביזרים:');
  console.log(code.substring(idx - 200, idx + 600));
}
