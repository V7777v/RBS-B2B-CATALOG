import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add actionConfirm state
content = content.replace(
  "const [isPlacingOrder, setIsPlacingOrder] = useState(false);",
  "const [isPlacingOrder, setIsPlacingOrder] = useState(false);\n    const [actionConfirm, setActionConfirm] = useState<'whatsapp' | 'email' | null>(null);"
);

// 2. Replace handleSendEmail and handleSendWhatsApp
const oldHandlers = `    const handleSendEmail = () => {
      if (!validateForm()) return;
      if (!recipientEmail) return;
      const orderDetails = buildOrderDetailsText();
      const subject = encodeURIComponent(\`הזמנה חדשה (B2B): \${companyName || 'לקוח מזדמן'}\`);
      const body = encodeURIComponent(orderDetails);
      
      const ccList: string[] = [];
      if (customerEmail) ccList.push(customerEmail);
      if (alsoToOffice && officeAgent.email && officeAgent.email !== recipientEmail) ccList.push(officeAgent.email);
      let mailtoLink = \`mailto:\${recipientEmail}?subject=\${subject}&body=\${body}\`;
      if (ccList.length) mailtoLink += \`&cc=\${ccList.join(',')}\`;
      
      window.location.href = mailtoLink;
      
      if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: cart.reduce((acc: number, item: any) => acc + item.quantity, 0), items: cart, detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'email' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });
      setLastSentMethod('email');
      setOrderPlaced(true);
    };

    const handleSendWhatsApp = () => {
      if (!validateForm()) return;
      
      if (!recipientPhone) return;
      const orderDetails = buildOrderDetailsText();
      const text = encodeURIComponent(orderDetails);
      
      window.open(\`https://wa.me/\${recipientPhone}?text=\${text}\`, '_blank');
      if (alsoToOffice && officeAgent.phone && officeAgent.phone !== recipientPhone) {
        setTimeout(() => window.open(\`https://wa.me/\${officeAgent.phone}?text=\${text}\`, '_blank'), 700);
      }
      
      if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: cart.reduce((acc: number, item: any) => acc + item.quantity, 0), items: cart, detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'whatsapp' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });
      setLastSentMethod('whatsapp');
      setOrderPlaced(true);
    };`;

const newHandlers = `    const handleSendEmailRequest = () => {
      if (!validateForm()) return;
      if (!recipientEmail) return;
      setActionConfirm('email');
    };

    const handleSendWhatsAppRequest = () => {
      if (!validateForm()) return;
      if (!recipientPhone) return;
      setActionConfirm('whatsapp');
    };

    const executeSendAction = (clearCartAfter: boolean) => {
      const orderDetails = buildOrderDetailsText();
      
      if (actionConfirm === 'email') {
        const subject = encodeURIComponent(\`הזמנה חדשה (B2B): \${companyName || 'לקוח מזדמן'}\`);
        const body = encodeURIComponent(orderDetails);
        const ccList: string[] = [];
        if (customerEmail) ccList.push(customerEmail);
        if (alsoToOffice && officeAgent.email && officeAgent.email !== recipientEmail) ccList.push(officeAgent.email);
        let mailtoLink = \`mailto:\${recipientEmail}?subject=\${subject}&body=\${body}\`;
        if (ccList.length) mailtoLink += \`&cc=\${ccList.join(',')}\`;
        window.location.href = mailtoLink;
        
        if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: cart.reduce((acc: number, item: any) => acc + item.quantity, 0), items: cart, detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'email' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });
        setLastSentMethod('email');
      } else if (actionConfirm === 'whatsapp') {
        const text = encodeURIComponent(orderDetails);
        window.open(\`https://wa.me/\${recipientPhone}?text=\${text}\`, '_blank');
        if (alsoToOffice && officeAgent.phone && officeAgent.phone !== recipientPhone) {
          setTimeout(() => window.open(\`https://wa.me/\${officeAgent.phone}?text=\${text}\`, '_blank'), 700);
        }
        
        if (props.userUid) { addOrderRecord({ uid: props.userUid, email: props.userProfile?.email || '', customerNumber: props.userProfile?.customerNumber || '', company: companyName || '', itemCount: cart.reduce((acc: number, item: any) => acc + item.quantity, 0), items: cart, detailsText: orderDetails, agent: props.userProfile?.agent || '', method: 'whatsapp' }); } if (props.onSaveBilling) props.onSaveBilling({ companyName, companyId, phonePrefix, phone, email: customerEmail });
        setLastSentMethod('whatsapp');
      }
      
      if (clearCartAfter) {
        props.setCart([]);
      }
      setOrderPlaced(true);
      setActionConfirm(null);
    };`;

content = content.replace(oldHandlers, newHandlers);

// 3. Update handlePlaceOrder to clear cart
content = content.replace(
  "setLastSentMethod('saved');\n        setOrderPlaced(true);",
  "setLastSentMethod('saved');\n        props.setCart([]);\n        setOrderPlaced(true);"
);

// 4. Update the buttons to point to the new Request functions
content = content.replace(
  "onClick={handleSendWhatsApp}",
  "onClick={handleSendWhatsAppRequest}"
);
content = content.replace(
  "onClick={handleSendEmail}",
  "onClick={handleSendEmailRequest}"
);

// 5. Add the actionConfirm modal at the top of the CheckoutView return (or right inside the main div wrapper)
const actionModalHTML = `
      {actionConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#004387] p-4 text-white text-lg font-bold text-center">
              {actionConfirm === 'whatsapp' ? 'שליחת הזמנה ב-WhatsApp' : 'שליחת הזמנה ב-Email'}
            </div>
            <div className="p-6 text-center text-gray-700 font-medium">
              לאחר השליחה מומלץ לאפס את העגלה כדי למנוע בלבול בהזמנות הבאות.
            </div>
            <div className="p-4 flex flex-col gap-2 bg-gray-50">
              <button onClick={() => executeSendAction(true)} className="w-full py-2.5 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold rounded-lg transition-colors">
                שלח ונקה עגלה
              </button>
              <button onClick={() => executeSendAction(false)} className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition-colors">
                שלח בלי לנקות
              </button>
              <button onClick={() => setActionConfirm(null)} className="w-full py-2.5 mt-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  "return (\n      <div className=\"flex flex-col md:flex-row gap-6 mx-auto bg-white rounded-none shadow-sm min-h-[calc(100vh-400px)]\">",
  "return (\n      <div className=\"flex flex-col md:flex-row gap-6 mx-auto bg-white rounded-none shadow-sm min-h-[calc(100vh-400px)]\">" + actionModalHTML
);

fs.writeFileSync('src/App.tsx', content);
