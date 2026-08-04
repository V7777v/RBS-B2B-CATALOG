import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all origin-bottom-left animate-pulse`;
const replacement1 = `transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all origin-bottom-left`;

let fails = 0;
if (content.includes(target1)) { 
    content = content.replaceAll(target1, replacement1); 
} else { 
    console.log('t1 failed'); fails++; 
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
