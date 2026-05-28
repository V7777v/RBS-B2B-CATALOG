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

console.log('15,8 =>', parsePrice("15,8"));
console.log('15,80 =>', parsePrice("15,80"));
console.log('1,500 =>', parsePrice("1,500"));
console.log('1,500.50 =>', parsePrice("1,500.50"));
console.log('1,500,000 =>', parsePrice("1,500,000"));
console.log('15.8 =>', parsePrice("15.8"));
console.log('₪15.8 =>', parsePrice("₪15.8"));
console.log('1,00 =>', parsePrice("1,00"));
console.log('0,5 =>', parsePrice("0,5"));
