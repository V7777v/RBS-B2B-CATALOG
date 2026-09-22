import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/trackEvent\('send_favorites_whatsapp', \{ items_count: items.length \}\);\n                trackEvent\('send_favorites_whatsapp', \{ items_count: items.length \}\);/g, "trackEvent('send_favorites_whatsapp', { items_count: items.length });");

fs.writeFileSync('src/App.tsx', content);
