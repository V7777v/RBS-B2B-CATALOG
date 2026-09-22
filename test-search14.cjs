const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;
const query = 'מצלמה';
const queryTokens = query.split(/[\s\-/,]+/).filter(Boolean);
const results = data.filter(item => {
  const cleanDescription = (item.description || '').replace(/<[^>]*>?/gm, ' ');
  const searchableText = `${item.name} ${item.sku} ${item.brand} ${cleanDescription} ${item.category} ${item.subcategory}`.toLowerCase();
  const cleanedSearchableText = searchableText.replace(/[^a-z0-9א-ת\s]/gi, '');
  return queryTokens.every(token => {
    const cleanToken = token.replace(/[^a-z0-9א-ת]/gi, '');
    if (!cleanToken) return searchableText.includes(token);
    return cleanedSearchableText.includes(cleanToken);
  });
});
console.log(results.find(r => r.sku === '303103627') ? "IT MATCHED" : "IT DID NOT MATCH");
