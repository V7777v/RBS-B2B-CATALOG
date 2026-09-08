import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Regex issues
content = content.replace(/split\(\/\[\n\s*([^\]]*)\]\+\/\)/g, "split(/[$1]+/)");
content = content.replace(/split\('\n([^']*)'\)/g, "split('\\n$1')");

// Joins
content = content.replace(/\.join\('\n([^']*)'\)/g, ".join('\\n$1')");
content = content.replace(/\$\{items\.join\('\n([^']*)'\)\}/g, "${items.join('\\n$1')}");

// DetailsText
content = content.replace(/const detailsText = 'הזמנה \(עודכנה ע"י הסוכן\)\n\s*---------------------------------\n\s*' \+/g, "const detailsText = 'הזמנה (עודכנה ע\\\"י הסוכן)\\n---------------------------------\\n' +");

content = content.replace(/'\n\s*---------------------------------\n\s*סה״כ פריטים: \$\{itemCount\}\n\s*סה״כ לתשלום: ₪\$\{totalPrice\}'/g, "'\\n---------------------------------\\nסה״כ פריטים: ${itemCount}\\nסה״כ לתשלום: ₪${totalPrice}'");

content = content.replace(/const detailsText = 'הזמנה \(עודכנה על ידי הלקוח\)\n\s*---------------------------------\n\s*' \+ items\.map\(\(it: any\) => `\$\{it\.name\} \(\$\{it\.sku\}\) — כמות: \$\{it\.quantity\} — מחיר: ₪\$\{it\.price\}`\)\.join\('\\n'\) \+ '\n\s*---------------------------------\n\s*סה״כ פריטים: \$\{itemCount\}';/g, "const detailsText = 'הזמנה (עודכנה על ידי הלקוח)\\n---------------------------------\\n' + items.map((it: any) => `${it.name} (${it.sku}) — כמות: ${it.quantity} — מחיר: ₪${it.price}`).join('\\n') + '\\n---------------------------------\\nסה״כ פריטים: ${itemCount}';");

// And for those .join('\n') that already got replaced to join('\\n') but detailsText still broken?
// Let's just fix the rest.
content = content.replace(/הזמנה חדשה \(נשלחה ללא ניקוי עגלה\)\n\s*---------------------------------\n\s*/g, "הזמנה חדשה (נשלחה ללא ניקוי עגלה)\\n---------------------------------\\n");
content = content.replace(/הזמנה חדשה\n\s*---------------------------------\n\s*/g, "הזמנה חדשה\\n---------------------------------\\n");

// Also check for any remaining `.join('\n')` that has a real newline inside single quotes
content = content.replace(/\.join\('([^']*)'\)/g, (match, p1) => {
    return `.join('${p1.replace(/\n/g, '\\n')}')`;
});

// Check string templates
content = content.replace(/`([^`]*)`/g, (match, p1) => {
    return `\`${p1.replace(/\n/g, '\\n')}\``; // Wait! No, backticks CAN have newlines! 
    // BUT we don't want real newlines if it was previously escaped? 
    // Actually, `tsc` doesn't complain about backticks with newlines!
});

fs.writeFileSync('src/App.tsx', content);
