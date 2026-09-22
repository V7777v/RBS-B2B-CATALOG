import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs';
const PRODUCTS_GID = '1506812668';

async function test() {
  const url = `${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${PRODUCTS_GID}`;
  const start = Date.now();
  const resp = await fetch(url);
  const text = await resp.text();
  const elapsed = Date.now() - start;
  console.log(`Fetch took ${elapsed}ms, text length = ${text.length} characters`);
  
  Papa.parse(text, {
    header: true,
    complete: (results) => {
      console.log("Total parsed rows:", results.data.length);
    }
  });
}

test().catch(console.error);
