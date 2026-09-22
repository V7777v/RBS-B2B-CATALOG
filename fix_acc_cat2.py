import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

# I want to revert isAccCategory and isInfrastructureItem

bad_infra = '''  const isNetworkOrAV = 
    sub.includes('מתג') || sub.includes('switch') || 
    sub.includes('נתב') || sub.includes('router') || 
    sub.includes('ליבה') || 
    sub.includes('ups') || sub.includes('אל פסק') || 
    sub.includes('nvr') || sub.includes('dvr') || 
    sub.includes('מגבר') || sub.includes('audio') || sub.includes('שמע') ||
    sub.includes('בקר') || sub.includes('controller');

  const desc = String(pp.description || '').toLowerCase();
  const isRackmount = 
    name.includes('rackmount') || desc.includes('rackmount') || cat.includes('rackmount') || sub.includes('rackmount') || nested.includes('rackmount') ||
    name.includes('rackmout') || desc.includes('rackmout') || cat.includes('rackmout') || sub.includes('rackmout') || nested.includes('rackmout'); // Handling user typo RACKMOUT

  return isInfraCategory || isInfraSub || isNetworkOrAV || isRackmount;'''

good_infra = '''  const desc = String(pp.description || '').toLowerCase();
  const isRackmount = 
    name.includes('rackmount') || desc.includes('rackmount') || cat.includes('rackmount') || sub.includes('rackmount') || nested.includes('rackmount') ||
    name.includes('rackmout') || desc.includes('rackmout') || cat.includes('rackmout') || sub.includes('rackmout') || nested.includes('rackmout'); // Handling user typo RACKMOUT

  // The user explicitly requested ONLY products related to the cabinet AND ONLY from the "מחירון תשתיות" catalog.
  // We should strictly require it to be from the infrastructure catalog, except maybe rackmount which we can keep restricted to infra.
  // Actually, let's just make it return isInfraCategory. If it's not in the infrastructure price list, it's out.
  return isInfraCategory;'''

text = text.replace(bad_infra, good_infra)


bad_acc = '''    const isAccCategory = 
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

good_acc = '''    const isAccCategory = 
      sub.includes('ארונות תקשורת') || 
      cat.includes('ארונות תקשורת') || 
      nested.includes('אביזרים') || 
      nested.includes('פסי שקעים') ||
      compatMap[normSku] !== undefined ||
      VERIFIED_ZERO_U_EXCEPTIONS[normSku] !== undefined;'''

text = text.replace(bad_acc, good_acc)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
