import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix ProductCard
content = content.replace(
  /<div\n\s*onClick=\{\(\) => navigateToProduct\(product\)\}\n\s*className=\{\`group flex flex-col h-full rounded-none bg-white overflow-hidden shadow-\[0_5px_15px_rgba\(0,0,0,0\.05\)\] hover:shadow-\[0_12px_25px_rgba\(0,0,0,0\.1\)\] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100 relative\`\}/g,
  `<div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToProduct(product);
          }
        }}
        onClick={() => navigateToProduct(product)}
        className={\`group flex flex-col h-full rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100 relative\`}`
);

fs.writeFileSync('src/App.tsx', content);
