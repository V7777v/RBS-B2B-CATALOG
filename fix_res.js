import fs from 'fs';

let content = fs.readFileSync('api/advisor/chat.ts', 'utf-8');

content = content.replace(/res\.json\(\{\n\s*type: "ai_response",\n\s*text: textOutput,\n\s*sources: webSources,\n\s*quotaInfo: \{ current: currentUsage, limit: dailyLimit \}\n\s*\}\);/g, 
`res.json({
      type: "ai_response",
      text: textOutput,
      sources: webSources,
      quotaInfo: { current: currentUsage, limit: dailyLimit, debug: true }
    });`);

fs.writeFileSync('api/advisor/chat.ts', content);
