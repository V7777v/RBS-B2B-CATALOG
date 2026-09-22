import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = """    // 1. Included Shelves
    let shelvesQty = parseAccessoryCount(cabinetData?.shelvesQty);
    if (shelvesQty === 0 && Array.isArray(includedItems)) {
      const shelfItem = includedItems.find(it => it.includes('מדפ') || it.includes('מדפים'));
      if (shelfItem) shelvesQty = parseAccessoryCount(shelfItem);
    }
    if (shelvesQty === 0 && product?.description) {
      const m = String(product.description).match(/(\\d+)\\s*מדפ/i);
      if (m) shelvesQty = parseInt(m[1], 10);
    }"""

good = """    // 1. Included Shelves
    let shelvesQty = 0;
    const rawShelvesQty = cabinetData?.shelvesQty?.trim();
    if (rawShelvesQty && rawShelvesQty !== 'X') {
      shelvesQty = parseAccessoryCount(rawShelvesQty);
    } else if (!rawShelvesQty || rawShelvesQty === '') {
      // Missing data -> try to extract from included items or description
      if (Array.isArray(includedItems)) {
        const shelfItem = includedItems.find(it => it.includes('מדפ') || it.includes('מדפים'));
        if (shelfItem) shelvesQty = parseAccessoryCount(shelfItem);
      }
      if (shelvesQty === 0 && product?.description) {
        const m = String(product.description).match(/(\\d+)\\s*מדפ/i);
        if (m) shelvesQty = parseInt(m[1], 10);
      }
    }"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
