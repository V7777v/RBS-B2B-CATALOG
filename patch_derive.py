import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = '''  for (const b of KNOWN_BRANDS) {
    if (hay.includes(b)) return b;
  }

  return 'כללי';
};'''

good = '''  for (const b of KNOWN_BRANDS) {
    if (hay.includes(b)) return b;
  }
  
  if (hay.includes('תשתיות')) return 'תשתיות';

  return 'כללי';
};'''

text = text.replace(bad, good)

with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
