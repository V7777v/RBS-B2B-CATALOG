import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

# Match from `const parseCabinetDepthFromName` to the end of `const deriveBrand`
bad_pattern = re.compile(r'// Match a shelf to a cabinet using the accessory sheet.*?const isCabinetProduct =', re.DOTALL)
text = bad_pattern.sub('const isCabinetProduct =', text)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
