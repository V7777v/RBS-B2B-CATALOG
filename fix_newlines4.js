import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

const errors = [
  330, 331, 339, 340, 390, 391, // regexes
  2444, 2445, // detailsText
  3033, 3034, 3035, 3036, // detailsText
  3116, 3117, // join
  6178, 6179, // join
  6398, 6399, // join
  6426, 6427, // join
  6852, 6853, 6854, 6855, // detailsText
  7440, 7441 // join
];

for (let i of errors.sort((a,b)=>b-a)) {
    // we want to merge lines[i-1] with the next lines if they are broken.
    // Actually, a simpler way is to just join the specific known lines!
}
