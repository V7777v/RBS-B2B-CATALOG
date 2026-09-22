const fs = require('fs');
let code = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf8');

// Replace handleAddOptional logic
code = code.replace(
/    setSelectedOptionals\(prev => \{\n      const existingIdx = prev\.findIndex\(item => item\.pn === acc\.pn && !item\.targetU\);\n      if \(existingIdx >= 0\) \{\n        const newArr = \[\.\.\.prev\];\n        newArr\[existingIdx\] = \{ \.\.\.newArr\[existingIdx\], quantity: newArr\[existingIdx\]\.quantity \+ 1 \};\n        return newArr;\n      \}\n      return \[\.\.\.prev, \{ \.\.\.acc, quantity: 1, id: acc\.sku || acc\.pn || Math\.random\(\)\.toString\(\) \}\];\n    \}\);/g,
`    setSelectedOptionals(prev => [...prev, { ...acc, quantity: 1, id: newInstId, instanceId: newInstId }]);`
);

// Replace handleIncrementQuantity logic
code = code.replace(
/    setSelectedOptionals\(prev => \{\n      const newArr = \[\.\.\.prev\];\n      newArr\[index\] = \{ \.\.\.newArr\[index\], quantity: newArr\[index\]\.quantity \+ 1 \};\n      return newArr;\n    \}\);/g,
`    const newInstId2 = \`\${item.sku || item.pn}-unit-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`;
    setLastAddedInstanceId(newInstId2);
    setSelectedOptionals(prev => [...prev, { ...item, quantity: 1, id: newInstId2, instanceId: newInstId2, targetU: undefined }]);`
);

// We should also replace handleRemoveOptional logic to just filter out the item
code = code.replace(
/    if \(fullyRemove \|\| item\.quantity === 1\) \{\n      setSelectedOptionals\(prev => prev\.filter\(\(_, i\) => i !== index\)\);\n    \} else \{\n      setSelectedOptionals\(prev => \{\n        const newArr = \[\.\.\.prev\];\n        newArr\[index\] = \{ \.\.\.newArr\[index\], quantity: newArr\[index\]\.quantity - 1 \};\n        return newArr;\n      \}\);\n    \}/g,
`    setSelectedOptionals(prev => {
      // Find the specific item and remove it. If fullyRemove is true, remove all with same SKU.
      if (fullyRemove) {
        return prev.filter(p => (p.sku || p.pn) !== (item.sku || item.pn));
      }
      return prev.filter((_, i) => i !== index);
    });`
);

fs.writeFileSync('src/components/CabinetConfigurator.tsx', code);
console.log('Patched');
