import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// 1. Highlight State
if (!content.includes('const [highlightedSku, setHighlightedSku]')) {
  content = content.replace("const [addedIdx, setAddedIdx] = useState<number | null>(null);",
    "const [addedIdx, setAddedIdx] = useState<number | null>(null);\n  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);");
}

// 2. Add id and highlight styling to the accessory card
const cardStart = `  return (
      <div key={idx} className={\`flex flex-col p-3.5 border group transition-all relative rounded-none hover:shadow-sm \${fitsRemaining ? 'bg-slate-50 border-slate-100 hover:border-[#004387]' : 'bg-rose-50/40 border-rose-100'}\`}>`;
const cardNew = `  return (
      <div id={\`acc-\${acc.pn}\`} key={idx} className={\`flex flex-col p-3.5 border group transition-all relative rounded-none hover:shadow-sm \${fitsRemaining ? 'bg-slate-50 border-slate-100 hover:border-[#004387]' : 'bg-rose-50/40 border-rose-100'} \${highlightedSku === acc.pn ? 'ring-2 ring-[#fe8d00] bg-orange-50' : ''}\`}>`;
content = content.replace(cardStart, cardNew);

// 3. LTR formatting for SKU in the accessory card
content = content.replace(
  `<p className="font-bold text-[15px] text-slate-900 group-hover:text-[#004387] transition-colors leading-snug">{acc.pn}</p>`,
  `<p className="font-bold text-[15px] text-slate-900 group-hover:text-[#004387] transition-colors leading-snug flex justify-start"><span dir="ltr" className="inline-block">{acc.pn}</span></p>`
);

// 4. LTR formatting for SKU in the Selected Optionals Review Area
content = content.replace(
  `<span className="text-gray-800 font-bold leading-tight truncate">
                          {item.pn}
                       </span>`,
  `<span className="text-gray-800 font-bold leading-tight truncate inline-block" dir="ltr">
                          {item.pn}
                       </span>`
);

// 5. Rack slot onClick highlight
const clickLogic = `                    onClick={() => {
                      if (isEmpty) {
                        // Highlight or scroll to accessories list
                        const el = document.getElementById('com-accessories-list');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else if (isOptional && typeof slot.optionalIdx === 'number') {
                        // Quick increment when clicked on rack
                        handleIncrementQuantity(slot.optionalIdx);
                      }
                    }}`;
const newClickLogic = `                    onClick={() => {
                      if (isEmpty) {
                        const el = document.getElementById('com-accessories-list');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else if (isOptional && slot.accessoryRef?.pn) {
                        setHighlightedSku(slot.accessoryRef.pn);
                        const el = document.getElementById(\`acc-\${slot.accessoryRef.pn}\`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        setTimeout(() => setHighlightedSku(null), 2000);
                      }
                    }}`;
content = content.replace(clickLogic, newClickLogic);

fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
