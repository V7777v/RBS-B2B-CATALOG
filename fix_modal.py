import re
with open('src/components/Cabinet3D/AddSlotModal.tsx', 'r') as f:
    text = f.read()

bad_tabs = '''  const [activeTab, setActiveTab] = useState<'direct' | 'auxiliary'>('direct');

  useEffect(() => {
    if (isAuxiliaryMode) {
      setActiveTab('auxiliary');
    } else {
      setActiveTab('direct');
    }
  }, [isAuxiliaryMode, isOpen]);

  const { directItems, auxItems } = useMemo(() => {
    const direct: any[] = [];
    const aux: any[] = [];
    compatibleAccessories.forEach(acc => {
      const u = acc.uSize ?? 1;
      if (u === 0) aux.push(acc);
      else direct.push(acc);
    });
    return { directItems: direct, auxItems: aux };
  }, [compatibleAccessories]);

  const filteredDirect = useMemo(() => {
    if (!searchFilter) return directItems;
    const lower = searchFilter.toLowerCase();
    return directItems.filter(item => 
      (item.name || '').toLowerCase().includes(lower) || 
      (item.sku || item.pn || '').toLowerCase().includes(lower) ||
      (item.brand || '').toLowerCase().includes(lower)
    );
  }, [directItems, searchFilter]);

  const filteredAux = useMemo(() => {
    if (!searchFilter) return auxItems;
    const lower = searchFilter.toLowerCase();
    return auxItems.filter(item => 
      (item.name || '').toLowerCase().includes(lower) || 
      (item.sku || item.pn || '').toLowerCase().includes(lower) ||
      (item.brand || '').toLowerCase().includes(lower)
    );
  }, [auxItems, searchFilter]);

  useEffect(() => {
    if (searchFilter) {
      const allOpen: Record<string, boolean> = {};
      const groups = activeTab === 'direct' ? directRubrics : auxRubrics;
      groups.forEach(g => allOpen[g.id] = true);
      setOpenSections(allOpen);
    }
  }, [searchFilter, activeTab, filteredAux, filteredDirect]);

  const directRubrics = useMemo(() => groupAccessoriesForDisplay(filteredDirect), [filteredDirect]);
  const auxRubrics = useMemo(() => groupAccessoriesForDisplay(filteredAux), [filteredAux]);'''

good_tabs = '''  const unifiedRubrics = useMemo(() => groupAccessoriesForDisplay(compatibleAccessories, searchFilter, isAuxiliaryMode ? undefined : (targetU ? targetU : availableU)), [compatibleAccessories, searchFilter, isAuxiliaryMode, targetU, availableU]);

  useEffect(() => {
    if (searchFilter) {
      const allOpen: Record<string, boolean> = {};
      unifiedRubrics.forEach(g => allOpen[g.id] = true);
      setOpenSections(allOpen);
    }
  }, [searchFilter, unifiedRubrics]);'''

text = text.replace(bad_tabs, good_tabs)

bad_tabs2 = '''        <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg">
          <button
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'direct' && !isAuxiliaryMode ? 'bg-white shadow-sm text-[#004387]' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setActiveTab('direct')}
            disabled={isAuxiliaryMode}
          >
            ציוד U
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'auxiliary' || isAuxiliaryMode ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setActiveTab('auxiliary')}
          >
            אביזרי 0U
          </button>
        </div>'''

text = text.replace(bad_tabs2, '')

bad_content = '''      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 relative">
        {(activeTab === 'direct' ? directRubrics : auxRubrics).length === 0 ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <Box size={32} className="text-slate-300 mb-3" />
            <span className="font-bold">לא נמצא ציוד מתאים</span>
            {searchFilter && <span className="text-xs mt-1">נסה לשנות את מילות החיפוש</span>}
          </div>
        ) : (
          (activeTab === 'direct' ? directRubrics : auxRubrics).map(rubric => {'''

good_content = '''      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 relative">
        {unifiedRubrics.length === 0 ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <Box size={32} className="text-slate-300 mb-3" />
            <span className="font-bold">לא נמצא ציוד מתאים</span>
            {searchFilter && <span className="text-xs mt-1">נסה לשנות את מילות החיפוש</span>}
          </div>
        ) : (
          unifiedRubrics.map(rubric => {'''

text = text.replace(bad_content, good_content)

bad_render = '''{rubric.items.map((item: any) => renderProductItem(item, activeTab === 'auxiliary'))}'''
good_render = '''{rubric.items.map((item: any) => renderProductItem(item, item.uSize === 0))}'''
text = text.replace(bad_render, good_render)

with open('src/components/Cabinet3D/AddSlotModal.tsx', 'w') as f:
    f.write(text)
