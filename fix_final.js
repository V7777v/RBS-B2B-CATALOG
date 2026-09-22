import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

const errs = [330, 339, 390, 2444, 3033, 3035, 3116, 6178, 6398, 6426, 6852, 6854, 7440];

// Sort descending so joining doesn't mess up earlier indices
errs.sort((a,b) => b - a);

for (let e of errs) {
    let idx = e - 1;
    lines[idx] = lines[idx] + "\\n" + lines[idx + 1];
    lines.splice(idx + 1, 1);
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
