import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `    navigateForward({
      currentView: niche ? 'niche_subs' : nested ? 'nested_subs' : sub ? 'products' : 'catalog_subs',
      selectedCatalog: cat || null,
      selectedSubcategory: sub || null,
      selectedNestedSubcategory: nested || null,
      selectedNicheCategory: niche || null,
      selectedProduct: null
    });
  }, [catalogData, navigateForward]);`;

const replace = `    navigateForward({
      currentView: niche ? 'niche_subs' : nested ? 'nested_subs' : sub ? 'products' : 'catalog_subs',
      selectedCatalog: cat || null,
      selectedSubcategory: sub || null,
      selectedNestedSubcategory: nested || null,
      selectedNicheCategory: niche || null,
      selectedProduct: null
    });
  }, [catalogData, navigateForward, hasMoreProducts]);`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find block");
}
