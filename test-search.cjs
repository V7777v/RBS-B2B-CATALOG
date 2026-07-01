const fs = require('fs');
const catalogData = [
  { id: '1', name: 'Product A', sku: '942117' },
  { id: '2', name: 'Product B', sku: '2117' }
];
const searchQuery = "2117";
const queryTokens = searchQuery.toLowerCase().split(/[\s\-/,]+/).filter(Boolean);
let filtered = catalogData.filter(item => {
  const searchableText = `${item.name} ${item.sku}`.toLowerCase();
  const cleanedSearchableText = searchableText.replace(/[^a-z0-9א-ת]/gi, '');
  const tokenMatch = queryTokens.every(token => {
    const cleanToken = token.replace(/[^a-z0-9א-ת]/gi, '');
    if (!cleanToken) return searchableText.includes(token);
    return cleanedSearchableText.includes(cleanToken);
  });
  return tokenMatch;
});
console.log(filtered);
