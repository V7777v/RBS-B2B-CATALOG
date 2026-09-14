import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = """    return {
      instanceId: (slot as any).instanceId || slot.id || '',
      name,
      sku,"""

good1 = """    return {
      instanceId: (slot as any).instanceId || slot.id || '',
      name,
      sku,"""

good2 = """    return {
      instanceId: item.instanceId || item.id || `0U-${sku}`,
      name,
      sku,"""

parts = text.split(bad)
if len(parts) == 3:
    new_text = parts[0] + good1 + parts[1] + good2 + parts[2]
    with open('src/components/CabinetConfigurator.tsx', 'w') as f:
        f.write(new_text)
