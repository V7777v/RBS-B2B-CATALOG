import fs from 'fs';

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Find the start of app.post("/api/advisor/chat"
const startIndex = serverCode.indexOf('app.post("/api/advisor/chat"');
if (startIndex !== -1) {
    // Find the matching closing bracket
    let openBrackets = 0;
    let endIndex = startIndex;
    let started = false;
    for (let i = startIndex; i < serverCode.length; i++) {
        if (serverCode[i] === '{') {
            openBrackets++;
            started = true;
        } else if (serverCode[i] === '}') {
            openBrackets--;
        }
        if (started && openBrackets === 0) {
            endIndex = i;
            break;
        }
    }
    
    // We also need to get rid of the end parenthesis and semicolon );
    endIndex = serverCode.indexOf(');', endIndex) + 2;

    const oldRoute = serverCode.substring(startIndex, endIndex);

    const newRoute = `import advisorHandler from "./api/advisor/chat.js";

// API endpoint to serve chat requests safely
app.post("/api/advisor/chat", async (req, res) => {
  // Mock Vercel environment for local Express
  req.query = req.query || {};
  await advisorHandler(req as any, res as any);
});`;

    serverCode = serverCode.replace(oldRoute, newRoute);
    fs.writeFileSync('server.ts', serverCode);
    console.log("Replaced route");
} else {
    console.log("Could not find route");
}
