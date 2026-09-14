import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = """  const match = str.match(/\\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }"""

good = """  // Clean out common false-positive numbers like voltage or inches before matching quantity
  let cleanStr = str.replace(/[0-9]{2,3}\\s*V/gi, '');
  cleanStr = cleanStr.replace(/19\\s*["״'']|19\\s*inch/gi, '');
  
  // Look for explicit quantity patterns like "2 מדפים", "כולל 4 מאווררים"
  const qtyMatch = cleanStr.match(/(?:כולל|עם|מכיל)?\\s*(\\d+)\\s*(?:יח|יחידות|מדפ|מאוורר|גלגל|רגל)/i);
  if (qtyMatch) {
    return parseInt(qtyMatch[1], 10);
  }
  
  // If it's literally just a number
  if (/^\\s*\\d+\\s*$/.test(cleanStr)) {
    return parseInt(cleanStr.trim(), 10);
  }"""

text = text.replace(bad, good)
with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
