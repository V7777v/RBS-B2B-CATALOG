import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
let firestoreContent = fs.readFileSync('src/firestoreData.ts', 'utf-8');

const t1 = `    } else if (agentName) {
      loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
    }
    } finally {
      approvingRef.current = false;
      setQuoteSaving(false);`;

const r1 = `    } else if (agentName) {
      loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
    }
    } catch (error: any) {
      console.error('approveQuote failed:', error);
      alert('אישור ההצעה נכשל [' + (error?.code || error?.message || 'UNKNOWN') + ']. נסה שוב או פנה לסוכן.');
    } finally {
      approvingRef.current = false;
      setQuoteSaving(false);`;

const t2 = `                  disabled={!signingName.trim()}
                  onClick={() => {
                    const canvas = signatureCanvasRef.current;
                    const sigDataUrl = canvas ? canvas.toDataURL('image/png') : '';
                    approveQuote(signingQuote, sigDataUrl, signingName);
                    setSigningQuote(null);
                  }}`;

const r2 = `                  disabled={!signingName.trim()}
                  onClick={() => {
                    const canvas = signatureCanvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    let hasInk = false;
                    if (ctx) {
                      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                      for (let i = 3; i < px.length; i += 4) { if (px[i] !== 0) { hasInk = true; break; } }
                    }
                    if (!hasInk) { alert('יש לחתום על גבי המסך לפני האישור.'); return; }
                    const sigDataUrl = canvas.toDataURL('image/png');
                    approveQuote(signingQuote, sigDataUrl, signingName);
                    setSigningQuote(null);
                  }}`;

const t3 = `                  <p className="text-white/60 text-[11px] mt-2">{userRole === 'sales_manager' ? 'תצוגת כל הסוכנים' : 'הלקוחות והפעילות שלך'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <div className="text-[11px] text-amber-800 font-bold mb-0.5">ממתין לחתימה</div>
                    <div className="text-2xl font-extrabold text-amber-600">{managerKpis.pending}</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <div className="text-[11px] text-green-800 font-bold mb-0.5">נחתם החודש</div>
                    <div className="text-2xl font-extrabold text-green-700">{managerKpis.signedCount}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="text-[11px] text-gray-600 font-bold mb-0.5">מחזור חתום החודש</div>
                    <div className="text-lg font-extrabold text-[#004387]">₪{Math.round(managerKpis.revenue).toLocaleString('he-IL')}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="text-[11px] text-gray-600 font-bold mb-0.5">לקוחות פעילים</div>
                    <div className="text-2xl font-extrabold text-[#004387]">{customerGroups.length}</div>
                  </div>
                </div>

                {managerKpis.stale > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-red-600 flex-shrink-0" />
                    <span className="text-[12px] font-bold text-red-800">{managerKpis.stale} הצעות ממתינות מעל 7 ימים — כדאי לעקוב</span>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 mb-2">לקוחות ({customerGroups.length})</h4>
                  <div className="space-y-2">
                    {customerGroups.length === 0 && (
                      <p className="text-[11px] text-gray-400 text-center py-4">אין עדיין לקוחות עם הצעות או הזמנות.</p>
                    )}
                    {customerGroups.map((g: any) => {
                      const initials = String(g.name || '?').trim().split(/\\s+/).slice(0, 2).map((w: string) => w[0]).join('');
                      const badge = g.status === 'signed'
                        ? { txt: 'נחתם', cls: 'bg-green-100 text-green-800' }
                        : g.status === 'pending'
                        ? { txt: 'ממתין', cls: 'bg-amber-100 text-amber-800' }
                        : { txt: 'ללא הצעה', cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <div key={g.key} className="bg-white border border-gray-200 rounded-xl p-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-[#004387] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {initials || '?'}
                            </div>
                            <div className="min-w-0 flex-1 text-right">
                              <div className="font-bold text-sm text-[#0c2d57] truncate">{g.name}</div>
                              {userRole === 'sales_manager' && g.agent && (
                                <div className="text-[11px] text-gray-500 truncate">סוכן: {g.agent}</div>
                              )}
                            </div>
                            <span className={\`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 \${badge.cls}\`}>{badge.txt}</span>
                          </div>
                          <div className="flex items-center gap-3 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                            <span><b className="text-gray-800">{g.quotes?.length || 0}</b> הצעות</span>
                            <span><b className="text-gray-800">{g.orders?.length || 0}</b> הזמנות</span>
                            <span className="mr-auto font-bold text-[#004387]">₪{Math.round(g.quotesTotal + g.ordersTotal).toLocaleString('he-IL')}</span>
                          </div>
                          {g.oldestPendingDays > 7 && (
                            <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                              ממתין לחתימה {g.oldestPendingDays} ימים
                            </div>
                          )}`;

const r3 = `                  <p className="text-white/60 text-[11px] mt-2">{userRole === 'sales_manager' ? 'תצוגת כל הסוכנים' : 'הלקוחות והפעילות שלך'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] text-amber-800 font-bold mb-0.5">ממתין לחתימה</div>
                    <div className="text-2xl font-extrabold text-amber-600">{managerKpis.pending}</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] text-green-800 font-bold mb-0.5">נחתם החודש</div>
                    <div className="text-2xl font-extrabold text-green-700">{managerKpis.signedCount}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] text-gray-600 font-bold mb-0.5">מחזור חתום החודש</div>
                    <div className="text-lg font-extrabold text-[#004387]">₪{Math.round(managerKpis.revenue).toLocaleString('he-IL')}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                    <div className="text-[11px] text-gray-600 font-bold mb-0.5">לקוחות פעילים</div>
                    <div className="text-2xl font-extrabold text-[#004387]">{customerGroups.length}</div>
                  </div>
                </div>

                {managerKpis.stale > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-center justify-center gap-2 text-center">
                    <TrendingUp size={16} className="text-red-600 flex-shrink-0" />
                    <span className="text-[12px] font-bold text-red-800">{managerKpis.stale} הצעות ממתינות מעל 7 ימים — כדאי לעקוב</span>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 mb-2 text-center">לקוחות ({customerGroups.length})</h4>
                  <div className="space-y-2">
                    {customerGroups.length === 0 && (
                      <p className="text-[11px] text-gray-400 text-center py-4">אין עדיין לקוחות עם הצעות או הזמנות.</p>
                    )}
                    {customerGroups.map((g: any) => {
                      const initials = String(g.name || '?').trim().split(/\\s+/).slice(0, 2).map((w: string) => w[0]).join('');
                      const badge = g.status === 'signed'
                        ? { txt: 'נחתם', cls: 'bg-green-100 text-green-800' }
                        : g.status === 'pending'
                        ? { txt: 'ממתין', cls: 'bg-amber-100 text-amber-800' }
                        : { txt: 'ללא הצעה', cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <div key={g.key} className="bg-white border border-gray-200 rounded-xl p-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-[#004387] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {initials || '?'}
                            </div>
                            <div className="min-w-0 flex-1 text-center">
                              <div className="font-bold text-sm text-[#0c2d57] truncate">{g.name}</div>
                              {userRole === 'sales_manager' && g.agent && (
                                <div className="text-[11px] text-gray-500 truncate">סוכן: {g.agent}</div>
                              )}
                            </div>
                            <span className={\`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 \${badge.cls}\`}>{badge.txt}</span>
                          </div>
                          <div className="flex items-center justify-center gap-3 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                            <span><b className="text-gray-800">{g.quotes?.length || 0}</b> הצעות</span>
                            <span><b className="text-gray-800">{g.orders?.length || 0}</b> הזמנות</span>
                            <span className="font-bold text-[#004387]">₪{Math.round(g.quotesTotal + g.ordersTotal).toLocaleString('he-IL')}</span>
                          </div>
                          {g.oldestPendingDays > 7 && (
                            <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1 text-center">
                              ממתין לחתימה {g.oldestPendingDays} ימים
                            </div>
                          )}`;

const t4 = `}

export async function updateQuote(quoteId: string, fields: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'quotes', quoteId), { ...sanitizeForFirestore(fields), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) { console.error('updateQuote failed:', e); }
}

export async function deleteQuote(quoteId: string): Promise<void> {`;

const r4 = `}

export async function updateQuote(quoteId: string, fields: Record<string, any>): Promise<void> {
  await setDoc(doc(db, 'quotes', quoteId), { ...sanitizeForFirestore(fields), updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteQuote(quoteId: string): Promise<void> {`;

let fails = 0;

if (appContent.includes(t1)) {
  appContent = appContent.replace(t1, r1);
  console.log('t1 replaced');
} else {
  console.log('t1 not found');
  fails++;
}

if (appContent.includes(t2)) {
  appContent = appContent.replace(t2, r2);
  console.log('t2 replaced');
} else {
  console.log('t2 not found');
  fails++;
}

if (appContent.includes(t3)) {
  appContent = appContent.replace(t3, r3);
  console.log('t3 replaced');
} else {
  console.log('t3 not found');
  fails++;
}

if (firestoreContent.includes(t4)) {
  firestoreContent = firestoreContent.replace(t4, r4);
  console.log('t4 replaced');
} else {
  console.log('t4 not found');
  fails++;
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', appContent);
  fs.writeFileSync('src/firestoreData.ts', firestoreContent);
  console.log('SUCCESS');
}
