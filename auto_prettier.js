import fs from 'fs';
import { execSync } from 'child_process';

let maxIterations = 50;
let it = 0;

while (it < maxIterations) {
  it++;
  try {
    execSync('npx prettier --write src/App.tsx', { stdio: 'pipe' });
    console.log('Prettier passed!');
    break;
  } catch (err) {
    const output = err.stderr.toString() || err.stdout.toString();
    const match = output.match(/SyntaxError: Invalid character\. \((\d+):(\d+)\)/);
    if (match) {
      const line = parseInt(match[1]);
      const col = parseInt(match[2]);
      console.log(`Fixing error at line ${line}, col ${col}`);
      
      let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
      let target = lines[line - 1];
      
      // We expect the invalid character to be '\' followed by 'n'.
      // Let's check if there is a '\n' near that column.
      const searchStr = '\\n';
      // Just replace the first occurrence of '\\n' on that line!
      if (target.includes(searchStr)) {
          lines[line - 1] = target.replace(searchStr, '\n');
          fs.writeFileSync('src/App.tsx', lines.join('\n'));
      } else {
          console.log("Could not find \\n on line " + line);
          console.log("Line:", target);
          break;
      }
    } else {
      console.log("Unknown prettier error:", output);
      break;
    }
  }
}
