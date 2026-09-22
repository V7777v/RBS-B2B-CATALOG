import { Jimp } from 'jimp';

async function run() {
  for (let i = 1; i <= 4; i++) {
    try {
      const img = await Jimp.read(`public/logo${i}.png`);
      console.log(`logo${i}.png: ${img.width}x${img.height}`);
    } catch (e) {
       console.log(`logo${i}.png failed`);
    }
  }
}
run();
