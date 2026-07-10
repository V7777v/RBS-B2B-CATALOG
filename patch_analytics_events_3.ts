import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// toggleFavorite
content = content.replace(
  "  const toggleFavorite = useCallback((product: any) => {\n    setFavorites((prev: any[]) => {\n      const exists = prev.some((f) => f.id === product.id);\n      const next = exists\n        ? prev.filter((f) => f.id !== product.id)\n        : [...prev, { id: product.id, name: product.name, sku: product.sku || '', image: product.images?.[0] || '' }];",
  "  const toggleFavorite = useCallback((product: any) => {\n    setFavorites((prev: any[]) => {\n      const exists = prev.some((f) => f.id === product.id);\n      if (!exists) trackEvent('add_to_favorites', { item_id: product.id, item_name: product.name });\n      const next = exists\n        ? prev.filter((f) => f.id !== product.id)\n        : [...prev, { id: product.id, name: product.name, sku: product.sku || '', image: product.images?.[0] || '' }];"
);

fs.writeFileSync('src/App.tsx', content);
