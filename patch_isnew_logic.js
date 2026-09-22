import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `isNew: productsInCat.some(p => (p.subcategory === subName || (subName === 'Inginium Full Channel' && p.subcategory?.startsWith('Inginium - '))) && p.isNew),`;
const r1 = `isNew: (sheetSub?.isNew === true) || productsInCat.some(p => (p.subcategory === subName || (subName === 'Inginium Full Channel' && p.subcategory?.startsWith('Inginium - '))) && p.isNew),`;

const t2 = `isNew: prods.some(p => p.nestedSubcategory === nestedName && p.isNew),`;
const r2 = `isNew: (sheetSub?.isNew === true) || prods.some(p => p.nestedSubcategory === nestedName && p.isNew),`;

const t3 = `isNew: prods.some(p => p.nicheCategory === nicheName && p.isNew),`;
const r3 = `isNew: (sheetSub?.isNew === true) || prods.some(p => p.nicheCategory === nicheName && p.isNew),`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }
if (content.includes(t3)) { content = content.replace(t3, r3); } else { console.log('t3 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
