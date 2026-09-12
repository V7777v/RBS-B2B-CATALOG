import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// Remove mobile tabs logic
content = content.replace(/const \[mobileTab, setMobileTab\] = useState<'accessories' \| 'cabinet' \| 'summary'>\('accessories'\);\n/g, '');
content = content.replace(/<div className="block @4xl:hidden border-b border-gray-200 bg-gray-50 flex mb-4">[\s\S]*?<\/div>/g, '');

// Restore Column 1
content = content.replace(/<div className={`@4xl:block \$\{mobileTab === 'cabinet' \? 'block' : 'hidden'\}`}>\s*<div className="@4xl:col-span-1 space-y-3">/g, '<div className="@4xl:col-span-1 space-y-3">');

// We have </div></div> before {/* Column 2
content = content.replace(/<\/div>\n\s*<\/div>\n\s*\{\/\* Column 2: Selected Optionals/g, '</div>\n        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}\n        <div className="@4xl:col-span-2 flex flex-col gap-6">\n        {/* Column 2: Selected Optionals');

// Inside Column 2, remove its wrapper
content = content.replace(/<div className={`@4xl:block \$\{mobileTab === 'summary' \? 'block' : 'hidden'\}`}>\n\s*<div className="space-y-6">/g, '<div className="space-y-6">');

// Before Column 3, there's </div></div>
content = content.replace(/<\/div>\n\s*<\/div>\n\s*\{\/\* Column 3: Optional Compatible Upgrades/g, '</div>\n        {/* Column 3: Optional Compatible Upgrades');

// Inside Column 3, remove its wrapper
content = content.replace(/<div className={`@4xl:block \$\{mobileTab === 'accessories' \? 'block' : 'hidden'\}`}>\n\s*<div id="com-accessories-list"/g, '<div id="com-accessories-list"');

// Fix buckets layout
const oldBuckets = `              {_bucketShelves.length > 0 && AccordionSection('shelves', '📏 מדפים (סטנדרטיים, תלויים, נשלפים)', _bucketShelves, 'bg-slate-100 text-slate-800', false)}
              {_bucketPdu.length > 0 && AccordionSection('pdu', '🔌 פסי שקעים וניהול צריכה', _bucketPdu, 'bg-red-50 text-red-800', false)}
              {_bucketFan.length > 0 && AccordionSection('fans', '🌀 פתרונות אוורור (מאווררים, מפוחים)', _bucketFan, 'bg-blue-50 text-blue-800', false)}
              {_bucketPanel.length > 0 && AccordionSection('panels', '🎛️ פאנלים וניהול כבילה', _bucketPanel, 'bg-gray-100 text-gray-800', false)}
              {_bucketOthers.length > 0 && AccordionSection('others', '🔧 אביזרים נוספים', _bucketOthers, 'bg-emerald-50 text-emerald-800', false)}
              {_illusPairs.length > 0 && AccordionSection('illus', '🧩 אביזרי המחשה', _illusPairs, 'bg-purple-50 text-purple-800', false)}`;

const newBuckets = `              {_bucketTakesU.length > 0 && AccordionSection('takesU', '📏 תופס מקום בארון (U)', _bucketTakesU, 'bg-[#e6f0fa] text-[#004387]')}
              {_bucketFree.length > 0 && AccordionSection('freeU', '🔌 אביזרים ללא שימוש ב-U (אופקי/תלוי)', _bucketFree, 'bg-slate-50 text-slate-700', false)}
              {_bucketPdu.length > 0 && AccordionSection('pdu', '⚡ פסי שקעים וחלוקת מתח', _bucketPdu, 'bg-rose-50 text-rose-800', false)}
              {_illusPairs.length > 0 && AccordionSection('illus', '🧩 תצוגת הדמיה (ללא מחיר)', _illusPairs, 'bg-indigo-50 text-indigo-800', false)}`;

content = content.replace(oldBuckets, newBuckets);

// Find the logic that defines buckets and restore it.
const bucketsLogicOld = `const _bucketTakesU = [];
  const _bucketFree = [];
  
  const _isShelf = ({ acc }: any) => /מדף|shelf/i.test(\`\${acc.name || ''} \${acc.description || ''} \${acc.pn || ''}\`);
  const _isPdu = ({ acc }: any) => acc._pdu || /פס שקע|פסי שקע|שקעים|pdu/i.test(\`\${acc.name || ''} \${acc.description || ''} \${acc.pn || ''}\`);
  const _isFan = ({ acc }: any) => /מאוורר|אוורור|מפוח|fan/i.test(\`\${acc.name || ''} \${acc.description || ''} \${acc.pn || ''}\`);
  const _isPanel = ({ acc }: any) => /פנל|פלאנל|עיוור|panel|cable|ניהול כבילה|מברשת/i.test(\`\${acc.name || ''} \${acc.description || ''} \${acc.pn || ''}\`);

  const _bucketShelves = _filtered.filter(({ acc }: any) => !acc._promoted && _isShelf({ acc }));
  const _bucketPdu = _filtered.filter(({ acc }: any) => !acc._promoted && !_isShelf({ acc }) && _isPdu({ acc }));
  const _bucketFan = _filtered.filter(({ acc }: any) => !acc._promoted && !_isShelf({ acc }) && !_isPdu({ acc }) && _isFan({ acc }));
  const _bucketPanel = _filtered.filter(({ acc }: any) => !acc._promoted && !_isShelf({ acc }) && !_isPdu({ acc }) && !_isFan({ acc }) && _isPanel({ acc }));
  const _bucketOthers = _filtered.filter(({ acc }: any) => !acc._promoted && !_isShelf({ acc }) && !_isPdu({ acc }) && !_isFan({ acc }) && !_isPanel({ acc }));`;

const bucketsLogicNew = `const _bucketTakesU = _filtered
    .filter(({ acc }: any) => !acc._promoted && acc.uSize > 0)
    .sort((a: any, b: any) => {
      const rank = (x: any) => (x.acc._curated ? 0 : (x.acc._depth ? 1 : 2));
      return rank(a) - rank(b);
    });
  const _bucketFreeAll = _filtered.filter(({ acc }: any) => !acc._promoted && acc.uSize === 0);
  const _isPdu = ({ acc }: any) => acc._pdu || /פס שקע|פסי שקע|שקעים|pdu/i.test(\`\${acc.name || ''} \${acc.description || ''} \${acc.pn || ''}\`);
  const _bucketPdu = _bucketFreeAll.filter(_isPdu);
  const _bucketFree = _bucketFreeAll.filter((x: any) => !_isPdu(x));`;

content = content.replace(bucketsLogicOld, bucketsLogicNew);

fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
