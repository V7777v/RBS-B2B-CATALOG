const fs = require('fs');
const content = fs.readFileSync('vercel.json', 'utf8');

const target = "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-src 'self' https: data: blob:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'self'";

const replacement = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.gstatic.com https://www.google.com https://*.firebaseapp.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://www.google.com https://api.emailjs.com https://data.gov.il https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com wss://*.firebaseio.com; frame-src 'self' data: blob: https://*.firebaseapp.com https://www.google.com https://accounts.google.com https://apis.google.com https://www.youtube.com https://drive.google.com https://docs.google.com https://*.hikvision.com https://polman-audio.com https://teltonika-networks.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

if (content.includes(target)) {
    const newContent = content.replace(target, replacement);
    fs.writeFileSync('vercel.json', newContent, 'utf8');
    console.log("Successfully replaced the CSP.");
} else {
    console.log("Target string not found in vercel.json!");
}
