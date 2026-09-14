import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = "const prioritizedBrands = ['HIKVISION', 'POLMAN'];"
good = "const prioritizedBrands = ['תשתיות', 'HIKVISION', 'POLMAN'];"
text = text.replace(bad, good)

with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
