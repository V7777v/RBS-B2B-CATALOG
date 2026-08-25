import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/<MessageSquare, Copy size={/g, '<MessageSquare size={');
fs.writeFileSync('src/App.tsx', content);
