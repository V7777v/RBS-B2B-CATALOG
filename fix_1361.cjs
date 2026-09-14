const fs = require('fs');
let text = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf8');

// The broken code at 1361 looks like:
//     const newInstId = `${acc.sku || acc.pn}-unit-${nextUnitIdx}`;|| acc.pn || Math.random().toString() }];    });    setLastAddedInstanceId(newInstId);

text = text.replace(
    /const newInstId = `\$\{acc\.sku \|\| acc\.pn\}-unit-\$\{nextUnitIdx\}`;\|\| acc\.pn \|\| Math\.random\(\)\.toString\(\) \}\];    \}\);    setLastAddedInstanceId\(newInstId\);/g,
    `const newInstId = \`\${acc.sku || acc.pn}-unit-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`;
    setSelectedOptionals(prev => [...prev, { ...acc, quantity: 1, id: newInstId, instanceId: newInstId, targetU: undefined }]);
    setLastAddedInstanceId(newInstId);`
);

fs.writeFileSync('src/components/CabinetConfigurator.tsx', text);
