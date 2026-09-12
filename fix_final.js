import fs from 'fs';

let content = fs.readFileSync('api/advisor/chat.ts', 'utf-8');

content = content.replace(/quotaInfo: \{ current: currentUsage, limit: dailyLimit, debug: true \}/g, 'quotaInfo: { current: currentUsage, limit: dailyLimit }');

fs.writeFileSync('api/advisor/chat.ts', content);
