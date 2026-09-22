import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `                מק״ט: <span className="font-mono text-gray-800 tracking-wide">{selectedProduct.sku}</span>
              </div>

              <button
                onClick={() => copyShareLink && copyShareLink('product', selectedProduct.sku || selectedProduct.id)}
                className="w-full mb-4 sm:mb-6 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#004387] rounded-md font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Link size={14} /> העתק קישור למוצר
              </button>
              
              <div className="mb-6 sm:mb-8 bg-white border-2 border-slate-100 p-5 sm:p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:border-[#004387]/25 transition-all duration-300 relative overflow-hidden text-right">
                {/* Brand colored vertical accent bar on the right (RTL start) */}`;

const r1 = `                מק״ט: <span className="font-mono text-gray-800 tracking-wide">{selectedProduct.sku}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 sm:mb-6">
                <button
                  onClick={() => copyShareLink && copyShareLink('product', selectedProduct.sku || selectedProduct.id)}
                  className="py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#004387] rounded-md font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Link size={14} /> העתק קישור
                </button>
                <button
                  onClick={() => {
                    const key = selectedProduct.sku || selectedProduct.id || '';
                    const link = window.location.origin + '/?product=' + encodeURIComponent(String(key));
                    const priceStr = (!isGuest && selectedProduct.price > 0)
                      ? \`\\nמחיר מתקין: ₪\${Number(selectedProduct.price).toLocaleString('he-IL')}\`
                      : '';
                    const msg = \`\${selectedProduct.name}\\nמק״ט: \${selectedProduct.sku || ''}\${priceStr}\\n\\nקישור למוצר:\\n\${link}\`;
                    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
                  }}
                  className="py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-md font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <MessageSquare size={14} /> שלח בוואטסאפ
                </button>
              </div>
              
              <div className="mb-6 sm:mb-8 bg-white border-2 border-slate-100 p-5 sm:p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:border-[#004387]/25 transition-all duration-300 relative overflow-hidden text-right">
                {/* Brand colored vertical accent bar on the right (RTL start) */}`;

const t2 = `                    const retail = p.retailPrice ? \` (צרכן: ₪\${p.retailPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})})\` : '';
                    priceStr = \` | מחיר מתקין: \${price}\${retail}\`;
                  }
                  return \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\${priceStr}\`;
                });
                const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);
                trackEvent('send_favorites_whatsapp', { items_count: items.length });
                let phone = guestPhoneDest.replace(/\\D/g, '');
                if (phone.startsWith('0')) phone = '972' + phone.slice(1);
                window.open(\`https://wa.me/\${phone}?text=\${text}\`, '_blank');
                setShowGuestWhatsAppModal(false);
                setGuestWhatsAppToast('רשימת המועדפים נשמרה');
                setTimeout(() => setGuestWhatsAppToast(''), 3000);
              }} className="w-full py-2.5 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold rounded-lg transition-colors">
                שלח ושמור מועדפים
              </button>
              <button onClick={() => {
                const items = favorites.filter((f: any) => selectedFavIds.has(f.id)).map((f: any) => {
                  const p = catalogData.find((x: any) => x.id === f.id);
                  let priceStr = '';
                  if (p) {
                    const price = p.price > 0 ? \`₪\${p.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : 'צור קשר';
                    const retail = p.retailPrice ? \` (צרכן: ₪\${p.retailPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})})\` : '';
                    priceStr = \` | מחיר מתקין: \${price}\${retail}\`;
                  }
                  return \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\${priceStr}\`;
                });
                const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);
                let phone = guestPhoneDest.replace(/\\D/g, '');`;

const r2 = `                    const retail = p.retailPrice ? \` (צרכן: ₪\${p.retailPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})})\` : '';
                    priceStr = \` | מחיר מתקין: \${price}\${retail}\`;
                  }
                  const favKey = f.sku || f.id || '';
                  const favLink = favKey ? \`\\n  \${window.location.origin}/?product=\${encodeURIComponent(String(favKey))}\` : '';
                  return \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\${priceStr}\${favLink}\`;
                });
                const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);
                trackEvent('send_favorites_whatsapp', { items_count: items.length });
                let phone = guestPhoneDest.replace(/\\D/g, '');
                if (phone.startsWith('0')) phone = '972' + phone.slice(1);
                window.open(\`https://wa.me/\${phone}?text=\${text}\`, '_blank');
                setShowGuestWhatsAppModal(false);
                setGuestWhatsAppToast('רשימת המועדפים נשמרה');
                setTimeout(() => setGuestWhatsAppToast(''), 3000);
              }} className="w-full py-2.5 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold rounded-lg transition-colors">
                שלח ושמור מועדפים
              </button>
              <button onClick={() => {
                const items = favorites.filter((f: any) => selectedFavIds.has(f.id)).map((f: any) => {
                  const p = catalogData.find((x: any) => x.id === f.id);
                  let priceStr = '';
                  if (p) {
                    const price = p.price > 0 ? \`₪\${p.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : 'צור קשר';
                    const retail = p.retailPrice ? \` (צרכן: ₪\${p.retailPrice.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})})\` : '';
                    priceStr = \` | מחיר מתקין: \${price}\${retail}\`;
                  }
                  const favKey = f.sku || f.id || '';
                  const favLink = favKey ? \`\\n  \${window.location.origin}/?product=\${encodeURIComponent(String(favKey))}\` : '';
                  return \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\${priceStr}\${favLink}\`;
                });
                const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מועדפים:\\n\${items.join('\\n')}\`);
                let phone = guestPhoneDest.replace(/\\D/g, '');`;

const t3 = `                        const price = p.price > 0 ? \`₪\${p.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : 'צור קשר';
                        priceStr = \` | מחיר מתקין: \${price}\`;
                      }
                      return \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\${priceStr}\`;
                    });
                    const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מוצרים:\\n\${items.join('\\n')}\\n\\nבברכה,\\n\${agentName}\`);
                    trackEvent('send_favorites_whatsapp', { items_count: items.length, user_role: userRole });`;

const r3 = `                        const price = p.price > 0 ? \`₪\${p.price.toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : 'צור קשר';
                        priceStr = \` | מחיר מתקין: \${price}\`;
                      }
                      const favKey = f.sku || f.id || '';
                      const favLink = favKey ? \`\\n  \${window.location.origin}/?product=\${encodeURIComponent(String(favKey))}\` : '';
                      return \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\${priceStr}\${favLink}\`;
                    });
                    const text = encodeURIComponent(\`שלום רב,\\n\\nרשימת מוצרים:\\n\${items.join('\\n')}\\n\\nבברכה,\\n\${agentName}\`);
                    trackEvent('send_favorites_whatsapp', { items_count: items.length, user_role: userRole });`;

let fails = 0;
const pairs = [[t1, r1], [t2, r2], [t3, r3]];

for (let i = 0; i < pairs.length; i++) {
  if (content.includes(pairs[i][0])) {
    content = content.replace(pairs[i][0], pairs[i][1]);
    console.log(`Replaced t${i+1} successfully.`);
  } else {
    console.log(`t${i+1} not found!`);
    fails++;
  }
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find some blocks.");
}
