import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes("import { trackPageView, trackEvent } from './lib/analytics';")) {
  content = content.replace("import LegalAndCookies from './LegalAndCookies';", "import LegalAndCookies from './LegalAndCookies';\nimport { trackPageView, trackEvent } from './lib/analytics';");
  fs.writeFileSync('src/App.tsx', content);
}
