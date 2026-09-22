import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert CopyToClipboard component
const copyComponent = `
const CopyToClipboard = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      title="העתק מק״ט"
      className="p-1 text-gray-400 hover:text-[#004387] bg-white rounded-md border border-gray-200 hover:border-[#004387] hover:bg-blue-50 transition-colors mr-1.5 focus:outline-none flex-shrink-0 flex items-center justify-center active:scale-95"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
};
`;

content = content.replace(
  'interface CatalogCardProps',
  copyComponent + '\\ninterface CatalogCardProps'
);

// 1. Line 901: Product Card
content = content.replace(
  `<span>מק״ט: {product.sku}</span>`,
  `<span className="flex items-center justify-center">מק״ט: <span className="font-mono mr-1">{product.sku}</span><CopyToClipboard text={product.sku} /></span>`
);

// 2. Line 1314: Detailed Product view
content = content.replace(
  `מק״ט: <span className="font-mono text-gray-800 tracking-wide">{selectedProduct.sku}</span>`,
  `<div className="flex items-center justify-center">מק״ט: <span className="font-mono text-gray-800 tracking-wide mr-1.5">{selectedProduct.sku}</span><CopyToClipboard text={selectedProduct.sku} /></div>`
);
content = content.replace(
  `className="text-gray-600 mb-2 text-[15px] sm:text-[18px] font-bold text-center bg-gray-50 py-2 border border-gray-200 rounded-md"`,
  `className="text-gray-600 mb-2 text-[15px] sm:text-[18px] font-bold bg-gray-50 py-2 border border-gray-200 rounded-md flex items-center justify-center"`
);

// 3. Line 2261: Cart item
content = content.replace(
  `מק״ט: <span className="font-mono">{item.sku}</span></div>`,
  `מק״ט: <span className="font-mono">{item.sku}</span><CopyToClipboard text={item.sku} /></div>`
);
content = content.replace(
  `className="text-[15px] font-bold text-gray-600 mb-2 text-center bg-gray-50 py-1 rounded border border-gray-100"`,
  `className="text-[15px] font-bold text-gray-600 mb-2 flex items-center justify-center bg-gray-50 py-1 rounded border border-gray-100"`
);

// 4. Line 5852: Checkout item
content = content.replace(
  `מק״ט: <span className="font-mono">{item.sku}</span></div>`, // Might have been replaced if identical to 2261, wait, I'll use regex or specific replace
  `מק״ט: <span className="font-mono">{item.sku}</span><CopyToClipboard text={item.sku} /></div>`
);
content = content.replace(
  `className="text-[15px] font-bold text-gray-700 mt-2 text-center bg-gray-50 py-1.5 rounded border border-gray-100"`,
  `className="text-[15px] font-bold text-gray-700 mt-2 flex items-center justify-center bg-gray-50 py-1.5 rounded border border-gray-100"`
);

fs.writeFileSync('src/App.tsx', content);
