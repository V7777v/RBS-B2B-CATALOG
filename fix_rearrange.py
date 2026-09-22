import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """        const move = plan.moves.find(m => {
          const normSku = normalizeSku(m.sku);
          const optSku = normalizeSku(opt.sku || opt.pn);
          return normSku === optSku || (opt.id && opt.id.includes(m.instanceId));
        });"""

good = """        const move = plan.moves.find(m => (opt.instanceId && opt.instanceId === m.instanceId) || (opt.id && opt.id === m.instanceId));"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
