const fs = require('fs');
let text = fs.readFileSync('corrupted_lines.txt', 'utf8');
let lines = text.split('\n');
for (let i=0; i<lines.length; i++) {
  let line = lines[i];
  if (line.includes('setSelectedOptionals')) {
    // try to remove the setSelectedOptionals spam
    let cleaned = line.replace(/setSelectedOptionals\(prev => \[\.\.\.prev, \{ \.\.\.acc, quantity: 1, id: newInstId, instanceId: newInstId \}\]\);/g, '');
    console.log(`Line ${i}: length before ${line.length}, after ${cleaned.length}`);
    if (cleaned.length < 200) console.log(cleaned.trim());
  }
}
