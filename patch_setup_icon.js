import fs from 'fs';

let content = fs.readFileSync('scripts/setup_icon.ts', 'utf-8');
const fetchBlock = `    const buffer = await fetchImage(GOOGLE_DRIVE_ID);`;
const replaceBlock = `    const buffer = await fetchImage(GOOGLE_DRIVE_ID);
    
    // Fetch new logo
    const newLogoBuffer = await fetchImage('1zLQmLHHe7x2ZzGv9dYPayNUMnIGDEQli');
    fs.writeFileSync(path.join(pubDir, 'new-logo.png'), newLogoBuffer);
    console.log("Downloaded new-logo.png for Vercel");
`;

if (content.includes(fetchBlock)) {
  content = content.replace(fetchBlock, replaceBlock);
  fs.writeFileSync('scripts/setup_icon.ts', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find block");
}
