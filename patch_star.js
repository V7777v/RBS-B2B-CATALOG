import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  "ShoppingCart, Search, Menu",
  "Star, ShoppingCart, Search, Menu"
);

fs.writeFileSync('src/App.tsx', content);
