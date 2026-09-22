import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `        isComingSoon: sheetSub?.isComingSoon === true,
        image: customImage || getFallbackImage(subName) || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(subName),`;
const r1 = `        isComingSoon: sheetSub?.isComingSoon === true,
        isNew: productsInCat.some(p => (p.subcategory === subName || (subName === 'Inginium Full Channel' && p.subcategory?.startsWith('Inginium - '))) && p.isNew),
        image: customImage || getFallbackImage(subName) || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(subName),`;

const t2 = `        isComingSoon: sheetSub?.isComingSoon === true,
        image: customImage || getFallbackImage(nestedName) || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(nestedName),`;
const r2 = `        isComingSoon: sheetSub?.isComingSoon === true,
        isNew: prods.some(p => p.nestedSubcategory === nestedName && p.isNew),
        image: customImage || getFallbackImage(nestedName) || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(nestedName),`;

const t3 = `        isComingSoon: sheetSub?.isComingSoon === true,
        image: customImage || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(nicheName),`;
const r3 = `        isComingSoon: sheetSub?.isComingSoon === true,
        isNew: prods.some(p => p.nicheCategory === nicheName && p.isNew),
        image: customImage || firstProductImage || 'https://placehold.co/600x400/f3f4f6/000000?text=' + encodeURIComponent(nicheName),`;


let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }
if (content.includes(t3)) { content = content.replace(t3, r3); } else { console.log('t3 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
