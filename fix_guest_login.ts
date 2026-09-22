import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  "export default function App() {\n  useEffect(() => {\n    const handleTriggerLogin = () => { try { sessionStorage.removeItem('rbs_guest'); } catch {} setIsGuest(false); };\n    window.addEventListener('rbs_trigger_login', handleTriggerLogin);\n    return () => window.removeEventListener('rbs_trigger_login', handleTriggerLogin);\n  }, []);",
  "export default function App() {"
);
content = content.replace(
  "const [isGuest, setIsGuest] = useState(() => { try { return sessionStorage.getItem('rbs_guest') === '1'; } catch { return false; } });",
  "const [isGuest, setIsGuest] = useState(() => { try { return sessionStorage.getItem('rbs_guest') === '1'; } catch { return false; } });\n  useEffect(() => {\n    const handleTriggerLogin = () => { try { sessionStorage.removeItem('rbs_guest'); } catch {} setIsGuest(false); };\n    window.addEventListener('rbs_trigger_login', handleTriggerLogin);\n    return () => window.removeEventListener('rbs_trigger_login', handleTriggerLogin);\n  }, []);"
);
fs.writeFileSync('src/App.tsx', content);
