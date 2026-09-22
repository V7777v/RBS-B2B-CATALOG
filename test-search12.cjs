const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;

const searchQuery = '101430';
const query = searchQuery.toLowerCase();
const queryTokens = query.split(/[\s\-/,]+/).filter(Boolean);

const filtered = data.filter(item => {
  if (item.name === 'קטגוריית אם' || item.name === 'מוצר הדגמה') return false;

  const cleanDescription = (item.description || '').replace(/<[^>]*>?/gm, ' ');
  const searchableText = `${item.name} ${item.sku} ${item.brand} ${cleanDescription} ${item.category} ${item.subcategory}`.toLowerCase();
  const cleanedSearchableText = searchableText.replace(/[^a-z0-9א-ת\s]/gi, '');

  const tokenMatch = queryTokens.every(token => {
    const cleanToken = token.replace(/[^a-z0-9א-ת]/gi, '');
    if (!cleanToken) return searchableText.includes(token);
    return cleanedSearchableText.includes(cleanToken);
  });

  return tokenMatch;
});

console.log(filtered.length);
console.log(filtered.map(f => f.sku));
