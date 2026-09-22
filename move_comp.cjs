const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const componentsRegex = /  const BrandBadge: React\.FC<\{ brand: string \}>[\s\S]*?  const ProductCard: React\.FC<\{ product: any \}>[^]*?    \);\n  \};\n/g;

const match = content.match(componentsRegex);
if (!match) {
  console.log("No match found for components block.");
  process.exit(1);
}

let extracted = match[0];
content = content.replace(componentsRegex, '');

// Process extracted components to pass props
extracted = extracted.replace(/  const BrandBadge: React\.FC<\{ brand: string \}> = \(\{ brand \}\) => \{/g, 'const BrandBadge: React.FC<{ brand: string }> = ({ brand }) => {');

extracted = extracted.replace(/  const CatalogCard: React\.FC<\{ catalog: any \}> = \(\{ catalog \}\) => \(/g, 
'interface CatalogCardProps { catalog: any; navigateToCatalog: (name: string) => void; }\nconst CatalogCard: React.FC<CatalogCardProps> = ({ catalog, navigateToCatalog }) => (');

extracted = extracted.replace(/  const SubcategoryCard: React\.FC<\{ sub: any, onClick\?: \(\) => void \}> = \(\{ sub, onClick \}\) => \(/g,
'interface SubcategoryCardProps { sub: any; onClick?: () => void; navigateToSubcategory?: (name: string) => void; }\nconst SubcategoryCard: React.FC<SubcategoryCardProps> = ({ sub, onClick, navigateToSubcategory }) => (');
extracted = extracted.replace(/onClick={onClick || \(\(\) => navigateToSubcategory\(sub\.name\)\)}/g, 'onClick={onClick || (() => navigateToSubcategory && navigateToSubcategory(sub.name))}');

extracted = extracted.replace(/  const ProductCard: React\.FC<\{ product: any \}> = \(\{ product \}\) => \{/g,
'export interface ProductCardProps { product: any; navigateToProduct: (product: any) => void; addToCart: (product: any) => void; }\nexport const ProductCard: React.FC<ProductCardProps> = ({ product, navigateToProduct, addToCart }) => {');

const insertionIndex = content.indexOf('const VirtualProductCard: React.FC<VirtualProductCardProps> =');
if (insertionIndex === -1) {
  console.log("No VirtualProductCard found.");
  process.exit(1);
}
content = content.slice(0, insertionIndex) + extracted + '\n' + content.slice(insertionIndex);

// Add missing props in App component usages
content = content.replace(/<ProductCard key=\{product.id\} product=\{product\} \/>/g, '<ProductCard key={product.id} product={product} navigateToProduct={navigateToProduct} addToCart={addToCart} />');
content = content.replace(/<ProductCard product=\{product\} \/>/g, '<ProductCard product={product} navigateToProduct={navigateToProduct} addToCart={addToCart} />');
content = content.replace(/<CatalogCard key=\{catalog.name\} catalog=\{catalog\} \/>/g, '<CatalogCard key={catalog.name} catalog={catalog} navigateToCatalog={navigateToCatalog} />');
content = content.replace(/<SubcategoryCard key=\{sub.name\} sub=\{sub\} onClick=\{sub.onClick\} \/>/g, '<SubcategoryCard key={sub.name} sub={sub} onClick={sub.onClick} navigateToSubcategory={navigateToSubcategory} />');
content = content.replace(/<SubcategoryCard key=\{sub.name\} sub=\{sub\} \/>/g, '<SubcategoryCard key={sub.name} sub={sub} navigateToSubcategory={navigateToSubcategory} />');

// also replace in App usages
content = content.replace(/<ProductCard product=\{p\} \/>/g, '<ProductCard product={p} navigateToProduct={navigateToProduct} addToCart={addToCart} />');
content = content.replace(/<ProductCard\n\s*key=\{product\.id\}\n\s*product=\{product\}\n\s*\/>/gs, '<ProductCard key={product.id} product={product} navigateToProduct={navigateToProduct} addToCart={addToCart} />');

fs.writeFileSync('src/App.tsx', content);
