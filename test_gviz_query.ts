import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs';
const PRODUCTS_GID = '1506812668'; // products gid

async function test() {
  const url = `${SHEET_URL}/gviz/tq?tqx=out:csv&gid=${PRODUCTS_GID}&tq=${encodeURIComponent('SELECT * LIMIT 5 OFFSET 0')}`;
  
  // Use fetch and Papa to parse
  const resp = await fetch(url);
  const text = await resp.text();
  console.log("Raw Response start (first 200 chars):");
  console.log(text.substring(0, 200));

  Papa.parse(text, {
    header: true,
    complete: (results) => {
      console.log("Parsed rows count:", results.data.length);
      console.log("First row keys:", Object.keys(results.data[0]));
      console.log("First row:", results.data[0]);
    }
  });
}

test().catch(console.error);
