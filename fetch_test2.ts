import fs from 'fs';
const id = '1bYu1HOoH9IzcCRruDwKXWN2wV_Z0B2Ge';
async function run() {
  const url = `https://drive.google.com/uc?export=download&id=${id}&confirm=t`;
  const res = await fetch(url);
  console.log(res.status, res.headers.get('content-type'));
  const buf = Math.floor(parseInt(res.headers.get('content-length') || '0'));
  console.log('size:', buf);
  const text = await res.arrayBuffer();
  console.log('bytes:', text.byteLength);
  const head = Buffer.from(text.slice(0, 50));
  console.log('head:', head.toString('ascii'));
  fs.writeFileSync('test1.jpg', Buffer.from(text));
}
run().catch(console.error);
