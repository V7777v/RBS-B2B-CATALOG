import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  `      if (selectedSubcategory === 'Inginium Full Channel' || selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {`,
  `      let prods: any[] = [];
      if (selectedSubcategory === 'Inginium Full Channel' || selectedSubcategory === 'מתגי ליבה ורשת מנוהלים') {`
);

content = content.replace(
  `         const prods = productsInCat.filter(p => p.subcategory === nestedName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');`,
  `         prods = productsInCat.filter(p => p.subcategory === nestedName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');`
);

content = content.replace(
  `         const prods = productsInCat.filter(p => p.subcategory === selectedSubcategory && p.nestedSubcategory === nestedName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');`,
  `         prods = productsInCat.filter(p => p.subcategory === selectedSubcategory && p.nestedSubcategory === nestedName && p.name !== 'מוצר הדגמה' && p.name !== 'קטגוריית אם');`
);

fs.writeFileSync('src/App.tsx', content);
