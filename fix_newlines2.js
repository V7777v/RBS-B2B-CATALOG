import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/\\ninterface CatalogCardProps/g, '\ninterface CatalogCardProps');
fs.writeFileSync('src/App.tsx', content);
