# BoardsNote â€” Design System v2.1

A refined design system for a notes and canvas application.

---

## Foundations

### 1. Colors

> **Single token system.** All components must use `--color-*` tokens only. Legacy tokens (`--bg-*`, `--text-*`, `--border-*`) have been removed to avoid conflicts.

#### Background Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-shell-bg` | `#e8e6e0` | `#1c1b19` | Inset app shell + sidebar background |
| `--color-surface-hover` | `#dedad2` | `#242320` | Sidebar inputs, hover states |
| `--color-editor-bg` | `#ffffff` | `#141310` | Main editor / content area |

> **Layer hierarchy:** Shell (`#e8e6e0`) â†’ Sidebar inputs/hover (`#dedad2`) â†’ Editor (`#ffffff`). The editor is the lightest surface â€” the clean content stage. The shell reads as quiet chrome around it.

#### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-text-primary` | `#2c2b28` | `#c8c6c0` | Headings, body text |
| `--color-text-muted` | `#aaa8a2` | `#5a5956` | Secondary text, labels, placeholders |

#### Brand & Accent

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-accent` | `#ff6127` | `#ff6127` | Active nav, CTAs, focus ring, toggle |
| `--color-accent-tint` | `rgba(255,97,39,0.10)` | `rgba(255,97,39,0.12)` | Selected item backgrounds |
| `--color-accent-dark` | `#cc4d1f` | `#cc4d1f` | Pressed state, hover on accent elements |

#### Border Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-border` | `#d4d1c8` | `#2a2927` | All UI borders and separators |

#### Accent Usage Rules

- **Full strength** â€” active nav indicator, CTA buttons, toggle/checkbox, focus ring
- **Tint** â€” selected note/item background fill only
- **Never** on large background fills, never as body text color on light surfaces

#### Context Colors
Tag colors are auto-generated from a palette of 14 colors (red, orange, amber, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose) at 10% opacity background with matching text.

---

### 2. Typography

#### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-sans` | Inter | All UI text |

#### Type Scales

| Context | Scale | Usage |
|---------|-------|-------|
| Interface (Sidebar, Header) | 1.125 â€” Major Second | Navigation, buttons, labels |
| Notes | 1.200 â€” Minor Third | Note content, documents |
| Canvas | 1.250 â€” Major Third | Canvas elements, diagrams |

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
- **Inset shell gap**: 6px (0.375rem) â€” gap around entire app
- **Sidebar width**: 200px fixed
- **Resizer width**: 8px (sidebar toggle area)
- **Max content width**: 4xl (max-w-4xl) for notes

---

### 4. Border Radius / Shape

#### Radius Philosophy
**Tiny radius (4px) universally** â€” sharp but not harsh

| Token | Value |
|-------|-------|
| `--radius-tiny` | 4px |
| `--radius-sm` | var(--radius-tiny) |
| `--radius-md` | var(--radius-tiny) |
| `--radius-lg` | var(--radius-tiny) |
| `--radius-xl` | var(--radius-tiny) |
| `--radius-2xl` | var(--radius-tiny) |
| `--radius-3xl` | var(--radius-tiny) |

#### Shape Exceptions
- **Canvas toolbar**: 16px radius (floating pill shape)
- **Sticky notes**: 2px 12px 12px 2px (asymmetric curl effect)
- **Color swatches**: 50% (circular)
- **Toggle switches**: 100px (fully rounded)
- **Avatar/info button**: rounded-full (circular)

---

### 5. Elevation / Shadows

#### Philosophy
**Borders over Shadows** â€” 1px `var(--color-border)` as primary separator, minimal shadow usage

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
| **Primary** | `var(--color-accent)` | `var(--color-accent)` | White | CTAs, active mode tabs |
| **Secondary** | `var(--color-surface-hover)` | `var(--color-border)` | `var(--color-text-primary)` | Secondary actions |
| **Ghost** | Transparent | Transparent | `var(--color-text-muted)` | Icon buttons, subtle actions |
| **Outline** | Transparent | `var(--color-accent)` | `var(--color-accent)` | Create buttons, emphasis |
| **Destructive** | `red-500` | `red-500` | White | Delete actions |
| **Active/Selected** | `var(--color-accent-tint)` | `var(--color-accent)` | `var(--color-accent)` | Selected state |

#### Button Sizes

| Size | Padding | Font Size | Usage |
|------|---------|-----------|-------|
| **Small** | p-1 (4px) | 12px | Icon buttons, compact |
| **Default** | px-3 py-1.5 | 13px | Standard buttons |
| **Toolbar Primary** | 40px Ã— 40px | â€” | Canvas toolbar main |
| **Toolbar Secondary** | 32px Ã— 32px | â€” | Canvas toolbar secondary |

#### Button States
- **Default**: Base styling
- **Hover**: `background: var(--color-surface-hover)`, `color: var(--color-text-primary)` 
- **Active/Pressed**: `transform: scale(0.95)` 
- **Selected**: `var(--color-accent-tint)` background, `var(--color-accent)` text
- **Disabled**: Reduced opacity

---

### 2. Cards / Containers

#### App Panel (Primary Container)
```css
.app-panel {
  border-radius: var(--radius-tiny); /* 4px */
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
- Background: `var(--color-surface-hover)` 
- Border: 1px solid `var(--color-border)` 
- Border radius: 4px (default) or 12px (modal-like)
- Shadow: Context-dependent (none to xl)

---

### 3. Inputs / Forms

#### Text Inputs

| Element | Background | Border | Radius | Height |
|---------|------------|--------|--------|--------|
| Search bar | `var(--color-editor-bg)` | `var(--color-border)` | 4px | 36px (h-9) |
| Title input | Transparent | None | 0 | Auto |
| Inline edit | Transparent | Bottom only | 0 | Auto |
| Tag input | `var(--color-editor-bg)` | `var(--color-border)` | 4px | Auto |

#### Input States
- **Default**: Border `var(--color-border)` 
- **Hover**: Border `var(--color-text-muted)` 
- **Focus**: Outline none, border `var(--color-text-primary)` 
- **Placeholder**: `var(--color-text-muted)` 

#### Select/Checkbox
- **Toggle switches**: 28px Ã— 16px, pill-shaped
  - Unchecked: `var(--color-surface-hover)` background
  - Checked: `var(--color-accent)` background
  - Knob: 10px circle, slides 12px

---

### 4. Navigation

#### Mode Tabs (Notes/Canvas)
- Layout: Flex, 2 buttons, equal width
- Padding: py-1.5 (6px vertical)
- Active: `var(--color-accent)` background, white text
- Inactive: Transparent, `var(--color-text-muted)` text

#### Sidebar
- Width: 200px fixed
- Background: `var(--color-shell-bg)` 
- Sections: Mode tabs â†’ Search â†’ File list â†’ Footer
- File items: px-2 py-1.5, hover `var(--color-surface-hover)` 
- Active file: `var(--color-accent-tint)` background, `var(--color-accent)` text
- Collapsed: 0px width with 8px resizer handle

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
- Background: `var(--color-shell-bg)` 
- Border-radius: 12px
- Shadow: shadow-2xl
- Backdrop: `bg-black/50 backdrop-blur-sm` 

#### Delete Confirmation
- Width: 320px (w-80)
- Background: `var(--color-shell-bg)` 
- Border: `var(--color-border)` 
- Border-radius: 8px

#### Dropdown Menus (File Menu)
- Width: 144px (w-36)
- Background: `var(--color-shell-bg)` 
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
- Section headers: 11px uppercase, letter-spacing 0.03em, `var(--color-text-muted)` 
- Empty state: Italic, `var(--color-text-muted)` 

#### Tables (Editor)
- Border-collapse: collapse
- Cell padding: 6px 10px
- Header background: `var(--color-surface-hover)` 
- Border: 1px solid `var(--color-border)` 

#### Badges / Tags
- Font size: 10px
- Padding: px-1.5 py-0.5
- Border: 1px solid (color-matched)
- Border-radius: 4px
- Background: Color at 10% opacity

#### Layers Panel
- Compact list with drag handles
- Icon + label layout
- Selected: `var(--color-accent-tint)` background, `var(--color-accent)` text

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
| Default | `var(--color-text-muted)` |
| Hover | `var(--color-text-primary)` |
| Active/Selected | `var(--color-accent)` |
| Disabled/Muted | `var(--color-text-muted)` |

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
- Settings grid: 1 col mobile â†’ 2 cols sm+
- Content max-width: max-w-4xl centered

---

### 4. Dark Mode

#### Theme Toggle
- Manual toggle in sidebar footer (Sun/Moon icons)
- Persisted to localStorage (`inkframe_theme`)
- Applied via `.dark` class on document root

#### Color Transformations

| Token | Light | Dark |
|-------|-------|------|
| `--color-shell-bg` | `#e8e6e0` | `#1c1b19` |
| `--color-surface-hover` | `#dedad2` | `#242320` |
| `--color-editor-bg` | `#ffffff` | `#141310` |
| `--color-border` | `#d4d1c8` | `#2a2927` |
| `--color-text-primary` | `#2c2b28` | `#c8c6c0` |
| `--color-text-muted` | `#aaa8a2` | `#5a5956` |
| `--color-accent` | `#ff6127` | `#ff6127` |
| `--color-accent-tint` | `rgba(255,97,39,0.10)` | `rgba(255,97,39,0.12)` |
| `--color-accent-dark` | `#cc4d1f` | `#cc4d1f` |

#### Accent Preservation
- Brand color `#ff6127` remains identical in both themes
- Brand tint slightly stronger in dark (12% vs 10% opacity)

#### Component Adaptations
- All components use `--color-*` CSS variables only
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
- Paper-like warmth in light mode (`#e8e6e0`)
- Not sterile white or cold gray
- Sepia-adjacent undertones

#### Accent Restraint
- Brand color (`#ff6127`) used intentionally, never decoratively
- Full strength: active nav, CTAs, focus
- Tint only: selected backgrounds
- Never: large fills, body text on light surfaces

---

## Quick Reference

### CSS Variables (complete)

```css
:root {
  /* Core */
  --font-base: 14px;
  --icon-size: 16px;
  --gap-size: 0.5rem;
  --stroke-width: 1.5px;
  --radius-tiny: 4px;
  --radius-sm: var(--radius-tiny);
  --radius-md: var(--radius-tiny);
  --radius-lg: var(--radius-tiny);
  --radius-xl: var(--radius-tiny);
  --radius-2xl: var(--radius-tiny);
  --radius-3xl: var(--radius-tiny);

  /* Scales */
  --scale-ui: 1.125;
  --scale-note: 1.200;
  --scale-canvas: 1.250;

  /* Colors â€” Light */
  --color-shell-bg: #e8e6e0;
  --color-surface-hover: #dedad2;
  --color-editor-bg: #ffffff;
  --color-border: #d4d1c8;
  --color-text-primary: #2c2b28;
  --color-text-muted: #aaa8a2;
  --color-accent: #ff6127;
  --color-accent-tint: rgba(255, 97, 39, 0.10);
  --color-accent-dark: #cc4d1f;
}

.dark {
  --color-shell-bg: #1c1b19;
  --color-surface-hover: #242320;
  --color-editor-bg: #141310;
  --color-border: #2a2927;
  --color-text-primary: #c8c6c0;
  --color-text-muted: #5a5956;
  --color-accent: #ff6127;
  --color-accent-tint: rgba(255, 97, 39, 0.12);
  --color-accent-dark: #cc4d1f;
}
```
