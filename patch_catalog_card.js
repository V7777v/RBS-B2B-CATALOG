import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `interface CatalogCardProps { catalog: any; navigateToCatalog: (name: string) => void; }
const CatalogCard: React.FC<CatalogCardProps> = ({catalog, navigateToCatalog}) => (
  <div onClick={() => navigateToCatalog(catalog.name)} className="group flex flex-col h-full rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100">`;

const r1 = `interface CatalogCardProps { catalog: any; navigateToCatalog: (name: string) => void; isNew?: boolean; }
const CatalogCard: React.FC<CatalogCardProps> = ({catalog, navigateToCatalog, isNew}) => (
  <div onClick={() => navigateToCatalog(catalog.name)} className="group flex flex-col h-full rounded-none bg-white overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100 relative">
    {isNew && (
      <div className="absolute top-3.5 left-[-33px] z-10 w-32 py-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700 text-white text-[9px] sm:text-[10px] font-extrabold text-center uppercase tracking-widest transform -rotate-45 shadow-[0_4px_10px_rgba(16,185,129,0.45)] border-y border-emerald-400 flex items-center justify-center gap-1.5 select-none">
        <Sparkles size={10} className="text-emerald-100 animate-pulse" />
        <span>חדש!</span>
      </div>
    )}`;

const t2 = `                  {catalogFolders.map((catalog) => (
                    <CatalogCard key={catalog.name} catalog={catalog} navigateToCatalog={navigateToCatalog} />
                  ))}`;

const r2 = `                  {catalogFolders.map((catalog) => (
                    <CatalogCard 
                      key={catalog.name} 
                      catalog={catalog} 
                      navigateToCatalog={navigateToCatalog} 
                      isNew={catalogData.some(p => p.category === catalog.name && p.isNew)}
                    />
                  ))}`;


let fails = 0;
if (content.includes(t1)) { content = content.replace(t1, r1); } else { console.log('t1 failed'); fails++; }
if (content.includes(t2)) { content = content.replace(t2, r2); } else { console.log('t2 failed'); fails++; }

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
}
