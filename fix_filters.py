import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

infra_bad = '''  const isInfraSub = 
    sub.includes('תשתיות') ||
    sub.includes('ארונות תקשורת') ||
    sub.includes('מסדים') ||
    sub.includes('פסי שקעים') ||
    sub.includes('ספקי כח') ||
    sub.includes('ספקי כוח') ||
    nested.includes('פסי שקעים') ||
    nested.includes('אביזרים למסד') ||
    nested.includes('אביזרים לארון') ||
    nested.includes('מדפים ואביזרים');

  const desc = String(pp.description || '').toLowerCase();
  const isRackmount = 
    name.includes('rackmount') || desc.includes('rackmount') || cat.includes('rackmount') || sub.includes('rackmount') || nested.includes('rackmount') ||
    name.includes('rackmout') || desc.includes('rackmout') || cat.includes('rackmout') || sub.includes('rackmout') || nested.includes('rackmout'); // Handling user typo RACKMOUT

  return isInfraCategory || isInfraSub || isRackmount;
};'''

infra_good = '''  const isInfraSub = 
    sub.includes('תשתיות') ||
    sub.includes('ארונות תקשורת') ||
    sub.includes('מסדים') ||
    sub.includes('פסי שקעים') ||
    sub.includes('ספקי כח') ||
    sub.includes('ספקי כוח') ||
    nested.includes('פסי שקעים') ||
    nested.includes('אביזרים למסד') ||
    nested.includes('אביזרים לארון') ||
    nested.includes('מדפים ואביזרים');

  const isNetworkOrAV = 
    sub.includes('מתג') || sub.includes('switch') || 
    sub.includes('נתב') || sub.includes('router') || 
    sub.includes('ליבה') || 
    sub.includes('ups') || sub.includes('אל פסק') || 
    sub.includes('nvr') || sub.includes('dvr') || 
    sub.includes('מגבר') || sub.includes('audio') || sub.includes('שמע') ||
    sub.includes('בקר') || sub.includes('controller') ||
    cat.includes('hikvision') || cat.includes('polman');

  const desc = String(pp.description || '').toLowerCase();
  const isRackmount = 
    name.includes('rackmount') || desc.includes('rackmount') || cat.includes('rackmount') || sub.includes('rackmount') || nested.includes('rackmount') ||
    name.includes('rackmout') || desc.includes('rackmout') || cat.includes('rackmout') || sub.includes('rackmout') || nested.includes('rackmout'); // Handling user typo RACKMOUT

  return isInfraCategory || isInfraSub || isNetworkOrAV || isRackmount;
};'''

text = text.replace(infra_bad, infra_good)

acc_bad = '''    const isAccCategory = 
      sub.includes('ארונות תקשורת') || 
      cat.includes('ארונות תקשורת') || 
      nested.includes('אביזרים') || 
      nested.includes('פסי שקעים') ||
      compatMap[normSku] !== undefined ||
      VERIFIED_ZERO_U_EXCEPTIONS[normSku] !== undefined;
    if (!isAccCategory) return;'''

acc_good = '''    const isAccCategory = 
      sub.includes('ארונות תקשורת') || 
      cat.includes('ארונות תקשורת') || 
      nested.includes('אביזרים') || 
      nested.includes('פסי שקעים') ||
      sub.includes('rackmount') || sub.includes('rackmout') || cat.includes('rackmount') || cat.includes('rackmout') ||
      sub.includes('מתג') || sub.includes('switch') || 
      sub.includes('נתב') || sub.includes('router') || 
      sub.includes('ליבה') || 
      sub.includes('ups') || sub.includes('אל פסק') || 
      sub.includes('nvr') || sub.includes('dvr') || 
      sub.includes('מגבר') || sub.includes('audio') || sub.includes('שמע') ||
      sub.includes('בקר') || sub.includes('controller') ||
      compatMap[normSku] !== undefined ||
      VERIFIED_ZERO_U_EXCEPTIONS[normSku] !== undefined ||
      (pp.name || '').toLowerCase().includes('rackmount') || (pp.name || '').toLowerCase().includes('rackmout') ||
      (pp.description || '').toLowerCase().includes('rackmount') || (pp.description || '').toLowerCase().includes('rackmout');
      
    if (!isAccCategory) return;'''

text = text.replace(acc_bad, acc_good)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
