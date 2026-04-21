import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/bg-\[#0c0c0c\]/g, 'bg-[var(--bg-primary)]');
app = app.replace(/bg-\[#141414\]/g, 'bg-[var(--bg-secondary)]');
app = app.replace(/bg-\[#1c1c1c\]/g, 'bg-[var(--bg-tertiary)]');
app = app.replace(/bg-\[#2a2a2a\]/g, 'bg-[var(--border-primary)]');
app = app.replace(/border-\[#2a2a2a\]/g, 'border-[var(--border-primary)]');
app = app.replace(/text-\[#e8e8e8\]/g, 'text-[var(--text-primary)]');
app = app.replace(/text-\[#888\]/g, 'text-[var(--text-secondary)]');
app = app.replace(/hover:bg-\[#1c1c1c\]/g, 'hover:bg-[var(--bg-tertiary)]');
app = app.replace(/hover:bg-\[#2a2a2a\]/g, 'hover:bg-[var(--border-primary)]');
app = app.replace(/hover:bg-\[#444\]/g, 'hover:bg-[var(--border-secondary)]');
app = app.replace(/hover:text-\[#e8e8e8\]/g, 'hover:text-[var(--text-primary)]');
app = app.replace(/border-\[#888\]/g, 'border-[var(--text-secondary)]');

app = app.replace(/'#1c1c1c'/g, "'var(--bg-tertiary)'");
app = app.replace(/'#141414'/g, "'var(--bg-secondary)'");
app = app.replace(/'#0c0c0c'/g, "'var(--bg-primary)'");
app = app.replace(/'#2a2a2a'/g, "'var(--border-primary)'");
app = app.replace(/'#444'/g, "'var(--border-secondary)'");
app = app.replace(/'#e8e8e8'/g, "'var(--text-primary)'");
app = app.replace(/'#888'/g, "'var(--text-secondary)'");
app = app.replace(/'#555'/g, "'var(--text-secondary)'");

fs.writeFileSync('src/App.tsx', app);
