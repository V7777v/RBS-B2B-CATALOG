import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// add_to_cart
content = content.replace(
  "  const addToCart = useCallback((product: any, quantity = 1, optionals: any[] = []) => {\n    if (isGuest) { setGuestPrompt(true); return; }",
  "  const addToCart = useCallback((product: any, quantity = 1, optionals: any[] = []) => {\n    if (isGuest) { setGuestPrompt(true); return; }\n    trackEvent('add_to_cart', { item_id: product.id, item_name: product.name, quantity, user_role: userRole });"
);

// performSearch
content = content.replace(
  "  const performSearch = useCallback(() => {\n    if (!searchQuery.trim()) return;\n    setIsProductsLoading(true);\n    setHasMoreProducts(true);",
  "  const performSearch = useCallback(() => {\n    if (!searchQuery.trim()) return;\n    trackEvent('search', { search_term: searchQuery });\n    setIsProductsLoading(true);\n    setHasMoreProducts(true);"
);

// toggleFavorite
content = content.replace(
  "    const isFav = favorites.some(f => f.id === product.id);\n    let newFavs;",
  "    const isFav = favorites.some(f => f.id === product.id);\n    let newFavs;\n    if (!isFav) trackEvent('add_to_favorites', { item_id: product.id, item_name: product.name });"
);

fs.writeFileSync('src/App.tsx', content);
