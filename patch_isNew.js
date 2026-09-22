import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `  const isComingSoon = row['Coming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE' || row['Cooming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE';`;
const replace1 = `  const isComingSoon = row['Coming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE' || row['Cooming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE';
  const isNewColKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'isnew');
  const isNew = isNewColKey ? (row[isNewColKey]?.toString()?.trim()?.toUpperCase() === 'TRUE' || row[isNewColKey]?.toString()?.trim()?.toUpperCase() === 'YES' || row[isNewColKey]?.toString()?.trim() === 'כן') : false;`;

const target2 = `    isComingSoon: isComingSoon,
    isHotSale: isHotSale,`;
const replace2 = `    isComingSoon: isComingSoon,
    isNew: isNew,
    isHotSale: isHotSale,`;

const target3 = `         const isComingSoon = row['Coming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE' || row['Cooming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE';`;
const replace3 = `         const isComingSoon = row['Coming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE' || row['Cooming Soon']?.toString()?.trim()?.toUpperCase() === 'TRUE';
         const isNewColKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'isnew');
         const isNew = isNewColKey ? (row[isNewColKey]?.toString()?.trim()?.toUpperCase() === 'TRUE' || row[isNewColKey]?.toString()?.trim()?.toUpperCase() === 'YES' || row[isNewColKey]?.toString()?.trim() === 'כן') : false;`;

const target4 = `           isComingSoon: isComingSoon,
           image: subImage,`;
const replace4 = `           isComingSoon: isComingSoon,
           isNew: isNew,
           image: subImage,`;

let fails = 0;
if (content.includes(target1)) { content = content.replace(target1, replace1); } else { console.log('target1 failed'); fails++; }
if (content.includes(target2)) { content = content.replace(target2, replace2); } else { console.log('target2 failed'); fails++; }
if (content.includes(target3)) { content = content.replace(target3, replace3); } else { console.log('target3 failed'); fails++; }
if (content.includes(target4)) { content = content.replace(target4, replace4); } else { console.log('target4 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
