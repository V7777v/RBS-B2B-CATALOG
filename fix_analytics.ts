import fs from 'fs';
let content = fs.readFileSync('src/lib/analytics.ts', 'utf-8');
content = content.replace(/if \(import\.meta\.env\.DEV\)/g, "if (// @ts-ignore\nimport.meta.env.DEV)");
fs.writeFileSync('src/lib/analytics.ts', content);
