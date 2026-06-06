const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const lines = content.split('\n');

const corruptedLineIndex = 352; // 0-indexed line 353

let corruptedLine = lines[corruptedLineIndex];

// The string that was inserted Everywhere
const searchString = 'onClick={onClick || (() => navigateToSubcategory && navigateToSubcategory(sub.name))}';

// Remove it
let recovered = corruptedLine.split(searchString).join('');

lines[corruptedLineIndex] = recovered;

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log("RECOVERED!");
