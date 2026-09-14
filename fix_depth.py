import re
with open('src/utils/cabinetData.ts', 'r') as f:
    text = f.read()

bad = """  const depthMatch = str.match(/(?:עומק|depth|עומק[:\s]|D=)\s*[:]?\s*([0-9]{2,4})\s*(מ"?מ|mm|ס"?מ|cm)?/i);
  if (depthMatch) {
    const val = parseInt(depthMatch[1], 10);
    const unit = (depthMatch[2] || '').toLowerCase();
    if (unit.includes('מ') || unit.includes('mm')) {
      return val; // e.g. "עומק 80 mm" -> 80
    }
    if (unit.includes('ס') || unit.includes('cm')) {
      return val * 10; // e.g. "עומק 60 cm" -> 600
    }
    // No unit: < 150 assumes cm, >= 150 assumes mm
    return val < 150 ? val * 10 : val;
  }"""

good = """  // Match explicit depth mention (עומק: X or depth X or D=X or בעומק X)
  // Check for unit (mm / מ"מ vs cm / ס"מ). Handle different quotes.
  const depthMatch = str.match(/(?:עומק|depth|D=)\s*[:]?\s*([0-9]{2,4})\s*(מ[״"']?מ|mm|ס[״"']?מ|cm)?/i);
  if (depthMatch) {
    const val = parseInt(depthMatch[1], 10);
    const unit = (depthMatch[2] || '').toLowerCase();
    if (unit.includes('ס') || unit.includes('cm')) {
      return val * 10; // e.g. "עומק 60 cm" -> 600, "עומק 60 ס״מ" -> 600
    }
    if (unit.includes('מ') || unit.includes('mm')) {
      return val; // e.g. "עומק 80 mm" -> 80
    }
    // No unit: < 150 assumes cm, >= 150 assumes mm
    return val < 150 ? val * 10 : val;
  }"""

text = text.replace(bad, good)
with open('src/utils/cabinetData.ts', 'w') as f:
    f.write(text)
