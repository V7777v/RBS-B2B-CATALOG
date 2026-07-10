import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// search
content = content.replace(
  "const performSearch = () => {",
  "const performSearch = () => {\n    if (searchQuery) trackEvent('search', { search_term: searchQuery });"
);

// toggleFavorite
content = content.replace(
  "const isFav = favorites.some((f: any) => f.id === product.id);\n    let newFavs;",
  "const isFav = favorites.some((f: any) => f.id === product.id);\n    let newFavs;\n    if (!isFav) trackEvent('add_to_favorites', { item_id: product.id, item_name: product.name });"
);

// send_favorites_whatsapp (there are two places for this in the modal, one sends and saves, one sends and clears)
content = content.replace(
  "const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);",
  "const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);\n                trackEvent('send_favorites_whatsapp', { items_count: items.length });"
);
content = content.replace(
  "const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);",
  "const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);\n                trackEvent('send_favorites_whatsapp', { items_count: items.length });"
);

// add_to_cart
content = content.replace(
  "const addToCart = (product: any, quantity: number = 1, optionals: any[] = []) => {",
  "const addToCart = (product: any, quantity: number = 1, optionals: any[] = []) => {\n    trackEvent('add_to_cart', { item_id: product.id, item_name: product.name, quantity, user_role: userRole });"
);

// checkout_start (when cart opens)
content = content.replace(
  "const [isCartOpen, setIsCartOpen] = useState(false);",
  "const [isCartOpen, setIsCartOpen] = useState(false);"
);
// We can hook to cart opening in the useEffect tracking or just when setIsCartOpen(true) is called.
// It's probably easier to just hook useEffect on `isCartOpen`.
const cartOpenHook = `
  useEffect(() => {
    if (isCartOpen) trackEvent('checkout_start', { cart_size: cart.length });
  }, [isCartOpen]);
`;
content = content.replace("  const [isCartOpen, setIsCartOpen] = useState(false);", "  const [isCartOpen, setIsCartOpen] = useState(false);\n" + cartOpenHook);

fs.writeFileSync('src/App.tsx', content);
