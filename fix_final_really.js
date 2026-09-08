import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace these literal `\n` with real newlines!
content = content.replace(/\{\\n\s*code:/g, '{\n        code:');
content = content.replace(/unknown',\\n\s*hasCurrentUser:/g, "unknown',\n        hasCurrentUser:");
content = content.replace(/\}, \[userUid\]\);\\n\s*const \[compareItems/g, "}, [userUid]);\n  const [compareItems");
content = content.replace(/<\/div>\\n\s*<\/div>/g, "</div>\n            </div>");
content = content.replace(/<\/>\\n\s*\}\)/g, "</>\n                )}");
content = content.replace(/text-center">\\n\s*<div/g, 'text-center">\n                    <div');
content = content.replace(/\/>\\n\s*<Search/g, '/>\n                  <Search');
content = content.replace(/<\/div>\\n\s*\{\/\* Status Tabs/g, '</div>\n                {/* Status Tabs');
content = content.replace(/\)\}\\n\s*\{\/\* Floating Action Bar/g, ')}\n      {/* Floating Action Bar');

fs.writeFileSync('src/App.tsx', content);
