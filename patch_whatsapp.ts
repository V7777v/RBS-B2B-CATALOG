import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add states
content = content.replace(
  "const [guestPhoneDest, setGuestPhoneDest] = useState('');",
  "const [guestPhoneDest, setGuestPhoneDest] = useState('');\n  const [showGuestWhatsAppModal, setShowGuestWhatsAppModal] = useState(false);\n  const [guestWhatsAppToast, setGuestWhatsAppToast] = useState('');"
);

// Replace the guest WhatsApp button and input area
const guestWhatsappTarget = `                    <div className="mt-4 flex flex-col gap-2">
                      <input type="tel" placeholder="מספר טלפון לשליחה (למשל 0501234567)" value={guestPhoneDest} onChange={(e) => setGuestPhoneDest(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm text-right" dir="ltr" />
                      <button disabled={selectedFavIds.size === 0 || !guestPhoneDest} onClick={() => {
                        const items = favorites.filter((f: any) => selectedFavIds.has(f.id)).map((f: any) => \`- \${f.name} \${f.sku ? \`(מק"ט: \${f.sku})\` : ''} - כמות: \${favQuantities[f.id] || 1}\`);
                        const text = encodeURIComponent(\`שלום רב,\\n\\nהזמנה:\\n\${items.join('\\n')}\`);
                        let phone = guestPhoneDest.replace(/\\D/g, '');
                        if (phone.startsWith('0')) phone = '972' + phone.slice(1);
                        window.open(\`https://wa.me/\${phone}?text=\${text}\`, '_blank');
                      }} className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm">
                        שלח נבחרים בוואטסאפ ({selectedFavIds.size})
                      </button>
                    </div>`;

const guestWhatsappReplace = `                    <div className="mt-4 flex flex-col gap-2">
                      {guestWhatsAppToast && (
                        <div className="text-center text-sm font-bold text-green-600 bg-green-50 py-1 px-2 rounded">{guestWhatsAppToast}</div>
                      )}
                      <input type="tel" placeholder="מספר טלפון לשליחה (למשל 0501234567)" value={guestPhoneDest} onChange={(e) => setGuestPhoneDest(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm text-right" dir="ltr" />
                      <button disabled={selectedFavIds.size === 0 || !guestPhoneDest} onClick={() => setShowGuestWhatsAppModal(true)} className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm">
                        שלח נבחרים בוואטסאפ ({selectedFavIds.size})
                      </button>
                    </div>`;
                    
content = content.replace(guestWhatsappTarget, guestWhatsappReplace);

// Add the modal HTML just after {showProfile && ( ... )} inside the App component return block.
// Let's insert it before the closing `</div>` of the overlay. Or just below the `showProfile` block.
// I'll put it right after the `showProfile` block.
const modalTarget = `      {showProfile && (`;
const modalReplace = `      {showGuestWhatsAppModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#004387] p-4 text-white text-lg font-bold text-center">
              שליחת מועדפים ב-WhatsApp
            </div>
            <div className="p-6 text-center text-gray-700 font-medium">
              האם לאחר השליחה לאפס את רשימת המועדפים או לשמור אותה להמשך?
            </div>
            <div className="p-4 flex flex-col gap-2 bg-gray-50">
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
                let phone = guestPhoneDest.replace(/\\D/g, '');
                if (phone.startsWith('0')) phone = '972' + phone.slice(1);
                window.open(\`https://wa.me/\${phone}?text=\${text}\`, '_blank');
                setShowGuestWhatsAppModal(false);
                setFavorites(prev => {
                  const next = prev.filter(f => !selectedFavIds.has(f.id));
                  try { localStorage.setItem('rbs_guest_favorites', JSON.stringify(next)); } catch {}
                  return next;
                });
                setSelectedFavIds(new Set());
                setGuestWhatsAppToast('רשימת המועדפים אופסה');
                setTimeout(() => setGuestWhatsAppToast(''), 3000);
              }} className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition-colors">
                שלח ואפס מועדפים
              </button>
              <button onClick={() => setShowGuestWhatsAppModal(false)} className="w-full py-2.5 mt-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showProfile && (`;
content = content.replace(modalTarget, modalReplace);

fs.writeFileSync('src/App.tsx', content);
