import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

m = re.search(r'const buildCatalogAccessories = \(.*?\n\};', text, re.DOTALL)
if m:
    print(m.group(0))
else:
    print("Not found with this regex")
