import re
with open('src/components/Cabinet3D/AddSlotModal.tsx', 'r') as f:
    text = f.read()

text = text.replace('<span>מק״ט: {item.sku || item.pn}</span>', '<span>מק״ט: <span dir="ltr" className="inline-block">{item.sku || item.pn}</span></span>')

with open('src/components/Cabinet3D/AddSlotModal.tsx', 'w') as f:
    f.write(text)

with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

text = text.replace('<span>מק"ט: {inspectedProduct.sku || inspectedProduct.pn}</span>', '<span>מק"ט: <span dir="ltr" className="inline-block">{inspectedProduct.sku || inspectedProduct.pn}</span></span>')

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
