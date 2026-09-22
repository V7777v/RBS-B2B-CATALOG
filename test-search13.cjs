const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;
const items = data.filter(d => d.sku === '101430N');
items.forEach(item => console.log(item.name));
