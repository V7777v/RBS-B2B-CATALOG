import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
const errors = [3216, 3305, 6580, 6813, 6842, 7272, 7886];

for (let e of errors) {
    let startIdx = e - 1;
    let endIdx = startIdx + 1;
    
    // Some strings span multiple lines
    while (endIdx < lines.length && (lines[endIdx-1].match(/'/g) || []).length % 2 !== 0 && !lines[endIdx].includes(";')")) {
        // Find where the string is closed
        if (lines[endIdx].includes("'")) {
           break; 
        }
        endIdx++;
    }
}
