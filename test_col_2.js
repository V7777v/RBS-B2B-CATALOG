import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

const col2 = `{/* Column 2: Selected Optionals & Included Items (Middle side) */}`;
console.log("col2", content.includes(col2), content.includes("className={`@4xl:block ${mobileTab === 'summary'"));

const col3 = `{/* Right Panel: Optional Upgrades */}`;
console.log("col3", content.includes(col3), content.includes("className={`@4xl:block ${mobileTab === 'accessories'"));
