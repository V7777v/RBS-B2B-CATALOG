import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `absolute top-3 right-3 z-20 bg-gradient-to-br from-emerald-400 to-green-600`;
const r1 = `absolute top-3 left-3 z-20 bg-gradient-to-br from-emerald-400 to-green-600`;

const t2 = `absolute top-4 right-4 z-20 bg-gradient-to-br from-emerald-400 to-green-600`;
const r2 = `absolute top-4 left-4 z-20 bg-gradient-to-br from-emerald-400 to-green-600`;

let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
