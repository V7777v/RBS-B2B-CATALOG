import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

if 'parseCabinetDepthFromName' not in text:
    text += """
export const parseCabinetDepthFromName = (name: string): number => {
  const m = String(name || '').match(/בגודל\s*([0-9]{2,4})\s*[*xX\u00d7]\s*([0-9]{2,4})/);
  if (m) { const d = parseInt(m[1], 10); return d < 150 ? d * 10 : d; }
  return 0;
};
"""
    with open('src/utils/cabinetData.ts', 'w') as f:
        f.write(text)
