import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix CatalogCard
content = content.replace(
  /<div\s+onClick=\{\(\) => navigateToCatalog\(catalog.name\)\}\s+className="group flex flex-col h-full rounded-none bg-white overflow-hidden/g,
  `<div
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToCatalog(catalog.name);
      }
    }}
    onClick={() => navigateToCatalog(catalog.name)}
    className="group flex flex-col h-full rounded-none bg-white overflow-hidden`
);

// Fix ProductCard
content = content.replace(
  /<div\s+className={`group flex flex-col bg-white overflow-hidden rounded-xl shadow-\[0_2px_15px_rgba\(0,0,0,0\.04\)\] hover:shadow-\[0_8px_25px_rgba\(0,0,0,0\.08\)\] transition-all cursor-pointer transform hover:-translate-y-1 relative border \${isSelectedForBulk \? 'border-blue-500 ring-2 ring-blue-500\/20' : 'border-gray-100'}`}\s+onClick=\{\(\) => navigateToProduct\(product\)\}/g,
  `<div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToProduct(product);
        }
      }}
      className={\`group flex flex-col bg-white overflow-hidden rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all cursor-pointer transform hover:-translate-y-1 relative border \${isSelectedForBulk ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100'}\`}
      onClick={() => navigateToProduct(product)}`
);

fs.writeFileSync('src/App.tsx', content);
