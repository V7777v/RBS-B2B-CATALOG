import fs from 'fs';

const code = fs.readFileSync('dist/assets/CabinetConfigurator-BccCGWX8.js', 'utf-8');
const idx = code.indexOf('buildCatalogAccessories');
if (idx !== -1) {
  console.log('Found buildCatalogAccessories:');
  console.log(code.substring(idx - 100, idx + 1200));
} else {
  console.log('Not found');
}
