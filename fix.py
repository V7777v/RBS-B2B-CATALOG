with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

import re
text = re.sub(r'const newInstId = `\$\{acc.sku \|\| acc.pn\}-unit-\$\{nextUnitIdx\}`;\|\| acc.pn \|\| Math.random\(\).toString\(\) \}\];    \}\);    setLastAddedInstanceId\(newInstId\);',
    r'''
    const newInstId = `${acc.sku || acc.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setSelectedOptionals(prev => [...prev, { ...acc, quantity: 1, id: newInstId, instanceId: newInstId, targetU: undefined }]);
    setLastAddedInstanceId(newInstId);
    ''', text)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
