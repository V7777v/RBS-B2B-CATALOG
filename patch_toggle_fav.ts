import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  const toggleFavorite = useCallback((product: any) => {
    setFavorites((prev: any[]) => {
      const exists = prev.some((f) => f.id === product.id);
      const next = exists
        ? prev.filter((f) => f.id !== product.id)
        : [...prev, { id: product.id, name: product.name, sku: product.sku || '', image: product.images?.[0] || '' }];
      if (userUid) saveFavorites(userUid, next);
      return next;
    });
  }, [userUid]);`;
  
const replace = `  const toggleFavorite = useCallback((product: any) => {
    setFavorites((prev: any[]) => {
      const exists = prev.some((f) => f.id === product.id);
      const next = exists
        ? prev.filter((f) => f.id !== product.id)
        : [...prev, { id: product.id, name: product.name, sku: product.sku || '', image: product.images?.[0] || '' }];
      if (userUid) {
        saveFavorites(userUid, next);
      } else {
        try { localStorage.setItem('rbs_guest_favorites', JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [userUid]);`;

content = content.replace(target, replace);
fs.writeFileSync('src/App.tsx', content);
