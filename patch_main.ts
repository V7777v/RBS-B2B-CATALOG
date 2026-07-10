import fs from 'fs';
let content = fs.readFileSync('src/main.tsx', 'utf-8');

if (!content.includes("@vercel/analytics/react")) {
  content = content.replace(
    "import AppErrorBoundary from './AppErrorBoundary.tsx';",
    "import AppErrorBoundary from './AppErrorBoundary.tsx';\nimport { Analytics } from '@vercel/analytics/react';"
  );
  
  content = content.replace(
    "<App />\n    </AppErrorBoundary>",
    "<App />\n      <Analytics />\n    </AppErrorBoundary>"
  );
  
  fs.writeFileSync('src/main.tsx', content);
}
