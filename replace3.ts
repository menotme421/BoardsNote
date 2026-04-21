import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/#2a2a2a/g, 'var(--border-primary)');

fs.writeFileSync('src/App.tsx', app);
