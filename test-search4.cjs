const fs = require('fs');
const Papa = require('papaparse');
const csv = fs.readFileSync('test.csv', 'utf8');
const data = Papa.parse(csv, { header: true }).data;
console.log(data[0].sku);
console.log(data.find(d => d.name && d.name.includes('HB90')).sku);
