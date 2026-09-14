import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """    const nextUnitIdx = 1;
    const newInstId = `${item.sku || item.pn}-unit-${nextUnitIdx}`;
    setLastAddedInstanceId(newInstId);
    setHighlightedOptIdx(index);
    setChassisPulse(true);

    setSelectedOptionals(prev => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], quantity: newArr[index].quantity + 1 };
      return newArr;
    });"""

good = """
    const newInstId2 = `${item.sku || item.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setLastAddedInstanceId(newInstId2);
    setHighlightedOptIdx(index);
    setChassisPulse(true);

    setSelectedOptionals(prev => [...prev, { ...item, quantity: 1, id: newInstId2, instanceId: newInstId2, targetU: undefined }]);
"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
