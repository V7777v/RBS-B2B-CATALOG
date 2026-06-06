const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The parts are:
// index 0 to 351 are at the beginning, separated by `\\n`.
// Then the reconstructed code (which has real newlines).
// Then index 353 to end, separated by `\\n`.

// Since reconstructedCode starts with a real newline and ends with a real newline,
// We can find the portions before and after it.

// Wait, the easiest and 100% accurate way is to run `split('\\n')` ONLY on the first line (which contains 0 to 351) 
// and the last line (which contains 353 to end)!

const lines = content.split('\n');

// The very first line `lines[0]` is the first 352 lines joined by `\\n`.
const firstPart = lines[0].split('\\n').join('\n');

// The very last line `lines[lines.length - 1]` is the lines after 353 joined by `\\n`.
const lastPart = lines[lines.length - 1].split('\\n').join('\n');

// But wait, what if `\\n` inside the string was actually `\\\\n`?
// Let's just do the split/join, it's highly unlikely that `\\n` appears literally anywhere else except maybe in regex.
// Wait, if it does appear in regex, it's 2 chars `\n`.  .split('\\n') will break it!
// Is there a better way?
// Let's check if the first part has `\\n` inside strings.
// Let's just fix the join!
