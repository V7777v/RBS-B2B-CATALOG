import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

text = re.sub(r"const isCabinetProduct = \(.*?\n\};\n", "", text, flags=re.DOTALL)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
