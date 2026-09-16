const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./public/catalogData.json', 'utf8'));
const pdus = data.filter(d => d.category && d.category.includes('פסי שקעים'));
console.log(pdus.map(p => `${p.pn} - ${p.name || p.description} - U:${p.uSize}`));
