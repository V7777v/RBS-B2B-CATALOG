import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  // INCLUSIONS:
  // Is a copper network cable category/subcategory OR name mentions network cable
  const isNetworkCable = 
    cat.includes('תשתיות') ||
    cat.includes('hikvision') ||
    name.includes('hikvision') ||
    (product.brand && String(product.brand).toLowerCase().includes('hikvision')) ||
    subcat.includes('כבלי רשת') ||
    subcat.includes('כבלים ואביזרים') ||
    subcat.includes('cat5') ||
    subcat.includes('cat6') ||
    subcat.includes('cat7') ||
    subcat.includes('cat8') ||`;

const replace = `  // INCLUSIONS:
  // Is a copper network cable category/subcategory OR name mentions network cable
  const isNetworkCable = 
    cat.includes('תשתיות') ||
    subcat.includes('כבלי רשת') ||
    subcat.includes('כבלים ואביזרים') ||
    subcat.includes('cat5') ||
    subcat.includes('cat6') ||
    subcat.includes('cat7') ||
    subcat.includes('cat8') ||`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find block");
}
