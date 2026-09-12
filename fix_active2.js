import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `      if (found && found.active) {`;
const replacement = `      if (found) {`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
