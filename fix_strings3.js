import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix joins
content = content.replace(/\.join\('\n'\)/g, ".join('\\n')");

// Fix specific texts
content = content.replace(/const detailsText = 'הזמנה \(עודכנה ע"י הסוכן\)\n  ---------------------------------\n  ' \+/g, "const detailsText = 'הזמנה (עודכנה ע\\\"י הסוכן)\\n  ---------------------------------\\n  ' +");

content = content.replace(/'\n  ---------------------------------\n  סה״כ פריטים: \$\{itemCount\}\n  סה״כ לתשלום: ₪\$\{totalPrice\}'/g, "'\\n  ---------------------------------\\n  סה״כ פריטים: ${itemCount}\\n  סה״כ לתשלום: ₪${totalPrice}'");

content = content.replace(/const detailsText = 'הזמנה \(עודכנה על ידי הלקוח\)\n  ---------------------------------\n  ' \+ items\.map\(\(it: any\) => `\$\{it\.name\} \(\$\{it\.sku\}\) — כמות: \$\{it\.quantity\} — מחיר: ₪\$\{it\.price\}`\)\.join\('\n'\) \+ '\n  ---------------------------------\n  סה״כ פריטים: \$\{itemCount\}';/g, "const detailsText = 'הזמנה (עודכנה על ידי הלקוח)\\n  ---------------------------------\\n  ' + items.map((it: any) => `${it.name} (${it.sku}) — כמות: ${it.quantity} — מחיר: ₪${it.price}`).join('\\n') + '\\n  ---------------------------------\\n  סה״כ פריטים: ${itemCount}';");

// Check if any `join('` followed by `')` still exist across lines
// We can just replace all instances of:
// `join('\n')`
// `join('\n  ')`
content = content.replace(/\.join\('\n([^']*)'\)/g, ".join('\\n$1')");

// Also there was this:
// ${items.join('
// ')}`);
content = content.replace(/\$\{items\.join\('\n([^']*)'\)\}/g, "${items.join('\\n$1')}");

fs.writeFileSync('src/App.tsx', content);
