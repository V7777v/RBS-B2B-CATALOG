import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replaceAll(
  'https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png',
  'https://drive.google.com/uc?export=view&id=1zLQmLHHe7x2ZzGv9dYPayNUMnIGDEQli'
);

fs.writeFileSync('src/App.tsx', content);
console.log("SUCCESS");
