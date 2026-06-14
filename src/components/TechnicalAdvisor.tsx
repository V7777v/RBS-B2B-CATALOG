import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, X, Send, Bot, User, Loader2, Plus, CornerDownLeft, Info, HelpCircle, ShoppingCart, Check, RefreshCw, AlertTriangle, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UPSCalculator } from './UPSCalculator';

interface TechnicalAdvisorProps {
  catalogData: any[];
  addToCart: (product: any, quantity?: number) => void;
  isAuthenticated: boolean;
  onClose: () => void;
}

export const TechnicalAdvisor: React.FC<TechnicalAdvisorProps> = ({ 
  catalogData, 
  addToCart,
  isAuthenticated,
  onClose
}) => {

  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rbs_advisor_disclaimer_approved') === 'true';
    } catch {
      return false;
    }
  });
  const [tempChecked, setTempChecked] = useState(false);

  const [messages, setMessages] = useState<any[]>([
    {
      role: 'model',
      text: `שלום! אני עוזר התכנון והיועץ הטכני של RBS Telecom. 

אני כאן כדי לסייע לך לבחור מוצרים, לבדוק מפרטים ומידות, לתכנן ארונות תקשורת, סיבים אופטיים, מערכות POE, לחשב צריכת הספק (Watts) ולהתאים נפחי אל-פסק (UPS). 

באפשרותך לשאול אותי כל שאלה טכנית או הנדסית לגבי הקטלוג שלנו או לתכנון הרשת שלך!

*הבהרה: המערכת נמצאת בשלב הרצה (Trial/Beta) ונעזרת במודל ייעוץ הנדסי חכם חלפי - מומלץ לאמת זמני גיבוי ומפרטים קריטיים מול מקורות רשמיים והוראות היצרן המצורפות.*`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  
  // Interactive UPS Calculator State
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcWatts, setCalcWatts] = useState<number>(30);
  const [calcHours, setCalcHours] = useState<number>(2);
  const [calcResultWh, setCalcResultWh] = useState<number>(0);



  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, isLoading]);

  // Recalculate UPS on inputs alteration
  useEffect(() => {
    // Basic calculation formula: Wh = (Watts * Hours) / Efficiency (approx 0.85 typical)
    const wh = Math.ceil((calcWatts * calcHours) / 0.85);
    setCalcResultWh(wh);
  }, [calcWatts, calcHours]);

  if (!isAuthenticated) return null;

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  const handleSend = async (customText?: string, forceAI: boolean = false) => {
    const textToSend = typeof customText === 'string' ? customText : input;
    if (!textToSend.trim() || isLoading) return;

    if (calcOpen) setCalcOpen(false);

    if (typeof customText !== 'string') setInput('');

    // Append user message
    const userMsg = {
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Prepare chat history payload
      const historyPayload = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          forceAI: forceAI
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        let errMsg = 'התקשרות עם השרת נכשלה';
        try {
          const errData = await res.json();
          if (errData && errData.details) {
            errMsg += `: ${errData.details}`;
          } else if (errData && errData.error) {
            errMsg += `: ${errData.error}`;
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: data.text,
        timestamp: new Date(),
        sources: data.sources || [],
        type: data.type,
        directProducts: data.products,
        originalQuery: textToSend
      }]);

    } catch (err: any) {
      if (err.name === 'AbortError') return;

      console.error("AI Advisor Communication error:", err);
      const errorMsg = err.message || 'שגיאה לא ידועה';
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: `אופס! נתקלתי בבעיה בחיבור לשרת.\n\n**פרטי השגיאה:** ${errorMsg}`,
        timestamp: new Date(),
        isError: true,
        failedQuery: textToSend
      }]);
    } finally {
      setIsLoading(false);
    }
  };





  const handleResetChat = () => {
    setMessages([
      {
        role: 'model',
        text: `שלום! אני עוזר התכנון והיועץ הטכני של RBS Telecom. 
  
אני כאן כדי לסייע לך לבחור מוצרים, לבדוק מפרטים ומידות, לתכנן ארונות תקשורת, סיבים אופטיים, מערכות POE, לחשב צריכת הספק (Watts) ולהתאים נפחי אל-פסק (UPS). 
  
באפשרותך לשאול אותי כל שאלה טכנית או הנדסית לגבי הקטלוג שלנו או לתכנון הרשת שלך!
  
*הבהרה: המערכת נמצאת בשלב הרצה (Trial/Beta) ונעזרת במודל ייעוץ הנדסי חכם חלפי - מומלץ לאמת זמני גיבוי ומפרטים קריטיים מול מקורות רשמיים והוראות היצרן המצורפות.*`,
        timestamp: new Date()
      }
    ]);
    setInput('');
    setCalcOpen(false);
  };

  return (
    <div className="bg-gray-50 w-full relative min-h-[100dvh]" style={{ direction: 'rtl' }}>
              {/* AI Disclaimer Dialog Popup Overlay */}
              <AnimatePresence>
                {!disclaimerAccepted && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 z-30 bg-[#0c2d57] text-white p-6 flex flex-col justify-between overflow-y-auto select-text"
                    style={{ direction: 'rtl' }}
                  >
                    <div className="my-auto space-y-5">
                      <div className="flex justify-center mb-2">
                        <div className="bg-[#fe8d00]/20 p-4 rounded-full border border-[#fe8d00]/40 animate-pulse">
                          <AlertTriangle className="w-10 h-10 text-[#fe8d00]" />
                        </div>
                      </div>

                      <div className="text-center">
                        <h4 className="text-lg font-bold text-white mb-2">מערכת תמיכה וייעוץ הנדסי (RBS Expert)</h4>
                        <div className="h-1 w-16 bg-[#fe8d00] mx-auto rounded-full" />
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-xs sm:text-sm space-y-3 leading-relaxed text-cyan-50">
                        <p className="font-semibold text-white">אנא קרא ואשר את התנאים הבאים לפני תחילת השימוש ביועץ ההנדסי:</p>
                        <ul className="list-disc pr-4 space-y-2 text-right">
                          <li><strong>מערכת בהרצה:</strong> מנוע ה-Expert נמצא כרגע בשלב הרצה וניסוי לשימוש פנימי.</li>
                          <li><strong>חישובים והספקים:</strong> נתוני הספקים (Watts) ומפרטי הגיבוי מופקים על ידי מודל AI. ייתכנו שגיאות או טענות ויש לעשות בדיקה נוספת מול מקורות רשמיים.</li>
                          <li><strong>התנערות מאחריות:</strong> כל התשובות וההצעות הן בגדר המלצה בלבד. לחברה אין שום אחריות ישירה או עקיפה לגבי נכונות המענה או נזקים הנובעים מכך.</li>
                          <li><strong>חובת בדיקה נוספת:</strong> באחריות המשתמש לאמת מידע קריטי ישירות מול דפי המפרט הטכני והמדריכים של היצרן המצורפים לקטלוג.</li>
                        </ul>
                      </div>

                      {/* Acceptance Checkbox Toggle */}
                      <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                        <input 
                          type="checkbox" 
                          checked={tempChecked} 
                          onChange={(e) => setTempChecked(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-[#fe8d00] cursor-pointer"
                        />
                        <span className="text-xs text-gray-300 leading-normal font-semibold">
                          קראתי, הבנתי ואני מאשר שזהו ייעוץ מבוסס AI, שיש לבצע בדיקה מול מקורות רשמיים ושלחברה אין שום אחריות על תוצרים אלו.
                        </span>
                      </label>
                    </div>

                    <div className="pt-4 mt-auto">
                      <button
                        onClick={() => {
                          if (tempChecked) {
                            try {
                              localStorage.setItem('rbs_advisor_disclaimer_approved', 'true');
                            } catch (e) {}
                            setDisclaimerAccepted(true);
                          }
                        }}
                        disabled={!tempChecked}
                        className="w-full bg-[#fe8d00] disabled:bg-gray-600 hover:bg-[#ff9e24] disabled:text-gray-300 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:cursor-not-allowed text-xs sm:text-sm"
                      >
                        <Check className="w-4 h-4" />
                        קראתי הבנתי ואני מאשר
                      </button>
                      <button 
                        onClick={() => onClose()}
                        className="w-full text-gray-400 hover:text-white transition-colors text-xs text-center mt-3 bg-transparent border-none cursor-pointer underline"
                      >
                        ביטול וחזרה לקטלוג
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="bg-[#0c2d57] text-white p-2 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden gap-2 sm:gap-0 shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe8d00]/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10 w-full sm:w-auto">
                  <div className="bg-[#fe8d00] p-1.5 rounded-lg text-white shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 leading-tight text-white m-0 truncate">
                      RBS Expert
                      <span className="text-[9px] sm:text-[10px] bg-green-500 text-white px-1.5 py-0.5 animate-pulse rounded select-none font-semibold shrink-0">LIVE</span>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gray-300 leading-none mt-0.5 truncate">מנוע ייעוץ הנדסי וחישוב אל-פסק</p>
                  </div>
                  
                  {/* Close button for mobile right in the top corner against the bot name */}
                  <button 
                    onClick={() => onClose()}
                    className="p-1 sm:hidden rounded-full hover:bg-white/10 text-white border-none cursor-pointer shrink-0 ml-1"
                    aria-label="סגור חלון יועץ"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto relative z-10 shrink-0 border-t border-white/10 pt-2 sm:pt-0 sm:border-t-0">
                  <div className="flex gap-1.5 flex-1">
                    {/* Reset/Refresh chatbot button */}
                    <button 
                      onClick={handleResetChat}
                      className="flex-1 sm:flex-initial p-1.5 px-2 text-[10px] sm:text-xs font-semibold rounded-md border border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 text-white transition-all flex justify-center items-center gap-1 cursor-pointer"
                      title="איפוס והתחלת שיחה חדשה"
                    >
                      <RefreshCw className="w-3 h-3 text-red-300" />
                      <span>איפוס</span>
                    </button>

                    {/* Toggle UPS Calculator Button */}
                    <button 
                      onClick={() => setCalcOpen(!calcOpen)}
                      className={`flex-1 sm:flex-initial p-1.5 px-2 text-[10px] sm:text-xs font-semibold rounded-md border transition-all flex justify-center items-center gap-1 cursor-pointer ${
                        calcOpen 
                          ? 'bg-[#fe8d00] border-transparent text-white shadow-inner font-bold' 
                          : 'border-white/20 bg-white/10 text-white hover:bg-[#fe8d00] hover:border-transparent'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 shrink-0 text-yellow-300" />
                      <span className="truncate">{calcOpen ? "סגור מחשבון" : "מחשבון UPS"}</span>
                    </button>
                  </div>

                  {/* Close button for desktop layout */}
                  <button 
                    onClick={() => onClose()}
                    className="hidden sm:block p-1.5 rounded-full hover:bg-white/10 text-white border-none cursor-pointer shrink-0"
                    aria-label="סגור חלון יועץ"
                  >
                    <X className="w-4 h-4 sm:w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Dynamic Interactive calculator drop panel */}
              <AnimatePresence>
                {calcOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-white border-b border-gray-200 overflow-hidden text-sm relative z-20 shadow-sm"
                  >
                    <UPSCalculator catalogData={catalogData} onAddToCart={addToCart} onAskAdvisor={handleSend} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slimmer persistent disclaimer footer */}
              <div className="bg-amber-50/75 border-b border-amber-200/50 p-2 px-3 text-[10px] text-amber-900 leading-normal flex items-start gap-1.5 select-text">
                <span className="text-xs shrink-0 mt-0.5">⚠️</span>
                <div>
                  <strong className="font-bold text-amber-950">הבהרת AI:</strong> התשובות והחישובים מונעים בבינה מלאכותית ואינם מהווים ייעוץ מחייב. יש לאמת כל מפרט וזמני גיבוי מול מסמכי המקור.
                </div>
              </div>

              {/* Chat View */}
              <div className="p-4 space-y-4 select-text">
                {messages.map((m, idx) => {
                  const isModel = m.role === 'model';
                    return (
                    <div key={idx} className={`flex ${isModel ? 'justify-start' : 'justify-end'} gap-2`}>
                      {isModel && (
                        <div className="w-8 h-8 rounded-full bg-[#0c2d57] text-white flex items-center justify-center shrink-0 self-start text-xs border border-white/20">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="flex flex-col max-w-[90%] sm:max-w-[85%] overflow-hidden">
                        <div className={`p-3 rounded-xl shadow-xs text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words break-all sm:break-words ${
                          isModel 
                            ? 'bg-white border border-gray-100 text-gray-800 rounded-tr-none' 
                            : 'bg-[#004387] text-white rounded-tl-none'
                        }`}>
                          {isModel ? (
                            <div className="markdown-body [&>p]:mb-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mr-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mr-4 [&>ol]:mb-2 [&_a.md-link]:text-blue-600 [&_a.md-link]:underline [&_a.md-link:hover]:text-blue-800 [&_strong]:font-bold [&_table]:w-full [&_table]:mb-3 [&_th]:border [&_th]:border-gray-200 [&_th]:p-1 [&_th]:bg-gray-50 [&_td]:border [&_td]:border-gray-200 [&_td]:p-1 break-words">
                              <Markdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({node, href, children, ...props}: any) => {
                                    if (href && href.startsWith('product://')) {
                                      let sku = href.replace('product://', '');
                                      try { sku = decodeURIComponent(sku); } catch (e) {}
                                      sku = sku.trim();
                                      
                                      const product = catalogData?.find(p => p && p.sku && p.sku.toString().trim() === sku);
                                      if (product) {
                                        return (
                                          <div className="my-3 flex flex-col sm:flex-row items-center gap-3 p-3 border border-blue-100 rounded-lg bg-gray-50 max-w-sm max-w-full">
                                            {product.images?.[0] && (
                                              <img 
                                                src={product.images[0]} 
                                                alt={product.name} 
                                                className="w-16 h-16 object-contain rounded-md bg-white border border-gray-100 p-1"
                                              />
                                            )}
                                            <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-right gap-1 w-full">
                                              <span className="font-bold text-[#004387] text-sm leading-tight text-right w-full" dir="rtl">{product.name}</span>
                                              <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start w-full">
                                                <span className="text-[10px] text-gray-500 font-mono bg-white px-1.5 py-0.5 border border-gray-200 rounded shrink-0">{product.sku}</span>
                                                {product.price > 0 && (
                                                  <span className="text-[11px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 shrink-0">₪{product.price.toLocaleString('he-IL')}</span>
                                                )}
                                              </div>
                                              
                                              <div className="flex flex-wrap items-center gap-2 mt-2 w-full justify-center sm:justify-start">
                                                <button
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    addToCart(product, 1);
                                                  }}
                                                  className="flex items-center justify-center gap-1.5 p-1.5 px-3 text-xs font-bold text-white bg-[#004387] hover:bg-[#fe8d00] rounded-md transition-colors shadow-sm"
                                                  title="הוסף לעגלה"
                                                >
                                                  <ShoppingCart className="w-3.5 h-3.5" />
                                                  <span>הוסף לעגלה</span>
                                                </button>
                                                {product.specsLink && (
                                                  <a
                                                    href={product.specsLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center p-1.5 px-3 text-xs font-bold text-[#004387] hover:text-white bg-white hover:bg-[#004387] border border-[#004387] rounded-md transition-colors no-underline"
                                                    style={{ textDecoration: 'none' }}
                                                    title="מפרט טכני"
                                                  >
                                                    <Info className="w-3.5 h-3.5 ml-1" />
                                                    <span>מפרט טכני</span>
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                    }
                                    return <a href={href} {...props} className="md-link" target="_blank" rel="noopener noreferrer">{children}</a>;
                                  }
                                }}
                              >
                                {m.text}
                              </Markdown>
                            </div>
                          ) : (
                            m.text
                          )}

                          {/* Render direct products if available */}
                          {isModel && m.directProducts && m.directProducts.length > 0 && (
                            <div className="mt-3 flex flex-col gap-2">
                              {m.directProducts.map((product: any, idx: number) => (
                                <div key={idx} className="my-3 flex flex-col sm:flex-row items-center gap-3 p-3 border border-blue-100 rounded-lg bg-gray-50 max-w-sm max-w-full">
                                  {product.images?.[0] && (
                                    <img 
                                      src={product.images[0]} 
                                      alt={product.name} 
                                      className="w-16 h-16 object-contain rounded-md bg-white border border-gray-100 p-1"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-right gap-1 w-full">
                                    <span className="font-bold text-[#004387] text-sm leading-tight text-right w-full" dir="rtl">{product.name}</span>
                                    <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start w-full">
                                      <span className="text-[10px] text-gray-500 font-mono bg-white px-1.5 py-0.5 border border-gray-200 rounded shrink-0">{product.sku}</span>
                                      {product.price > 0 && (
                                        <span className="text-[11px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 shrink-0">₪{product.price.toLocaleString('he-IL')}</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-2 w-full justify-center sm:justify-start">
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          addToCart(product, 1);
                                        }}
                                        className="flex items-center justify-center gap-1.5 p-1.5 px-3 text-xs font-bold text-white bg-[#004387] hover:bg-[#fe8d00] rounded-md transition-colors shadow-sm"
                                        title="הוסף לעגלה"
                                      >
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                        <span>הוסף לעגלה</span>
                                      </button>
                                      {product.specsLink && (
                                        <a
                                          href={product.specsLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center p-1.5 px-3 text-xs font-bold text-[#004387] hover:text-white bg-white hover:bg-[#004387] border border-[#004387] rounded-md transition-colors no-underline"
                                          style={{ textDecoration: 'none' }}
                                          title="מפרט טכני"
                                        >
                                          <Info className="w-3.5 h-3.5 ml-1" />
                                          <span>מפרט טכני</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {m.originalQuery && m.directProducts && m.directProducts.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100/80 flex flex-col gap-2">
                                  <span className="text-[11px] font-bold text-gray-500 block">עוזר תמיכה מהיר ושאלות המשך ספציפיות:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {m.directProducts.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const skus = m.directProducts.map((p: any) => p.sku).join(', ');
                                          handleSend(`אנא השווה בין המוצרים הבאים בטבלה הנדסית ופרט את ההבדלים ביניהם מבחינת מפרט, הספקים ופונקציות: ${skus}`, true);
                                        }}
                                        className="text-[11px] font-semibold text-[#004387] bg-blue-50 hover:bg-blue-100 border border-blue-200/50 rounded-full px-2.5 py-1.5 transition-colors cursor-pointer flex items-center gap-1"
                                      >
                                        📊 השווה מוצרים אלו בטבלת השוואה
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const skus = m.directProducts.map((p: any) => p.sku).join(', ');
                                        handleSend(`אנא פרט את המפרט הטכני המלא, התכונות ופונקציונליות השירות עבור מק"טים אלו: ${skus}`, true);
                                      }}
                                      className="text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full px-2.5 py-1.5 transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      🔍 הצג מפרט טכני מלא ופונקציונליות
                                    </button>
                                    {m.directProducts.slice(0, 2).map((product: any, pIdx: number) => (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => {
                                          handleSend(`מהם השימושים והיתרונות ההנדסיים העיקריים של מוצר ${product.name} (מק"ט: ${product.sku})?`, true);
                                        }}
                                        className="text-[11px] font-semibold text-[#fe8d00] bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-full px-2.5 py-1.5 transition-colors cursor-pointer text-right max-w-xs truncate"
                                      >
                                        💡 יתרונות של {product.sku}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => handleSend(m.originalQuery, true)}
                                      className="text-xs font-bold text-blue-600 underline hover:text-blue-800 transition-colors mt-1 block py-1 cursor-pointer bg-transparent border-none pr-1"
                                    >
                                      שאל את ה-AI להעמקה כללית על שאילתה זו לקטלוג
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Render external grounding citation web sources */}
                          {isModel && m.sources && m.sources.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-gray-100">
                              <span className="text-[10px] text-gray-400 font-semibold block mb-1">קישורי מקור ומידע טכני רשמי:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {m.sources.map((source: any, i: number) => (
                                  <a 
                                    key={i} 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-gray-50 hover:bg-gray-100 text-blue-600 px-2 py-1 rounded inline-flex items-center gap-1 border border-gray-200/60 transition-colors text-[10px] truncate max-w-full font-medium"
                                  >
                                    <HelpCircle className="w-2.5 h-2.5" />
                                    {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-gray-400 self-start select-none">
                            {m.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {m.isError && m.failedQuery && (
                            <button
                              onClick={() => {
                                setMessages(prev => prev.filter(msg => msg !== m));
                                handleSend(m.failedQuery);
                              }}
                              className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              נסה שוב
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0c2d57] text-white flex items-center justify-center shrink-0 text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-xl rounded-tr-none flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin text-[#004387]" />
                      <span>סורק קטלוג ומאגר נתונים ומכין פתרון הנדסי...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions suggestion chip area (Removed) */}

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-gray-200">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="שאל אותי על צריכת W, חישובי אל פסק, או מוצר..."
                    className="flex-1 bg-gray-50 border border-gray-200 focus:bg-white rounded-lg px-3 py-2 text-base md:text-sm outline-none focus:ring-1 focus:ring-[#004387] transition-all text-right"
                  />
                  {isLoading ? (
                    <button 
                      type="button"
                      onClick={handleStop}
                      className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center border-none cursor-pointer"
                      title="עצור ריצה"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      disabled={!input.trim()}
                      className="bg-[#004387] hover:bg-[#fe8d00] disabled:bg-gray-200 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center border-none cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 rotate-180" />
                    </button>
                  )}
                </form>
                <p className="text-[9px] text-gray-400 text-center mt-1 select-none">
                  תשובות מבוססות על שילוב של קטלוג RBSTelecom וחיפוש Google Search זמני.
                </p>
              </div>

    </div>
  );
};
