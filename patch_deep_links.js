import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `/* ===== Hoisted out of App() to give stable identity (prevents remount that wiped configurator state) ===== */
const ProductDetailsView = (props: any) => {
  const { addToCart, bulkSelection, cart, catalogData, currentOptionals, handleBulkSelectionChange, handleOptionalsChange, navigateHome, navigateToCategoryAndSub, navigateToProduct, removeFromCart, selectedProduct, setCart, setIsAuthenticated, updateCartQuantity, isGuest } = props;
    const [mainImage, setMainImage] = useState(selectedProduct?.images[0]);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);`;

const r1 = `/* ===== Hoisted out of App() to give stable identity (prevents remount that wiped configurator state) ===== */
const ProductDetailsView = (props: any) => {
  const { addToCart, bulkSelection, cart, catalogData, currentOptionals, handleBulkSelectionChange, handleOptionalsChange, navigateHome, navigateToCategoryAndSub, navigateToProduct, removeFromCart, selectedProduct, setCart, setIsAuthenticated, updateCartQuantity, isGuest, copyShareLink } = props;
    const [mainImage, setMainImage] = useState(selectedProduct?.images[0]);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);`;

const t2 = `                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0c2d57] mb-2 leading-tight">{selectedProduct.name}</h1>
              <div className="text-gray-600 mb-4 sm:mb-6 text-[15px] sm:text-[18px] font-bold text-center bg-gray-50 py-2 border border-gray-200 rounded-md">
                מק״ט: <span className="font-mono text-gray-800 tracking-wide">{selectedProduct.sku}</span>
              </div>
              
              <div className="mb-6 sm:mb-8 bg-white border-2 border-slate-100 p-5 sm:p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:border-[#004387]/25 transition-all duration-300 relative overflow-hidden text-right">
                {/* Brand colored vertical accent bar on the right (RTL start) */}`;

const r2 = `                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0c2d57] mb-2 leading-tight">{selectedProduct.name}</h1>
              <div className="text-gray-600 mb-2 text-[15px] sm:text-[18px] font-bold text-center bg-gray-50 py-2 border border-gray-200 rounded-md">
                מק״ט: <span className="font-mono text-gray-800 tracking-wide">{selectedProduct.sku}</span>
              </div>

              <button
                onClick={() => copyShareLink && copyShareLink('product', selectedProduct.sku || selectedProduct.id)}
                className="w-full mb-4 sm:mb-6 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#004387] rounded-md font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Link size={14} /> העתק קישור למוצר
              </button>
              
              <div className="mb-6 sm:mb-8 bg-white border-2 border-slate-100 p-5 sm:p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:border-[#004387]/25 transition-all duration-300 relative overflow-hidden text-right">
                {/* Brand colored vertical accent bar on the right (RTL start) */}`;

const t3 = `    }
  }, [searchQuery]);

  const navigateForward = useCallback((updates: any) => {
    setAdvisorOpen(false);
    // Move layout states into current replace state before push
    if (window.history.state) {
      window.history.replaceState({
        ...window.history.state,
        searchQuery: searchQuery
      }, '');
    }

    const nextState = {
      currentView,
      selectedCatalog,
      selectedSubcategory,
      selectedNestedSubcategory,
      selectedNicheCategory,
      selectedProduct,
      searchQuery,
      ...updates
    };
    window.history.pushState(nextState, '');
    setCurrentView(nextState.currentView);
    if (updates.selectedCatalog !== undefined) setSelectedCatalog(nextState.selectedCatalog);
    if (updates.selectedSubcategory !== undefined) setSelectedSubcategory(nextState.selectedSubcategory);`;

const r3 = `    }
  }, [searchQuery]);

  // --- DEEP LINKS: build a shareable query string from the current view state ---
  const buildQueryFromState = (s: any): string => {
    const p = new URLSearchParams();
    if (s.currentView === 'product' && s.selectedProduct) {
      const key = s.selectedProduct.sku || s.selectedProduct.id || '';
      if (key) p.set('product', String(key));
    } else {
      if (s.selectedCatalog) p.set('cat', String(s.selectedCatalog));
      if (s.selectedSubcategory) p.set('sub', String(s.selectedSubcategory));
      if (s.selectedNestedSubcategory) p.set('nested', String(s.selectedNestedSubcategory));
      if (s.selectedNicheCategory) p.set('niche', String(s.selectedNicheCategory));
    }
    const q = p.toString();
    return q ? (window.location.pathname + '?' + q) : window.location.pathname;
  };

  const deepLinkDoneRef = useRef(false);
  const [deepLinkError, setDeepLinkError] = useState<string>('');
  const [copyToast, setCopyToast] = useState<string>('');

  const copyShareLink = useCallback((kind: 'product' | 'category', value: string) => {
    const key = kind === 'product' ? 'product' : 'cat';
    const url = window.location.origin + '/?' + key + '=' + encodeURIComponent(String(value || ''));
    const done = () => {
      setCopyToast(kind === 'product' ? 'הקישור למוצר הועתק' : 'הקישור לקטגוריה הועתק');
      window.setTimeout(() => setCopyToast(''), 2500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => {
        window.prompt('העתק את הקישור:', url);
      });
    } else {
      window.prompt('העתק את הקישור:', url);
    }
  }, []);

  const navigateForward = useCallback((updates: any) => {
    setAdvisorOpen(false);
    // Move layout states into current replace state before push
    if (window.history.state) {
      window.history.replaceState({
        ...window.history.state,
        searchQuery: searchQuery
      }, '');
    }

    const nextState = {
      currentView,
      selectedCatalog,
      selectedSubcategory,
      selectedNestedSubcategory,
      selectedNicheCategory,
      selectedProduct,
      searchQuery,
      ...updates
    };
    window.history.pushState(nextState, '', buildQueryFromState(nextState));
    setCurrentView(nextState.currentView);
    if (updates.selectedCatalog !== undefined) setSelectedCatalog(nextState.selectedCatalog);
    if (updates.selectedSubcategory !== undefined) setSelectedSubcategory(nextState.selectedSubcategory);`;

const t4 = `      selectedProduct: product
    });
  }, [navigateForward]);

  const handleCheckout = () => {
    navigateForward({`;

const r4 = `      selectedProduct: product
    });
  }, [navigateForward]);

  // --- DEEP LINKS: restore view from the URL, once the catalog has actually loaded ---
  useEffect(() => {
    if (deepLinkDoneRef.current) return;
    if (!catalogData || catalogData.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const productKey = (params.get('product') || '').trim();
    const cat = (params.get('cat') || '').trim();
    const sub = (params.get('sub') || '').trim();
    const nested = (params.get('nested') || '').trim();
    const niche = (params.get('niche') || '').trim();
    if (!productKey && !cat) { deepLinkDoneRef.current = true; return; }
    deepLinkDoneRef.current = true;

    if (productKey) {
      const needle = productKey.toLowerCase();
      const found = catalogData.find((p: any) =>
        String(p.sku || '').toLowerCase() === needle || String(p.id || '').toLowerCase() === needle
      );
      if (found) {
        setCurrentOptionals([]);
        navigateForward({ currentView: 'product', selectedProduct: found });
      } else {
        setDeepLinkError('המוצר לא נמצא');
      }
      return;
    }

    navigateForward({
      currentView: niche ? 'niche_subs' : nested ? 'nested_subs' : sub ? 'products' : 'catalog_subs',
      selectedCatalog: cat || null,
      selectedSubcategory: sub || null,
      selectedNestedSubcategory: nested || null,
      selectedNicheCategory: niche || null,
      selectedProduct: null
    });
  }, [catalogData, navigateForward]);

  const handleCheckout = () => {
    navigateForward({`;

const t5 = `                  <h3 className="text-xl font-bold text-[#0c2d57]">טוען את פרטי המוצר...</h3>
                </div>
              ) : (
                <ProductDetailsView {...{ addToCart, bulkSelection, cart, catalogData, currentOptionals, handleBulkSelectionChange, handleOptionalsChange, navigateHome, navigateToCategoryAndSub, navigateToProduct, removeFromCart, selectedProduct, setCart, setIsAuthenticated, updateCartQuantity, isGuest }} />
              )
            ) : currentView === 'checkout' ? (
               <CheckoutView {...{ addToCart, bulkSelection, cart, catalogData, currentOptionals, handleBulkSelectionChange, handleOptionalsChange, navigateHome, navigateToCategoryAndSub, navigateToProduct, removeFromCart, selectedProduct, setCart, setIsAuthenticated, updateCartQuantity, userUid, userProfile }} billingProfile={billingProfile} onSaveBilling={(d: any) => { if (userUid) { saveUserProfile(userUid, d); setBillingProfile(d); } }} navigateToOrders={() => { setShowProfile(true); setShowOrders(true); }} onOrderPlaced={(o: any) => setOrders((prev: any[]) => [o, ...prev.filter((x: any) => x.id !== o.id)])} />`;

const r5 = `                  <h3 className="text-xl font-bold text-[#0c2d57]">טוען את פרטי המוצר...</h3>
                </div>
              ) : (
                <ProductDetailsView {...{ addToCart, bulkSelection, cart, catalogData, currentOptionals, handleBulkSelectionChange, handleOptionalsChange, navigateHome, navigateToCategoryAndSub, navigateToProduct, removeFromCart, selectedProduct, setCart, setIsAuthenticated, updateCartQuantity, isGuest, copyShareLink }} />
              )
            ) : currentView === 'checkout' ? (
               <CheckoutView {...{ addToCart, bulkSelection, cart, catalogData, currentOptionals, handleBulkSelectionChange, handleOptionalsChange, navigateHome, navigateToCategoryAndSub, navigateToProduct, removeFromCart, selectedProduct, setCart, setIsAuthenticated, updateCartQuantity, userUid, userProfile }} billingProfile={billingProfile} onSaveBilling={(d: any) => { if (userUid) { saveUserProfile(userUid, d); setBillingProfile(d); } }} navigateToOrders={() => { setShowProfile(true); setShowOrders(true); }} onOrderPlaced={(o: any) => setOrders((prev: any[]) => [o, ...prev.filter((x: any) => x.id !== o.id)])} />`;

const t6 = `              >
                <span className="text-base">📤</span> שלח עותק למשרד (וואטסאפ)
              </button>
            </div>
          </div>
        </div>
      )}

      {viewedQuote && (
        <>`;

const r6 = `              >
                <span className="text-base">📤</span> שלח עותק למשרד (וואטסאפ)
              </button>
            </div>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[95] bg-[#0c2d57] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg" dir="rtl">
          {copyToast}
        </div>
      )}

      {deepLinkError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[95] bg-red-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2" dir="rtl">
          {deepLinkError}
          <button onClick={() => setDeepLinkError('')} className="border-none bg-transparent text-white cursor-pointer p-0"><X size={16} /></button>
        </div>
      )}

      {viewedQuote && (
        <>`;

let fails = 0;
const pairs = [[t1, r1], [t2, r2], [t3, r3], [t4, r4], [t5, r5], [t6, r6]];

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
