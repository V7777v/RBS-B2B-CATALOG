import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const hookToInsert = `
  useEffect(() => {
    let path = window.location.pathname + window.location.search;
    let title = 'RBS B2B Catalog';

    if (currentView === 'home') {
      path = '/';
      title = 'דף הבית';
    } else if (currentView === 'catalog_subs' && selectedCatalog) {
      path = \`/catalog/\${encodeURIComponent(selectedCatalog)}\`;
      title = \`קטלוג - \${selectedCatalog}\`;
      trackEvent('catalog_view', { catalog_name: selectedCatalog });
    } else if (currentView === 'products') {
      path = \`/products\`;
      if (selectedSubcategory) {
        path += \`/\${encodeURIComponent(selectedSubcategory)}\`;
        trackEvent('catalog_view', { subcategory: selectedSubcategory });
      }
      title = \`מוצרים\`;
    } else if (currentView === 'product' && selectedProduct) {
      path = \`/product/\${encodeURIComponent(selectedProduct.id)}\`;
      title = \`מוצר - \${selectedProduct.name}\`;
      trackEvent('product_view', { item_id: selectedProduct.id, item_name: selectedProduct.name });
    } else if (currentView === 'checkout') {
      path = '/checkout';
      title = 'קופה';
    }

    trackPageView(path, title);
  }, [currentView, selectedCatalog, selectedSubcategory, selectedProduct]);
`;

// Replace the previous hook
const oldHookRegex = /useEffect\(\(\) => \{\s*let path = window.location.pathname[\s\S]*?\}, \[currentView, selectedCatalog, selectedSubcategory, selectedProduct\]\);/m;
content = content.replace(oldHookRegex, hookToInsert.trim());

fs.writeFileSync('src/App.tsx', content);
