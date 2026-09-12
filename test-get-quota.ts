import { getGoogleToken } from "./api/_lib/googleSheets.js";

async function run() {
  const saTok = await getGoogleToken("test");
  const todayStr = new Date().toISOString().slice(0, 10);
  const url = `https://firestore.googleapis.com/v1/projects/rbs-b2b/databases/(default)/documents/quotas/guest_test-guest-1_${todayStr}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${saTok}` } });
  console.log("GET status:", res.status);
  console.log("GET data:", await res.text());
}
run().catch(console.error);
