import fs from 'fs';
let content = fs.readFileSync('src/AppErrorBoundary.tsx', 'utf-8');
content = content.replace(
  '<p style={{ fontSize: \'15px\', color: \'#5b6675\', lineHeight: 1.6, margin: \'0 0 22px\' }}>',
  '<p style={{ fontSize: \'15px\', color: \'#5b6675\', lineHeight: 1.6, margin: \'0 0 22px\' }}>{this.state.message}<br/>'
);
fs.writeFileSync('src/AppErrorBoundary.tsx', content);
