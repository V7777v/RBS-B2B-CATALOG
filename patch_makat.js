import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldCopyComp = `const CopyToClipboard = ({ text }: { text: string }) => {
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
};`;

const makatComp = `const MakatBadge = ({ sku, className = "" }: { sku: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="העתק מק״ט"
      className={\`group/makat inline-flex items-center justify-center gap-2 bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border border-gray-200 hover:border-[#004387] active:border-[#002f5e] transition-all rounded-lg py-2.5 px-4 sm:py-1.5 sm:px-3 w-full sm:w-auto cursor-pointer focus:outline-none select-none \${className}\`}
    >
      <span className="text-gray-600 group-hover/makat:text-[#0c2d57] transition-colors text-[16px] sm:text-[15px] font-bold flex items-center">
        מק״ט: <span className="font-mono mr-1.5 tracking-wide text-gray-800 group-hover/makat:text-[#004387]">{sku}</span>
      </span>
      <span className="text-gray-400 group-hover/makat:text-[#004387] transition-colors flex items-center justify-center p-0.5">
        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
      </span>
    </button>
  );
};`;

if (content.includes(oldCopyComp)) {
    content = content.replace(oldCopyComp, makatComp);
} else {
    console.log("Could not find CopyToClipboard component!");
}

// Product Card
content = content.replace(
  /<div className="text-\[13px\] sm:text-\[15\.5px\] text-gray-600 font-bold mb-1\.5 flex flex-row items-center justify-center gap-1 w-full flex-wrap">\s*<span className="flex items-center justify-center">מק״ט: <span className="font-mono mr-1">\{product\.sku\}<\/span><CopyToClipboard text=\{product\.sku\} \/><\/span>\s*<\/div>/g,
  '<div className="mb-2.5 flex flex-row items-center justify-center w-full">\\n          <MakatBadge sku={product.sku} />\\n        </div>'
);

// Detailed Product view
content = content.replace(
  /<div className="text-gray-600 mb-2 text-\[15px\] sm:text-\[18px\] font-bold bg-gray-50 py-2 border border-gray-200 rounded-md flex items-center justify-center">\s*<div className="flex items-center justify-center">מק״ט: <span className="font-mono text-gray-800 tracking-wide mr-1\.5">\{selectedProduct\.sku\}<\/span><CopyToClipboard text=\{selectedProduct\.sku\} \/><\/div>\s*<\/div>/g,
  '<div className="mb-4 flex flex-row items-center justify-start w-full">\\n                <MakatBadge sku={selectedProduct.sku} className="!w-full sm:!w-auto sm:!text-[17px] !py-3 sm:!py-2" />\\n              </div>'
);

// Cart Item
content = content.replace(
  /<div className="text-\[15px\] font-bold text-gray-600 mb-2 flex items-center justify-center bg-gray-50 py-1 rounded border border-gray-100">מק״ט: <span className="font-mono">\{item\.sku\}<\/span><CopyToClipboard text=\{item\.sku\} \/><\/div>/g,
  '<div className="mb-2"><MakatBadge sku={item.sku} className="!py-1.5 !px-2.5 !w-full sm:!w-auto" /></div>'
);

// Checkout Item
content = content.replace(
  /<div className="text-\[15px\] font-bold text-gray-700 mt-2 flex items-center justify-center bg-gray-50 py-1\.5 rounded border border-gray-100">מק״ט: <span className="font-mono">\{item\.sku\}<\/span><CopyToClipboard text=\{item\.sku\} \/><\/div>/g,
  '<div className="mt-2"><MakatBadge sku={item.sku} className="!py-1.5 !px-2.5 !w-full sm:!w-auto" /></div>'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Replacement complete.");
