import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const importReplacement = "import { updateOrderStatus, updateOrder, getLastOrderError } from './firestoreData';\nimport { trackPageView, trackEvent } from './lib/analytics';";
content = content.replace("import { updateOrderStatus, updateOrder, getLastOrderError } from './firestoreData';", importReplacement);

const appEffectReplacement = `export default function App() {
  useEffect(() => {
    trackEvent('app_loaded', { app_name: 'rbs_b2b_catalog' });
  }, []);`;
content = content.replace("export default function App() {", appEffectReplacement);

fs.writeFileSync('src/App.tsx', content);
