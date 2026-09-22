import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/\\n                window.open/g, '\n                window.open');
content = content.replace(/\\n                \}\)/g, '\n                })');
content = content.replace(/\\n/g, '\n'); 
// wait, if I run replace(/\\n/g, '\n') it will break the regexes I fixed again!
