import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

// Line 3216: const detailsText = 'הזמנה (עודכנה ע"י הסוכן)
// Line 3217:   ---------------------------------
// Line 3218:   ' +
lines[3215] = lines[3215] + "\\n" + lines[3216] + "\\n" + lines[3217];
lines[3216] = "";
lines[3217] = "";

// Line 3305: 
// 3305: orderItems.map((it: any) => `${it.name} (${it.sku}) — כמות: ${it.quantity} — מחיר יח׳: ₪${it.price}`).join('
// 3306: ') +
lines[3304] = lines[3304] + "\\n" + lines[3305];
lines[3305] = "";

// 6580:
// 6580: const lines = (q.items || []).map((it: any) => `\u2022 ${it.name} (${it.sku || ''}) \u00d7${it.qty} = \u20aa${Math.round((Number(it.quotedPrice) || 0) * (Number(it.qty) || 0))}`).join('
// 6581: ');
lines[6579] = lines[6579] + "\\n" + lines[6580];
lines[6580] = "";

// 6813: ${items.join('
// 6814: ')}`);
lines[6812] = lines[6812] + "\\n" + lines[6813];
lines[6813] = "";

// 6842: ${items.join('
// 6843: ')}`);
lines[6841] = lines[6841] + "\\n" + lines[6842];
lines[6842] = "";

// 7272: const detailsText = 'הזמנה (עודכנה על ידי הלקוח)
// 7273:   ---------------------------------
// 7274:   ' + items.map((it: any) => `${it.name} (${it.sku}) — כמות: ${it.quantity} — מחיר: ₪${it.price}`).join('\n') + '\n  ---------------------------------\n  סה״כ פריטים: ${itemCount}';
// WAIT, line 7272 to 7275
// 7272: onClick={async () => { ... const detailsText = 'הזמנה (עודכנה על ידי הלקוח)
// 7273:   ---------------------------------
// 7274:   ' + items.map...
// 7275: '); await updateOrder...
lines[7271] = lines[7271] + "\\n" + lines[7272] + "\\n" + lines[7273] + "\\n" + lines[7274];
lines[7272] = "";
lines[7273] = "";
lines[7274] = "";

// 7886: ${items.join('
// 7887: ')}`); // maybe? 
// Let's check 7886
lines[7885] = lines[7885] + "\\n" + lines[7886];
lines[7886] = "";

fs.writeFileSync('src/App.tsx', lines.filter(l => l !== "").join('\n'));
