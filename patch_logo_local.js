import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replaceAll(
  'https://drive.google.com/uc?export=view&id=1zLQmLHHe7x2ZzGv9dYPayNUMnIGDEQli',
  '/new-logo.png'
);

fs.writeFileSync('src/App.tsx', content);
console.log("SUCCESS");
