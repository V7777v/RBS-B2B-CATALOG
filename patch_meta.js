import fs from 'fs';

let content = fs.readFileSync('index.html', 'utf-8');

const t1 = `    <meta property="og:image" content="https://rbs-b2-b-catalog.vercel.app/icons/icon-512.png" />\n    <meta property="og:image:width" content="256" />\n    <meta property="og:image:height" content="256" />\n`;

const t2 = `    <meta name="twitter:image" content="https://rbs-b2-b-catalog.vercel.app/icons/icon-512.png" />\n`;

content = content.replace(t1, '');
content = content.replace(t2, '');

fs.writeFileSync('index.html', content);
console.log("SUCCESS");
