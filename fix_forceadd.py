with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """  const forceAddPending = () => {
    if (pendingAccessory) {
      setSelectedOptionals(prev => {
        const existingIdx = prev.findIndex(item => item.pn === pendingAccessory.pn);
        if (existingIdx >= 0) {
          const newArr = [...prev];
          newArr[existingIdx] = { ...newArr[existingIdx], quantity: newArr[existingIdx].quantity + 1 };
          return newArr;
        }
        return [...prev, { ...pendingAccessory, quantity: 1, id: Math.random().toString() }];
      });
    }
    setWarningModalOpen(false);
    setPendingAccessory(null);
  };"""

good = """  const forceAddPending = () => {
    setWarningModalOpen(false);
    setPendingAccessory(null);
  };"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
