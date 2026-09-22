import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = r"  const \[viewMode, setViewMode\] = useState<'2d' \| '3d'>\('2d'\);"
good = """  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);"""

text = re.sub(bad, good, text)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
