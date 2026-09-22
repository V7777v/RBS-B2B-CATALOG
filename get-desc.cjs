const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;
const item = data.find(r => r.sku && r.sku.includes('303103627'));
console.log(item);
