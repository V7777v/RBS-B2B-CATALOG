import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// I saw parsing logic at the beginning of the file.
console.log(content.substring(130, 180));
