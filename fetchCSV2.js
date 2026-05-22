import Papa from 'papaparse';

async function run() {
  try {
    const gids = ['0', '1506812668', '1781083359', '1626175369', '1236512478', '143181465'];
    for (const gid of gids) {
      console.log(`--- GID ${gid} ---`);
      const response = await fetch(`https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs/gviz/tq?tqx=out:csv&gid=${gid}&_=${Date.now()}`);
      const text = await response.text();
      console.log(text.split('\n').slice(0, 3).join('\n'));
    }
  } catch(e) {
    console.error(e);
  }
}
run();
