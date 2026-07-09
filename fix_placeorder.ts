import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setLastSentMethod('saved');")) {
    if (lines[i+1].includes("setOrderPlaced(true);")) {
       lines.splice(i+1, 0, "        props.setCart([]);");
       break;
    }
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
