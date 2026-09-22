import https from 'https';
const ids = ['1bYu1HOoH9IzcCRruDwKXWN2wV_Z0B2Ge', '1IY-JR9yklU1DgM75tMiQJkg-nztA5p_K', '1Q4E-iDnmqTnh66DoKqjCBVaedEudVcsY', '1xvImJlgaHeLOwZgNRxGBBT8F6rBEve2F'];
function download(id: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let url = 'https://drive.google.com/uc?export=download&id=' + id;
    function fetchURL(u: string) {
       https.get(u, res => {
          if(res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
             let loc = res.headers.location;
             if(!loc.startsWith('http')) loc = 'https://drive.google.com' + loc;
             fetchURL(loc);
          } else {
             let data: Buffer[] = [];
             res.on('data', c => data.push(c));
             res.on('end', () => resolve(Buffer.concat(data)));
          }
       }).on('error', reject);
    }
    fetchURL(url);
  });
}
async function run() {
  for(let id of ids) {
    let buf = await download(id);
    console.log(id, buf.length, buf.slice(0, 10).toString('hex'));
  }
}
run();
