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
    } else if (currentView === 'products') {
      path = \`/products\`;
      if (selectedSubcategory) path += \`/\${encodeURIComponent(selectedSubcategory)}\`;
      title = \`מוצרים\`;
    } else if (currentView === 'product' && selectedProduct) {
      path = \`/product/\${encodeURIComponent(selectedProduct.id)}\`;
      title = \`מוצר - \${selectedProduct.name}\`;
    } else if (currentView === 'checkout') {
      path = '/checkout';
      title = 'קופה';
    }

    trackPageView(path, title);
  }, [currentView, selectedCatalog, selectedSubcategory, selectedProduct]);
`;

content = content.replace("  useEffect(() => {\n    trackEvent('app_loaded', { app_name: 'rbs_b2b_catalog' });\n  }, []);", "  useEffect(() => {\n    trackEvent('app_loaded', { app_name: 'rbs_b2b_catalog' });\n  }, []);\n" + hookToInsert);

fs.writeFileSync('src/App.tsx', content);
