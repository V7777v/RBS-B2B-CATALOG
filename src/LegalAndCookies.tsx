import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// ====================================================================
// פרטי החברה — RBS Telecom
// ====================================================================
const COMPANY = {
  name: 'רבס טלקום בע״מ',
  number: '514373679', // ח.פ
  address: 'נתניה, לנטוס טום 10',
  phone: '077-2045522',
  email: 'info@rbs-telecom.com',
  a11yCoordinator: 'שרון יעקובי',
  updated: 'יוני 2026',
};

// ⚠️ הערה למפתח: הטקסטים המשפטיים להלן הם טיוטה ראשונית בלבד.
// יש להעביר לבדיקת עו״ד (פרטיות/תקנון) ולמורשה נגישות (הצהרת נגישות) לפני הסתמכות.

type DocKey = 'privacy' | 'cookies' | 'terms' | 'accessibility';

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-[#0c2d57] mt-5 mb-2">{children}</h2>
);
const P: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={className || "text-sm text-gray-700 leading-relaxed mb-2"}>{children}</p>
);
const LI: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-sm text-gray-700 leading-relaxed mb-1">{children}</li>
);

const DraftNote: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
    מסמך זה הוא טיוטה ראשונית ואינו מהווה ייעוץ משפטי. מומלץ להעבירו לבדיקת עורך/ת דין (ולמורשה נגישות עבור הצהרת הנגישות) לפני פרסום סופי.
  </div>
);

const AccessibilityDoc: React.FC = () => (
  <div>
    <DraftNote />
    <P>{COMPANY.name} רואה חשיבות רבה במתן שירות שוויוני לכלל הלקוחות, ופועלת להנגשת האתר לאנשים עם מוגבלות בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998, ולתקנות הנגישות מכוחו.</P>
    <P>אתר זה הונגש בהתאם לתקן הישראלי 5568 ולהנחיות WCAG 2.0 ברמת AA, ככל הניתן, וכולל תפריט נגישות ייעודי להתאמת התצוגה.</P>
    <H2>פעולות הנגשה שבוצעו</H2>
    <ul className="list-disc pr-5">
      <LI>תפריט נגישות: הגדלת טקסט, גופן קריא, הדגשת קישורים ועצירת אנימציות.</LI>
      <LI>מבנה דף סמנטי ותמיכה בקוראי מסך.</LI>
      <LI>ניווט מלא באמצעות מקלדת וקישור "דלג לתוכן הראשי".</LI>
      <LI>סימון ברור של אלמנט הפוקוס בעת ניווט מקלדת.</LI>
      <LI>טקסט חלופי (alt) לתמונות ושמירה על ניגודיות וכיווניות RTL.</LI>
    </ul>
    <H2>מגבלות ידועות</H2>
    <P>ייתכנו רכיבים או תכנים של צד שלישי (כגון מסמכים מקושרים או תכנים מוטמעים) שאינם נגישים במלואם. אנו פועלים לשיפור מתמשך של הנגישות.</P>
    <H2>רכז הנגישות</H2>
    <P>שם: {COMPANY.a11yCoordinator}</P>
    <P>דוא״ל: {COMPANY.email} | טלפון: {COMPANY.phone}</P>
    <P>נתקלתם בקושי בגלישה או בבעיית נגישות? נשמח שתפנו אלינו ונטפל בפנייה בהקדם.</P>
    <P className="text-xs text-gray-500">עודכן לאחרונה: {COMPANY.updated}</P>
  </div>
);

const PrivacyDoc: React.FC = () => (
  <div>
    <DraftNote />
    <H2>כללי</H2>
    <P>מדיניות פרטיות זו מתארת כיצד {COMPANY.name} (ח.פ {COMPANY.number}) אוספת, משתמשת ומגנה על מידע אישי במסגרת השימוש באתר. השימוש באתר מהווה הסכמה למדיניות זו.</P>
    <H2>איזה מידע נאסף</H2>
    <ul className="list-disc pr-5">
      <LI>פרטי חשבון: כתובת דוא״ל, שם חברה, מספר לקוח ופרטי איש קשר.</LI>
      <LI>פעילות באתר: הזמנות, הצעות מחיר, מוצרים מועדפים ופניות.</LI>
      <LI>מידע טכני בסיסי הנדרש לתפעול ולאבטחת השירות.</LI>
    </ul>
    <H2>מטרות השימוש במידע</H2>
    <ul className="list-disc pr-5">
      <LI>אספקת שירותי הקטלוג, ההזמנות והצעות המחיר.</LI>
      <LI>תקשורת עם הלקוח ומתן מענה לפניות.</LI>
      <LI>שמירה על אבטחת המידע ומניעת שימוש לרעה.</LI>
    </ul>
    <H2>שמירה ואבטחת מידע</H2>
    <P>המידע נשמר בשירותי תשתית מאובטחים (Google Firebase). אנו נוקטים אמצעי אבטחה סבירים להגנה על המידע, אך לא ניתן להבטיח הגנה מוחלטת.</P>
    <H2>העברת מידע לצד שלישי</H2>
    <P>אנו עושים שימוש בספקי שירות חיצוניים לצורך תפעול האתר, ובהם: Google Firebase (אחסון, הזדהות ובסיס נתונים), Google reCAPTCHA (אבטחה) ו-EmailJS (משלוח דוא״ל). מידע אינו נמכר לצדדים שלישיים.</P>
    <H2>זכויותיך</H2>
    <P>בהתאם לחוק הגנת הפרטיות, התשמ״א-1981, באפשרותך לעיין במידע אודותיך, לבקש את תיקונו או מחיקתו. לפנייה: {COMPANY.email}.</P>
    <H2>עוגיות</H2>
    <P>האתר עושה שימוש בעוגיות ובאחסון מקומי כמפורט במדיניות העוגיות.</P>
    <H2>יצירת קשר</H2>
    <P>{COMPANY.name}, {COMPANY.address} | טלפון: {COMPANY.phone} | דוא״ל: {COMPANY.email}</P>
    <P className="text-xs text-gray-500">עודכן לאחרונה: {COMPANY.updated}</P>
  </div>
);

const CookiesDoc: React.FC = () => (
  <div>
    <DraftNote />
    <P>אתר זה עושה שימוש בעוגיות (Cookies) ובאחסון מקומי בדפדפן (localStorage / sessionStorage) לצורך תפעול תקין, אבטחה ושיפור חוויית המשתמש.</P>
    <H2>עוגיות חיוניות</H2>
    <ul className="list-disc pr-5">
      <LI>הזדהות והתחברות לחשבון (Google Firebase Authentication).</LI>
      <LI>אבטחה והגנה מפני שימוש אוטומטי לרעה (Google reCAPTCHA / App Check).</LI>
    </ul>
    <H2>אחסון פונקציונלי</H2>
    <ul className="list-disc pr-5">
      <LI>שמירת מוצרים מועדפים והעדפות תצוגה ונגישות.</LI>
      <LI>מצב גלישת אורח (מתקין).</LI>
      <LI>ניהול מכסת שימוש ביועץ החכם.</LI>
    </ul>
    <H2>ניהול עוגיות</H2>
    <P>ניתן לחסום או למחוק עוגיות דרך הגדרות הדפדפן. חסימת עוגיות חיוניות עלולה לפגוע בתפקוד האתר ובאפשרות ההתחברות.</P>
    <P className="text-xs text-gray-500">עודכן לאחרונה: {COMPANY.updated}</P>
  </div>
);

const TermsDoc: React.FC = () => (
  <div>
    <DraftNote />
    <H2>כללי</H2>
    <P>תקנון זה מסדיר את השימוש באתר של {COMPANY.name} (ח.פ {COMPANY.number}). השימוש באתר מהווה הסכמה לתנאים אלה.</P>
    <H2>אופי השירות</H2>
    <P>האתר מהווה קטלוג עסקי (B2B) המיועד ללקוחות ומתקינים מאושרים. המחירים, הזמינות והמפרטים עשויים להשתנות מעת לעת ללא הודעה מוקדמת.</P>
    <H2>הזמנות והצעות מחיר</H2>
    <P>הזמנה המבוצעת באתר מהווה בקשה/הצעה בלבד וכפופה לאישור סופי של נציג החברה. אין באמור משום התחייבות למכירה עד לאישור ההזמנה.</P>
    <H2>קניין רוחני</H2>
    <P>כל התכנים, התמונות, הסימנים המסחריים והמידע באתר הם קניינם של {COMPANY.name} או של ספקיה, ואין לעשות בהם שימוש ללא אישור בכתב.</P>
    <H2>הגבלת אחריות</H2>
    <P>השירות ניתן כפי שהוא (AS-IS). החברה לא תישא באחריות לנזק עקיף או תוצאתי הנובע מהשימוש באתר, בכפוף לכל דין.</P>
    <H2>דין וסמכות שיפוט</H2>
    <P>על תקנון זה יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית תהא לבתי המשפט המוסמכים במחוז המתאים.</P>
    <H2>יצירת קשר</H2>
    <P>{COMPANY.name}, {COMPANY.address} | טלפון: {COMPANY.phone} | דוא״ל: {COMPANY.email}</P>
    <P className="text-xs text-gray-500">עודכן לאחרונה: {COMPANY.updated}</P>
  </div>
);

const DOC_TITLES: Record<DocKey, string> = {
  privacy: 'מדיניות פרטיות',
  cookies: 'מדיניות עוגיות',
  terms: 'תקנון ותנאי שימוש',
  accessibility: 'הצהרת נגישות',
};

// ====================================================================
// תפריט נגישות (Accessibility widget) — כלים בטוחים שאינם שוברים פריסה
// ====================================================================
type A11yState = { readable: boolean; links: boolean; nomotion: boolean; font: number };
const A11Y_DEFAULT: A11yState = { readable: false, links: false, nomotion: false, font: 0 };

const A11yIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18z" />
  </svg>
);

const ToggleRow: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${active ? 'bg-[#004387] text-white border-[#004387]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
  >
    <span>{label}</span>
    <span className={`text-xs ${active ? 'text-white' : 'text-gray-400'}`}>{active ? 'פעיל' : 'כבוי'}</span>
  </button>
);

const LegalAndCookies: React.FC = () => {
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);
  const [consent, setConsent] = useState<boolean>(true);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [a11y, setA11y] = useState<A11yState>(A11Y_DEFAULT);

  useEffect(() => {
    try {
      setConsent(localStorage.getItem('rbs_cookie_consent') === '1');
    } catch {
      setConsent(true);
    }
    try {
      const saved = JSON.parse(localStorage.getItem('rbs_a11y') || 'null');
      if (saved && typeof saved === 'object') setA11y({ ...A11Y_DEFAULT, ...saved });
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('rbs-a11y-readable', a11y.readable);
    el.classList.toggle('rbs-a11y-links', a11y.links);
    el.classList.toggle('rbs-a11y-nomotion', a11y.nomotion);
    el.style.fontSize = a11y.font ? `${100 + a11y.font * 10}%` : '';
    try { localStorage.setItem('rbs_a11y', JSON.stringify(a11y)); } catch {}
  }, [a11y]);

  const acceptCookies = () => {
    try { localStorage.setItem('rbs_cookie_consent', '1'); } catch {}
    setConsent(true);
  };

  const setFont = (delta: number) => setA11y((p) => ({ ...p, font: Math.max(0, Math.min(4, p.font + delta)) }));
  const resetA11y = () => setA11y(A11Y_DEFAULT);

  const renderDoc = (k: DocKey) => {
    if (k === 'privacy') return <PrivacyDoc />;
    if (k === 'cookies') return <CookiesDoc />;
    if (k === 'terms') return <TermsDoc />;
    return <AccessibilityDoc />;
  };

  return (
    <>
      {/* CSS for accessibility adjustments (layout-safe, no filters) */}
      <style>{`
        .rbs-a11y-readable, .rbs-a11y-readable * { font-family: Arial, "Assistant", sans-serif !important; line-height: 1.7 !important; letter-spacing: .03em !important; }
        .rbs-a11y-links a { text-decoration: underline !important; outline: 1px dashed currentColor !important; outline-offset: 2px; }
        .rbs-a11y-nomotion *, .rbs-a11y-nomotion *::before, .rbs-a11y-nomotion *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
      `}</style>

      {/* Footer */}
      <footer className="bg-[#0c2d57] text-white/90 mt-auto" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="text-sm leading-relaxed">
              <div className="font-bold text-white mb-1">{COMPANY.name}</div>
              <div>ח.פ {COMPANY.number}</div>
              <div>{COMPANY.address}</div>
              <div>טלפון: {COMPANY.phone}</div>
              <div>דוא״ל: {COMPANY.email}</div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="מידע משפטי">
              <button onClick={() => setOpenDoc('accessibility')} className="hover:text-[#f7941d] underline transition-colors">הצהרת נגישות</button>
              <button onClick={() => setOpenDoc('privacy')} className="hover:text-[#f7941d] underline transition-colors">מדיניות פרטיות</button>
              <button onClick={() => setOpenDoc('cookies')} className="hover:text-[#f7941d] underline transition-colors">מדיניות עוגיות</button>
              <button onClick={() => setOpenDoc('terms')} className="hover:text-[#f7941d] underline transition-colors">תקנון</button>
            </nav>
          </div>
          <div className="border-t border-white/15 mt-4 pt-3 text-xs text-white/60 text-center">
            © {new Date().getFullYear()} {COMPANY.name}. כל הזכויות שמורות.
          </div>
        </div>
      </footer>

      {/* Accessibility floating button */}
      <button
        onClick={() => setA11yOpen((v) => !v)}
        aria-label="תפריט נגישות"
        aria-expanded={a11yOpen}
        className="fixed bottom-4 left-4 z-[80] w-12 h-12 rounded-full bg-[#004387] text-white shadow-lg flex items-center justify-center hover:bg-[#0c2d57] transition-colors"
      >
        <A11yIcon />
      </button>

      {/* Accessibility menu */}
      {a11yOpen && (
        <div className="fixed inset-0 z-[81]" onClick={() => setA11yOpen(false)}>
          <div
            className="fixed bottom-20 left-4 w-[280px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            role="dialog"
            aria-label="תפריט נגישות"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#004387] text-white">
              <span className="font-bold flex items-center gap-2"><A11yIcon size={18} /> נגישות</span>
              <button onClick={() => setA11yOpen(false)} aria-label="סגור" className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-3 space-y-2">
              {/* Font size */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-700">גודל טקסט</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFont(-1)} aria-label="הקטן טקסט" className="w-8 h-8 rounded-md bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100">A-</button>
                  <span className="text-xs text-gray-500 w-8 text-center">{100 + a11y.font * 10}%</span>
                  <button onClick={() => setFont(1)} aria-label="הגדל טקסט" className="w-8 h-8 rounded-md bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100">A+</button>
                </div>
              </div>
              <ToggleRow label="גופן קריא" active={a11y.readable} onClick={() => setA11y((p) => ({ ...p, readable: !p.readable }))} />
              <ToggleRow label="הדגשת קישורים" active={a11y.links} onClick={() => setA11y((p) => ({ ...p, links: !p.links }))} />
              <ToggleRow label="עצירת אנימציות" active={a11y.nomotion} onClick={() => setA11y((p) => ({ ...p, nomotion: !p.nomotion }))} />
              <button onClick={resetA11y} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">איפוס הגדרות</button>
              <button onClick={() => { setA11yOpen(false); setOpenDoc('accessibility'); }} className="w-full px-3 py-2.5 rounded-lg bg-[#f7941d] text-white text-sm font-bold hover:opacity-90">הצהרת נגישות</button>
            </div>
          </div>
        </div>
      )}

      {/* Legal modal */}
      {openDoc && (
        <div className="fixed inset-0 z-[85] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpenDoc(null)}>
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#004387] text-white flex-shrink-0">
              <span className="font-bold">{DOC_TITLES[openDoc]}</span>
              <button onClick={() => setOpenDoc(null)} aria-label="סגור" className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {renderDoc(openDoc)}
            </div>
          </div>
        </div>
      )}

      {/* Cookie consent banner */}
      {!consent && (
        <div className="fixed bottom-0 inset-x-0 z-[75] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]" dir="rtl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-gray-700 flex-grow leading-relaxed">
              אתר זה עושה שימוש בעוגיות לצורך תפעול, אבטחה ושיפור חוויית המשתמש.{' '}
              <button onClick={() => setOpenDoc('cookies')} className="text-[#004387] underline font-medium">למידע נוסף</button>
            </p>
            <button onClick={acceptCookies} className="bg-[#004387] hover:bg-[#0c2d57] text-white text-sm font-bold px-5 py-2 rounded-lg whitespace-nowrap transition-colors flex-shrink-0">
              אני מסכים/ה
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LegalAndCookies;
