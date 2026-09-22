import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const detailsText = 'הזמנה (עודכנה על ידי הלקוח)")) {
    if (!lines[i].includes("';")) {
       // it's broken! Join with next 2 lines
       lines[i] = lines[i] + "\\n" + lines[i+1] + "\\n" + lines[i+2];
       lines[i+1] = '';
       lines[i+2] = '';
    }
  }
  if (lines[i].includes("const detailsText = 'הזמנה (עודכנה ע\"י הסוכן)")) {
    if (!lines[i].includes("';") && !lines[i].includes("') +")) {
       lines[i] = lines[i] + "\\n" + lines[i+1] + "\\n" + lines[i+2];
       lines[i+1] = '';
       lines[i+2] = '';
    }
  }
}

fs.writeFileSync('src/App.tsx', lines.filter(x => x !== '').join('\n'));
