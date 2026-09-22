import fs from 'fs';
const ids = ['1bYu1HOoH9IzcCRruDwKXWN2wV_Z0B2Ge', '1IY-JR9yklU1DgM75tMiQJkg-nztA5p_K', '1Q4E-iDnmqTnh66DoKqjCBVaedEudVcsY', '1xvImJlgaHeLOwZgNRxGBBT8F6rBEve2F'];
async function run() {
  for (let i=0; i<ids.length; i++) {
    const url = `https://drive.google.com/uc?export=download&id=${ids[i]}&confirm=t`;
    const res = await fetch(url);
    const text = await res.arrayBuffer();
    console.log(`Image ${i+1}: ${text.byteLength} bytes`);
    fs.writeFileSync(`public/logo${i+1}.png`, Buffer.from(text));
  }
}
run();
