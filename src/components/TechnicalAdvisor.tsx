import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Bot, User, Loader2, Plus, CornerDownLeft, Info, HelpCircle, ShoppingCart, Check, RefreshCw, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UPSCalculator } from './UPSCalculator';

interface TechnicalAdvisorProps {
  catalogData: any[];
  addToCart: (product: any, quantity?: number) => void;
  isAuthenticated: boolean;
}

export const TechnicalAdvisor: React.FC<TechnicalAdvisorProps> = ({ 
  catalogData, 
  addToCart,
  isAuthenticated
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
  const [sources, setSources] = useState<any[]>([]);
  
  // Interactive UPS Calculator State
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcWatts, setCalcWatts] = useState<number>(30);
  const [calcHours, setCalcHours] = useState<number>(2);
  const [calcResultWh, setCalcResultWh] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Recalculate UPS on inputs alteration
  useEffect(() => {
    // Basic calculation formula: Wh = (Watts * Hours) / Efficiency (approx 0.85 typical)
    const wh = Math.ceil((calcWatts * calcHours) / 0.85);
    setCalcResultWh(wh);
  }, [calcWatts, calcHours]);

  if (!isAuthenticated) return null;

  const handleSend = async (customText?: string) => {
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
          history: historyPayload
        })
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
        sources: data.sources || []
      }]);

    } catch (err: any) {
      console.error("AI Advisor Communication error:", err);
      const errorMsg = err.message || 'שגיאה לא ידועה';
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: `אופס! נתקלתי בבעיה בחיבור לשרת.\n\n**פרטי השגיאה:** ${errorMsg}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract SKU suggestions based on current model output
  const findProductSuggestions = (text: string) => {
    if (!text || !catalogData || catalogData.length === 0) return [];
    
    // Find matching products by looking up SKUs or partial SKUs in the message
    const suggestions: any[] = [];
    const lowerText = text.toLowerCase();
    
    catalogData.forEach(p => {
      // Check if SKU exists and is mentioned in text, limit to max 3 items to avoid overwhelming
      if (p && p.sku && typeof p.sku === 'string' && p.sku.length > 2) {
        if (lowerText.includes(p.sku.toLowerCase()) && !suggestions.some(s => s.sku === p.sku)) {
          suggestions.push(p);
        }
      }
    });

    // If no direct SKU, check name keywords for high relevancy items (like "מחבר", "אל פסק", "סיב פאץ'")
    if (suggestions.length === 0) {
      const words = ["ups", "אל פסק", "ארון", "cabinet", "מגשר", "poe"];
      for (const word of words) {
        if (lowerText.includes(word)) {
          const match = catalogData.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase().includes(word) && !p.isComingSoon);
          if (match && !suggestions.some(s => s.id === match.id)) {
            suggestions.push(match);
          }
          if (suggestions.length >= 2) break;
        }
      }
    }

    return suggestions.slice(0, 3);
  };

  const handleAddSuggested = (product: any) => {
    addToCart(product, 1);
  };

  return (
    <>
      {/* Floating Sparkle Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button 
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-[#004387] text-white p-4 rounded-full shadow-[0_10px_25px_rgba(0,67,135,0.4)] hover:bg-[#fe8d00] transition-colors flex items-center gap-2 font-bold relative border-2 border-white/10 group overflow-hidden"
          style={{ direction: 'rtl' }}
        >
          <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
          <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-350 ease-out whitespace-nowrap text-sm pr-1">
            יועץ טכני חכם ✨
          </span>
          {/* Active pulse effect */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fe8d00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border border-white"></span>
          </span>
        </motion.button>
      </div>

      {/* Slide-in sidebar advisor interface */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ direction: 'rtl' }}>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-gray-50 w-full sm:max-w-md h-full relative z-10 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.15)] overflow-hidden border-r border-[#004387]/15"
              ref={containerRef}
            >
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
                        onClick={() => setIsOpen(false)}
                        className="w-full text-gray-400 hover:text-white transition-colors text-xs text-center mt-3 bg-transparent border-none cursor-pointer underline"
                      >
                        ביטול וחזרה לקטלוג
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="bg-[#0c2d57] text-white p-4 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe8d00]/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="bg-[#fe8d00] p-1.5 rounded-lg text-white">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-1.5 leading-tight text-white m-0">
                      RBS Expert
                      <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 animate-pulse rounded select-none font-semibold">LIVE</span>
                    </h3>
                    <p className="text-[11px] text-gray-300 leading-none mt-0.5">מנוע ייעוץ הנדסי וחישוב אל-פסק</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCalcOpen(!calcOpen)}
                    className="p-1 px-2 text-xs font-semibold rounded-md border border-white/20 bg-white/10 hover:bg-[#fe8d00] hover:border-transparent transition-all flex items-center gap-1 text-white border-none cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${calcOpen ? 'rotate-180' : ''} transition-transform`} />
                    מחשבון UPS
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white border-none cursor-pointer"
                    aria-label="סגור חלון יועץ"
                  >
                    <X className="w-5 h-5" />
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
              <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
                {messages.map((m, idx) => {
                  const isModel = m.role === 'model';
                  const suggestedProducts = isModel ? findProductSuggestions(m.text) : [];
                  
                  return (
                    <div key={idx} className={`flex ${isModel ? 'justify-start' : 'justify-end'} gap-2`}>
                      {isModel && (
                        <div className="w-8 h-8 rounded-full bg-[#0c2d57] text-white flex items-center justify-center shrink-0 self-start text-xs border border-white/20">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="flex flex-col max-w-[85%]">
                        <div className={`p-3 rounded-xl shadow-xs text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                          isModel 
                            ? 'bg-white border border-gray-100 text-gray-800 rounded-tr-none' 
                            : 'bg-[#004387] text-white rounded-tl-none'
                        }`}>
                          {m.text}

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

                        {/* Render inline direct-add product cards matched dynamically */}
                        {isModel && suggestedProducts.length > 0 && (
                          <div className="mt-2 space-y-2 bg-white rounded-lg p-2.5 border border-dashed border-[#004387]/20">
                            <span className="text-[10px] text-[#004387] font-bold block">מוצרים שהוזכרו להוספה מהירה לעגלה:</span>
                            {suggestedProducts.map((prod, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between gap-2.5 p-1.5 border border-gray-100 rounded bg-gray-50/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  {prod.images && prod.images[0] && (
                                    <img 
                                      src={prod.images[0]} 
                                      alt={prod.name} 
                                      className="w-8 h-8 object-contain bg-white border border-gray-100 p-0.5 rounded flex-shrink-0" 
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-gray-800 truncate" title={prod.name}>{prod.name}</div>
                                    <div className="text-[9px] text-gray-500 font-mono">מק"ט: {prod.sku} {prod.price > 0 && `| ₪${prod.price.toLocaleString('he-IL')}`}</div>
                                    
                                    {/* Link block to download/view datasheet specs manual */}
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 select-text">
                                      {prod.specsLink && (
                                        <a 
                                          href={prod.specsLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-[9px] text-blue-600 hover:text-orange-500 font-semibold underline flex items-center gap-0.5"
                                        >
                                          📄 דף מפרט טכני
                                        </a>
                                      )}
                                      {prod.manualLink && (
                                        <a 
                                          href={prod.manualLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-[9px] text-teal-600 hover:text-orange-500 font-semibold underline flex items-center gap-0.5"
                                        >
                                          📘 מדריך למשתמש
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleAddSuggested(prod)}
                                  className="bg-[#004387] hover:bg-[#fe8d00] text-white p-1 rounded transition-colors flex items-center justify-center shrink-0 border-none cursor-pointer"
                                  title="הוסף לעגלת קניות"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <span className="text-[9px] text-gray-400 mt-1 self-start select-none">
                          {m.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
                    className="flex-1 bg-gray-50 border border-gray-200 focus:bg-white rounded-lg px-3 py-2 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-[#004387] transition-all text-right"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="bg-[#004387] hover:bg-[#fe8d00] disabled:bg-gray-200 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center border-none cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 rotate-180" />
                  </button>
                </form>
                <p className="text-[9px] text-gray-400 text-center mt-1 select-none">
                  תשובות מבוססות על שילוב של קטלוג RBSTelecom וחיפוש Google Search זמני.
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
