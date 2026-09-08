import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix the regexes and string splits
content = content.replace(/split\(\/\[\n/g, "split(/[\\n");
content = content.replace(/split\('\n/g, "split('\\n");

fs.writeFileSync('src/App.tsx', content);
