import fs from 'fs';

const code = fs.readFileSync('dist/assets/CabinetConfigurator-BccCGWX8.js', 'utf-8');
const idx = code.indexOf('if(/מחלץ|extractor|כלי\\b|too');
console.log(code.substring(idx, idx + 1000));
