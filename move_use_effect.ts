import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const hookRegex = /  useEffect\(\(\) => \{\n    let path = window\.location\.pathname \+ window\.location\.search;[\s\S]*?  \}, \[currentView, selectedCatalog, selectedSubcategory, selectedProduct\]\);\n/m;
const match = content.match(hookRegex);

if (match) {
  content = content.replace(hookRegex, '');
  content = content.replace("  const [selectedProduct, setSelectedProduct] = useState<any>(null);\n", "  const [selectedProduct, setSelectedProduct] = useState<any>(null);\n\n" + match[0] + "\n");
  fs.writeFileSync('src/App.tsx', content);
  console.log("Moved useEffect successfully");
} else {
  console.log("Could not find useEffect");
}
