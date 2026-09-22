import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `    if (!productKey && !cat) { deepLinkDoneRef.current = true; return; }
    deepLinkDoneRef.current = true;

    if (productKey) {
      const needle = productKey.toLowerCase();
      const found = catalogData.find((p: any) =>
        String(p.sku || '').toLowerCase() === needle || String(p.id || '').toLowerCase() === needle
      );
      if (found) {
        setCurrentOptionals([]);
        navigateForward({ currentView: 'product', selectedProduct: found });
      } else {
        setDeepLinkError('המוצר לא נמצא');
      }
      return;
    }`;

const replace = `    if (!productKey && !cat) { deepLinkDoneRef.current = true; return; }

    if (productKey) {
      const needle = productKey.toLowerCase();
      const found = catalogData.find((p: any) =>
        String(p.sku || '').toLowerCase() === needle || String(p.id || '').toLowerCase() === needle
      );
      if (found) {
        setCurrentOptionals([]);
        navigateForward({ currentView: 'product', selectedProduct: found });
        deepLinkDoneRef.current = true;
      } else if (!hasMoreProducts) {
        setDeepLinkError('המוצר לא נמצא');
        deepLinkDoneRef.current = true;
      }
      return;
    }
    
    deepLinkDoneRef.current = true;`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find block");
}
