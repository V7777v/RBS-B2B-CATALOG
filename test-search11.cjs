const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;
const items = data.filter(d => d.sku && d.sku.includes('101430'));
items.forEach(item => console.log(item.sku, item.id));
