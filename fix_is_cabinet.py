import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

if 'isCabinetProduct' not in text:
    text += """
export const isCabinetProduct = (pp: any): boolean => {
  const name = String(pp?.name || '').trim();
  const sub = String(pp?.subcategory || '').trim();
  const cat = String(pp?.category || '').trim();
  if (/ארון|Rack|Cabinet/i.test(name) && !/מדף|אביזר|בורג|מאוורר|פאנל/i.test(name)) return true;
  if (/ארונות תקשורת/i.test(sub) && !name.includes('מדף')) return true;
  return false;
};
"""
    with open('src/utils/cabinetData.ts', 'w') as f:
        f.write(text)
