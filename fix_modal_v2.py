import re
with open('src/components/Cabinet3D/AddSlotModal.tsx', 'r') as f:
    text = f.read()

# We want to replace the whole block from activeTab to the end of directRubrics declaration

bad_start = "  const [activeTab, setActiveTab] = useState<'direct' | 'alternative' | 'rearrange' | 'auxiliary'>('direct');"
bad_end = "  const auxRubrics = useMemo(() => groupAccessoriesForDisplay(filteredAux), [filteredAux]);"

start_idx = text.find(bad_start)
end_idx = text.find(bad_end) + len(bad_end)

good_block = '''  const [activeTab, setActiveTab] = useState<'direct' | 'auxiliary'>('direct');

  const unifiedRubrics = useMemo(() => {
    // We filter compatible accessories depending on the mode.
    // Wait, earlier the user just wanted it to NOT have tabs.
    // If it has no tabs, it just shows EVERYTHING from compatibleAccessories, appropriately grouped by groupAccessoriesForDisplay!
    // Let's just group them all!
    const items = compatibleAccessories;
    return groupAccessoriesForDisplay(items, searchFilter, isAuxiliaryMode ? undefined : (targetU ? undefined : availableU));
  }, [compatibleAccessories, searchFilter, isAuxiliaryMode, targetU, availableU]);

  useEffect(() => {
    if (searchFilter.length > 1) {
      const allOpen: Record<string, boolean> = {};
      unifiedRubrics.forEach(g => allOpen[g.id] = true);
      setOpenSections(allOpen);
    }
  }, [searchFilter, unifiedRubrics]);
'''

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + good_block + text[end_idx:]

with open('src/components/Cabinet3D/AddSlotModal.tsx', 'w') as f:
    f.write(text)
