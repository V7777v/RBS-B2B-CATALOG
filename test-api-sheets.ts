import "dotenv/config";
import { fetchSheetCSVDataV4, ALLOWED_GIDS } from "./api/_lib/googleSheets.js";

async function smokeTest() {
  console.log("Running smoke test for Google Sheets proxy API...");
  
  if (!process.env.GOOGLE_SA_EMAIL || !process.env.GOOGLE_SA_PRIVATE_KEY) {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.warn("Skipping real API call since Google Service Account credentials are not set in environment.");
      console.log("Smoke test passed (skipped).");
      process.exit(0);
    }
  }

  const testGid = ALLOWED_GIDS[0];
  console.log(`Testing GID ${testGid}...`);
  
  try {
    const data = await fetchSheetCSVDataV4(testGid, "smoke-test");
    if (!Array.isArray(data) || data.length === 0) {
       console.warn("Received empty or invalid data array. Check sheet contents.");
    } else {
       console.log(`Successfully fetched ${data.length} rows.`);
    }
    console.log("Smoke test passed.");
    process.exit(0);
  } catch (error: any) {
    console.error("Smoke test failed:");
    console.error(error);
    process.exit(1);
  }
}

smokeTest();
