const fs = require('fs');
let code = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf8');

// We can replace the pdfOrderable grouping.
code = code.replace(
/  const pdfOrderable = selectedOptionals\.filter\(\(o: any\) => !o\._illustration\);/g,
`  const pdfOrderable = Object.values(
    selectedOptionals.filter((o: any) => !o._illustration).reduce((acc: any, curr: any) => {
      const key = curr.sku || curr.pn;
      if (!acc[key]) {
        acc[key] = { ...curr, quantity: 1 };
      } else {
        acc[key].quantity += 1;
      }
      return acc;
    }, {})
  ) as any[];`
);

fs.writeFileSync('src/components/CabinetConfigurator.tsx', code);
console.log('Patched 2');
