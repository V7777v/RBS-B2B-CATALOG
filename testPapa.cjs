const Papa = require("papaparse");
const https = require("https");

const parsePrice = (priceVal) => {
  if (priceVal === undefined || priceVal === null || priceVal === '') return 0;
  if (typeof priceVal === 'number') return priceVal;
  
  let s = String(priceVal).trim();
  s = s.replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    if (s.split(',').length > 2) {
      s = s.replace(/,/g, '');
    } else {
      const parts = s.split(',');
      if (parts[1].length === 3) {
        s = s.replace(',', '');
      } else {
        s = s.replace(',', '.');
      }
    }
  }
  
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};

const url = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs/gviz/tq?tqx=out:csv&gid=1506812668';

https.get(url, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let zeros = 0;
        let nulls = 0;
        results.data.forEach((row, i) => {
           let p = row.price || row.Price || row['מחיר']; 
           let parsed = parsePrice(p);
           if (p && p.trim() !== '' && parsed === 0) {
              console.log(`Row ${i+2}: Raw price: "${p}" => Parsed: 0`);
              zeros++;
           }
           if (!p || p.trim() === '') nulls++;
        });
        console.log("Total non-empty prices parsed as 0:", zeros);
        console.log("Total empty prices:", nulls);

        // Print some decimal ones just to see:
        let decimals = results.data.filter(r => (r.price || r.Price) && String(r.price || r.Price).match(/[,.]/)).slice(0, 10);
        console.log("\\nSample decimal prices in CSV:");
        decimals.forEach(r => console.log(`"${r.price || r.Price}" => ${parsePrice(r.price || r.Price)}`));
      }
    });
  });
});
