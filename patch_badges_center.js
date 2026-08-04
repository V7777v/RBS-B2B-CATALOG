import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// CatalogCard text wrapper
content = content.replace(
  `className="p-3 sm:p-5 flex flex-col flex-grow bg-white group-hover:bg-gray-50 transition-colors text-center sm:text-right"`,
  `className="p-3 sm:p-5 flex flex-col flex-grow bg-white group-hover:bg-gray-50 transition-colors text-center sm:text-right relative"`
);

// SubcategoryCard text wrapper
content = content.replace(
  `className="p-3 sm:p-5 flex flex-col flex-grow bg-white text-center justify-between"`,
  `className="p-3 sm:p-5 flex flex-col flex-grow bg-white text-center justify-between relative"`
);

// ProductCard text wrapper
content = content.replace(
  `className="p-3 sm:p-4 flex flex-col flex-grow text-center"`,
  `className="p-3 sm:p-4 flex flex-col flex-grow text-center relative"`
);

fs.writeFileSync('src/App.tsx', content);
console.log('SUCCESS');
