import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/\\n      \{isNew && \(/g, '\n      {isNew && (');
content = content.replace(/\\n      \{sub\.isComingSoon && \(/g, '\n      {sub.isComingSoon && (');
content = content.replace(/\\n      \{sub\.isNew && !sub\.isComingSoon && \(/g, '\n      {sub.isNew && !sub.isComingSoon && (');
content = content.replace(/\\n      \{product\.isComingSoon && \(/g, '\n      {product.isComingSoon && (');
content = content.replace(/\\n      \{product\.isNew && !product\.isComingSoon && \(/g, '\n      {product.isNew && !product.isComingSoon && (');
fs.writeFileSync('src/App.tsx', content);
