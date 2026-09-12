import { getGoogleToken } from "./api/_lib/googleSheets.js";

async function run() {
  const saTok = await getGoogleToken("test");
  const patchUrl = `https://firestore.googleapis.com/v1/projects/rbs-b2b/databases/(default)/documents/quotas/test_quota_456?updateMask.fieldPaths=count`;
  const patchRes = await fetch(patchUrl, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${saTok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { count: { integerValue: "1" } } })
  });
  console.log("PATCH status:", patchRes.status);
  console.log("PATCH data:", await patchRes.text());
}
run().catch(console.error);
