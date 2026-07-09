import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const [actionConfirm, setActionConfirm] = useState")) {
     lines.splice(i+1, 0, "    const [completedCart, setCompletedCart] = useState<any[]>([]);");
     break;
  }
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const orderDetails = buildOrderDetailsText();")) {
     // replace in executeSendAction and handlePlaceOrder
  }
  if (lines[i].includes("cart.forEach((item: any) => {")) {
     lines[i] = lines[i].replace("cart.forEach", "(completedCart.length > 0 ? completedCart : cart).forEach");
  }
  if (lines[i].includes("cart.reduce((acc, item) => acc + item.quantity, 0)")) {
     lines[i] = lines[i].replace("cart.reduce", "(completedCart.length > 0 ? completedCart : cart).reduce");
  }
  if (lines[i].includes("cart.reduce((acc: number, item: any) => acc + item.quantity, 0)")) {
     lines[i] = lines[i].replace("cart.reduce", "(completedCart.length > 0 ? completedCart : cart).reduce");
  }
  if (lines[i].includes("items: cart")) {
     lines[i] = lines[i].replace("items: cart", "items: (completedCart.length > 0 ? completedCart : cart)");
  }
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("props.setCart([]);")) {
     lines.splice(i, 0, "        setCompletedCart([...cart]);");
     break;
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
