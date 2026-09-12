import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const duplicateStr = `<div className="bg-white rounded-2xl p-6 sm:p-8 max-w-[560px] w-full text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-[560px] w-full text-center shadow-2xl relative">`;

content = content.replace(duplicateStr, `<div className="bg-white rounded-2xl p-6 sm:p-8 max-w-[560px] w-full text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>`);

fs.writeFileSync('src/App.tsx', content);
