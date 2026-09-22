import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');
console.log(content.substring(content.indexOf('// 2. Optional accessories'), content.indexOf('const qty = opt.quantity || 1;')));
