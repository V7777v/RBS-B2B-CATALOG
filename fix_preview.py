import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = """    return {
      name,
      sku,
      description,"""

good = """    return {
      instanceId: (slot as any).instanceId || slot.id || '',
      name,
      sku,
      description,"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
