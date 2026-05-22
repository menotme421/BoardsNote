# BoardsNote — Roadmap v2

> Compiled from user feedback session. Items are ordered by priority within each section.
> Legend: 🐛 Bug · ✨ UX improvement · 🌱 New feature · ✂️ Cut/cleanup · 🔍 Needs scoping

---

## Next — Sync

### 1. 🌱 Google Drive sync
**Scope:** Notes + Canvas  
**Priority:** Ship next, before any other new feature

Implement cloud persistence via Google Drive. This promotes the long-deferred "Settings → Sync" tab into an active feature.

**Acceptance criteria:**
- OAuth sign-in flow in Settings → Sync
- Each note and canvas board serialised as an individual file in a dedicated Drive folder
- Changes sync on save (not real-time)
- Conflict resolution: last-write-wins for v1
- Sync status indicator in sidebar footer (idle / syncing / error)
- Works offline; syncs when connection is restored

---

## Notes — Bugs

### 2. 🐛 Drag-and-drop: drop cursor line indicator persists after drop
**Scope:** Notes  

The line indicator showing where a block will land has a long latency to disappear after the block is dropped.

**Fix:** Clear drag state (and the drop cursor) immediately on the `drop` event — do not wait for the next repaint or React reconciliation cycle.

---

### 3. 🐛 Drag-and-drop: does not work inside bullet or numbered lists
**Scope:** Notes  

Dragging blocks inside list nodes has no effect.

**Fix:** Add list node types (`bulletList`, `orderedList`, `listItem`) to the TipTap drag-handle extension's allowed-node configuration.

---

### 4. 🐛 Code block: Cmd+A / Ctrl+A selects entire note instead of code inside block
**Scope:** Notes  

When the cursor is inside a code block, select-all escapes the block boundary and selects the whole document.

**Fix:** Intercept the `selectAll` command inside the code block node and scope it to the block's content. Stop event propagation so it does not bubble to the editor root.

---

### 5. 🐛 Table block: no way to delete the entire table
**Scope:** Notes  

Backspace on the table container does not delete it. Users are stuck.

**Fix (two-part):**
1. Add a "Delete table" action to the existing table context menu.
2. Handle the case where the cursor is on the table's outer node boundary and `Backspace` or `Delete` is pressed — delete the entire table node.

---

## Notes — UX Improvements

### 6. ✨ Nested list indentation style
**Scope:** Notes  

All list levels currently use the same marker style, making nesting hard to read.

**Expected behaviour:**
- Ordered list, level 2+: `list-style-type: lower-alpha` (a, b, c…)
- Unordered list, level 2+: `list-style-type: circle` (hollow bullet)
- Level 1 remains unchanged (decimal / filled disc)

**Fix:** Add CSS rules targeting `ol > li > ol` and `ul > li > ul` inside the editor content styles.

---

### 7. ✨ Redesign note info button as a "Properties" panel
**Scope:** Notes  

The current info button feels disconnected and underdesigned. Replace it with a proper Properties panel that follows the design system.

**Position:** Top-right corner of the editor, same location as the current button.

**Panel contents:**
- Word count and character count
- Created date / last modified date
- Tag management (add, remove tags)
- Note-level settings (e.g. font size override if applicable)

**Design reference:** Use the same panel pattern as the Canvas properties panel. Follow `design.md` tokens — 4px radius, `var(--color-*)`, no heavy shadows, 1px border.

---

## Canvas — Bugs

### 8. 🐛 Text nodes and pasted content follow cursor with large delay
**Scope:** Canvas  

Moving text nodes or pasted images has a noticeable lag behind the cursor. Shapes previously had the same issue and were fixed by a re-implementation.

**Fix:** Apply the same rendering path used for the fixed shapes to text nodes and pasted image elements. The fix likely involves bypassing React state diffing for position updates and writing directly to the canvas/DOM during `pointermove`.

---

### 9. 🐛 Pasted images cannot be resized
**Scope:** Canvas  

Images pasted onto the canvas have no resize handles.

**Fix:**
- Show resize handles on all four corners (and optionally edges) when an image node is selected — same component as shape resize handles.
- Default behaviour: constrain aspect ratio.
- Hold Shift to free-resize (or invert — pick one and be consistent with shape resize behaviour).

---

## Canvas — UX Improvements

### 10. ✨ Zoom is too insensitive — too many scroll steps to cover useful range
**Scope:** Canvas  

Current zoom increment per scroll tick is too small, requiring excessive scrolling.

**Improvements:**
- Increase zoom step size per scroll tick
- Support pinch-to-zoom on trackpad and touch screens
- Add a zoom level indicator to the canvas toolbar (e.g. "75%")
- Add a zoom reset button (double-click indicator or dedicated button) to snap back to 100%

---

### 11. ✨ Redesign search / command interface on canvas
**Scope:** Canvas  

The current canvas search feels disconnected from the rest of the app.

**Direction:** Unify with the existing command palette pattern used in Notes — same modal component, same keyboard shortcut (`Cmd+K` / `Ctrl+K`), results scoped to canvas elements (nodes, sticky notes, text blocks).

---

### 12. ✨ Redesign layers panel to match design system
**Scope:** Canvas  

The layers panel does not follow `design.md` tokens.

**Design spec:**
- 4px border radius throughout
- All colours via `var(--color-*)` tokens
- Lucide icons at 14px, `stroke-width: 1.5px`
- Row layout: drag handle + icon + label, compact padding (`px-2 py-1.5`)
- Selected state: brand-tint background (`var(--color-accent-tint)`), brand text (`var(--color-accent)`)
- Matches the Layers Panel spec in `design.md § Data Display → Layers Panel`

---

### 13. ✨ Improve stylus writing experience
**Scope:** Canvas  

Stylus input is functional but not optimised.

**Improvements to investigate:**
- Pressure sensitivity: map `PointerEvent.pressure` to stroke width
- Palm rejection: check `pointerType === 'pen'` and ignore simultaneous touch input
- Optional: snap-to-grid for stylus (off by default, toggle in canvas settings)

---

## Canvas — Cleanup

### 14. ✂️ Remove duplicate / non-unique font variants from font picker
**Scope:** Canvas  

The font appearance option includes visually identical variants, making the list noisy and confusing.

**Action:**
1. Audit the font list — remove any variant that renders identically to another already in the list.
2. If the remaining unique set is ≤ 3 fonts, remove the font picker entirely and inherit the global font setting from Notes Settings.

---

## Needs Scoping — Revisit After Canvas v1

### 15. 🔍 Arrows / connectors on canvas
**Scope:** Canvas  
**Previously:** Cut as "too complex for v1"

**Re-evaluate now.** A concrete unblocking use case has emerged: migrating graphs from Excalidraw requires arrows — without them, connected diagrams cannot be replicated and users are stuck. This changes the calculus from "nice to have" to "blocks real migration."

**Decision needed:** Yes or no. If yes, promote to the Canvas v1 definition of done before closing that milestone.

---

## Updated: Canvas v1 Definition of Done

- [ ] Text nodes can be created and edited
- [ ] Sticky notes work (create, move, delete, edit text)
- [ ] Basic shapes work (create, move, resize, delete)
- [ ] Pen and erase work reliably
- [ ] Move / select works for all element types
- [ ] Canvas persists between sessions
- [ ] Text nodes and pasted images move without cursor lag *(was bug #8)*
- [ ] Pasted images are resizable *(was bug #9)*
- [ ] Layers panel matches design system *(was UX #12)*
- [ ] **[Pending decision]** Arrows / connectors *(scoping item #15)*