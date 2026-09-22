import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

const col1 = `{/* Column 1: Interactive Server Rack Simulator (Right side) */}`;
console.log(content.includes(col1));
