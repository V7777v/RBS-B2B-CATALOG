import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = '''export const isCabinetProduct = (pp: any): boolean => {
  const name = String(pp?.name || '').trim();
  const sub = String(pp?.subcategory || '').trim();
  const cat = String(pp?.category || '').trim();
  if (/ארון|Rack|Cabinet/i.test(name) && !/מדף|אביזר|בורג|מאוורר|פאנל/i.test(name)) return true;
  if (/ארונות תקשורת/i.test(sub) && !name.includes('מדף') && !name.includes('פאנל') && !name.includes('פנל') && !name.includes('אביזר') && !name.includes('פס') && !name.includes('מגירה')) return true;
  return false;
};'''

good = '''export const isCabinetProduct = (pp: any): boolean => {
  const name = String(pp?.name || '').trim();
  const sub = String(pp?.subcategory || '').trim();
  const cat = String(pp?.category || '').trim();
  const isExcluded = /מדף|אביזר|בורג|מאוורר|פאנל|פנל|מגירה|פס|תרמוסטט|ארגונית|סט|cable|management/i.test(name);
  if (isExcluded) return false;
  if (/ארון|מסד|Rack|Cabinet/i.test(name)) return true;
  if (/ארונות תקשורת/i.test(sub) && /ארון|מסד/i.test(name)) return true;
  return false;
};'''

text = text.replace(bad, good)

with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
