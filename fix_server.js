import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

serverCode = serverCode.replace(
  'const PRODUCTS_GID = "1506812668";\n\nfunction isAllowedForGuest',
  'function isAllowedForGuest'
);

fs.writeFileSync('server.ts', serverCode);
