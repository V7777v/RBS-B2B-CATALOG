import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  // If a line has an unclosed single quote and next line exists
  let singleQuoteCount = (lines[i].match(/'/g) || []).length;
  // This is naive. 
}
