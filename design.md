# BoardsNote — Design System v2.0

A refined design system for a notes and canvas application.

---

## Foundations

### 1. Colors

#### Unified Neutral Ramp

All neutral colors (backgrounds, surfaces, text, borders) now derive from a **single warm hue: H=42**. Previously, "legacy" tokens (`--bg-primary`, `--text-primary`, `--border-primary`, etc.) used pure gray (S=0%, H=0) while newer `--color-*` tokens used a warm tint (H≈42-45, S>0) — two systems that drifted apart. Collapsing onto one hue removes that mismatch; the visual shift is imperceptible (≤2% lightness difference at any stop) but the system is now one ramp, not two.

**Ramp definition**: `hsl(42, S%, L%)` — only S and L vary per token.

| Token | Light `hsl(42, S, L)` | Dark `hsl(42, S, L)` | Usage |
|-------|------------------------|------------------------|-------|
| `--color-page-bg` | `42 15% 89%` (#e7e5df) | `42 8% 5%` (#0e0d0c) | Page background |
| `--color-shell-bg` | `42 15% 89%` (#e7e5df) | `42 6% 10%` (#1b1a18) | Inset app shell |
| ~~`--color-sidebar-bg`~~ | — | — | Removed — merged into `--color-page-bg` |
| `--color-editor-bg` | `42 0% 100%` (#ffffff) | `42 11% 7%` (#141310) | Main editor/content area |
| `--color-bg-primary` | `42 0% 100%` (#ffffff) | `42 0% 5%` (#0d0d0d) | Primary surfaces |
| `--color-bg-secondary` | `42 8% 96%` (#f6f5f4) | `42 0% 8%` (#141414) | Secondary surfaces |
| `--color-bg-tertiary` | `42 8% 91%` (#eae9e6) | `42 0% 11%` (#1c1c1c) | Tertiary/hover surfaces |
| `--color-surface-hover` | `42 15% 85%` (#dedbd3) | `42 6% 13%` (#23221f) | Hover states |
| `--color-text-primary` | `42 5% 16%` (#2b2a27) | `42 7% 77%` (#c8c6c0) | Headings, body text |
| `--color-text-secondary` | `42 5% 40%` (#6b6962) | `42 2% 53%` (#888481) | Secondary text (was `--text-secondary`) |
| `--color-text-muted` | `42 5% 65%` (#aaa8a1) | `42 2% 35%` (#5b5a57) | Tertiary text, labels |
| `--color-border` | `42 12% 81%` (#d4d1c9) | `42 4% 16%` (#2a2927) | Primary borders |
| `--color-border-secondary` | `42 6% 73%` (#bebcb6) | `42 0% 27%` (#454545) | Secondary borders |

**Migration note**: `--bg-primary` → `--color-bg-primary`, `--bg-secondary` → `--color-bg-secondary`, `--bg-tertiary` → `--color-bg-tertiary`, `--text-primary` → `--color-text-primary`, `--text-secondary` → `--color-text-secondary`, `--border-primary` → `--color-border`. All legacy aliases removed — one token per role, one ramp.

#### Brand & Accent

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-accent` | `#ff6127` | `#ff6127` | Primary accent — CTAs and destructive confirm only (not selection state) |
| `--color-accent-dark` | `#cc4d1f` | `#cc4d1f` | Hover states, emphasis |
| `--brand` | `#ff6127` | `#ff6127` | Brand color — CTAs, primary actions only |
| `--brand-subtle` | `rgba(255,97,39,0.08)` | `rgba(255,97,39,0.12)` | Subtle brand backgrounds (button hover, not selection) |

#### Content-Type Colors

System color now encodes *what something is*, not just that it's selected. Notes and Canvas each get a dedicated hue, used for active mode tabs, active/selected files in the sidebar, and content-type markers.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-note` | `#378ADD` | `#85B7EB` | Notes mode tab (active), active note file, note-type dot marker |
| `--color-note-tint` | `#EBF3FE` | `#0C3A6C` | Selected note background |
| `--color-canvas` | `#1D9E75` | `#5DCAA5` | Canvas mode tab (active), active canvas board, canvas-type dot marker |
| `--color-canvas-tint` | `#EBF7F3` | `#063428` | Selected canvas background |

#### Sync Status Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-sync-ok` | `#639922` | `#97C459` | Sync idle / synced |
| `--color-sync-busy` | `#BA7517` | `#EF9F27` | Sync in progress |
| `--color-sync-error` | `#E24B4A` | `#F09595` | Sync failure, error states |

#### Border Colors

Border colors are now part of the Unified Neutral Ramp above (`--color-border`, `--color-border-secondary`). `--border-primary` and `--border-secondary` are removed — see migration note.

#### Context Colors
Tag colors are auto-generated from a palette of 14 colors (red, orange, amber, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose) at 10% opacity background with matching text.

---

### 2. Typography

#### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-sans` | Inter | Default UI, body text |
| `--font-inter` | Inter | Interface text |

#### Type Scales

| Context | Scale | Usage |
|---------|-------|-------|
| Interface (Sidebar, Header) | 1.125 — Major Second | Navigation, buttons, labels |
| Notes | 1.200 — Minor Third | Note content, documents |
| Canvas | 1.250 — Major Third | Canvas elements, diagrams |

#### Typography Tokens

| Token | Value |
|-------|-------|
| `--font-base` | 14px |
| Base line-height | 1.8 |
| `--icon-size` | 16px |
| `--stroke-width` | 1.5px |

#### Heading Scale (Notes)
- H1: `calc(14px * 1.2 * 1.2 * 1.2)` = 24.2px
- H2: `calc(14px * 1.2 * 1.2)` = 20.2px  
- H3: `calc(14px * 1.2)` = 16.8px

---

### 3. Spacing

#### Base Unit
- **Base spacing unit**: 8px (0.5rem)
- **Gap size**: `var(--gap-size)` = 0.5rem (8px)

#### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--gap-size` | 0.5rem (8px) | Standard gaps |
| Sidebar padding | 0.5rem (8px) | Internal sidebar spacing |
| Content padding | 24px | Main content area padding |
| Section gaps | 1rem (16px) | Major section separations |
| Item padding | 0.375rem 0.5rem (6px 8px) | List items, buttons |

#### Layout Grid
- **Inset shell gap**: 6px (0.375rem) — gap around entire app
- **Sidebar width**: 220px fixed (240px on tablet `md:`)
- **Resizer width**: 8px (sidebar toggle area)
- **Max content width**: 4xl (max-w-4xl) for notes

---

### 4. Border Radius / Shape

#### Radius Philosophy
**Tiny radius (4px) universally** — sharp but not harsh

| Token | Value | Override Behavior |
|-------|-------|-------------------|
| `--radius-tiny` | 4px | Base radius token |
| `--radius-sm` | var(--radius-tiny) | 4px |
| `--radius-md` | var(--radius-tiny) | 4px |
| `--radius-lg` | var(--radius-tiny) | 4px |
| `--radius-xl` | var(--radius-tiny) | 4px |
| `--radius-2xl` | var(--radius-tiny) | 4px |
| `--radius-3xl` | var(--radius-tiny) | 4px |

#### Shape Exceptions
- **Canvas toolbar**: 16px radius (floating pill shape)
- **Sticky notes**: 2px 12px 12px 2px (asymmetric curl effect)
- **Color swatches**: 50% (circular)
- **Toggle switches**: 100px (fully rounded)
- **Avatar/info button**: rounded-full (circular)

---

### 5. Elevation / Shadows

#### Philosophy
**Borders over Shadows** — 1px borders as primary separator, minimal shadow usage

#### Shadow Values

| Element | Shadow Value |
|---------|--------------|
| Canvas toolbar | `0 12px 40px rgba(0, 0, 0, 0.08)` |
| Command palette | `shadow-2xl` (Tailwind) |
| Delete modal | `shadow-xl` (Tailwind) |
| Properties panel | `0 12px 40px rgba(0, 0, 0, 0.08)` |
| Bubble menu (editor) | `0 1px 4px rgba(0,0,0,0.08)` |
| Dropdown menus | `0 2px 8px rgba(0,0,0,0.10)` |
| Sticky note | `2px 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)` |

#### Elevation Hierarchy
1. **Base layer**: No shadow, borders only
2. **Floating elements**: Subtle shadow (8-12px blur)
3. **Modals/overlays**: Backdrop blur + higher shadow

---

## Components

### 1. Buttons

#### Variants

| Variant | Background | Border | Text | Usage |
|---------|------------|--------|------|-------|
| **Primary** | `var(--brand)` | `var(--brand)` | White | CTAs only (Create, Save, Connect) |
| **Secondary** | `var(--color-bg-secondary)` | `var(--color-border)` | `var(--color-text-primary)` | Secondary actions |
| **Ghost** | Transparent | Transparent | `var(--color-text-secondary)` | Icon buttons, subtle actions |
| **Outline** | Transparent | `var(--color-border)` | `var(--brand)` | Create buttons, emphasis |
| **Destructive** | `red-500` | `red-500` | White | Delete actions |
| **Active/Selected (Notes)** | `var(--color-note-tint)` | `var(--color-note)` | `var(--color-note)` | Selected note, active Notes tab |
| **Active/Selected (Canvas)** | `var(--color-canvas-tint)` | `var(--color-canvas)` | `var(--color-canvas)` | Selected canvas, active Canvas tab |

#### Button Sizes

| Size | Padding | Font Size | Usage |
|------|---------|-----------|-------|
| **Small** | p-1 (4px) | 12px | Icon buttons, compact |
| **Default** | px-3 py-1.5 | 13px | Standard buttons |
| **Toolbar Primary** | 40px × 40px | — | Canvas toolbar main |
| **Toolbar Secondary** | 32px × 32px | — | Canvas toolbar secondary |

#### Button States
- **Default**: Base styling
- **Hover**: `hover:bg-[var(--color-bg-tertiary)]`, `hover:text-[var(--color-text-primary)]`
- **Active/Pressed**: `transform: scale(0.95)`
- **Selected**: Content-type tint background and text (note blue or canvas teal, depending on context)
- **Disabled**: Reduced opacity (implied)

---

### 2. Cards / Containers

#### App Panel (Primary Container)
```
.app-panel {
  border-radius: var(--radius-tiny);  /* 4px */
  background: var(--color-editor-bg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}
```

#### Content Panel
- Padding: 24px
- Full height/width within app shell
- Smooth transition on sidebar collapse

#### Cards (Settings, Help Widget)
- Background: `var(--color-bg-secondary)`
- Border: 1px solid `var(--color-border)`
- Border radius: 4px (default) or 12px (modal-like)
- Shadow: Context-dependent (none to xl)

---

### 3. Inputs / Forms

#### Text Inputs

| Element | Background | Border | Radius | Height |
|---------|------------|--------|--------|--------|
| Search bar | `var(--color-bg-primary)` | `var(--color-border)` | 4px | 36px (h-9) |
| Title input | Transparent | None | 0 | Auto |
| Inline edit | Transparent | Bottom only | 0 | Auto |
| Tag input | `var(--color-bg-primary)` | `var(--color-border)` | 4px | Auto |
| Settings inputs | — | — | — | — |

#### Input States
- **Default**: Border `var(--color-border)`
- **Hover**: Border `var(--color-border-secondary)`
- **Focus**: Outline none, border `var(--color-text-primary)`
- **Placeholder**: `var(--color-text-secondary)`

#### Select/Checkbox
- **Toggle switches**: 28px × 16px, pill-shaped
  - Unchecked: `var(--color-bg-tertiary)` background
  - Checked: `var(--color-text-primary)` background
  - Knob: 10px circle, slides 12px

---

### 4. Navigation

#### Mode Tabs (Notes/Canvas)
- Layout: Flex, 2 buttons, equal width
- Padding: py-1.5 (6px vertical)
- Active (Notes): `var(--color-note-tint)` background, `var(--color-note)` text
- Active (Canvas): `var(--color-canvas-tint)` background, `var(--color-canvas)` text
- Inactive: Transparent, muted text

#### Sidebar
- Width: 220px fixed (240px on tablet `md:`)
- Sections: Mode tabs → Search → File list → Footer
- File items: px-2 py-1.5, hover `var(--color-bg-tertiary)`
- Each file item shows a small dot marker: `var(--color-note)` for notes, `var(--color-canvas)` for canvas boards
- Active note file: `var(--color-note-tint)` background, `var(--color-note)` text
- Active canvas file: `var(--color-canvas-tint)` background, `var(--color-canvas)` text
- Collapsed: 0px width with 8px resizer handle
- Footer sync status indicator: dot + label using `var(--color-sync-ok)` (synced), `var(--color-sync-busy)` (syncing), or `var(--color-sync-error)` (error)

#### Canvas Toolbar
- Position: Fixed bottom-center
- Shape: Pill (border-radius: 16px)
- Padding: 0.5rem
- Shadow: `0 12px 40px rgba(0, 0, 0, 0.08)`
- Groups: Divided by 1px `var(--color-border)` lines

---

### 5. Modals / Overlays

#### Command Palette
- Position: Fixed, top 15vh
- Width: max-w-2xl
- Background: `var(--color-bg-secondary)`
- Border-radius: 12px
- Shadow: shadow-2xl
- Backdrop: `bg-black/50 backdrop-blur-sm`

#### Delete Confirmation
- Width: 320px (w-80)
- Background: `var(--color-bg-secondary)`
- Border: `var(--color-border)`
- Border-radius: 8px

#### Dropdown Menus (File Menu)
- Width: 144px (w-36)
- Background: `var(--color-bg-secondary)`
- Border-radius: 8px
- Position: Fixed, calculated to stay in viewport

#### Help Widget
- Position: Fixed bottom-right
- Trigger: 32px circular button
- Panel: 260px width, max-h-[400px]

---

### 6. Data Display

#### Lists (File List)
- Item padding: px-2 py-1.5
- Gap between items: Implicit (compact)
- Section headers: 11px uppercase, letter-spacing 0.03em
- Empty state: Italic, muted text

#### Tables (Editor)
- Border-collapse: collapse
- Cell padding: 0.4em 0.6em
- Header background: rgba(128,128,128,0.1)
- Alternating rows: rgba(128,128,128,0.05)
- Border: 1px solid currentColor (inherited)

#### Badges / Tags
- Font size: 10px
- Padding: px-1.5 py-0.5
- Border: 1px solid (color-matched)
- Border-radius: 4px
- Background: Color at 10% opacity

#### Layers Panel
- Compact list with drag handles
- Icon + label layout
- Selected: `var(--color-canvas-tint)` background, `var(--color-canvas)` text

---

## Useful Category

### 1. Icons

#### Icon Set
- **Library**: Lucide React
- **Base size**: 16px (default), 14px (compact), 12px (small)

#### Icon Sizing

| Context | Size |
|---------|------|
| Standard UI | 16px |
| Sidebar/Lists | 14px |
| Compact/Inline | 12px |
| Toolbar | 16-20px |
| Editor bubble | 13px |

#### Stroke Width
- CSS variable: `--stroke-width: 1.5px`
- Applied globally via `svg.lucide` selector
- Consistent across all icon sizes

#### Icon Colors
| State | Color |
|-------|-------|
| Default | `var(--color-text-secondary)` |
| Hover | `var(--color-text-primary)` |
| Active/Selected | `var(--brand)` for CTA-context icons; `var(--color-note)` or `var(--color-canvas)` for content-type context |
| Disabled/Muted | `var(--text-muted)` |

---

### 2. Motion / Animation

#### Transitions

| Element | Duration | Easing |
|---------|----------|--------|
| Color/background | 0.15s ease | ease |
| Transform (buttons) | 0.15s ease | ease |
| Sidebar collapse | 0.3s ease-in-out | ease-in-out |
| Panel slides | 0.3s cubic-bezier(0.16, 1, 0.3, 1) | ease-out-expo |
| Color swatches | 0.2s cubic-bezier(0.4, 0, 0.2, 1) | material |
| Toggle switch | 0.2s cubic-bezier(0.4, 0, 0.2, 1) | material |

#### Micro-interactions
- **Button press**: `scale(0.95)`
- **Button hover (group)**: `scale(1.05)`
- **Color swatch hover**: `scale(1.1)`
- **Color swatch active**: `scale(0.9)`
- **Dropdown chevron**: `rotate-180` on open

#### Loading States

| Element | Animation |
|---------|-----------|
| Properties panel (right) | slideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) |
| Properties panel (left) | slideInFromLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) |
| Help widget | helpWidgetIn 150ms ease |
| Settings section | animate-in fade-in slide-in-from-bottom-2 duration-300 |

---

### 3. Responsive / Breakpoints

#### Applied Breakpoints

| Breakpoint | Tailwind | Usage |
|------------|----------|-------|
| sm | 640px | `sm:bottom-12`, `sm:flex-row`, `sm:grid-cols-2` |
| md | 768px | `md:p-12` (settings padding) |

#### Mobile Considerations
- **Canvas toolbar**: `touch-none` class for touch handling
- **Safe area**: `env(safe-area-inset-bottom)` for bottom positioning
- **Bottom padding**: `calc(max(24px, env(safe-area-inset-bottom)) + 12px)`

#### Layout Behavior
- Sidebar: Collapsible (not responsive breakpoint-based)
- Settings grid: 1 col mobile → 2 cols sm+
- Content max-width: max-w-4xl centered

---

### 4. Dark Mode

#### Theme Toggle
- Manual toggle in sidebar footer (Sun/Moon icons)
- Persisted to localStorage (`inkframe_theme`)
- Applied via `.dark` class on document root

#### Color Transformations

| Light | Dark | Notes |
|-------|------|-------|
| Warm paper (#e8e6e0) | Deep charcoal (#1c1b19) | Shell background |
| White (#ffffff) | Near-black (#141310) | Editor surface |
| Light gray (#f5f5f5) | Dark gray (#141414) | Secondary surfaces |
| Dark text (#2c2b28) | Light text (#c8c6c0) | Primary text |
| Muted (#aaa8a2) | Muted (#5a5956) | Secondary text |
| Borders (#d4d1c8) | Borders (#2a2927) | Separators |

#### Accent Preservation
- Brand color `#ff6127` remains identical in both themes
- Brand tint slightly stronger in dark (12% vs 10% opacity)

#### Content-Type & Status Colors (Dark Mode)
- `--color-note` and `--color-canvas` shift to lighter ramp stops in dark mode for contrast against dark surfaces (e.g. `#378ADD` → `#85B7EB`)
- Tint backgrounds (`--color-note-tint`, `--color-canvas-tint`) shift to dark, desaturated fills rather than light tints
- Sync status colors (`--color-sync-ok/busy/error`) follow the same pattern — lighter stops in dark mode

#### Component Adaptations
- All components use CSS variables
- No component-specific dark mode overrides needed
- `dark:` Tailwind classes used sparingly

---

### 5. Design Principles / Tone

#### High-Density Minimalism
- Maximum information density without clutter
- Compact padding (8px base, 6px for tight items)
- Functional hover states reveal secondary actions
- No decorative whitespace

#### Linear Aesthetic
- Clean lines, subtle borders
- No heavy shadows (borders preferred)
- 1px separators throughout
- Sharp corners (4px radius universally)

#### Zen Mode Ready
- Distraction-free focused states
- Collapsible sidebar
- Clean editor surfaces
- Minimal chrome

#### Warm Neutrality
- Paper-like warmth in light mode (#e8e6e0)
- Not sterile white or cold gray
- Sepia-adjacent undertones

#### Accent Restraint
- Brand color (`#ff6127`) reserved for CTAs and destructive confirms only
- Never used for selection or active state — that's content-type color now
- Full strength: primary buttons, focus rings
- Tint only: button hover backgrounds
- Never: large fills, body text on light surfaces, active nav/tabs

#### Content-Driven Color
- Notes = blue (`--color-note`), Canvas = teal (`--color-canvas`)
- Active mode tab, active file, and selection state all use the color of the content type being acted on
- A glance at the sidebar reveals note vs. canvas files without reading labels
- Sync status (`--color-sync-ok/busy/error`) follows standard green/amber/red convention

---

## Quick Reference

### CSS Variables Summary
```css
/* Unified neutral ramp — single hue H=42, light mode */
--color-page-bg: hsl(42 15% 89%);
--color-shell-bg: hsl(42 15% 89%);
--color-editor-bg: hsl(42 0% 100%);
--color-bg-primary: hsl(42 0% 100%);
--color-bg-secondary: hsl(42 8% 96%);
--color-bg-tertiary: hsl(42 8% 91%);
--color-surface-hover: hsl(42 15% 85%);
--color-text-primary: hsl(42 5% 16%);
--color-text-secondary: hsl(42 5% 40%);
--color-text-muted: hsl(42 5% 65%);
--color-border: hsl(42 12% 81%);
--color-border-secondary: hsl(42 6% 73%);

/* Unified neutral ramp — dark mode (.dark) */
.dark {
  --color-page-bg: hsl(42 8% 5%);
  --color-shell-bg: hsl(42 6% 10%);
  --color-editor-bg: hsl(42 11% 7%);
  --color-bg-primary: hsl(42 0% 5%);
  --color-bg-secondary: hsl(42 0% 8%);
  --color-bg-tertiary: hsl(42 0% 11%);
  --color-surface-hover: hsl(42 6% 13%);
  --color-text-primary: hsl(42 7% 77%);
  --color-text-secondary: hsl(42 2% 53%);
  --color-text-muted: hsl(42 2% 35%);
  --color-border: hsl(42 4% 16%);
  --color-border-secondary: hsl(42 0% 27%);
}

/* Core */
--font-base: 14px;
--icon-size: 16px;
--gap-size: 0.5rem;
--stroke-width: 1.5px;
--radius-tiny: 4px;

/* Scales */
--scale-ui: 1.125;
--scale-note: 1.200;
--scale-canvas: 1.250;

/* Brand — CTAs and destructive confirm only */
--color-accent: #ff6127;
--color-accent-dark: #cc4d1f;
--brand-subtle: rgba(255, 97, 39, 0.08);

/* Content-type — selection, active tabs, file markers */
--color-note: #378ADD;
--color-note-tint: #EBF3FE;
--color-canvas: #1D9E75;
--color-canvas-tint: #EBF7F3;

/* Sync status */
--color-sync-ok: #639922;
--color-sync-busy: #BA7517;
--color-sync-error: #E24B4A;
```