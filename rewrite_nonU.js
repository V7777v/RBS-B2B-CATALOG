import fs from 'fs';
let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// I also need to make sure nonUAccessories are properly defined and returned!
// Oh wait, in my earlier regex cleanup I removed nonUAccessories completely from useMemo!
// Let's add them back to useMemo so the rest of the file can use them!

const badMemo = `    // 2. Optional accessories added by user (Contiguous allocation)
    const optionalItemsAssignment: { uIndex: number; name: string; description: string; accessoryRef: any; optionalIdx: number; isAnchor: boolean; spanU: number; error?: string }[] = [];
    selectedOptionals.forEach((opt: any, optIdx: number) => {
      if (opt.uSize === 0) return;`;

const fixMemo = `    // 2. Optional accessories added by user (Contiguous allocation)
    const optionalItemsAssignment: { uIndex: number; name: string; description: string; accessoryRef: any; optionalIdx: number; isAnchor: boolean; spanU: number; error?: string }[] = [];
    const nonUAccessories: { name: string; quantity: number; description: string; accessoryRef: any; optionalIdx: number; zone: 'roof' | 'plinth' | 'rear' }[] = [];
    
    selectedOptionals.forEach((opt: any, optIdx: number) => {
      if (opt.uSize === 0) {
        nonUAccessories.push({
          name: opt.pn,
          quantity: opt.quantity || 1,
          description: opt.name || opt.description || '',
          accessoryRef: opt,
          optionalIdx: optIdx,
          zone: getPhysicalZone(opt.pn, opt.name || opt.description || ''),
        });
        return;
      }`;

content = content.replace(badMemo, fixMemo);
fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
