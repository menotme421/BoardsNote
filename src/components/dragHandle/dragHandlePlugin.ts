import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { ResolvedPos } from '@tiptap/pm/model';
import { DOMSerializer, type Node as ProseMirrorNode, Slice } from '@tiptap/pm/model';

const DRAG_HANDLE_PLUGIN_KEY = new PluginKey('customDragHandle');

interface DragTarget {
  node: ProseMirrorNode;
  pos: number;
  dom: HTMLElement;
  /** Full-width row band — used for vertical handle alignment. */
  rowRect: DOMRect;
  /** Content line under the pointer — used for horizontal handle alignment. */
  anchorRect: DOMRect;
}

interface TopLevelBlock {
  pos: number;
  end: number;
  node: ProseMirrorNode;
}

/** Types that should never be independently targeted by the drag handle. */
const EXCLUDED_TYPES = new Set([
  'doc',
  'tableRow',
  'tableCell',
  'tableHeader',
  'bulletList',
  'orderedList',
]);

interface ListItemBlock {
  start: number;
  end: number;
  node: ProseMirrorNode;
}

const DROPCURSOR_SELECTORS =
  '.ProseMirror-dropcursor, .prosemirror-dropcursor-block, .prosemirror-dropcursor-inline';

/** Vertical padding added above/below each list row hit band. */
const LIST_ROW_PAD_Y = 18;
/** Minimum list row hit height (px). */
const LIST_ROW_MIN_HEIGHT = 40;

/** Full-width row band for hit-testing (not the narrow text box). */
function getEditorContentRect(view: EditorView): DOMRect {
  return view.dom.getBoundingClientRect();
}

/** Innermost <li> under the pointer (not an ancestor li). */
function findInnermostListItemElement(
  el: Element | null,
  root: Element,
): HTMLElement | null {
  if (!el || !root.contains(el)) return null;

  let current: Element | null = el;
  while (current && current !== root) {
    if (current.tagName === 'LI') {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
}

/** Resolve the innermost listItem node containing a given document position. */
function resolveListItemAt(
  pos: number,
  doc: ProseMirrorNode,
): ListItemBlock | null {
  const clamped = Math.min(Math.max(pos, 0), doc.content.size);
  const $pos = doc.resolve(clamped < doc.content.size ? clamped + 1 : clamped);
  for (let d = $pos.depth; d >= 1; d--) {
    if ($pos.node(d).type.name === 'listItem') {
      const node = $pos.node(d);
      const start = $pos.before(d);
      return { start, end: start + node.nodeSize, node };
    }
  }
  return null;
}

/**
 * Row band for a list item — only this item's own label line, not nested sub-lists.
 * Expanded vertically so deep nested rows are easy to target.
 */
function getListItemRowRect(
  view: EditorView,
  item: ListItemBlock,
  editorRect: DOMRect,
): DOMRect {
  const dom = view.nodeDOM(item.start);
  if (!(dom instanceof HTMLElement)) {
    return new DOMRect(
      editorRect.left,
      0,
      editorRect.width,
      LIST_ROW_MIN_HEIGHT,
    );
  }

  const liRect = dom.getBoundingClientRect();
  const nestedList = dom.querySelector(':scope > ul, :scope > ol');
  const firstLine =
    dom.querySelector(':scope > p') ??
    dom.querySelector(':scope > div:not(ul):not(ol)') ??
    dom.firstElementChild;

  let top = liRect.top;
  let height = liRect.height;

  if (firstLine instanceof HTMLElement) {
    const lineRect = firstLine.getBoundingClientRect();
    top = lineRect.top;
    height = lineRect.height;
  }

  if (nestedList instanceof HTMLElement) {
    const nestedTop = nestedList.getBoundingClientRect().top;
    const ownHeight = nestedTop - top;
    if (ownHeight > 0) {
      height = ownHeight;
    }
  }

  const paddedHeight = Math.max(height + LIST_ROW_PAD_Y * 2, LIST_ROW_MIN_HEIGHT);
  const paddedTop = top - LIST_ROW_PAD_Y;

  return new DOMRect(editorRect.left, paddedTop, editorRect.width, paddedHeight);
}

/** First content line inside a list item (not the whole <li> box). */
function getListItemLabelElement(li: HTMLElement): HTMLElement {
  const label =
    li.querySelector(':scope > p') ??
    li.querySelector(':scope > div:not(ul):not(ol)');
  return label instanceof HTMLElement ? label : li;
}

/** Content line under the pointer — for horizontal handle placement. */
function getPointerAnchorRect(
  view: EditorView,
  clientX: number,
  clientY: number,
  fallbackDom: HTMLElement,
): DOMRect {
  const pointEl = document.elementFromPoint(clientX, clientY);
  if (pointEl instanceof HTMLElement && view.dom.contains(pointEl)) {
    if (pointEl.matches('p, h1, h2, h3, h4, h5, h6')) {
      return pointEl.getBoundingClientRect();
    }
    const innerLi = findInnermostListItemElement(pointEl, view.dom);
    if (innerLi) {
      return getListItemLabelElement(innerLi).getBoundingClientRect();
    }
    const line = pointEl.closest('p, h1, h2, h3, h4, h5, h6');
    if (line instanceof HTMLElement) {
      return line.getBoundingClientRect();
    }
  }

  if (fallbackDom.tagName === 'LI') {
    return getListItemLabelElement(fallbackDom).getBoundingClientRect();
  }
  const line =
    fallbackDom.querySelector('p, h1, h2, h3, h4, h5, h6') ?? fallbackDom;
  return (line as HTMLElement).getBoundingClientRect();
}

function removeNativeDropCursors(view: EditorView) {
  view.dom.ownerDocument
    .querySelectorAll(DROPCURSOR_SELECTORS)
    .forEach((element) => element.remove());
}

function getListInsertIndicatorRect(
  view: EditorView,
  clientX: number,
  clientY: number,
): DOMRect | null {
  const target = resolveListItemTargetFromCoords(view, clientX, clientY);
  if (!target) return null;

  const item: ListItemBlock = {
    start: target.pos,
    end: target.pos + target.node.nodeSize,
    node: target.node,
  };
  const row = getListItemRowRect(view, item, getEditorContentRect(view));
  const anchor = target.anchorRect.height > 0 ? target.anchorRect : row;
  const y = clientY < anchor.top + anchor.height / 2 ? anchor.top : anchor.bottom;
  const left = Math.max(getEditorContentRect(view).left, anchor.left);
  const width = Math.max(32, Math.min(anchor.width, getEditorContentRect(view).right - left));

  return new DOMRect(left, y, width, 2);
}

const BLOCK_ROW_PAD_Y = 22;

/** Content row for a non-list top-level block (not the outer wrapper). */
function getBlockContentRowRect(
  view: EditorView,
  pos: number,
  node: ProseMirrorNode,
  editorRect: DOMRect,
): DOMRect {
  let dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) {
    const atPos = view.domAtPos(pos);
    dom = atPos.node.childNodes[atPos.offset] as HTMLElement || null;
  }
  if (!(dom instanceof HTMLElement)) {
    return new DOMRect(editorRect.left, 0, editorRect.width, LIST_ROW_MIN_HEIGHT);
  }

  if (node.type.name === 'table') {
    const tableEl =
      dom.querySelector('table') ??
      dom.querySelector('.tableWrapper') ??
      dom;
    const tableRect = tableEl.getBoundingClientRect();
    return new DOMRect(
      editorRect.left,
      tableRect.top - BLOCK_ROW_PAD_Y,
      editorRect.width,
      tableRect.height + BLOCK_ROW_PAD_Y * 2,
    );
  }

  const line =
    dom.querySelector(':scope > p') ??
    dom.querySelector(':scope > h1, :scope > h2, :scope > h3') ??
    dom.firstElementChild ??
    dom;
  const lineRect = (line as HTMLElement).getBoundingClientRect();
  const height = Math.max(lineRect.height + BLOCK_ROW_PAD_Y * 2, LIST_ROW_MIN_HEIGHT);

  return new DOMRect(
    editorRect.left,
    lineRect.top - BLOCK_ROW_PAD_Y,
    editorRect.width,
    height,
  );
}

function finishDragTarget(
  view: EditorView,
  clientX: number,
  clientY: number,
  node: ProseMirrorNode,
  pos: number,
  dom: HTMLElement,
  rowRect: DOMRect,
): DragTarget {
  return {
    node,
    pos,
    dom,
    rowRect,
    anchorRect: getPointerAnchorRect(view, clientX, clientY, dom),
  };
}

/** Pick the row whose band best matches pointer Y (avoids boundary ambiguity). */
function pickTargetAtPointerY(
  candidates: DragTarget[],
  clientY: number,
): DragTarget | null {
  if (candidates.length === 0) return null;

  let best: { target: DragTarget; score: number } | null = null;

  for (const target of candidates) {
    const { rowRect } = target;
    const mid = rowRect.top + rowRect.height / 2;
    const inside = clientY >= rowRect.top && clientY <= rowRect.bottom;
    const score = inside ? Math.abs(clientY - mid) : Math.abs(clientY - mid) + 1e6;

    if (!best || score < best.score) {
      best = { target, score };
    }
  }

  return best?.target ?? null;
}

/** Drag preview image: only this item's label, never nested sub-lists. */
function createListItemDragImage(li: HTMLElement): HTMLElement {
  const clone = li.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('ul, ol').forEach((list) => list.remove());
  clone.style.position = 'absolute';
  clone.style.top = '-10000px';
  clone.style.left = '0';
  clone.style.width = `${li.getBoundingClientRect().width}px`;
  document.body.appendChild(clone);
  return clone;
}

/** How many listItem ancestors this item has (1 = top-level list row). */
function getListItemNestingDepth(doc: ProseMirrorNode, listItemPos: number): number {
  const $pos = doc.resolve(Math.min(listItemPos + 1, doc.content.size));
  let depth = 0;
  for (let d = 1; d <= $pos.depth; d++) {
    if ($pos.node(d).type.name === 'listItem') depth++;
  }
  return depth;
}

/** Every listItem in the document. */
function getAllListItems(doc: ProseMirrorNode): ListItemBlock[] {
  const items: ListItemBlock[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'listItem') {
      items.push({ start: pos, end: pos + node.nodeSize, node });
    }
  });
  return items;
}

function isEmptyTrailingParagraph(node: ProseMirrorNode): boolean {
  return node.type.name === 'paragraph' && node.content.size === 0;
}

/** All direct children of the document root. */
function getTopLevelBlocks(doc: ProseMirrorNode): TopLevelBlock[] {
  const blocks: TopLevelBlock[] = [];
  let pos = 0;
  doc.forEach((node) => {
    blocks.push({ pos, end: pos + node.nodeSize, node });
    pos += node.nodeSize;
  });
  return blocks;
}

/** Range of the doc-level block containing `pos`. */
function getTopLevelBlockRange(
  doc: ProseMirrorNode,
  pos: number,
): { start: number; end: number; node: ProseMirrorNode } | null {
  const clamped = Math.min(Math.max(pos, 0), doc.content.size);
  const $pos = doc.resolve(clamped);

  for (let d = $pos.depth; d >= 1; d--) {
    if ($pos.node(d - 1).type.name === 'doc') {
      const node = $pos.node(d);
      const start = $pos.before(d);
      return { start, end: start + node.nodeSize, node };
    }
  }

  if ($pos.depth === 0 && $pos.nodeAfter?.isBlock) {
    const node = $pos.nodeAfter;
    return { start: clamped, end: clamped + node.nodeSize, node };
  }

  return null;
}

/** Innermost listItem at `pos` (deepest in the ancestor chain). */
function getListItemRange(
  doc: ProseMirrorNode,
  pos: number,
): { start: number; end: number; node: ProseMirrorNode } | null {
  const clamped = Math.min(Math.max(pos, 0), doc.content.size);
  const $pos = doc.resolve(clamped < doc.content.size ? clamped + 1 : clamped);

  for (let d = $pos.depth; d >= 1; d--) {
    if ($pos.node(d).type.name === 'listItem') {
      const node = $pos.node(d);
      const start = $pos.before(d);
      return { start, end: start + node.nodeSize, node };
    }
  }

  return null;
}

function isListNode(node: ProseMirrorNode): boolean {
  return node.type.name === 'bulletList' || node.type.name === 'orderedList';
}

function isLastSiblingInList(doc: ProseMirrorNode, listItemPos: number): boolean {
  const $pos = doc.resolve(Math.min(listItemPos + 1, doc.content.size));
  for (let d = $pos.depth; d >= 1; d--) {
    if ($pos.node(d).type.name === 'listItem') {
      const parentDepth = d - 1;
      if (parentDepth >= 1 && isListNode($pos.node(parentDepth))) {
        const parent = $pos.node(parentDepth);
        const itemIndex = $pos.index(parentDepth);
        return itemIndex === parent.childCount - 1;
      }
    }
  }
  return false;
}

function shareParentList(
  doc: ProseMirrorNode,
  posA: number,
  posB: number,
): boolean {
  const $a = doc.resolve(Math.min(posA + 1, doc.content.size));
  const $b = doc.resolve(Math.min(posB + 1, doc.content.size));

  let listPosA = -1;
  let listPosB = -1;

  for (let d = $a.depth; d >= 1; d--) {
    if (isListNode($a.node(d))) { listPosA = $a.before(d); break; }
  }
  for (let d = $b.depth; d >= 1; d--) {
    if (isListNode($b.node(d))) { listPosB = $b.before(d); break; }
  }

  return listPosA !== -1 && listPosA === listPosB;
}

/**
 * Insert before/after the listItem row under the pointer (any nesting depth).
 * Supports reordering siblings and moving a child item above its parent row.
 */
function resolveListItemInsertPosFromCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): number | null {
  const target = resolveListItemTargetFromCoords(view, clientX, clientY);
  if (!target) return null;

  const editorRect = getEditorContentRect(view);
  const item: ListItemBlock = {
    start: target.pos,
    end: target.pos + target.node.nodeSize,
    node: target.node,
  };
  const row = getListItemRowRect(view, item, editorRect);
  const insertSplitRect = target.anchorRect.height > 0 ? target.anchorRect : row;
  const insertMidY = insertSplitRect.top + insertSplitRect.height / 2;

  if (clientY < insertMidY) {
    return target.pos;
  }
  return item.end;
}

/** All list-item drag targets with row + anchor geometry. */
function collectListItemTargets(
  view: EditorView,
  clientX: number,
  clientY: number,
): DragTarget[] {
  const editorRect = getEditorContentRect(view);
  const targets: DragTarget[] = [];

  for (const item of getAllListItems(view.state.doc)) {
    const dom = view.nodeDOM(item.start);
    if (!(dom instanceof HTMLElement)) continue;
    const rowRect = getListItemRowRect(view, item, editorRect);
    targets.push(
      finishDragTarget(view, clientX, clientY, item.node, item.start, dom, rowRect),
    );
  }

  return targets;
}

/** Resolve listItem from pointer — DOM innermost <li> first, then padded row bands. */
function resolveListItemTargetFromCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): DragTarget | null {
  const pointEl = document.elementFromPoint(clientX, clientY);
  const innerLi = findInnermostListItemElement(pointEl, view.dom);

  if (innerLi) {
    try {
      const domPos = view.posAtDOM(innerLi, 0);
      if (domPos > 0) {
        const item = resolveListItemAt(domPos, view.state.doc);
        if (item) {
          const dom = view.nodeDOM(item.start);
          if (dom instanceof HTMLElement) {
            const editorRect = getEditorContentRect(view);
            const rowRect = getListItemRowRect(view, item, editorRect);
            return finishDragTarget(
              view,
              clientX,
              clientY,
              item.node,
              item.start,
              dom,
              rowRect,
            );
          }
        }
      }
    } catch {
      // element not in editor DOM — fall through to row-band hit-test
    }
  }

  return pickTargetAtPointerY(collectListItemTargets(view, clientX, clientY), clientY);
}

function getBlockRange(
  doc: ProseMirrorNode,
  pos: number,
  typeName: string,
): { start: number; end: number; node: ProseMirrorNode } | null {
  if (typeName === 'listItem') {
    return getListItemRange(doc, pos);
  }
  return getTopLevelBlockRange(doc, pos);
}

function getBlockDOMRect(view: EditorView, block: TopLevelBlock): DOMRect | null {
  let dom = view.nodeDOM(block.pos);
  if (!(dom instanceof HTMLElement)) {
    const atPos = view.domAtPos(block.pos);
    dom = atPos.node.childNodes[atPos.offset] as HTMLElement || null;
  }
  if (!(dom instanceof HTMLElement)) return null;

  if (block.node.type.name === 'table') {
    const tableEl =
      dom.querySelector('table') ??
      dom.querySelector('.tableWrapper') ??
      dom;
    return tableEl.getBoundingClientRect();
  }

  return dom.getBoundingClientRect();
}

/**
 * Pick before/after a top-level block using viewport Y.
 * Never returns a position inside table cells or paragraph text.
 */
function resolveBlockInsertPosFromCoords(
  view: EditorView,
  clientY: number,
): number {
  const doc = view.state.doc;
  const blocks = getTopLevelBlocks(doc);

  if (blocks.length === 0) return 0;

  for (const block of blocks) {
    const rect = getBlockDOMRect(view, block);
    if (!rect) continue;

    if (clientY < rect.top + rect.height / 2) {
      return block.pos;
    }
  }

  const last = blocks[blocks.length - 1];
  return last.end;
}

function isInsideTable($pos: ResolvedPos): boolean {
  for (let d = $pos.depth; d >= 1; d--) {
    if ($pos.node(d).type.name === 'table') return true;
  }
  return false;
}

/** Move a block slice; never splits inline text. */
function moveBlockRange(
  state: EditorState,
  sourceStart: number,
  sourceEnd: number,
  insertPos: number,
  slice: Slice,
): Transaction | null {
  if (insertPos >= sourceStart && insertPos < sourceEnd) {
    return null;
  }

  let tr = state.tr;
  const closed =
    slice.openStart > 0 || slice.openEnd > 0
      ? new Slice(slice.content, 0, 0)
      : slice;

  // When deleting a listItem that is the sole child of its parent UL,
  // expand the delete range to include the UL itself.  This avoids
  // ProseMirror auto‑inserting placeholder content when the deletion
  // would leave an empty (schema‑invalid) list wrapper.
  let deleteFrom = sourceStart;
  let deleteTo = sourceEnd;
  const $check = tr.doc.resolve(Math.min(sourceStart + 1, tr.doc.content.size));
  for (let d = $check.depth; d >= 2; d--) {
    if ($check.node(d).type.name === 'listItem') {
      const parent = $check.node(d - 1);
      if (isListNode(parent) && parent.childCount === 1) {
        const expandedFrom = $check.before(d - 1);
        const expandedTo = $check.after(d - 1);

        // Guard 1: Never expand to a range starting at 0 — would include title node
        if (expandedFrom === 0) {
          break;
        }

        // Guard 2: The expanded range must be exactly a list wrapper.
        const expandedNode = tr.doc.nodeAt(expandedFrom);
        if (!expandedNode || !isListNode(expandedNode) || expandedFrom + expandedNode.nodeSize !== expandedTo) {
          break;
        }

        deleteFrom = expandedFrom;
        deleteTo = expandedTo;
      }
      break;
    }
  }

  if (insertPos < sourceStart) {
    tr = tr.delete(deleteFrom, deleteTo);
    const mappedInsert = tr.mapping.map(insertPos, -1);
    tr = tr.replace(mappedInsert, mappedInsert, closed);
  } else if (insertPos === sourceEnd) {
    // Boundary case: drop cursor at the source's end edge.
    // Delete first, then insert at the mapped position.
    // The mapped position is authoritative — ProseMirror's schema
    // handles auto-wrapping (e.g. re-wrapping a listItem in a UL).
    tr = tr.delete(deleteFrom, deleteTo);
    const mappedInsert = tr.mapping.map(insertPos, -1);
    tr = tr.replace(mappedInsert, mappedInsert, closed);
  } else {
    tr = tr.delete(deleteFrom, deleteTo);
    const mappedInsert = tr.mapping.map(insertPos, -1);
    tr = tr.replace(mappedInsert, mappedInsert, closed);
  }

  return tr;
}

/**
 * Resolve drag target from pointer coordinates — row bands for Y, content line for X.
 * Never uses posAtCoords / boundary positions for handle placement.
 */
function resolveTargetFromCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
  _el: Element | null,
): DragTarget | null {
  const editorRect = getEditorContentRect(view);
  if (
    clientY < editorRect.top ||
    clientY > editorRect.bottom ||
    clientX < editorRect.left ||
    clientX > editorRect.right
  ) {
    return null;
  }

  const candidates: DragTarget[] = collectListItemTargets(view, clientX, clientY);

  const doc = view.state.doc;
  for (const block of getTopLevelBlocks(doc)) {
    if (isListNode(block.node)) continue;

    const dom = view.nodeDOM(block.pos);
    if (!(dom instanceof HTMLElement)) continue;

    const rowRect = getBlockContentRowRect(
      view,
      block.pos,
      block.node,
      editorRect,
    );
    candidates.push(
      finishDragTarget(
        view,
        clientX,
        clientY,
        block.node,
        block.pos,
        dom,
        rowRect,
      ),
    );
  }

  return pickTargetAtPointerY(candidates, clientY);
}

function createDragHandlePlugin() {
  let dragSourcePos: number | null = null;
  let dragSourceNode: ProseMirrorNode | null = null;
  let isDraggingGlobal = false;

  return new Plugin({
    key: DRAG_HANDLE_PLUGIN_KEY,

    props: {
      handleDOMEvents: {
        // Block ProseMirror / native node drag — only .custom-drag-handle may start a drag.
        dragstart: (view, event) => {
          const target = event.target as HTMLElement;
          if (!target.closest('.custom-drag-handle')) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        drop: (view, event) => {
          if (isDraggingGlobal) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        dragover: (view, event) => {
          if (isDraggingGlobal) {
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },

    view(view: EditorView) {
      const handle = document.createElement('div');
      handle.className = 'custom-drag-handle';
      handle.setAttribute('draggable', 'true');
      handle.setAttribute('aria-label', 'Drag to reorder');

      const icon = document.createElement('span');
      icon.textContent = '⠿';
      handle.appendChild(icon);

      const wrapper = view.dom.parentElement;
      if (!wrapper) {
        return { destroy() {} };
      }

      wrapper.style.position = 'relative';
      wrapper.style.overflow = 'visible';
      wrapper.appendChild(handle);


      let isLocalDragging = false;
      let hideTimeout: number | null = null;
      let preResolvedDragPos: number | null = null;
      let preResolvedDragNode: ProseMirrorNode | null = null;
      let isHandleFocused = false; // Lock flag: prevents position updates when cursor is on handle
      const handledDropEvents = new WeakSet<DragEvent>();
      const dropIndicator = document.createElement('div');
      dropIndicator.className = 'custom-drag-drop-indicator';
      dropIndicator.style.position = 'absolute';
      dropIndicator.style.height = '2px';
      dropIndicator.style.background = 'var(--color-accent)';
      dropIndicator.style.borderRadius = '999px';
      dropIndicator.style.boxShadow = '0 0 0 1px color-mix(in srgb, var(--color-accent) 30%, transparent)';
      dropIndicator.style.pointerEvents = 'none';
      dropIndicator.style.zIndex = '60';
      dropIndicator.style.opacity = '0';
      dropIndicator.style.visibility = 'hidden';
      wrapper.appendChild(dropIndicator);

      function hideDropIndicator() {
        dropIndicator.style.opacity = '0';
        dropIndicator.style.visibility = 'hidden';
      }

      function showDropIndicator(rect: DOMRect) {
        const wrapperRect = wrapper!.getBoundingClientRect();
        dropIndicator.style.left = `${rect.left - wrapperRect.left + wrapper!.scrollLeft}px`;
        dropIndicator.style.top = `${rect.top - wrapperRect.top + wrapper!.scrollTop}px`;
        dropIndicator.style.width = `${rect.width}px`;
        dropIndicator.style.opacity = '1';
        dropIndicator.style.visibility = 'visible';
      }

      function clearCustomDragState() {
        isDraggingGlobal = false;
        isLocalDragging = false;
        dragSourcePos = null;
        dragSourceNode = null;
        isHandleFocused = false;
        hideDropIndicator();
        removeNativeDropCursors(view);
        view.dom.ownerDocument.documentElement.removeAttribute('data-custom-note-dragging');
      }

      function scheduleHide() {
        if (hideTimeout) return;
        hideTimeout = window.setTimeout(() => {
          hideHandle();
          hideTimeout = null;
        }, 800);
      }

      function cancelHide() {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      }

      function showHandle(target: DragTarget) {
        // Position is now set by onMouseMove using elementFromPoint
        // Only update visibility and store the target info
        preResolvedDragPos = target.pos;
        preResolvedDragNode = target.node;
        handle.style.opacity = '1';
        handle.style.visibility = 'visible';
      }

      function hideHandle() {
        handle.style.opacity = '0';
        handle.style.visibility = 'hidden';
        preResolvedDragPos = null;
        preResolvedDragNode = null;
      }

      function updateDropIndicator(event: DragEvent) {
        removeNativeDropCursors(view);

        if (!dragSourceNode) {
          hideDropIndicator();
          return;
        }

        if (dragSourceNode.type.name === 'listItem') {
          const rect = getListInsertIndicatorRect(view, event.clientX, event.clientY);
          if (rect) {
            showDropIndicator(rect);
          } else {
            hideDropIndicator();
          }
          return;
        }

        const target = resolveTargetFromCoords(
          view,
          event.clientX,
          event.clientY,
          document.elementFromPoint(event.clientX, event.clientY),
        );
        if (!target) {
          hideDropIndicator();
          return;
        }
        const anchor = target.anchorRect.height > 0 ? target.anchorRect : target.rowRect;
        const y = event.clientY < target.rowRect.top + target.rowRect.height / 2 ? anchor.top : anchor.bottom;
        showDropIndicator(new DOMRect(anchor.left, y, Math.max(32, anchor.width), 2));
      }

      let rafId: number | null = null;

      const onMouseMove = (e: MouseEvent) => {
        if (isLocalDragging) { return; }
        if (!view.editable) {
          hideHandle();
          return;
        }
        if (rafId !== null) return;
        const { clientX, clientY } = e;
        rafId = requestAnimationFrame(() => {
          rafId = null;

          let el = document.elementFromPoint(clientX, clientY);
          if (el && (el === handle || handle.contains(el))) {
            return;
          }

          // ============================================================
          // STEP A — VISUAL POSITIONING (handle placement only)
          // Produces: pixel values for handle top/left
          // ============================================================
          if (el instanceof HTMLElement && view.dom.contains(el)) {
            // Find visual target element for positioning
            let visualEl: HTMLElement | null = null;

            // Check for table first — use the wrapper/table element, never a cell or row.
            const tableEl = el.closest('div.tableWrapper, table') as HTMLElement;
            if (tableEl) {
              visualEl = tableEl;
            } else {
              const blockEl = el.closest('p, h1, h2, h3, h4, h5, h6, li, div.code-block-wrapper') as HTMLElement;

              if (blockEl) {
                // For list items, use inner content to avoid marker overlap
                if (blockEl.tagName === 'LI') {
                  const innerContent = blockEl.querySelector(':scope > p, :scope > div:not(ul):not(ol)');
                  visualEl = (innerContent instanceof HTMLElement) ? innerContent : blockEl;
                } else {
                  visualEl = blockEl;
                }
              }
            }

            if (!visualEl && el.matches('p, h1, h2, h3, h4, h5, h6, li, div')) {
              visualEl = el;
            }

            if (!visualEl) {
              const innerLi = findInnermostListItemElement(el, view.dom);
              if (innerLi) {
                const innerContent = innerLi.querySelector(':scope > p, :scope > div:not(ul):not(ol)');
                visualEl = (innerContent instanceof HTMLElement) ? innerContent : innerLi;
              }
            }
            
            // Set handle position from visual element's rect
            if (visualEl) {
              const visualRect = visualEl.getBoundingClientRect();
              const wrapperRect = wrapper!.getBoundingClientRect();
              const handleHeight = handle.offsetHeight || 24;
              
              // Vertical: center on first line
              const lineHeight = visualRect.height > 60 ? 24 : visualRect.height;
              const top = visualRect.top - wrapperRect.top + wrapper!.scrollTop + (lineHeight - handleHeight) / 2;
              
              // Horizontal: structural block's left edge - 28px
              const blockDOM = view.nodeDOM(preResolvedDragPos);
              const refEl = blockDOM instanceof HTMLElement && blockDOM.tagName === 'LI'
                ? blockDOM.parentElement
                : blockDOM;
              const blockRect = (refEl as HTMLElement)?.getBoundingClientRect();
              const left = blockRect
                ? blockRect.left - wrapperRect.left - 28
                : visualRect.left - wrapperRect.left - 28;
              
              handle.style.top = `${top}px`;
              handle.style.left = `${left}px`;
            }
          }

          // ============================================================
          // STEP B — PROSEMIRROR RESOLUTION (drag identity only)
          // Resolved position then drives Step A (handle visual placement).
          // ============================================================
          if (!isHandleFocused) {
            const pmPos = view.posAtCoords({ left: clientX, top: clientY });
            const doc = view.state.doc;

            if (pmPos) {
              const firstChild = doc.firstChild;
              const contentStart = firstChild && (firstChild.type.name === 'heading' || firstChild.type.name === 'title')
                ? firstChild.nodeSize
                : 0;

              let targetPos: number | null = null;
              let targetNode: ProseMirrorNode | null = null;

              // 1 — Try listItem ancestor
              const listItem = resolveListItemAt(pmPos.pos, doc);
              if (listItem && listItem.start >= contentStart) {
                targetPos = listItem.start;
                targetNode = listItem.node;
              }

              // 2 — Fallback to doc-level block walk
              if (targetPos === null) {
                const resolvedPos = doc.resolve(pmPos.pos);
                for (let depth = resolvedPos.depth; depth >= 0; depth--) {
                  if (depth === 0 || resolvedPos.node(depth - 1)?.type.name === 'doc') {
                    const node = resolvedPos.node(depth);
                    if (node.isBlock && !EXCLUDED_TYPES.has(node.type.name)) {
                      targetPos = depth === 0 ? pmPos.pos : resolvedPos.before(depth);
                      targetNode = node;
                      break;
                    }
                  }
                }
              }

              if (targetPos !== null && targetNode !== null && targetPos >= contentStart) {
                preResolvedDragPos = targetPos;
                preResolvedDragNode = targetNode;
              }
            }
          }

          // ============================================================
          // STEP A — VISUAL POSITIONING (driven by Step B's result)
          // ============================================================
          if (preResolvedDragPos !== null && preResolvedDragNode !== null && preResolvedDragPos >= 1) {
            const nodeDom = view.nodeDOM(preResolvedDragPos);
            if (nodeDom instanceof HTMLElement && view.dom.contains(nodeDom)) {
              let visualEl: HTMLElement = nodeDom;
              if (nodeDom.tagName === 'LI') {
                const innerContent = nodeDom.querySelector(':scope > p, :scope > div:not(ul):not(ol)');
                visualEl = (innerContent instanceof HTMLElement) ? innerContent : nodeDom;
              } else if (preResolvedDragNode.type.name === 'table') {
                const tableEl = nodeDom.querySelector('table') ?? nodeDom.querySelector('.tableWrapper') ?? nodeDom;
                if (tableEl instanceof HTMLElement) visualEl = tableEl;
              } else {
                const firstLine = nodeDom.querySelector(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
                if (firstLine instanceof HTMLElement) visualEl = firstLine;
              }

              const visualRect = visualEl.getBoundingClientRect();
              const wrapperRect = wrapper!.getBoundingClientRect();
              const handleHeight = handle.offsetHeight || 24;
              const lineHeight = visualRect.height > 60 ? 24 : visualRect.height;
              const top = visualRect.top - wrapperRect.top + wrapper!.scrollTop + (lineHeight - handleHeight) / 2;
              const blockDOM = view.nodeDOM(preResolvedDragPos);
              const refEl = blockDOM instanceof HTMLElement && blockDOM.tagName === 'LI'
                ? blockDOM.parentElement
                : blockDOM;
              const blockRect = (refEl as HTMLElement)?.getBoundingClientRect();
              const left = blockRect
                ? blockRect.left - wrapperRect.left - 28
                : visualRect.left - wrapperRect.left - 28;

              handle.style.top = `${top}px`;
              handle.style.left = `${left}px`;
            }

            cancelHide();
            handle.style.opacity = '1';
            handle.style.visibility = 'visible';
          } else {
            handle.style.opacity = '0';
            handle.style.visibility = 'hidden';
          }
        });
      };

      const onMouseLeave = () => {
        if (!isLocalDragging) scheduleHide();
      };

      const onMouseEnter = () => cancelHide();
      
      // Lock position when cursor enters the handle
      const onHandleMouseEnter = () => {
        isHandleFocused = true;
        cancelHide();
      };
      
      // Unlock position when cursor leaves the handle
      const onHandleMouseLeave = () => {
        isHandleFocused = false;
        scheduleHide();
      };

      let dragImageEl: HTMLElement | null = null;

      const onDragStart = (event: DragEvent) => {
        isDraggingGlobal = true;
        view.dom.ownerDocument.documentElement.setAttribute('data-custom-note-dragging', 'true');
        removeNativeDropCursors(view);
        event.stopPropagation();
        if (isLocalDragging) return;
        if (!event.dataTransfer) {
          clearCustomDragState();
          return;
        }

        const actualPos = preResolvedDragPos;
        const actualNode = preResolvedDragNode;

        if (actualPos === null || actualPos === undefined || !actualNode) {
          clearCustomDragState();
          return;
        }

        const range = actualNode.type.name === 'listItem'
          ? resolveListItemAt(actualPos, view.state.doc)
          : getBlockRange(view.state.doc, actualPos, actualNode.type.name);
        const finalRange = range;
        
        if (!finalRange || finalRange.node.type.name !== actualNode.type.name) {
          clearCustomDragState();
          return;
        }

        // Prevent dragging the trailing empty paragraph — ProseMirror
        // auto-recreates it on dispatch, producing a spurious blank block.
        if (
          finalRange.node.type.name === 'paragraph' &&
          isEmptyTrailingParagraph(finalRange.node)
        ) {
          clearCustomDragState();
          return;
        }

        // NodeSelection on list items highlights nested sub-lists (z + g).
        // NodeSelection on tables breaks cell content.
        if (actualNode.type.name === 'listItem') {
          const $inside = view.state.doc.resolve(
            Math.min(finalRange.start + 1, view.state.doc.content.size),
          );
          view.dispatch(
            view.state.tr.setSelection(TextSelection.near($inside)),
          );
        } else if (actualNode.type.name !== 'table') {
          view.dispatch(
            view.state.tr.setSelection(
              NodeSelection.create(view.state.doc, finalRange.start),
            ),
          );
        }

        dragSourcePos = finalRange.start;
        dragSourceNode = finalRange.node;

        // Fix 2: Build slice that includes full subtree
        let slice = view.state.doc.slice(finalRange.start, finalRange.end);
        if (slice.openStart > 0 || slice.openEnd > 0) {
          slice = new Slice(slice.content, 0, 0);
        }
        
        // Verify slice includes full node (especially important for listItems with nested children)
        if (actualNode.type.name === 'listItem') {
          const expectedSize = finalRange.node.nodeSize;
          if (slice.content.size < expectedSize - 2) {
            console.warn('[DragStart] WARNING: Slice may be truncated, expected size:', expectedSize, 'got:', slice.content.size);
          }
        }

        const serializer = DOMSerializer.fromSchema(view.state.schema);
        const fragment = serializer.serializeFragment(slice.content);
        const div = document.createElement('div');
        div.appendChild(fragment);

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', div.innerHTML);
        event.dataTransfer.setData('text/plain', div.textContent || '');

        const dom = view.nodeDOM(finalRange.start) as HTMLElement | null;
        
        if (actualNode.type.name === 'listItem' && dom?.tagName === 'LI') {
          dragImageEl = createListItemDragImage(dom);
          event.dataTransfer.setDragImage(dragImageEl, 0, 0);
        } else if (dom) {
          event.dataTransfer.setDragImage(dom, 0, 0);
        }

        event.stopPropagation();
        isLocalDragging = true;
      };

      const onDragEnd = () => {
        clearCustomDragState();
        if (dragImageEl) {
          dragImageEl.remove();
          dragImageEl = null;
        }
        hideHandle();
      };

      const onDragOverCapture = (event: DragEvent) => {
        if (!isDraggingGlobal) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
        updateDropIndicator(event);
      };

      const onDrop = (event: DragEvent) => {
        if (handledDropEvents.has(event)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }

        if (!isDraggingGlobal) {
          return;
        }

        handledDropEvents.add(event);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (
          dragSourcePos === null ||
          dragSourcePos === undefined ||
          !dragSourceNode
        ) {
          clearCustomDragState();
          return;
        }

        const sourceRange = dragSourceNode.type.name === 'listItem'
          ? resolveListItemAt(dragSourcePos, view.state.doc)
          : getBlockRange(view.state.doc, dragSourcePos, dragSourceNode.type.name);
        const finalRange = sourceRange;
        
        if (!finalRange) {
          clearCustomDragState();
          return;
        }

        let insertPos: number;

        if (dragSourceNode.type.name === 'listItem') {
          let listInsertPos = resolveListItemInsertPosFromCoords(
            view,
            event.clientX,
            event.clientY,
          );

          // Fallback: cursor is over non-list content — use block resolver
          if (
            listInsertPos === null ||
            (listInsertPos >= finalRange.start && listInsertPos < finalRange.end)
          ) {
            listInsertPos = resolveBlockInsertPosFromCoords(view, event.clientY);
          }

          if (listInsertPos === null) {
            clearCustomDragState();
            return;
          }

          // If the resolved position falls inside the source listItem itself,
          // the cursor is on the source item (or its child). This is a self‑drop.
          // First, check if it's a true no-op (same position).
          if (
            listInsertPos === finalRange.start ||
            (listInsertPos === finalRange.end && isLastSiblingInList(view.state.doc, finalRange.start))
          ) {
            clearCustomDragState();
            return;
          }
          // Not a no-op — try to find the nearest same-depth sibling instead.
          if (listInsertPos >= finalRange.start && listInsertPos < finalRange.end) {
            // Get the nesting depth of the source item
            const sourceDepth = getListItemNestingDepth(view.state.doc, finalRange.start);

            let best: { pos: number; score: number } | null = null;
            const pointerY = event.clientY;

            for (const item of getAllListItems(view.state.doc)) {
              // Skip source and its descendants
              if (item.start >= finalRange.start && item.end <= finalRange.end) continue;

              // Only consider items at the same nesting depth
              const itemDepth = getListItemNestingDepth(view.state.doc, item.start);
              if (itemDepth !== sourceDepth) continue;

              // Only consider items in the same parent list
              const sameParent = shareParentList(view.state.doc, finalRange.start, item.start);
              if (!sameParent) continue;

              // Score: distance from pointer
              const dom = view.nodeDOM(item.start);
              if (!(dom instanceof HTMLElement)) continue;
              const rect = dom.getBoundingClientRect();
              const itemMid = rect.top + rect.height / 2;
              const score = Math.abs(pointerY - itemMid);

              if (!best || score < best.score) {
                best = { pos: item.start, score };
              }
            }

            if (!best) {
              clearCustomDragState();
              return;
            }

            // Use the nearest sibling's position as the insert position
            listInsertPos = best.pos;
          }

          insertPos = listInsertPos;

          // Nudge when insertPos lands exactly on source's own start (drop
          // cursor at the listItem's own top boundary → insert just before).
          if (insertPos === finalRange.start) {
            insertPos = Math.max(0, insertPos - 1);
          }
        } else {
          insertPos = resolveBlockInsertPosFromCoords(view, event.clientY);

          // Dropping a non-table block: never land inside a table.
          if (dragSourceNode.type.name !== 'table') {
            const $probe = view.state.doc.resolve(
              Math.min(insertPos, view.state.doc.content.size),
            );
            if (isInsideTable($probe)) {
              const blocks = getTopLevelBlocks(view.state.doc);
              const tableBlock = blocks.find((b) => {
                if (b.node.type.name !== 'table') return false;
                return insertPos > b.pos && insertPos < b.end;
              });
              if (tableBlock) {
                const rect = getBlockDOMRect(view, tableBlock);
                insertPos =
                  rect && event.clientY < rect.top + rect.height / 2
                    ? tableBlock.pos
                    : tableBlock.end;
              }
            }
          }
        }

        let slice = view.state.doc.slice(finalRange.start, finalRange.end);
        if (slice.openStart > 0 || slice.openEnd > 0) {
          slice = new Slice(slice.content, 0, 0);
        }
        if (slice.content.childCount === 0) {
          clearCustomDragState();
          return;
        }

        const lastChild = view.state.doc.lastChild;
        const hasTrailingParagraph =
          lastChild !== null && isEmptyTrailingParagraph(lastChild);
        const lastRealContentEnd = hasTrailingParagraph
          ? view.state.doc.content.size - lastChild!.nodeSize
          : view.state.doc.content.size;

        if (
          hasTrailingParagraph &&
          insertPos > lastRealContentEnd
        ) {
          clearCustomDragState();
          return;
        }

        // No-op detection: dropping exactly where it already is
        const wouldBeNoOp = (
          insertPos === finalRange.start ||
          (insertPos === finalRange.end && isLastSiblingInList(view.state.doc, finalRange.start))
        );

        if (wouldBeNoOp) {
          clearCustomDragState();
          return;
        }

        // Guard: insertPos strictly inside source range — abort before moveBlockRange
        if (insertPos > finalRange.start && insertPos < finalRange.end) {
          clearCustomDragState();
          return;
        }

        const tr = moveBlockRange(
          view.state,
          finalRange.start,
          finalRange.end,
          insertPos,
          slice,
        );

        if (!tr) {
          clearCustomDragState();
          return;
        }

        view.dispatch(tr);
        clearCustomDragState();
      };

      view.dom.addEventListener('mousemove', onMouseMove);
      view.dom.addEventListener('mouseleave', onMouseLeave);
      view.dom.addEventListener('mouseenter', onMouseEnter);
      view.dom.addEventListener('dragover', onDragOverCapture, true);
      view.dom.addEventListener('dragenter', onDragOverCapture, true);
      view.dom.addEventListener('drop', onDrop, true);
      handle.addEventListener('dragstart', onDragStart);
      handle.addEventListener('dragend', onDragEnd);
      handle.addEventListener('mouseenter', onHandleMouseEnter);
      handle.addEventListener('mouseleave', onHandleMouseLeave);

      return {
        update(updatedView: EditorView) {
          if (!updatedView.editable) hideHandle();
        },
        destroy() {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          view.dom.removeEventListener('mousemove', onMouseMove);
          view.dom.removeEventListener('mouseleave', onMouseLeave);
          view.dom.removeEventListener('mouseenter', onMouseEnter);
          view.dom.removeEventListener('dragover', onDragOverCapture, true);
          view.dom.removeEventListener('dragenter', onDragOverCapture, true);
          view.dom.removeEventListener('drop', onDrop, true);
          handle.removeEventListener('dragstart', onDragStart);
          handle.removeEventListener('dragend', onDragEnd);
          handle.removeEventListener('mouseenter', onHandleMouseEnter);
          handle.removeEventListener('mouseleave', onHandleMouseLeave);
          cancelHide();
          dropIndicator.remove();
          if (handle.parentNode) {
            handle.parentNode.removeChild(handle);
          }
        },
      };
    },
  });
}

/** Custom block drag handle — not @tiptap/extension-drag-handle. */
export const CustomDragHandle = Extension.create({
  name: 'customDragHandle',

  addProseMirrorPlugins() {
    return [createDragHandlePlugin()];
  },
});

export default CustomDragHandle;
