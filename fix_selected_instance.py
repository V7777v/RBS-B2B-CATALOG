import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = r"selectedInstanceId=\{inspectedProduct \? \(inspectedProduct\.sku \|\| \(inspectedProduct as any\)\.instanceId\) : undefined\}"
good = "selectedInstanceId={inspectedProduct ? (inspectedProduct.instanceId || inspectedProduct.sku) : undefined}"
text = re.sub(bad, good, text)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
