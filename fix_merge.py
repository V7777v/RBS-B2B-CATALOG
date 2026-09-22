import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad1 = """    if (itemsMap.has(normSku)) {
      // Enrich existing record if needed
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      return;
    }"""

good1 = """    if (itemsMap.has(normSku)) {
      // Enrich existing record if needed
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      if (pp.price && (!existing.price || existing.price === 0)) {
        existing.price = parseFloat(String(pp.price).replace(/,/g, '')) || 0;
      }
      const newBrand = deriveBrand(pp);
      if (newBrand !== 'כללי' && existing.brand === 'כללי') {
        existing.brand = newBrand;
      }
      if (!existing.brandLogo && typeof pp.brand === 'string' && pp.brand.startsWith('http')) {
        existing.brandLogo = pp.brand;
      }
      return;
    }"""

bad2 = """    if (itemsMap.has(normSku)) {
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      if (!existing.price && pp.price) {
        existing.price = parseFloat(String(pp.price).replace(/,/g, '')) || 0;
      }
      return;
    }"""

good2 = """    if (itemsMap.has(normSku)) {
      const existing = itemsMap.get(normSku)!;
      if (!existing.image && ((pp.images && pp.images[0]) || pp.imageURL)) {
        existing.image = (pp.images && pp.images[0]) || pp.imageURL;
      }
      if (!existing.price && pp.price) {
        existing.price = parseFloat(String(pp.price).replace(/,/g, '')) || 0;
      }
      const newBrand = deriveBrand(pp);
      if (newBrand !== 'כללי' && existing.brand === 'כללי') {
        existing.brand = newBrand;
      }
      if (!existing.brandLogo && typeof pp.brand === 'string' && pp.brand.startsWith('http')) {
        existing.brandLogo = pp.brand;
      }
      return;
    }"""

text = text.replace(bad1, good1).replace(bad2, good2)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
