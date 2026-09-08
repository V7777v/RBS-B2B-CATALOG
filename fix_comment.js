import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Attach quotes to each customer group')) {
    lines[i] = lines[i].replace('\\n', '\n');
  }
}
fs.writeFileSync('src/App.tsx', lines.join('\n'));
