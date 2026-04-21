# BoardsNote — Design System v2.0

A refined design system for a notes and canvas application.

---

### Core Principles
- **High-Density Minimalism** — Maximum information density without clutter
- **Linear Aesthetic** — Clean lines, subtle borders, no heavy shadows
- **Zen Mode Ready** — Distraction-free focused states
- **Warm Neutrality** — Paper-like warmth, not sterile white or cold gray

### Design Language
- **Shell:** Inset App Shell with 6px gap
- **Radius Philosophy:** Tiny radius (4px) universally — sharp but not harsh
- **Borders over Shadows** — 1px borders as primary separator
- **Accent Restraint** — Brand color (`#ff6127`) used intentionally, never decoratively

### Design Context
- **Design language:** High-Density Minimalism + Zen Mode + Linear Aesthetic
- **Shell type:** Inset App Shell
- **Theme:** Light (default) + Dark (toggle)
- **Font:** Inter · **Icons:** Lucide React

---

### Layers (Light)

| Layer | Role | Color |
|---|---|---|
| App shell + Sidebar | Inset shell background | `#e8e6e0` |
| Sidebar inputs / hover | Search bar, hovered items | `#dedad2` |
| Main editor | Content stage | `#ffffff` |

### Layers (Dark)

| Layer | Role | Color |
|---|---|---|
| App shell + Sidebar | Inset shell background | `#1c1b19` |
| Sidebar inputs / hover | Search bar, hovered items | `#242320` |
| Main editor | Content stage | `#141310` |

---

### Tokens

| Token | Light | Dark |
|---|---|---|
| `--color-shell-bg` | `#e8e6e0` | `#1c1b19` |
| `--color-surface-hover` | `#dedad2` | `#242320` |
| `--color-editor-bg` | `#ffffff` | `#141310` |
| `--color-border` | `#d4d1c8` | `#2a2927` |
| `--color-text-primary` | `#2c2b28` | `#c8c6c0` |
| `--color-text-muted` | `#aaa8a2` | `#5a5956` |
| `--color-accent` | `#ff6127` | `#ff6127` |
| `--color-accent-tint` | `#ff6127` at 10% | `#ff6127` at 12% |
| `--color-accent-dark` | `#cc4d1f` | `#cc4d1f` |

---

### Accent Rules
- **Full strength** — active nav, CTA buttons, toggle, focus ring
- **Tint** — selected item background fill
- **Never** on large fills, never as body text on light surfaces

### Typography Scale
| Context | Scale |
|---|---|
| Interface (Sidebar, Header) | 1.125 — Major Second |
| Notes | 1.200 — Minor Third |
| Canvas | 1.250 — Major Third |
Base 14px · Icons 16px · Gap 8px · Stroke 1.5px
