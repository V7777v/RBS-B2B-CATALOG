import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """    const uSize = acc.uSize ?? 1;
    const newInstId = `${acc.sku || acc.pn}-unit-${Date.now()}`;
    setSelectedOptionals(prev => {
      if (targetU && uSize > 0) {
        return [...prev, { ...acc, quantity: 1, targetU, id: `${acc.sku || acc.pn}-U${targetU}-${Date.now()}` }];
      }
      const existingIdx = prev.findIndex(item => item.pn === acc.pn && !item.targetU);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx] = { ...newArr[existingIdx], quantity: newArr[existingIdx].quantity + 1 };
        return newArr;
      }
      return [...prev, { ...acc, quantity: 1, id: newInstId }];
    });"""

good = """    const uSize = acc.uSize ?? 1;
    const newInstId = `${acc.sku || acc.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Always add as a single instance
    setSelectedOptionals(prev => {
      return [...prev, { 
        ...acc, 
        quantity: 1, 
        targetU: targetU || undefined, 
        id: newInstId, 
        instanceId: newInstId 
      }];
    });
    setLastAddedInstanceId(newInstId);
    setUndoState(null);"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
