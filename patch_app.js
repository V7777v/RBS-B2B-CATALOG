import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `import { FirebaseAuthView } from './FirebaseAuthView';
import { auth, db, appCheck } from './firebase';
import { getToken as getAppCheckToken } from 'firebase/app-check';
import { doc, getDoc } from 'firebase/firestore';
import { loadCart, saveCart, addOrderRecord, loadOrders, loadFavorites, saveFavorites, loadAgentOrders, loadAllOrders, saveQuote, loadAgentQuotes, loadAllQuotes, subscribeCustomerQuotes, updateQuoteStatus, updateQuote, deleteQuote, loadUserProfile, saveUserProfile, subscribeAgentOrders, subscribeAllOrders, updateOrderStatus, updateOrder, getLastOrderError } from './firestoreData';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import QuoteDocument from './QuoteDocument';
import LegalAndCookies from './LegalAndCookies';
import { trackPageView, trackEvent } from './lib/analytics';`;

const r1 = `import { FirebaseAuthView } from './FirebaseAuthView';
import { auth, db, appCheck } from './firebase';
import { getToken as getAppCheckToken } from 'firebase/app-check';
import { doc, getDoc } from 'firebase/firestore';
import { loadCart, saveCart, addOrderRecord, loadOrders, loadFavorites, saveFavorites, loadAgentOrders, loadAllOrders, saveQuote, loadAgentQuotes, loadAllQuotes, subscribeAgentQuotes, subscribeAllQuotes, subscribeCustomerQuotes, updateQuoteStatus, updateQuote, deleteQuote, loadUserProfile, saveUserProfile, subscribeAgentOrders, subscribeAllOrders, updateOrderStatus, updateOrder, getLastOrderError } from './firestoreData';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import QuoteDocument from './QuoteDocument';
import LegalAndCookies from './LegalAndCookies';
import { trackPageView, trackEvent } from './lib/analytics';`;

const t2 = `  const [simpleAgentView, setSimpleAgentView] = useState(true);

  // Quote signing state
  const [signingQuote, setSigningQuote] = useState<any | null>(null);
  const [signingName, setSigningName] = useState('');
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignature = useRef(false);`;

const r2 = `  const [simpleAgentView, setSimpleAgentView] = useState(true);

  // Quote signing state
  const [signingQuote, setSigningQuote] = useState<any | null>(null);
  const [viewedQuote, setViewedQuote] = useState<any | null>(null);
  const [signingName, setSigningName] = useState('');
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignature = useRef(false);`;

const t3 = `      
      if (userRole === 'sales_manager') {
        loadAllQuotes().then(setAgentQuotes);
      } else if (agentName) {
        loadAgentQuotes(agentName).then(setAgentQuotes);
      }
    } catch (error: any) {
      console.error('[Quotes] submit failed', {
        code: error?.code || error?.message || 'UNKNOWN',`;

const r3 = `      
      if (userRole === 'sales_manager') {
        loadAllQuotes().then(setAgentQuotes);
      } else if (agentName) {
        loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
      }
    } catch (error: any) {
      console.error('[Quotes] submit failed', {
        code: error?.code || error?.message || 'UNKNOWN',`;

const t4 = `
    if (userRole === 'sales_manager') {
      loadAllQuotes().then(setAgentQuotes);
    } else if (agentName) {
      loadAgentQuotes(agentName).then(setAgentQuotes);
    }
    } finally {
      approvingRef.current = false;
      setQuoteSaving(false);`;

const r4 = `
    if (userRole === 'sales_manager') {
      loadAllQuotes().then(setAgentQuotes);
    } else if (agentName) {
      loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
    }
    } finally {
      approvingRef.current = false;
      setQuoteSaving(false);`;

const t5 = `  }, [showProfile, userRole]);
  useEffect(() => {
    if (!showProfile) return;
    if (userRole === 'sales_manager') {
      loadAllQuotes().then(setAgentQuotes);
    }
    else if (userRole === 'agent' && agentName) {
      loadAgentQuotes(agentName).then(setAgentQuotes);
    }
    else setTeamOrders([]);
  }, [showProfile, userRole, agentName]);
  useEffect(() => {`;

const r5 = `  }, [showProfile, userRole]);
  useEffect(() => {
    if (!showProfile) return;
    if (userRole === 'sales_manager') {
      const unsubQ = subscribeAllQuotes(setAgentQuotes);
      return () => unsubQ();
    }
    else if (userRole === 'agent' && auth.currentUser?.uid) {
      const unsubQ = subscribeAgentQuotes(auth.currentUser.uid, setAgentQuotes);
      return () => unsubQ();
    }
    else setTeamOrders([]);
  }, [showProfile, userRole, agentName]);
  useEffect(() => {`;

const t6 = `          </div>
        </div>
      )}

      {showPreviewModal && (
        <>
          {/* Print-specific style override */}
          <style dangerouslySetInnerHTML={{ __html: \``;

const r6 = `          </div>
        </div>
      )}

      {viewedQuote && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-2 md:p-4 animate-fade-in" dir="rtl" onClick={() => setViewedQuote(null)}>
            <div className="bg-gray-50 w-full max-w-[900px] h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="py-2 px-4 bg-[#004387] hover:bg-[#0c2d57] text-white rounded-xl font-bold text-sm border-none cursor-pointer flex items-center gap-1.5"
                  >
                    <Download size={16} /> ייצוא ל-PDF / הדפסה
                  </button>
                  {viewedQuote.signature && (
                    <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 hidden md:inline-flex items-center gap-1">
                      <PenTool size={12} /> נחתם ע"י {viewedQuote.signedBy || 'הלקוח'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0c2d57]">מסמך חתום</span>
                  <button onClick={() => setViewedQuote(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border-none bg-transparent cursor-pointer">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center bg-gray-100/60">
                <div
                  id="printable-quote-area-root"
                  className="bg-white w-full max-w-[800px] shadow-lg rounded-xl border border-gray-200 p-6 md:p-12 text-gray-800 text-xs md:text-sm flex flex-col min-h-[1050px] justify-between relative text-right"
                >
                  <QuoteDocument data={viewedQuote} mode="view" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showPreviewModal && (
        <>
          {/* Print-specific style override */}
          <style dangerouslySetInnerHTML={{ __html: \``;

const t7 = `                          </div>

                          {/* Quick details about products in quote */}
                          <div className="mt-2 text-[10px] text-gray-500 leading-normal bg-white/75 p-1.5 rounded-lg border border-gray-100/50 text-right">
                            <span className="font-bold text-gray-600">שורות הצעה ({q.items?.length || 0}): </span>
                            <span className="truncate block max-w-full">
                              {(q.items || []).map((it: any) => \`\${it.name} (\${it.qty})\`).join(', ')}
                            </span>`;

const r7 = `                          </div>

                          {/* Quick details about products in quote */}
                          <div className="mt-2 text-[10px] text-gray-500 leading-normal bg-white/75 p-1.5 rounded-lg border border-gray-100/50 text-right">
                            {q.signature && (
                              <div className="flex items-center gap-1.5 mb-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                                <PenTool size={11} className="text-green-700 flex-shrink-0" />
                                <span className="text-[10px] font-bold text-green-800">נחתם דיגיטלית ע"י {q.signedBy || 'הלקוח'}</span>
                              </div>
                            )}
                            <span className="font-bold text-gray-600">שורות הצעה ({q.items?.length || 0}): </span>
                            <span className="truncate block max-w-full">
                              {(q.items || []).map((it: any) => \`\${it.name} (\${it.qty})\`).join(', ')}
                            </span>`;

const t8 = `                                    await deleteQuote(q.id);
                                    if (userRole === 'sales_manager') {
                                      loadAllQuotes().then(setAgentQuotes);
                                    } else if (agentName) {
                                      loadAgentQuotes(agentName).then(setAgentQuotes);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border-none cursor-pointer flex items-center justify-center"`;

const r8 = `                                    await deleteQuote(q.id);
                                    if (userRole === 'sales_manager') {
                                      loadAllQuotes().then(setAgentQuotes);
                                    } else if (agentName) {
                                      loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border-none cursor-pointer flex items-center justify-center"`;


let fails = 0;
const pairs = [[t1, r1], [t2, r2], [t3, r3], [t4, r4], [t5, r5], [t6, r6], [t7, r7], [t8, r8]];

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
