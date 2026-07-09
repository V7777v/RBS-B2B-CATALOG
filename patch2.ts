import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const lines = content.split('\n');

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

lines.splice(1974, 2015 - 1974 + 1, newHandlers);

fs.writeFileSync('src/App.tsx', lines.join('\n'));
