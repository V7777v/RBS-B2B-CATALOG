import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = "const newInstId = `${acc.sku || acc.pn}-unit-${nextUnitIdx}`;\n\n|| acc.pn || Math.random().toString() }];\n    });\n    setLastAddedInstanceId(newInstId);"
good = """
const newInstId = `${acc.sku || acc.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
setSelectedOptionals(prev => [...prev, { ...acc, quantity: 1, id: newInstId, instanceId: newInstId, targetU: undefined }]);
setLastAddedInstanceId(newInstId);
"""
text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
