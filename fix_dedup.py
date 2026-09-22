import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = """  const filtered = capacityFiltered.filter(acc => {
    if (qTokens.length === 0) return true;
    const hay = `${acc.pn || ''} ${acc.sku || ''} ${acc.name || ''} ${acc.description || ''} ${acc.brand || ''}`.toLowerCase();
    return qTokens.every(tok => hay.includes(tok));
  });"""

good = """  const filtered = capacityFiltered.filter(acc => {
    if (qTokens.length === 0) return true;
    const hay = `${acc.pn || ''} ${acc.sku || ''} ${acc.name || ''} ${acc.description || ''} ${acc.brand || ''}`.toLowerCase();
    return qTokens.every(tok => hay.includes(tok));
  });

  // Ensure unique SKUs in the result
  const seenSkus = new Set<string>();
  const uniqueFiltered = filtered.filter(acc => {
    const sku = (acc.sku || acc.pn || '').toUpperCase();
    if (seenSkus.has(sku)) return false;
    seenSkus.add(sku);
    return true;
  });"""

text = text.replace(bad, good).replace("const shelves = filtered.filter(acc => acc.isShelf);", "const shelves = uniqueFiltered.filter(acc => acc.isShelf);").replace("const nonShelves = filtered.filter(acc => !acc.isShelf);", "const nonShelves = uniqueFiltered.filter(acc => !acc.isShelf);")

with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
