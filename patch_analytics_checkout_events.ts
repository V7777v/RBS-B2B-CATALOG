import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Order saved
content = content.replace(
  "        if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });\n        if (props.onOrderPlaced) props.onOrderPlaced({ id: newId, ...orderData, status: 'sent', createdAt: { toDate: () => new Date() } });",
  "        if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });\n        if (props.onOrderPlaced) props.onOrderPlaced({ id: newId, ...orderData, status: 'sent', createdAt: { toDate: () => new Date() } });\n        trackEvent('order_saved', { order_id: newId, item_count: itemCount, company_name: companyName });"
);

// executeSendAction
content = content.replace(
  "        if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: (completedCart.length > 0 ? completedCart : cart).reduce((acc: number, item: any) => acc + item.quantity, 0), items: (completedCart.length > 0 ? completedCart : cart), detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'email' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });\n        setLastSentMethod('email');",
  "        if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: (completedCart.length > 0 ? completedCart : cart).reduce((acc: number, item: any) => acc + item.quantity, 0), items: (completedCart.length > 0 ? completedCart : cart), detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'email' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });\n        setLastSentMethod('email');\n        trackEvent('order_sent_email', { clear_cart: clearCartAfter, item_count: (completedCart.length > 0 ? completedCart : cart).reduce((acc: number, item: any) => acc + item.quantity, 0) });"
);

content = content.replace(
  "        if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: (completedCart.length > 0 ? completedCart : cart).reduce((acc: number, item: any) => acc + item.quantity, 0), items: (completedCart.length > 0 ? completedCart : cart), detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'whatsapp' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });\n        setLastSentMethod('whatsapp');",
  "        if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: (completedCart.length > 0 ? completedCart : cart).reduce((acc: number, item: any) => acc + item.quantity, 0), items: (completedCart.length > 0 ? completedCart : cart), detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'whatsapp' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });\n        setLastSentMethod('whatsapp');\n        trackEvent('order_sent_whatsapp', { clear_cart: clearCartAfter, item_count: (completedCart.length > 0 ? completedCart : cart).reduce((acc: number, item: any) => acc + item.quantity, 0) });"
);

fs.writeFileSync('src/App.tsx', content);
