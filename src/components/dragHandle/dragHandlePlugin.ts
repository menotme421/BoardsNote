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
  pos: number;
  end: number;
  node: ProseMirrorNode;
}

/** Vertical padding added above/below each list row hit band. */
const LIST_ROW_PAD_Y = 36;
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

/** Map a DOM <li> to its ProseMirror listItem node (exact nodeDOM match). */
function getListItemForLI(
  view: EditorView,
  li: HTMLElement,
): ListItemBlock | null {
  let match: ListItemBlock | null = null;
  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'listItem') return;
    if (view.nodeDOM(pos) === li) {
      match = { pos, end: pos + node.nodeSize, node };
    }
  });
  return match;
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
  const dom = view.nodeDOM(item.pos);
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
      items.push({ pos, end: pos + node.nodeSize, node });
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
    pos: target.pos,
    end: target.pos + target.node.nodeSize,
    node: target.node,
  };
  const row = getListItemRowRect(view, item, editorRect);

  if (clientY < row.top + row.height / 2) {
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
    const dom = view.nodeDOM(item.pos);
    if (!(dom instanceof HTMLElement)) continue;
    const rowRect = getListItemRowRect(view, item, editorRect);
    targets.push(
      finishDragTarget(view, clientX, clientY, item.node, item.pos, dom, rowRect),
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
    const item = getListItemForLI(view, innerLi);
    if (item) {
      const dom = view.nodeDOM(item.pos);
      if (dom instanceof HTMLElement) {
        const editorRect = getEditorContentRect(view);
        const rowRect = getListItemRowRect(view, item, editorRect);
        return finishDragTarget(
          view,
          clientX,
          clientY,
          item.node,
          item.pos,
          dom,
          rowRect,
        );
      }
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
    console.log('[moveBlockRange] ABORT: insertPos', insertPos, 'is inside source range', sourceStart, '-', sourceEnd);
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
        deleteFrom = $check.before(d - 1);
        deleteTo = $check.after(d - 1);
        console.log('[moveBlockRange] Expanded delete to UL range:', deleteFrom, '-', deleteTo);
      }
      break;
    }
  }

  if (insertPos < sourceStart) {
    console.log('[moveBlockRange] insertPos < sourceStart case');
    console.log('[moveBlockRange] Before insert - sourceStart:', sourceStart, 'sourceEnd:', sourceEnd);
    console.log('[moveBlockRange] Deleting from', deleteFrom, 'to', deleteTo, '(size:', deleteTo - deleteFrom, ')');
    tr = tr.delete(deleteFrom, deleteTo);
    console.log('[moveBlockRange] After delete, doc size:', tr.doc.content.size);
    const mappedInsert = tr.mapping.map(insertPos, -1);
    console.log('[moveBlockRange] After delete - insert at:', mappedInsert);
    console.log('[moveBlockRange] Slice openStart:', closed.openStart, 'openEnd:', closed.openEnd);
    console.log('[moveBlockRange] Slice content:', closed.content.childCount, 'children, total size:', closed.content.size);
    console.log('[moveBlockRange] Inserting slice with', closed.content.size, 'nodes');
    // Use replace instead of insert to preserve slice structure
    tr = tr.replace(mappedInsert, mappedInsert, closed);
    console.log('[moveBlockRange] After insert, doc size:', tr.doc.content.size);
    console.log('[moveBlockRange] Expected size:', 102 + closed.content.size, 'Actual:', tr.doc.content.size);
  } else if (insertPos === sourceEnd) {
    // When insertPos equals sourceEnd, the drop is at the boundary
    // between the source and the next sibling.  "Delete first, then insert"
    // maps insertPos back to sourceStart — a no-op.  "Insert first, then
    // delete" also produces a no-op (the copy shifts back after the delete).
    // Instead: delete the source first, then place it AFTER the next sibling.
    console.log('[moveBlockRange] insertPos === sourceEnd case — delete first, insert past next sibling');
    console.log('[moveBlockRange] Deleting source at', deleteFrom, '-', deleteTo, '(size:', deleteTo - deleteFrom, ')');
    tr = tr.delete(deleteFrom, deleteTo);
    console.log('[moveBlockRange] After delete, doc size:', tr.doc.content.size);
    const mappedInsert = tr.mapping.map(insertPos, -1);
    console.log('[moveBlockRange] Mapped insertPos:', mappedInsert);
    // Find the node that starts at mappedInsert (the next sibling) by
    // walking up the resolved position's depth.  $pos.nodeAfter is wrong
    // because it returns the *first child* of the node at this position,
    // not the node itself.
    const $next = tr.doc.resolve(mappedInsert);
    let nextSize = 0;
    for (let d = $next.depth; d >= 1; d--) {
      if ($next.before(d) === mappedInsert) {
        nextSize = $next.node(d).nodeSize;
        break;
      }
    }
    const lastChildOfDoc = tr.doc.lastChild;
    const hasTrailingPara =
      lastChildOfDoc !== null && isEmptyTrailingParagraph(lastChildOfDoc);
    const docContentEnd = hasTrailingPara
      ? tr.doc.content.size - lastChildOfDoc!.nodeSize
      : tr.doc.content.size;
    const pasteAt = nextSize > 0 ? mappedInsert + nextSize : docContentEnd;
    if (nextSize > 0) {
      console.log('[moveBlockRange] Next sibling at', mappedInsert, 'size', nextSize, '— pasting at', pasteAt);
    } else {
      console.log('[moveBlockRange] No next sibling at', mappedInsert, '— pasting at end:', pasteAt);
    }
    console.log('[moveBlockRange] Inserting slice at', pasteAt, '(size:', closed.content.size, ')');
    tr = tr.replace(pasteAt, pasteAt, closed);
    console.log('[moveBlockRange] After insert, doc size:', tr.doc.content.size);
  } else {
    console.log('[moveBlockRange] insertPos > sourceEnd case');
    tr = tr.delete(deleteFrom, deleteTo);
    const mappedInsert = tr.mapping.map(insertPos, -1);
    // Use replace instead of insert to preserve slice structure
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
          if (
            dragSourcePos !== null &&
            dragSourcePos !== undefined &&
            dragSourceNode
          ) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        dragover: (view, event) => {
          if (dragSourceNode) {
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

      let isDragging = false;
      let hideTimeout: number | null = null;
      let preResolvedDragPos: number | null = null;
      let preResolvedDragNode: ProseMirrorNode | null = null;
      let isHandleFocused = false; // Lock flag: prevents position updates when cursor is on handle

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

      let rafId: number | null = null;

      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) return;
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
              
              // Horizontal: node's left edge - 28px
              const left = visualRect.left - wrapperRect.left - 28;
              
              handle.style.top = `${top}px`;
              handle.style.left = `${left}px`;
            }
          }

          // ============================================================
          // STEP B — PROSEMIRROR RESOLUTION (drag identity only)
          // Produces: { pos, node } for drag source
          // Uses view.posAtCoords — completely independent of Step A
          // ============================================================
          // Lock guard: skip resolution if handle is focused (cursor is on handle)
          if (isHandleFocused) {
            return;
          }
          
          const pmPos = view.posAtCoords({ left: clientX, top: clientY });
          if (pmPos) {
            // Fix 3: Guard against pos: 0 — filter out invalid root positions
            const contentStart = 1; // Position 0 is always document root
            if (pmPos.pos < contentStart) {
              // Discard invalid position, keep previous valid one
              return;
            }
            
            // Use view.nodeDOM to find the actual DOM element and map it to a ProseMirror position
            // This ensures we get the correct node boundary position
            let targetPos: number | null = null;
            let targetNode: ProseMirrorNode | null = null;
            
            // Try to find the node by walking through all nodes and matching DOM
            const resolvedPos = view.state.doc.resolve(pmPos.pos);
            
            // For listItem, find it via DOM element matching
            const domElement = document.elementFromPoint(clientX, clientY);
            if (domElement) {
              const liElement = domElement.closest('li');
              if (liElement) {
                // Find which listItem this DOM element corresponds to
                view.state.doc.descendants((node, pos) => {
                  if (node.type.name === 'listItem') {
                    const nodeDom = view.nodeDOM(pos);
                    if (nodeDom === liElement) {
                      targetPos = pos;
                      targetNode = node;
                      return false; // Stop searching
                    }
                  }
                });
              }
            }
            
            // If not a listItem, use the resolved position directly
            if (!targetPos) {
              // Walk up to find the correct block node
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
            
            // Store the resolved position and node for drag operations
            if (targetPos !== null && targetNode !== null && targetPos >= contentStart) {
              preResolvedDragPos = targetPos;
              preResolvedDragNode = targetNode;
              console.log('[DragHandle Step B] Resolved pos:', targetPos, 'nodeType:', targetNode.type.name);
            }
          }
          
          // Show handle ONLY if we have a valid non-zero position
          // This ensures the frozen position is always correct for the node the handle is sitting on
          if (preResolvedDragPos !== null && preResolvedDragNode !== null && preResolvedDragPos >= 1) {
            cancelHide();
            handle.style.opacity = '1';
            handle.style.visibility = 'visible';
          } else {
            // Hide handle if no valid position resolved
            handle.style.opacity = '0';
            handle.style.visibility = 'hidden';
          }
        });
      };

      const onMouseLeave = () => {
        if (!isDragging) scheduleHide();
      };

      const onMouseEnter = () => cancelHide();
      
      // Lock position when cursor enters the handle
      const onHandleMouseEnter = () => {
        isHandleFocused = true;
        cancelHide();
        console.log('[DragHandle] Handle focused - position locked at:', preResolvedDragPos, preResolvedDragNode?.type.name);
      };
      
      // Unlock position when cursor leaves the handle
      const onHandleMouseLeave = () => {
        isHandleFocused = false;
        console.log('[DragHandle] Handle unfocused - position updates resumed');
        scheduleHide();
      };

      let dragImageEl: HTMLElement | null = null;

      const onDragStart = (event: DragEvent) => {
        event.stopPropagation();
        if (isDragging) return;
        if (!event.dataTransfer) return;

        console.log('[DragStart] preResolvedDragPos:', preResolvedDragPos, 'preResolvedDragNode:', preResolvedDragNode?.type.name);
        console.log('[DragStart] isHandleFocused:', isHandleFocused, '(position should be locked)');

        // Use ONLY the pre-resolved position from Step B - no override
        const actualPos = preResolvedDragPos;
        const actualNode = preResolvedDragNode;

        console.log('[DragStart] actualPos:', actualPos, 'actualNode:', actualNode?.type.name);

        if (actualPos === null || actualPos === undefined || !actualNode) {
          console.log('[DragStart] ABORT: No valid position resolved');
          isDragging = true;
          return;
        }

        const range = getBlockRange(
          view.state.doc,
          actualPos,
          actualNode.type.name,
        );
        console.log('[DragStart] range:', range ? { start: range.start, end: range.end, nodeType: range.node.type.name } : null);
        
        // Fix 1: Handle listItem separately if getBlockRange returned null
        let finalRange = range;
        if (!finalRange && actualNode.type.name === 'listItem') {
          // Build range manually for listItem using ancestor chain
          const $pos = view.state.doc.resolve(Math.min(actualPos + 1, view.state.doc.content.size));
          for (let depth = $pos.depth; depth >= 1; depth--) {
            if ($pos.node(depth).type.name === 'listItem') {
              const node = $pos.node(depth);
              const start = $pos.before(depth);
              const end = $pos.after(depth);
              finalRange = { start, end, node };
              console.log('[DragStart] Manual listItem range:', { start, end, nodeType: node.type.name });
              break;
            }
          }
        }
        
        if (!finalRange || finalRange.node.type.name !== actualNode.type.name) {
          console.log('[DragStart] ABORT: Invalid range or node mismatch');
          isDragging = true;
          return;
        }

        // Prevent dragging the trailing empty paragraph — ProseMirror
        // auto-recreates it on dispatch, producing a spurious blank block.
        if (
          finalRange.node.type.name === 'paragraph' &&
          isEmptyTrailingParagraph(finalRange.node)
        ) {
          console.log('[DragStart] ABORT: Cannot drag trailing empty paragraph');
          isDragging = true;
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
          const expectedSize = finalRange.node.nodeSize; // nodeSize already accounts for content
          console.log('[DragStart] Slice validation:', {
            sliceSize: slice.content.size,
            expectedSize,
            matches: slice.content.size === expectedSize
          });
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
        console.log('[DragStart] finalRange.start:', finalRange.start, 'dom:', dom?.tagName, 'dom element:', dom);
        
        if (actualNode.type.name === 'listItem' && dom?.tagName === 'LI') {
          console.log('[DragStart] Creating list item drag image');
          dragImageEl = createListItemDragImage(dom);
          event.dataTransfer.setDragImage(dragImageEl, 0, 0);
        } else if (dom) {
          console.log('[DragStart] Using default drag image');
          event.dataTransfer.setDragImage(dom, 0, 0);
        } else {
          console.log('[DragStart] WARNING: No DOM element found for range.start');
        }

        event.stopPropagation();
        isDragging = true;
      };

      const onDragEnd = () => {
        isDragging = false;
        dragSourcePos = null;
        dragSourceNode = null;
        isHandleFocused = false; // Unlock position after drag completes
        console.log('[DragHandle] Drag ended - position unlocked');
        if (dragImageEl) {
          dragImageEl.remove();
          dragImageEl = null;
        }
        hideHandle();
      };

      const onDrop = (event: DragEvent) => {
        console.log('[Drop] Handler called');
        
        if (
          dragSourcePos === null ||
          dragSourcePos === undefined ||
          !dragSourceNode
        ) {
          console.log('[Drop] ABORT: No drag source');
          return;
        }

        console.log('[Drop] dragSourcePos:', dragSourcePos, 'dragSourceNode:', dragSourceNode.type.name);

        const sourceRange = getBlockRange(
          view.state.doc,
          dragSourcePos,
          dragSourceNode.type.name,
        );
        
        console.log('[Drop] sourceRange:', sourceRange ? { start: sourceRange.start, end: sourceRange.end } : null);
        
        // Fix 1: Handle listItem separately if getBlockRange returned null
        let finalRange = sourceRange;
        if (!finalRange && dragSourceNode.type.name === 'listItem') {
          // Build range manually for listItem using ancestor chain
          const $pos = view.state.doc.resolve(Math.min(dragSourcePos + 1, view.state.doc.content.size));
          for (let depth = $pos.depth; depth >= 1; depth--) {
            if ($pos.node(depth).type.name === 'listItem') {
              const node = $pos.node(depth);
              const start = $pos.before(depth);
              const end = $pos.after(depth);
              finalRange = { start, end, node };
              console.log('[Drop] Manual listItem range:', { start, end });
              break;
            }
          }
        }
        
        if (!finalRange) {
          console.log('[Drop] ABORT: No valid range');
          return;
        }

        let insertPos: number;

        if (dragSourceNode.type.name === 'listItem') {
          const listInsertPos = resolveListItemInsertPosFromCoords(
            view,
            event.clientX,
            event.clientY,
          );
          if (listInsertPos === null) {
            console.log('[Drop] ABORT: resolveListItemInsertPosFromCoords returned null');
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          // If the resolved position falls inside the source listItem itself,
          // the list resolver found the SOURCE as the target (its padded row
          // covers the actual cursor location).  Instead of falling back to
          // the top‑level block resolver (which places the item at the wrong
          // nesting level), find the nearest OTHER listItem to the cursor.
          if (listInsertPos >= finalRange.start && listInsertPos < finalRange.end) {
            const editorRect = getEditorContentRect(view);
            let best: { pos: number; score: number } | null = null;
            for (const item of getAllListItems(view.state.doc)) {
              // Skip the source itself (and any node inside its range)
              if (item.pos >= finalRange.start && item.end <= finalRange.end) continue;
              const dom = view.nodeDOM(item.pos);
              if (!(dom instanceof HTMLElement)) continue;
              const rowRect = getListItemRowRect(
                view,
                { pos: item.pos, end: item.end, node: item.node },
                editorRect,
              );
              const mid = rowRect.top + rowRect.height / 2;
              const inside = event.clientY >= rowRect.top && event.clientY <= rowRect.bottom;
              const score = inside
                ? Math.abs(event.clientY - mid)
                : Math.abs(event.clientY - mid) + 1e6;
              if (!best || score < best.score) {
                best = { pos: item.pos, score };
              }
            }
            if (best) {
              const item = getAllListItems(view.state.doc).find((i) => i.pos === best!.pos)!;
              const rowRect = getListItemRowRect(
                view,
                { pos: item.pos, end: item.end, node: item.node },
                editorRect,
              );
              insertPos =
                event.clientY < rowRect.top + rowRect.height / 2
                  ? item.pos
                  : item.end;
              console.log('[Drop] listItem self‑target fallback — found target at', best.pos, 'insertPos:', insertPos);
            } else {
              // No other listItem found — use parent list boundaries
              const $source = view.state.doc.resolve(
                Math.min(finalRange.start + 1, view.state.doc.content.size),
              );
              let listStart = -1;
              let listEnd = -1;
              for (let d = $source.depth; d >= 1; d--) {
                if (isListNode($source.node(d))) {
                  listStart = $source.before(d);
                  listEnd = $source.after(d);
                  break;
                }
              }
              if (listStart >= 0) {
                const sourceRow = getListItemRowRect(
                  view,
                  { pos: finalRange.start, end: finalRange.end, node: finalRange.node },
                  editorRect,
                );
                insertPos =
                  event.clientY < sourceRow.top + sourceRow.height / 2
                    ? listStart
                    : listEnd;
                console.log('[Drop] listItem self‑target fallback — using parent list, insertPos:', insertPos);
              } else {
                // Last resort
                insertPos = resolveBlockInsertPosFromCoords(view, event.clientY);
                console.log('[Drop] listItem self‑target fallback — no parent list, using block pos:', insertPos);
              }
            }
          } else {
            insertPos = listInsertPos;
          }

          // Also nudge when listInsertPos lands exactly on the source's own
          // start (inner drop cursor at the listItem's own top boundary).
          if (insertPos === finalRange.start) {
            insertPos = Math.max(0, insertPos - 1);
          }

          if (insertPos >= finalRange.start && insertPos < finalRange.end) {
            console.log('[Drop] listItem insertPos inside source range — letting moveBlockRange handle no-op');
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

        console.log('[Drop] finalRange:', { start: finalRange.start, end: finalRange.end });
        console.log('[Drop] insertPos:', insertPos);
        console.log('[Drop] Is insertPos inside source?', insertPos >= finalRange.start && insertPos <= finalRange.end);

        let slice = view.state.doc.slice(finalRange.start, finalRange.end);
        if (slice.openStart > 0 || slice.openEnd > 0) {
          slice = new Slice(slice.content, 0, 0);
        }
        if (slice.content.childCount === 0) return;

        console.log('[Drop] Slice content:', slice.content.childCount, 'children');
        console.log('[Drop] Slice content type:', Array.from({length: slice.content.childCount}, (_, i) => slice.content.child(i).type.name).join(', '));
        
        // Use the insertPos as-is - resolveListItemInsertPosFromCoords already handles list context
        console.log('[Drop] Using insertPos:', insertPos);

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
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const tr = moveBlockRange(
          view.state,
          finalRange.start,
          finalRange.end,
          insertPos,
          slice,
        );

        console.log('[Drop] moveBlockRange result:', tr ? 'Transaction created' : 'null');

        if (!tr) {
          console.log('[Drop] ABORT: moveBlockRange returned null');
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        console.log('[Drop] Dispatching transaction, insertPos:', insertPos);
        console.log('[Drop] Transaction steps:', tr.steps.length);
        console.log('[Drop] Transaction doc size before:', view.state.doc.content.size);
        console.log('[Drop] Transaction steps detail:', tr.steps.map((s, i) => `${i}: ${s.constructor.name}`).join(', '));
        console.log('[Drop] Transaction is valid:', tr.doc.content.size > 0);
        
        // Check if transaction is being rejected
        const oldDoc = view.state.doc;
        view.dispatch(tr);
        const newDoc = view.state.doc;
        
        console.log('[Drop] Transaction dispatched, new doc size:', newDoc.content.size);
        console.log('[Drop] Document changed:', oldDoc !== newDoc);
        console.log('[Drop] Same transaction doc?', newDoc === tr.doc);
        
        event.preventDefault();
        event.stopPropagation();
      };

      view.dom.addEventListener('mousemove', onMouseMove);
      view.dom.addEventListener('mouseleave', onMouseLeave);
      view.dom.addEventListener('mouseenter', onMouseEnter);
      view.dom.addEventListener('drop', onDrop);
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
          view.dom.removeEventListener('drop', onDrop);
          handle.removeEventListener('dragstart', onDragStart);
          handle.removeEventListener('dragend', onDragEnd);
          handle.removeEventListener('mouseenter', onHandleMouseEnter);
          handle.removeEventListener('mouseleave', onHandleMouseLeave);
          cancelHide();
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
