import fs from 'fs';
let content = fs.readFileSync('src/components/HumanVerification.tsx', 'utf-8');
content = content.replace("MousePointerClick", "Fingerprint");
content = content.replace("MousePointerClick", "Fingerprint"); // run again just in case
fs.writeFileSync('src/components/HumanVerification.tsx', content);
