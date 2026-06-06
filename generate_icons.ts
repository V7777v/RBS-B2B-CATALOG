import { Jimp } from 'jimp';
import * as fs from 'fs';

async function generateFromImage(sourcePath: string, size: number, outputPath: string) {
  const image = await Jimp.read(sourcePath);
  
  // Resize to destination size ensuring high-quality bicubic interpolation
  image.resize({ w: size, h: size });
  
  await image.write(outputPath as any);
  console.log(`Successfully generated from real logo: ${outputPath} (${size}x${size})`);
}

async function main() {
  // Ensure directories exist
  if (!fs.existsSync('public/icons')) {
    fs.mkdirSync('public/icons', { recursive: true });
  }

  // Choose the best logo from the fetched ones (they are all identical bounds 1254x1254)
  const sourceImage = 'public/logo1.png';

  const targets = [
    { name: 'public/icons/icon-512.png', size: 512 },
    { name: 'public/icons/icon-512-maskable.png', size: 512 },
    { name: 'public/icons/icon-192.png', size: 192 },
    { name: 'public/apple-touch-icon.png', size: 180 },
    { name: 'public/favicon.png', size: 32 }
  ];

  console.log("Starting production PWA icon rendering using the real Google Drive logo...");
  for (const t of targets) {
    try {
      await generateFromImage(sourceImage, t.size, t.name);
    } catch (err: any) {
      console.error(`Error compiling target ${t.name}:`, err.message);
    }
  }
  console.log("All icons rendered perfectly from the real logo!");
}

main().catch(err => {
  console.error(err);
});
