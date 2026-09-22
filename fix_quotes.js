import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

const toFix = [3216, 3218, 3219, 3220, 3305, 3306, 6580, 6581, 6813, 6814, 6842, 6843, 7272, 7275, 7886, 7887];

// Just replace `\n` inside the strings, but since we read by line, we can just join the lines that got broken!
// Let's print out line 3215 to 3222 to see what it looks like.
