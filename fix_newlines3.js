import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/\\n/g, '\n');
fs.writeFileSync('src/App.tsx', content);
