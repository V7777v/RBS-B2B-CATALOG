const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;
const item = data.find(d => d.sku === '303103627');
const cleanDescription = (item.description || '').replace(/<[^>]*>?/gm, ' ');
const searchableText = `${item.name} ${item.sku} ${item.brand} ${cleanDescription} ${item.category} ${item.subcategory}`.toLowerCase();
console.log(searchableText);
