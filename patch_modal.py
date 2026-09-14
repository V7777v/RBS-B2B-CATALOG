import re

with open('src/components/Cabinet3D/AddSlotModal.tsx', 'r') as f:
    text = f.read()

bad = """  isAuxiliaryMode = false, mode = 'mobile-drawer', onHoverProductItem
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'auxiliary'>('direct');"""

good = """  isAuxiliaryMode = false, mode = 'mobile-drawer', onHoverProductItem
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'direct' | 'auxiliary'>('direct');"""

text = text.replace(bad, good)

with open('src/components/Cabinet3D/AddSlotModal.tsx', 'w') as f:
    f.write(text)
