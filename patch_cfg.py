import re

with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad_fallback = """           const fallbackCabinet: CabinetMatrixData = {
             sku: productSkuNorm,
             u: parsedTotalU,
             depth: parseCabinetDepthFromName(product.name || ''),
             width: null,
             frontDoor: '',
             rearDoor: '',
             color: '',
             fans: '',
             wheels: '',
             levelingFeet: '',
             shelvesQty: '',
             suitableStandard: [],
             suitableHanging: [],
             suitableSliding: []
           };"""

good_fallback = """           const desc = product.description || '';
           const fallbackCabinet: CabinetMatrixData = {
             sku: productSkuNorm,
             u: parsedTotalU,
             depth: parseCabinetDepthFromName(product.name || ''),
             width: null,
             frontDoor: '',
             rearDoor: '',
             color: '',
             fans: desc.match(/(\\d+)\\s*(?:מאוורר|מאווררים|fan|fans)/i)?.[1] || '',
             wheels: desc.match(/(\\d+)\\s*(?:גלגל|גלגלים|wheel|wheels)/i)?.[1] || '',
             levelingFeet: desc.match(/(\\d+)\\s*(?:רגל|רגליות|רגליים|feet)/i)?.[1] || '',
             shelvesQty: desc.match(/(\\d+)\\s*(?:מדף|מדפים|shelf)/i)?.[1] || '',
             suitableStandard: [],
             suitableHanging: [],
             suitableSliding: []
           };"""

text = text.replace(bad_fallback, good_fallback)

bad_data = """        const data: CabinetMatrixData = {
           sku: cabRow[0]?.toString() || '',
           u: parseInt(cabRow[2]?.toString() || '0', 10),
           width: isNaN(widthVal) ? null : widthVal,
           depth: isNaN(depthVal) ? null : depthVal,
           frontDoor: String(cabRow[5] ?? '').trim(),
           rearDoor: String(cabRow[6] ?? '').trim(),
           color: String(cabRow[7] ?? '').trim(),
           fans: cabRow[8]?.toString() || 'X',
           wheels: cabRow[9]?.toString() || 'X',
           levelingFeet: cabRow[10]?.toString() || 'X',
           shelvesQty: cabRow[11]?.toString() || 'X',"""

good_data = """        const desc = product.description || '';
        const data: CabinetMatrixData = {
           sku: cabRow[0]?.toString() || '',
           u: parseInt(cabRow[2]?.toString() || '0', 10),
           width: isNaN(widthVal) ? null : widthVal,
           depth: isNaN(depthVal) ? null : depthVal,
           frontDoor: String(cabRow[5] ?? '').trim(),
           rearDoor: String(cabRow[6] ?? '').trim(),
           color: String(cabRow[7] ?? '').trim(),
           fans: (cabRow[8]?.toString() && cabRow[8].toString().toUpperCase() !== 'X' && cabRow[8].toString().trim() !== '') ? cabRow[8].toString() : (desc.match(/(\\d+)\\s*(?:מאוורר|מאווררים|fan|fans)/i)?.[1] || 'X'),
           wheels: (cabRow[9]?.toString() && cabRow[9].toString().toUpperCase() !== 'X' && cabRow[9].toString().trim() !== '') ? cabRow[9].toString() : (desc.match(/(\\d+)\\s*(?:גלגל|גלגלים|wheel|wheels)/i)?.[1] || 'X'),
           levelingFeet: (cabRow[10]?.toString() && cabRow[10].toString().toUpperCase() !== 'X' && cabRow[10].toString().trim() !== '') ? cabRow[10].toString() : (desc.match(/(\\d+)\\s*(?:רגל|רגליות|רגליים|feet)/i)?.[1] || 'X'),
           shelvesQty: (cabRow[11]?.toString() && cabRow[11].toString().toUpperCase() !== 'X' && cabRow[11].toString().trim() !== '') ? cabRow[11].toString() : (desc.match(/(\\d+)\\s*(?:מדף|מדפים|shelf)/i)?.[1] || 'X'),"""

text = text.replace(bad_data, good_data)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
