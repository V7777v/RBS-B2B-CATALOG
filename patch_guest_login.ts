import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  "useEffect(() => {",
  "useEffect(() => {\n    const handleTriggerLogin = () => { try { sessionStorage.removeItem('rbs_guest'); } catch {} setIsGuest(false); };\n    window.addEventListener('rbs_trigger_login', handleTriggerLogin);\n    return () => window.removeEventListener('rbs_trigger_login', handleTriggerLogin);\n  }, []);\n\n  useEffect(() => {"
);
fs.writeFileSync('src/App.tsx', content);
