import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { DOMSerializer, type Node as ProseMirrorNode, Slice, Fragment } from '@tiptap/pm/model';

const DRAG_HANDLE_PLUGIN_KEY = new PluginKey('customDragHandle');

interface DragTarget {
  node: ProseMirrorNode;
  pos: number;
  dom: HTMLElement;
}

/** Types that should never be independently targeted by the drag handle. */
const EXCLUDED_TYPES = new Set(['doc', 'tableRow', 'tableCell', 'tableHeader']);

/**
 * Resolve the deepest suitable block-level ProseMirror node under a DOM element.
 * Walks up the DOM until a ProseMirror-mappable element is found, then
 * walks up the resolved position's ancestor chain to find the first (deepest)
 * block node that is not excluded. listItem is skipped in the first pass so
 * that its children (paragraph, horizontalRule, etc.) are preferred; if none
 * are found, listItem is used as a fallback.
 */
function resolveTarget(view: EditorView, el: Element | null): DragTarget | null {
  if (!el) return null;

  // Walk up the DOM to find an element ProseMirror can map to a position
  let current: Element | null = el;
  let resolvedPos: number | null = null;

  while (current && current !== view.dom) {
    try {
      const pos = view.posAtDOM(current, 0);
      // posAtDOM can return 0 for the root — skip that
      if (pos > 0) {
        resolvedPos = pos;
        break;
      }
    } catch {
      // element not mappable — continue walking up
    }
    current = current.parentElement;
  }

  if (resolvedPos === null) return null;

  // Clamp pos to valid doc range
  const docSize = view.state.doc.content.size;
  const safePos = Math.min(Math.max(resolvedPos, 0), docSize);

  // If cursor is inside a table, always target the whole table
  // Walk up DOM to find table element directly, then use posAtDOM on it
  let tableElement: Element | null = el;
  while (tableElement && tableElement !== view.dom) {
    if (tableElement.tagName === 'TABLE' || tableElement.getAttribute('data-node-type') === 'table') {
      // Found table DOM element - resolve its position directly
      try {
        const tablePos = view.posAtDOM(tableElement, 0);
        if (tablePos > 0) {
          const tableNode = view.state.doc.nodeAt(tablePos);
          if (tableNode && tableNode.type.name === 'table') {
            console.log('[DragHandle] resolveTarget: table found via DOM walk', { tablePos });
            return { node: tableNode, pos: tablePos, dom: tableElement as HTMLElement };
          }
        }
      } catch {
        // posAtDOM failed, continue
      }
      break; // Found table element but couldn't resolve, stop here
    }
    tableElement = tableElement.parentElement;
  }
  
  // Fallback: use the resolved position from ancestor chain
  let $posEarly;
  try {
    $posEarly = view.state.doc.resolve(safePos);
  } catch {
    return null;
  }
  for (let depth = $posEarly.depth; depth >= 1; depth--) {
    const node = $posEarly.node(depth);
    if (node.type.name === 'table') {
      const nodePos = $posEarly.before(depth);
      const dom = view.nodeDOM(nodePos);
      if (dom && dom instanceof HTMLElement) {
        console.log('[DragHandle] resolveTarget: table found via before()', { nodePos, depth });
        return { node, pos: nodePos, dom };
      }
    }
  }

  const $pos = $posEarly;

  // ALWAYS check if we're inside a listItem first (before any other logic).
  // This ensures consistent behavior regardless of where the cursor hits.
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const ancestor = $pos.node(depth);
    if (ancestor.type.name === 'listItem') {
      const nodePos = $pos.before(depth);
      // nodePos can be 0 for first node - that's invalid for drag source
      if (nodePos === 0) break;
      const dom = view.nodeDOM(nodePos);
      if (dom && dom instanceof HTMLElement) {
        return { node: ancestor, pos: nodePos, dom };
      }
      // Found listItem but DOM not available — still stop here
      break;
    }
  }

  // Check for a leaf/atom block node directly at this position.
  // Leaf nodes like horizontalRule have no content, so they never
  // appear as ancestors in the $pos chain — we must look them up
  // explicitly via nodeAt().
  // NOTE: This runs AFTER listItem check, so list items always take priority.
  const nodeAtPos = view.state.doc.nodeAt(safePos);
  if (
    nodeAtPos &&
    nodeAtPos.isBlock &&
    !EXCLUDED_TYPES.has(nodeAtPos.type.name) &&
    nodeAtPos.type.name !== 'listItem' &&
    nodeAtPos.type.name !== 'bulletList' &&
    nodeAtPos.type.name !== 'orderedList'
  ) {
    const dom = view.nodeDOM(safePos);
    if (dom && dom instanceof HTMLElement) {
      return { node: nodeAtPos, pos: safePos, dom };
    }
  }

  // Walk from deepest to shallowest — find the first suitable block node
  // (for non-list items)
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const node = $pos.node(depth);
    const nodeType = node.type.name;

    // Skip excluded types (doc, table internals) and list-related nodes
    if (EXCLUDED_TYPES.has(nodeType) || 
        nodeType === 'listItem' || 
        nodeType === 'bulletList' || 
        nodeType === 'orderedList') {
      continue;
    }

    // Accept any block node
    if (node.isBlock) {
      const nodePos = $pos.before(depth);
      // nodePos can be 0 for first node - that's invalid for drag source
      if (nodePos === 0) continue;
      const dom = view.nodeDOM(nodePos);
      if (dom && dom instanceof HTMLElement) {
        return { node, pos: nodePos, dom };
      }
    }
  }

  return null;
}

function createDragHandlePlugin() {
  return new Plugin({
    key: DRAG_HANDLE_PLUGIN_KEY,

    view(view: EditorView) {
      // --- Create handle DOM ---
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

      let currentTarget: DragTarget | null = null;
      let isDragging = false;
      let hideTimeout: number | null = null;
      let dragSourcePos: number | null = null;
      let dragSourceNode: ProseMirrorNode | null = null;
      let dragSuccessful = false;
      
      // Pre-resolved drag source - stored when handle is shown, not when drag starts
      let preResolvedDragPos: number | null = null;
      let preResolvedDragNode: ProseMirrorNode | null = null;

      // --- Delayed hide helpers ---
      function scheduleHide() {
        if (hideTimeout) return; // already scheduled
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

      // --- Positioning ---
      function updatePosition(target: DragTarget) {
        const nodeRect = target.dom.getBoundingClientRect();
        const wrapperRect = wrapper!.getBoundingClientRect();
        const handleWidth = handle.offsetWidth || 24;
        const handleHeight = handle.offsetHeight || 24;

        // Vertically center the handle with the node when the node is shorter
        // than the handle (e.g. a thin <hr> divider). Otherwise align to top.
        let top: number;
        if (nodeRect.height < handleHeight) {
          top = nodeRect.top - wrapperRect.top + wrapper!.scrollTop
            + (nodeRect.height - handleHeight) / 2;
        } else {
          top = nodeRect.top - wrapperRect.top + wrapper!.scrollTop;
        }

        // Default: position to the left of the target node's left edge.
        let left = nodeRect.left - wrapperRect.left - handleWidth - 4;

        // If the target is inside a list (ul/ol), use the list container's
        // left edge instead of the inner paragraph's left edge. This avoids
        // the handle overlapping with bullet/number markers.
        const listAncestor = target.dom.closest('ul, ol');
        if (listAncestor) {
          const listRect = listAncestor.getBoundingClientRect();
          left = listRect.left - wrapperRect.left - handleWidth - 4;
        }

        handle.style.top = `${top}px`;
        handle.style.left = `${left}px`;
      }

      function showHandle(target: DragTarget) {
        currentTarget = target;
        updatePosition(target);
        
        // Pre-resolve and store the drag source position synchronously
        // This avoids resolution issues during dragstart event
        preResolvedDragPos = target.pos;
        preResolvedDragNode = target.node;
        
        console.log('[DragHandle] Handle shown - pre-resolved position:', {
          nodeType: target.node.type.name,
          pos: target.pos
        });
        
        handle.style.opacity = '1';
        handle.style.visibility = 'visible';
      }

      function hideHandle() {
        handle.style.opacity = '0';
        handle.style.visibility = 'hidden';
        currentTarget = null;
        // Clear pre-resolved drag source when handle is hidden
        preResolvedDragPos = null;
        preResolvedDragNode = null;
      }

      // --- Mousemove (requestAnimationFrame for ~16ms responsiveness) ---
      let rafId: number | null = null;

      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) return;
        if (!view.editable) {
          hideHandle();
          return;
        }
        if (rafId !== null) return; // already scheduled for this frame
        const { clientX, clientY } = e;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          
          // Get element under cursor, but ignore the drag handle itself
          let el = document.elementFromPoint(clientX, clientY);
          
          // If the element is the handle or inside the handle, ignore it
          // and use the last known target instead
          if (el && (el === handle || handle.contains(el))) {
            // Mouse is over the handle - keep the current target
            // Don't re-resolve from handle's position (it's outside editor)
            return;
          }
          
          const target = resolveTarget(view, el);

          if (target) {
            cancelHide();
            showHandle(target);
          }
          // Do NOT hide if no target found mid-move — just keep last position
        });
      };

      // --- Mouseleave: schedule delayed hide when leaving editor ---
      const onMouseLeave = () => {
        if (!isDragging) {
          scheduleHide();
        }
      };

      // --- Mouseenter on editor: cancel pending hide ---
      const onMouseEnter = () => {
        cancelHide();
      };

      // --- Mouseenter on handle: cancel pending hide so user can reach it ---
      const onHandleMouseEnter = () => {
        cancelHide();
      };

      // --- Drag start from handle ---
      const onDragStart = (event: DragEvent) => {
        // Guard against multiple drag start firings for the same gesture
        if (isDragging) {
          return;
        }
        
        if (!event.dataTransfer) return;
        
        // Use the pre-resolved position (set when handle was shown)
        // This avoids resolution timing issues during dragstart
        const actualPos = preResolvedDragPos;
        const actualNode = preResolvedDragNode;
        
        // If position is invalid or 0, let ProseMirror handle the drag natively
        // Don't abort the drag - just skip custom handling
        if (!actualPos || actualPos === 0 || !actualNode) {
          console.log('[DragHandle] Using native drag handling (no pre-resolved position)');
          // Don't set view.dragging - let ProseMirror's native behavior work
          isDragging = true;
          return;
        }
        
        console.log('[DragHandle] Drag start:', {
          nodeType: actualNode.type.name,
          pos: actualPos,
          nodeSize: actualNode.nodeSize
        });

        // 2. Set the selection to the target node for visual feedback
        const tr = view.state.tr;
        const selection = NodeSelection.create(view.state.doc, actualPos);
        tr.setSelection(selection);
        view.dispatch(tr);

        // 3. Store the source position and node info for the custom drop handler
        // This is captured ONCE and locked for the duration of this drag
        dragSourcePos = actualPos;
        dragSourceNode = actualNode;

        // 4. Create a precise slice that captures ONLY the single node.
        //    Uses the node's exact boundaries (pos to pos + nodeSize).
        const nodeStart = actualPos;
        const nodeEnd = actualPos + actualNode.nodeSize;
        
        // Extract just this node from the document using doc.slice().
        let slice = view.state.doc.slice(nodeStart, nodeEnd);
        
        // Ensure the slice is closed (openStart = 0, openEnd = 0) by wrapping it
        // in a new Slice if needed. This is critical for list items — if the slice
        // has open depths > 0, ProseMirror will try to splice it into the target
        // node's content instead of inserting it as a sibling.
        if (slice.openStart > 0 || slice.openEnd > 0) {
          slice = new Slice(slice.content, 0, 0);
        }
        
        // The slice is now guaranteed to be closed, ensuring ProseMirror treats
        // it as a self-contained unit to be inserted as a sibling node.
        (view as any).dragging = { slice, move: true };

        // 5. Serialize the slice to HTML via the schema's DOMSerializer so
        //    ProseMirror can parse it on drop and correctly perform a move.
        const serializer = DOMSerializer.fromSchema(view.state.schema);
        const fragment = serializer.serializeFragment(slice.content);
        const div = document.createElement('div');
        div.appendChild(fragment);

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', div.innerHTML);
        event.dataTransfer.setData('text/plain', div.textContent || ''); // fallback

        const dom = view.nodeDOM(actualPos) as HTMLElement | null;
        if (dom) {
          event.dataTransfer.setDragImage(dom, 0, 0);
        }

        isDragging = true;
      };

      // --- Drag end ---
      const onDragEnd = () => {
        isDragging = false;
        
        // Clear ProseMirror's drag state to prevent any residual handling
        (view as any).dragging = null;
        
        // Note: The custom drop handler (onDrop) handles listItem nodes.
        // For all other node types (tables, paragraphs, headings, etc.),
        // ProseMirror's native drop handler handles the move with delete+insert.
        
        dragSourcePos = null;
        dragSourceNode = null;
        dragSuccessful = false;
        
        // Hide briefly; mousemove will re-show on next hover
        hideHandle();
      };

      // --- Drop handler ---
      // Custom drop handler ONLY for listItems to ensure they're inserted between
      // list items, not inside them. For all other node types (tables, paragraphs,
      // headings, etc.), let ProseMirror's native drop handler handle it.
      const onDrop = (event: DragEvent) => {
        dragSuccessful = true;
        
        // Only handle drops for list items - let ProseMirror handle everything else
        if (!dragSourcePos || !dragSourceNode) return;
        if (dragSourceNode.type.name !== 'listItem') return;
        
        // The slice is already in view.dragging from onDragStart
        const dragging = (view as any).dragging;
        if (!dragging || !dragging.slice) return;
        
        // Get the drop position from the event
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!dropPos) return;
        
        const $dropPos = view.state.doc.resolve(dropPos.pos);
        
        // For listItems: insert between list items, not inside them
        let insertPos = dropPos.pos;
        
        for (let depth = $dropPos.depth; depth >= 1; depth--) {
          const node = $dropPos.node(depth);
          if (node.type.name === 'listItem') {
            // Insert BEFORE this listItem (at its start position)
            insertPos = $dropPos.before(depth);
            break;
          }
        }
        
        // Determine if we're dropping above or below the source
        const isDroppingAbove = dropPos.pos < dragSourcePos;
        
        // Create a transaction to perform the move
        const tr = view.state.tr;
        
        if (isDroppingAbove) {
          // DROPPING ABOVE: Delete first, then insert
          tr.delete(dragSourcePos, dragSourcePos + dragSourceNode.nodeSize);
          tr.insert(insertPos, dragging.slice.content);
        } else {
          // DROPPING BELOW: Insert first, then delete
          let adjustedInsertPos = insertPos;
          if (adjustedInsertPos > dragSourcePos) {
            adjustedInsertPos += dragSourceNode.nodeSize;
          }
          
          tr.insert(adjustedInsertPos, dragging.slice.content);
          tr.delete(dragSourcePos, dragSourcePos + dragSourceNode.nodeSize);
        }
        
        // Dispatch the transaction
        view.dispatch(tr);
        
        // Prevent ProseMirror's native drop handler from running
        event.preventDefault();
        event.stopPropagation();
      };

      // --- Register listeners ---
      view.dom.addEventListener('mousemove', onMouseMove);
      view.dom.addEventListener('mouseleave', onMouseLeave);
      view.dom.addEventListener('mouseenter', onMouseEnter);
      view.dom.addEventListener('drop', onDrop);
      handle.addEventListener('dragstart', onDragStart);
      handle.addEventListener('dragend', onDragEnd);
      handle.addEventListener('mouseenter', onHandleMouseEnter);

      return {
        update(updatedView: EditorView) {
          if (!updatedView.editable) {
            hideHandle();
          }
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
          cancelHide();
          if (handle.parentNode) {
            handle.parentNode.removeChild(handle);
          }
        },
      };
    },
  });
}

export const CustomDragHandle = Extension.create({
  name: 'customDragHandle',

  addProseMirrorPlugins() {
    return [createDragHandlePlugin()];
  },
});

export default CustomDragHandle;
