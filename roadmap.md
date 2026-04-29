# BoardsNote — Feature Scope & Audit

> **The single-purpose test:** "Will I die without this feature? Would BoardsNote still solve the problem without it?"
>
> **The problem BoardsNote solves:** A single place to write structured notes and sketch visual ideas — without switching apps.
>
> **The core promise:** Notes + Canvas, together, simple.

---

## The Core (Non-Negotiable)

These are the features that define what BoardsNote *is*. Remove any of these and it's a different product.

| Feature | Why it's core |
|---|---|
| Create, edit, delete notes | It's a notes app |
| Create, edit, delete canvas boards | It's a canvas app |
| Switch between Notes and Canvas in one place | That combo *is* the point |
| Sidebar to navigate between files | Access without this is broken |
| Dark mode | Table-stakes for any writing tool in 2024 |
| Persist data across sessions | Notes that disappear are useless |

---

## Feature Audit

### ✅ Sidebar

| Feature | Keep? | Verdict |
|---|---|---|
| Create note / canvas | ✅ Core | Ship |
| Rename file | ✅ Core | Ship |
| Delete file | ✅ Core | Ship |
| Favourite notes | ⚠️ Nice | Keep — helps navigation at low cost |
| Search notes and canvas | ✅ Core | Ship — without this, finding old notes breaks |
| Settings — Font | ⚠️ Nice | Keep — directly affects writing experience |
| Settings — Sync | ⚠️ Later | Cut for now — no backend yet, don't fake it |
| Settings — Keyboard Shortcuts | ⚠️ Nice | Keep only if shortcuts actually exist |

---

### ✅ Notes (TipTap)

| Feature | Keep? | Verdict |
|---|---|---|
| Basic typing / rich text | ✅ Core | Ship |
| Headings (H1, H2, H3) | ✅ Core | Ship |
| Bold, italic, inline code | ✅ Core | Ship |
| Bullet list / ordered list | ✅ Core | Ship |
| Code block | ✅ Core | Ship — but fix syntax highlighting |
| Table — basic insert | ✅ Core | Ship |
| Table — add row / col | ✅ Core | Ship |
| Table — delete row / col | ✅ Core | Finish and ship |
| Table — header row/col toggle | ⚠️ Nice | Defer — not blocking |
| Table — cell text alignment | ⚠️ Nice | Defer — not blocking |
| Table — cell color | ❌ Cut | Too early, adds complexity |
| Drag handle for blocks | ⚠️ Nice | Keep only after bug is fixed (bleeds into table cells) |
| Image embed | ❌ Cut | Out of scope for v1 |
| Export (PDF, Markdown) | ❌ Cut | Out of scope for v1 |
| Slash command menu | ⚠️ Nice | Keep if already started, cut if not |

---

### ⚠️ Canvas (Prototype — Paused)

Canvas is intentionally at prototype stage. The audit below defines what stays when you return to it.

| Feature | Keep? | Verdict |
|---|---|---|
| Text nodes | ✅ Core | Keep |
| Sticky notes | ✅ Core | Keep — signature canvas feature |
| Shapes (basic) | ⚠️ Nice | Keep basic set only (rect, circle, line) |
| Pen / freehand draw | ⚠️ Nice | Keep — differentiates from Notion |
| Erase | ✅ Core | Keep — pen without erase is broken |
| Move / select | ✅ Core | Keep |
| Delete | ✅ Core | Keep |
| Connectors / arrows | ❌ Cut | Too complex for v1 |
| Image upload to canvas | ❌ Cut | Out of scope for v1 |
| Canvas → Note link | ❌ Cut | Interesting later, not now |
| Multiplayer / collaboration | ❌ Cut | Out of scope entirely |

---

## What to Finish Before Adding Anything New

In priority order:

1. **Table — delete row/col** — in progress, finish it
2. **Drag handle bug** — hidden inside table cells
3. **Table cell spacing** — visual fix
4. **Bullet list rendering inside table cells** — CSS fix
5. **Code block** — add basic syntax highlighting
6. **Settings — remove Sync tab** — don't show features that don't work yet

---

## The "Not Now" List

Features that are valid ideas but explicitly deferred. Revisit after Notes is complete.

- Table cell background color
- Table text alignment per cell
- Image embed in notes
- Export to PDF / Markdown
- Canvas connector arrows
- Canvas ↔ Note linking
- Slash command menu (if not started)
- Sync / backend (Settings tab)
- Mobile layout

---

## Definition of "Done" for Notes v1

Notes is shippable when:

- [ ] Rich text works reliably (bold, italic, headings, lists, code)
- [ ] Tables can be inserted, rows/cols added and deleted
- [ ] Bullet lists render correctly inside table cells
- [ ] Drag handle does not appear inside table cells
- [ ] Code block displays monospace, no formatting bleed
- [ ] All sidebar actions work (create, rename, delete, favourite, search)
- [ ] Dark mode applies correctly across all surfaces
- [ ] Design system tokens applied consistently (no legacy colors)

---

## Definition of "Done" for Canvas v1

Canvas is shippable when:

- [ ] Text nodes can be created and edited
- [ ] Sticky notes work (create, move, delete, edit text)
- [ ] Basic shapes work (create, move, resize, delete)
- [ ] Pen and erase work reliably
- [ ] Move / select works for all element types
- [ ] Canvas persists between sessions

---

> **Rule going forward:** Any new feature idea gets added to the "Not Now" list first. It gets promoted to the roadmap only after the current definition of done is met.