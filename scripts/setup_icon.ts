import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

const GOOGLE_DRIVE_ID = '1bYu1HOoH9IzcCRruDwKXWN2wV_Z0B2Ge';

async function fetchImage(id: string): Promise<Buffer> {
  const url = `https://drive.google.com/uc?export=download&id=${id}&confirm=t`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function resizeAndSave(image: any, size: number, outputPath: string) {
  // Clone image so we don't modify the original during resize
  const clone = image.clone();
  clone.resize({ w: size, h: size });
  await clone.write(outputPath as any);
  console.log(`Generated ${outputPath} (${size}x${size})`);
}

async function generateOgImage(logoImage: any, outputPath: string) {
  const size = 256;
  const bg = new Jimp({ width: size, height: size, color: 0xffffffff });

  const logoClone = logoImage.clone();
  const logoWidth = 200;
  const logoHeight = Math.round((logoClone.bitmap.height / logoClone.bitmap.width) * logoWidth);
  logoClone.resize({ w: logoWidth, h: logoHeight });

  const logoX = Math.round((size - logoWidth) / 2);
  const logoY = Math.round((size - logoHeight) / 2);
  bg.composite(logoClone, logoX, logoY);

  await bg.write(outputPath as any);
  console.log(`Generated ${outputPath} (${size}x${size})`);
}

async function main() {
  console.log("Fetching source logo from Google Drive...");
  try {
    const pubDir = path.join(process.cwd(), 'public');
    const iconsDir = path.join(pubDir, 'icons');
    
    if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

    const buffer = await fetchImage(GOOGLE_DRIVE_ID);
    
    // Fetch new logo
    const newLogoBuffer = await fetchImage('1zLQmLHHe7x2ZzGv9dYPayNUMnIGDEQli');
    fs.writeFileSync(path.join(pubDir, 'new-logo.png'), newLogoBuffer);
    console.log("Downloaded new-logo.png for Vercel");

    // Fetch advisor avatar
    try {
      const avatarBuffer = await fetchImage('1ivu4rHgeaH6iiodL2WkA6i_6XS_gmmG_');
      const avatarImg = await Jimp.read(avatarBuffer);
      avatarImg.resize({ w: 112, h: 112 });
      await avatarImg.write(path.join(pubDir, 'advisor-avatar.png') as any);
      console.log("Downloaded and generated advisor-avatar.png (112x112)");
    } catch (e) {
      console.warn("Could not download advisor avatar in setup_icon:", e);
    }

    console.log(`Downloaded image of size ${buffer.byteLength} bytes.`);
    
    // Save original if needed
    fs.writeFileSync(path.join(pubDir, 'logo.png'), buffer);
    
    console.log("Generating PWA icons...");
    const image = await Jimp.read(buffer);

    const targets = [
      { name: 'icons/icon-512.png', size: 512 },
      { name: 'icons/icon-512-maskable.png', size: 512 },
      { name: 'icons/icon-192.png', size: 192 },
      { name: 'rbs-touch-icon.png', size: 180 },
      { name: 'rbs-icon-180.png', size: 180 },
      { name: 'rbs-icon-192.png', size: 192 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'apple-touch-icon-precomposed.png', size: 180 },
      { name: 'apple-touch-icon-180x180.png', size: 180 },
      { name: 'apple-touch-icon-180x180-precomposed.png', size: 180 },
      { name: 'apple-touch-icon-152x152.png', size: 152 },
      { name: 'apple-touch-icon-120x120.png', size: 120 },
      { name: 'favicon.png', size: 32 }
    ];

    for (const target of targets) {
      await resizeAndSave(image, target.size, path.join(pubDir, target.name));
    }

    console.log("Generating OG image (public/og-image.png)...");
    await generateOgImage(image, path.join(pubDir, 'og-image.png'));

    console.log("Successfully generated all icons and OG image for Vercel build.");
  } catch (error) {
    console.warn("⚠️ Warning: Failed to fetch/generate latest icons from Google Drive during prebuild. Using fallback or existing assets. Error:", error);
    // Let the build proceed smoothly instead of failing the entire deployment.
  }
}

main();
