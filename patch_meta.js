import fs from 'fs';

let content = fs.readFileSync('index.html', 'utf-8');

const t1 = `    <meta property="og:description" content="מצלמות אבטחה, רשת ותקשורת — HIKVISION, EZVIZ ועוד. קטלוג B2B למפיצים ומתקינים." />\n    <meta property="og:url" content="https://rbs-b2-b-catalog.vercel.app/" />`;
const r1 = `    <meta property="og:description" content="מצלמות אבטחה, רשת ותקשורת — HIKVISION, EZVIZ ועוד. קטלוג B2B למפיצים ומתקינים." />\n    <meta property="og:image" content="https://rbs-b2-b-catalog.vercel.app/og-logo.png" />\n    <meta property="og:url" content="https://rbs-b2-b-catalog.vercel.app/" />`;

const t2 = `    <meta name="twitter:description" content="מצלמות אבטחה, רשת ותקשורת — HIKVISION, EZVIZ ועוד." />\n    <style>`;
const r2 = `    <meta name="twitter:description" content="מצלמות אבטחה, רשת ותקשורת — HIKVISION, EZVIZ ועוד." />\n    <meta name="twitter:image" content="https://rbs-b2-b-catalog.vercel.app/og-logo.png" />\n    <style>`;

content = content.replace(t1, r1);
content = content.replace(t2, r2);

fs.writeFileSync('index.html', content);
console.log("SUCCESS");
