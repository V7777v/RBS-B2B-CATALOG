import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad_acc = '''    const isAccCategory = 
      sub.includes('ארונות תקשורת') || 
      cat.includes('ארונות תקשורת') || 
      nested.includes('אביזרים') || 
      nested.includes('פסי שקעים') ||
      compatMap[normSku] !== undefined ||
      VERIFIED_ZERO_U_EXCEPTIONS[normSku] !== undefined;'''

good_acc = '''    const isAccCategory = 
      sub.includes('ארונות תקשורת') || 
      cat.includes('ארונות תקשורת') || 
      nested.includes('אביזרים') || 
      nested.includes('פסי שקעים') ||
      sub.includes('rackmount') ||
      sub.includes('rackmout') ||
      sub.includes('מתג') || sub.includes('switch') || 
      sub.includes('נתב') || sub.includes('router') || 
      sub.includes('ליבה') || 
      sub.includes('ups') || sub.includes('אל פסק') || 
      sub.includes('nvr') || sub.includes('dvr') || 
      sub.includes('מגבר') || sub.includes('audio') || sub.includes('שמע') ||
      sub.includes('בקר') || sub.includes('controller') ||
      compatMap[normSku] !== undefined ||
      VERIFIED_ZERO_U_EXCEPTIONS[normSku] !== undefined;'''

text = text.replace(bad_acc, good_acc)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
