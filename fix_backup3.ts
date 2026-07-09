import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("cart.forEach((item, idx) => {")) {
     lines[i] = lines[i].replace("cart.forEach", "(completedCart.length > 0 ? completedCart : cart).forEach");
  }
  if (lines[i].includes("cart.reduce((acc, item) => acc + item.quantity, 0)")) {
     lines[i] = lines[i].replace("cart.reduce", "(completedCart.length > 0 ? completedCart : cart).reduce");
  }
  if (lines[i].includes("cart.reduce((acc: number, item: any) => acc + item.quantity, 0)")) {
     lines[i] = lines[i].replace("cart.reduce", "(completedCart.length > 0 ? completedCart : cart).reduce");
  }
  if (lines[i].includes("items: cart,")) {
     lines[i] = lines[i].replace("items: cart,", "items: (completedCart.length > 0 ? completedCart : cart),");
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
