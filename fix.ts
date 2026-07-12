import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetLine = "  const [agentQuotes, setAgentQuotes] = useState<any[]>([]);\n";

if (code.includes(targetLine)) {
  code = code.replace(targetLine, "");
  
  const insertAfter = "  const [teamOrders, setTeamOrders] = useState<any[]>([]);\n";
  code = code.replace(insertAfter, insertAfter + targetLine);
  
  fs.writeFileSync('src/App.tsx', code);
  console.log('Fixed!');
} else {
  console.log('Target line not found');
}
