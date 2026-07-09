import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace("onClick={() => handleSendEmail()}", "onClick={() => handleSendEmailRequest()}");
content = content.replace("onClick={() => handleSendWhatsApp()}", "onClick={() => handleSendWhatsAppRequest()}");

fs.writeFileSync('src/App.tsx', content);
