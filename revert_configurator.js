import fs from 'fs';

let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// 1. Remove mobile tabs state
content = content.replace(/const \[mobileTab, setMobileTab\] = useState<'accessories' \| 'cabinet' \| 'summary'>\('accessories'\);/, "");

// 2. Fix the layout return block.
// I need to replace everything from `return (` to the end of the file.
