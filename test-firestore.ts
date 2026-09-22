import { getGoogleToken } from "./api/_lib/googleSheets.js";

async function run() {
  const saTok = await getGoogleToken("test");
  const url = `https://firestore.googleapis.com/v1/projects/rbs-b2b/databases/(default)/documents/quotas/test_quota_123`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${saTok}` } });
  console.log("GET status:", res.status);
  
  if (res.status === 404) {
    const postUrl = `https://firestore.googleapis.com/v1/projects/rbs-b2b/databases/(default)/documents/quotas?documentId=test_quota_123`;
    const postRes = await fetch(postUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${saTok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { count: { integerValue: "1" } } })
    });
    console.log("POST status:", postRes.status);
    const postData = await postRes.text();
    console.log("POST data:", postData);
  }
}
run().catch(console.error);
