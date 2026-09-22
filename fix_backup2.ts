import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setLastSentMethod('saved');")) {
     lines.splice(i+1, 0, "        setCompletedCart([...cart]);");
     break;
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
