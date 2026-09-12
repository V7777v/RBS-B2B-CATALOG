import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `      if (hasPromos && !hasSeen) {
        const timer = setTimeout(() => {
          setShowPromoBanner(true);
        }, 1200); // 1.2s delay for a highly native & elegant pop-in effect
        return () => clearTimeout(timer);
      }`;

const newStr = `      if (hasPromos && !hasSeen) {
        // Hot Sale popup disabled for now
        // const timer = setTimeout(() => {
        //   setShowPromoBanner(true);
        // }, 1200);
        // return () => clearTimeout(timer);
      }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/App.tsx', content);
