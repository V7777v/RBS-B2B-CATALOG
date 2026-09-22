import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Line 330:
content = content.replace("s.startsWith('http'));\\n          }", "s.startsWith('http'));\n          }");

// Line 338:
content = content.replace("s.startsWith('http'));      }\\n      if (!itemImages", "s.startsWith('http'));      }\n      if (!itemImages");

fs.writeFileSync('src/App.tsx', content);
