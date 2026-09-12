import fs from 'fs';

let content = fs.readFileSync('src/components/TechnicalAdvisor.tsx', 'utf-8');

content = content.replace("import { appCheck } from '../firebase';", "import { appCheck, auth } from '../firebase';");

const oldFetch = `
      let appCheckToken: string | null = null;
      try { appCheckToken = (await getToken(appCheck)).token; } catch { appCheckToken = null; }

      const res = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': appCheckToken || ''
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          forceAI: true,
          isGuest: !!isGuest
        })
      });`;

const newFetch = `
      let appCheckToken: string | null = null;
      try { appCheckToken = (await getToken(appCheck)).token; } catch { appCheckToken = null; }
      
      let idToken = "";
      if (auth.currentUser) {
        try { idToken = await auth.currentUser.getIdToken(); } catch {}
      }
      
      let guestId = localStorage.getItem('rbs_guest_id');
      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem('rbs_guest_id', guestId);
      }

      const res = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': appCheckToken || '',
          'X-Firebase-Id-Token': idToken,
          'X-Guest-Id': guestId
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          forceAI: true
        })
      });`;

content = content.replace(oldFetch, newFetch);

const oldQuotaCheck = `    const AI_DAILY_LIMIT = isGuest ? 8 : 50;
    const aiToday = new Date().toISOString().slice(0, 10);
    let aiQuota: { date: string; count: number } = { date: aiToday, count: 0 };
    try {
      const rawQ = localStorage.getItem('rbs_ai_quota');
      if (rawQ) { const pq = JSON.parse(rawQ); if (pq && pq.date === aiToday) aiQuota = pq; }
    } catch {}

    if (aiQuota.count >= AI_DAILY_LIMIT) {
      if (typeof customText !== 'string') setInput('');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: \`הגעת למכסת השאלות היומית (\${AI_DAILY_LIMIT}). ניתן להמשיך מחר\${isGuest ? ', או להתחבר כמשתמש מורשה לקבלת מכסה גבוהה יותר' : ', או לפנות לתמיכה'}.\`,
        timestamp: new Date()
      }]);
      setIsLoading(false);
      return;
    }

    try { aiQuota.count += 1; localStorage.setItem('rbs_ai_quota', JSON.stringify(aiQuota)); } catch {}
`;

// Remove the local quota check completely from handleSend
content = content.replace(oldQuotaCheck, `    // Local quota check removed. Server manages quota via centralized Firestore tracking.
`);

// Handle the 429 response 
const oldDataParsing = `
      if (!res.ok) {
        throw new Error('שגיאת רשת בגישה ליועץ.');
      }
      const data = await res.json();
      
      if (data.type === 'direct_products' && data.products) {
`;

const newDataParsing = `
      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: errData.message || errData.error || 'הגעת למכסת השאלות היומית או שיש עומס על המערכת. נסה שוב מאוחר יותר.',
          timestamp: new Date()
        }]);
        setIsLoading(false);
        return;
      }
      
      if (!res.ok) {
        throw new Error('שגיאת רשת בגישה ליועץ.');
      }
      
      const data = await res.json();
      
      if (data.quotaInfo) {
         // UI could optionally display this quota remaining
         console.log("Quota Info:", data.quotaInfo);
      }
      
      if (data.type === 'direct_products' && data.products) {
`;

content = content.replace(oldDataParsing, newDataParsing);

fs.writeFileSync('src/components/TechnicalAdvisor.tsx', content);
