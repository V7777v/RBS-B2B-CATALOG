import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `  };

  const deepLinkDoneRef = useRef(false);
  const [deepLinkError, setDeepLinkError] = useState<string>('');
  const [copyToast, setCopyToast] = useState<string>('');`;

const r1 = `  };

  const deepLinkDoneRef = useRef(false);

  const buildCategoryShareUrl = useCallback((): string => {
    const p = new URLSearchParams();
    if (selectedCatalog) p.set('cat', String(selectedCatalog));
    if (selectedSubcategory) p.set('sub', String(selectedSubcategory));
    if (selectedNestedSubcategory) p.set('nested', String(selectedNestedSubcategory));
    if (selectedNicheCategory) p.set('niche', String(selectedNicheCategory));
    return window.location.origin + '/?' + p.toString();
  }, [selectedCatalog, selectedSubcategory, selectedNestedSubcategory, selectedNicheCategory]);

  const copyShareCategoryLink = useCallback((mode: 'copy' | 'whatsapp') => {
    const url = buildCategoryShareUrl();
    const label = selectedNicheCategory || selectedNestedSubcategory || selectedSubcategory || selectedCatalog || '';
    if (mode === 'whatsapp') {
      const msg = \`קטגוריה: \${label}\\n\\nצפה בקטלוג:\\n\${url}\`;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
      return;
    }
    const done = () => {
      setCopyToast('הקישור לקטגוריה הועתק');
      window.setTimeout(() => setCopyToast(''), 2500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => { window.prompt('העתק את הקישור:', url); });
    } else {
      window.prompt('העתק את הקישור:', url);
    }
  }, [buildCategoryShareUrl, selectedCatalog, selectedSubcategory, selectedNestedSubcategory, selectedNicheCategory]);
  const [deepLinkError, setDeepLinkError] = useState<string>('');
  const [copyToast, setCopyToast] = useState<string>('');`;

const t2 = `          }}
          aria-hidden="true" 
        />

        <div className="container mx-auto px-4 py-2">`;

const r2 = `          }}
          aria-hidden="true" 
        />

        {selectedCatalog && currentView !== 'product' && currentView !== 'checkout' && !searchQuery && (
          <div className="container mx-auto px-4 pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => copyShareCategoryLink('copy')}
                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#004387] rounded-lg font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Link size={14} /> העתק קישור לקטגוריה
              </button>
              <button
                onClick={() => copyShareCategoryLink('whatsapp')}
                className="flex-1 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <MessageSquare size={14} /> שלח קטגוריה בוואטסאפ
              </button>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-2">`;

let fails = 0;
const pairs = [[t1, r1], [t2, r2]];

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
