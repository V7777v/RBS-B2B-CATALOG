import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Line 3216
content = content.replace(/הזמנה \(עודכנה ע"י הסוכן\)\n\s+---------------------------------\n/g, 'הזמנה (עודכנה ע"י הסוכן)\\n  ---------------------------------\\n  ');

// 3223 (join at the end)
content = content.replace(/\n\s+---------------------------------\n\s+סה״כ פריטים: \$\{itemCount\}\n\s+סה״כ לתשלום: ₪\$\{totalPrice\}/g, '\\n  ---------------------------------\\n  סה״כ פריטים: ${itemCount}\\n  סה״כ לתשלום: ₪${totalPrice}');

// Order (WhatsApp format) 3305
content = content.replace(/הזמנה חדשה \(נשלחה ללא ניקוי עגלה\)\n\s+---------------------------------\n/g, 'הזמנה חדשה (נשלחה ללא ניקוי עגלה)\\n  ---------------------------------\\n  ');
content = content.replace(/הזמנה חדשה\n\s+---------------------------------\n/g, 'הזמנה חדשה\\n  ---------------------------------\\n  ');

// 6580 6813 6842 7272 7886
// Let's look for backticks that might have had \\n inside string concatenation.
// Wait, the errors were on single quotes, not backticks!
// Let's write a simple regex: find `'...` that spans a newline and replace with `\n`.
// Actually, why don't I just read `src/App.tsx`, and for every line that ends with an unclosed single quote (and is not a comment), join it with the next line using `\\n`?
// Better yet, let's just do a string replace of specific patterns.

// Let's print the lines that are broken to see exactly what they are.
const lines = content.split('\n');
const errors = [3216, 3218, 3219, 3220, 3305, 3306, 6580, 6581, 6813, 6814, 6842, 6843, 7272, 7275, 7886, 7887];
for (let num of errors) {
  console.log(`Line ${num}: ${lines[num - 1]}`);
}
