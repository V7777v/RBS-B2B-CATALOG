import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """    if (fullyRemove || 1 === 1) {
      setSelectedOptionals(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedOptionals(prev => {
         const newArr = [...prev];
         newArr[index] = { ...newArr[index], quantity: newArr[index].quantity - 1 };
         return newArr;
      });
    }"""

good = """
    setSelectedOptionals(prev => {
      if (fullyRemove) {
        return prev.filter(p => (p.sku || p.pn) !== (item.sku || item.pn));
      }
      return prev.filter((_, i) => i !== index);
    });
"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
