# BoardsNote — Roadmap v2.5

> Compiled from interface redesign exploration session.
> Focus: sidebar simplification, browser/home layer, and first-run personality.
> Legend: 🌱 New feature · 🎨 Redesign · 🔍 Needs scoping

---

## Context

This update originated from a single observation: **the sidebar feels packed and complex**, despite BoardsNote already being minimal compared to apps like Notion or Anytype. It also wasn't designed with tablet (landscape) as a second device in mind.

Two questions framed the whole exploration:

- **Returning user:** "Where did I leave off?" / "I want to create something new."
- **First-time user:** "How do I create a note or canvas?"

The conclusion: the sidebar was trying to do too many jobs (navigation, search, mode switching, settings, *and* first-touch orientation). The fix is architectural — split these responsibilities across two layers.

---

## 1. 🎨 New three-state architecture

### The two layers

| Layer | Job | When it appears |
|---|---|---|
| **Browser (home)** | "What do I work on?" — orientation, browsing, creation | On app open, or when navigating back |
| **Sidebar** | "Jump to another file" — pure navigation | While inside a Note or Canvas |

### The three interface states

1. **Browser** — full-width, no sidebar. Topbar has wordmark + Notes/Canvas mode switcher only.
2. **Editor/Canvas, sidebar hidden** — content shell takes full width. Sidebar toggle button in topbar.
3. **Editor/Canvas, sidebar visible** — lean sidebar appears flush to page background (no shell), content shell shrinks.

```
Browser (full width, no sidebar)
    │
    ├── Tap card → Editor / Canvas
    │       ├── Sidebar hidden (default) → toggle → Sidebar appears
    │       └── Sidebar visible
    │               ├── Tap file → switch file, stay in editor
    │               ├── Tap "Home" row → back to Browser
    │               └── Tap toggle → sidebar hides
    │
    └── Tap "New note/board" → Editor / Canvas (sidebar hidden)
```

**Acceptance criteria:**
- User can move between all three states without dead ends
- State transitions are smooth (sidebar width animates, no layout jump)
- Returning to the app reopens the last-edited file directly (skips browser) — browser is reached via "Home", not the default landing screen for returning users with existing files
- First-time users with zero files land on the Browser blank state

---

## 2. 🎨 Sidebar redesign (editor/canvas mode)

The sidebar becomes a **pure navigator** — three elements only, nothing else.

### Structure (top to bottom)
1. **Home row** — `← Home`, returns to Browser
2. **Divider**
3. **File list** — flat, recency-sorted, active file highlighted with brand-tint background
4. **New file row** — inline at bottom of list, not a separate button
5. **Footer** — single row, 2 icons only (Settings, Theme toggle)

### What's removed from the old sidebar
| Element | Was | Now |
|---|---|---|
| Mode switcher (Notes/Canvas) | Full-width tab strip | Moved to Browser topbar |
| Search bar | Always-visible inline bar | Removed — `Cmd+K` palette only |
| Footer | Multiple labeled sections | Single icon row (Settings + Theme) |

### Visual treatment — shell change
**Sidebar no longer has its own shell.** Following the Linear pattern:
- Sidebar background = `--color-page-bg` (same as page, no border, no radius)
- Content (editor/canvas) = white/dark shell, 1px border, 4px radius, inset 6px from page edge (existing `design.md` tokens)
- This removes `--color-sidebar-bg` as a distinct token — it becomes `--color-page-bg`

### Tablet (landscape) adjustments
| Token | Desktop | Tablet |
|---|---|---|
| Sidebar width | 220px | 240px |
| File item padding | `px-3 py-2` | `px-3 py-2.5` |
| Footer icon buttons | 28×28px | 36×36px |
| Mode/nav icon buttons | 28×28px | 32×32px |

**Acceptance criteria:**
- Sidebar renders with no border/shell, flush to page background in both themes
- File list is the dominant visual element — no competing sections
- Home row is always the first item, consistently positioned
- Tablet touch targets meet the sizes above without layout breaking

---

## 3. 🌱 Browser (home) layer — split mode design

The Browser is a **new top-level surface**, not a sidebar variant. It replaces the old "always-visible file list" with a card-based view, split by mode.

### Layout
- **Topbar:** wordmark (also acts as Home button when inside editor), Notes/Canvas mode switcher (pill toggle, center), search + settings + theme icons (right)
- **Browser header row:** section title ("Notes" / "Canvas"), file count, sort indicator (defaults to "Recent"), "New note"/"New board" button (mode-aware)
- **Card grid:** 2-column grid (3-column on tablet landscape)

### Notes mode — card content
- Card title
- Text excerpt (2–3 lines, clamped)
- Footer: type dot, last-edited time, tags (if any)
- **Pinned file spans full width** (2-column "wide" card) with extra excerpt lines — the only size-variance rule, driven by pin state rather than arbitrary bento sizing

### Canvas mode — card content
- Card title
- **Visual thumbnail** — actual miniature render of canvas content (shapes, stickies, text in real positions, scaled down)
- Footer: type dot, last-edited time, tags (if any)
- Pinned board gets the pin label + same card treatment as notes

**Acceptance criteria:**
- Mode switcher in topbar toggles the entire browser content (not just a filter chip)
- Notes cards never show canvas-style thumbnails and vice versa
- Pinned file/board always appears first, with wide/expanded treatment
- Canvas thumbnails are real scaled renders, not placeholder icons
- Sort defaults to "Recent" (most recently edited first)

---

## 4. 🌱 First-run / blank state

### Tone
**Quietly poetic, welcoming.** Not jokey, not a tutorial. One small personality moment rather than a feature walkthrough — walkthroughs are deferred to a future "real app" milestone (see Not Now list).

### Copy
> **Heading (same across both modes):**
> "Notes and canvas. Nothing more, nothing less."
>
> **Subline:**
> "Write something. Draw something. See what happens."

### Placement — Option B (chosen)
The blank message sits **flush below the browser header**, left-aligned, same padding as where the first card will appear. It reads as the body of the header row, not a floating centered object. When the first file is created, the message is replaced by the card grid growing from the same position.

### Actions
- Primary button: mode-appropriate ("Start writing" in Notes, "Start drawing" in Canvas)
- Secondary button: the other mode's action
- Keyboard hint line below buttons: `N for a new note · C for a new canvas` (order matches current mode)

### Canvas-mode extra
A faint (≈18% opacity light / ≈10% dark), sketch-style doodle — simple shapes, a sticky note outline, connecting lines — anchored to the bottom of the content area. Decorative only, doesn't compete with the copy.

### Lifecycle
This blank state is shown **once per mode**, only when that mode has zero files. Once the first Note (or first Canvas) is created, this screen never appears again for that mode — it's a one-time welcome, not a persistent empty-state pattern.

### Open question
- "0 files" in the header count: omit the count entirely when zero (show just "Notes" / "Canvas" + new button), to avoid drawing attention to the emptiness. **Needs decision before implementation.**

**Acceptance criteria:**
- Blank state appears only when a mode has zero files, and only on first visit to that empty mode
- Heading and subline are identical across Notes/Canvas (single manifesto, not per-screen copy)
- Canvas mode shows the doodle; Notes mode does not
- Once any file exists in a mode, the blank state is permanently replaced by the card grid for that mode

---

## 5. 🔍 Needs scoping

### 5.1 Open/editor transition animation
Tapping a card in the Browser needs a defined transition into full-screen editor/canvas. Not yet designed. Should feel native, not jarring — likely a scale/fade combination tied to the card's position.

### 5.2 Canvas thumbnail generation
Real-time scaled renders of canvas content for Browser cards. Needs technical scoping — render-to-image on save vs. live canvas snapshot vs. cached thumbnail regenerated periodically.

### 5.3 Full onboarding walkthrough
Deferred. The blank-state personality moment is the interim solution. A full walkthrough is a "real app" milestone, not part of this update.

---

## Updated Definition of "Done" for v2.5

- [ ] Three-state architecture implemented (Browser / Editor-sidebar-hidden / Editor-sidebar-visible)
- [ ] Sidebar redesigned: home row, file list, minimal footer — no shell, flush to page background
- [ ] Mode switcher, search bar, and old footer removed from sidebar
- [ ] Tablet sizing tokens applied (sidebar width, padding, icon sizes)
- [ ] Browser layer built with Notes/Canvas split card grids
- [ ] Pinned file/board gets wide-card treatment in both modes
- [ ] Canvas cards render real thumbnails
- [ ] Blank state (Option B placement) implemented for both modes, one-time-per-mode
- [ ] Returning users with files skip Browser and reopen last file directly
- [ ] `design.md` updated: `--color-sidebar-bg` removed/merged into `--color-page-bg`

---

## The "Not Now" List (additions)

- Full onboarding walkthrough (5.3)
- Open/editor transition animation polish (5.1) — ship with a simple default first, refine later
- Canvas thumbnail caching strategy (5.2) — ship with on-save render first