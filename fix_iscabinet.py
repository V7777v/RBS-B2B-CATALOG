import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = "if (/ארונות תקשורת/i.test(sub) && !name.includes('מדף')) return true;"
good = "if (/ארונות תקשורת/i.test(sub) && !name.includes('מדף') && !name.includes('פאנל') && !name.includes('פנל') && !name.includes('אביזר') && !name.includes('פס') && !name.includes('מגירה')) return true;"

text = text.replace(bad, good)

with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
