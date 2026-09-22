const fs = require('fs');
let code = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf8');

// Group selectedOptionals for the UI in the "Selected Optionals Review Area"
code = code.replace(
/                 \{selectedOptionals\.map\(\(item, idx\) => \{/g,
`                 {Object.values(
                    selectedOptionals.reduce((acc: any, curr: any, idx: number) => {
                      const key = curr.targetU ? \`\${curr.sku || curr.pn}-U\${curr.targetU}\` : (curr.sku || curr.pn);
                      if (!acc[key]) {
                        acc[key] = { ...curr, quantity: 1, optionalIdx: idx, originalItem: curr };
                      } else {
                        acc[key].quantity += 1;
                      }
                      return acc;
                    }, {})
                  ).map((item: any, _mappedIdx: number) => {
                    const idx = item.optionalIdx;
`
);

fs.writeFileSync('src/components/CabinetConfigurator.tsx', code);
console.log('Patched 3');
