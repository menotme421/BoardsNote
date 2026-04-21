import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/fill="#555"/g, 'fill="var(--text-secondary)"');
app = app.replace(/stroke="#555"/g, 'stroke="var(--text-secondary)"');
app = app.replace(/stroke="#e8e8e8"/g, 'stroke="var(--text-primary)"');
app = app.replace(/bg-\[#e8e8e8\]/g, 'bg-[var(--text-primary)]');
app = app.replace(/text-\[#0c0c0c\]/g, 'text-[var(--bg-primary)]');
app = app.replace(/focus:border-\[#444\]/g, 'focus:border-[var(--border-secondary)]');

fs.writeFileSync('src/App.tsx', app);
