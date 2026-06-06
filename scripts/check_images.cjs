const https = require('https');

function downloadAndMeasure(id) {
  return new Promise((resolve, reject) => {
    const url = `https://drive.google.com/uc?export=download&id=${id}`;
    
    function fetch(u) {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let loc = res.headers.location;
            if(!loc.startsWith('http')) loc = 'https://drive.google.com' + loc;
            return fetch(loc);
        }
        let data = [];
        res.on('data', chunk => {
          data.push(chunk);
          let buf = Buffer.concat(data);
          if (buf.length >= 24) {
             // check format
             if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
                const width = buf.readUInt32BE(16);
                const height = buf.readUInt32BE(20);
                res.destroy();
                resolve({width, height});
             }
          }
          if (buf.length > 5000) {
             res.destroy();
             resolve({error: 'could not figure out from first 5kb'});
          }
        });
      }).on('error', reject);
    }
    fetch(url);
  });
}

async function run() {
  const ids = ['1bYu1HOoH9IzcCRruDwKXWN2wV_Z0B2Ge', '1IY-JR9yklU1DgM75tMiQJkg-nztA5p_K', '1Q4E-iDnmqTnh66DoKqjCBVaedEudVcsY', '1xvImJlgaHeLOwZgNRxGBBT8F6rBEve2F'];
  for (let i = 0; i < ids.length; i++) {
    try {
      const size = await downloadAndMeasure(ids[i]);
      if (size.width) {
        console.log(`Image ${i+1}: ${size.width}x${size.height}`);
      } else {
        console.log(`Image ${i+1}: unknown`);
      }
    } catch(e) {
      console.log(`Image ${i+1}: error`);
    }
  }
}
run();
