import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `              <div
                className="overflow-auto flex-grow"
                style={{ WebkitOverflowScrolling: "touch" }}
              >`;

const replacement = `              <div
                className="overflow-auto flex-grow"
                style={{ WebkitOverflowScrolling: "touch", paddingBottom: "env(safe-area-inset-bottom)" }}
              >`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
