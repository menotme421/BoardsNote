import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { dropCursor as pmDropCursor } from 'prosemirror-dropcursor';
import { logToBackend } from '../../App';

type DropCursorView = {
  dragend: () => void;
  drop: () => void;
  setCursor: (pos: number | null) => void;
  timeout: number;
  cursorPos?: number | null;
  element?: HTMLElement | null;
  destroy: () => void;
};

function immediateDropCursor(options: {
  color?: string | false;
  width?: number;
  class?: string;
}) {
  const base = pmDropCursor(options);
  const createView = base.spec.view!;

  return new Plugin({
    view(editorView) {
      const view = createView(editorView) as DropCursorView;

      const clearCursor = () => {
        clearTimeout(view.timeout);
        try {
          view.setCursor(null);
        } catch {
          view.element?.remove();
          view.element = null;
          view.cursorPos = null;
        }
      };

      view.dragend = clearCursor;
      view.drop = clearCursor;

      const clearFromDocument = (event: Event) => {
        logToBackend(`[DROPCURSOR clearFromDocument] triggered by event: ${event.type}`);
        setTimeout(() => {
          clearCursor();
          editorView.dom
            .ownerDocument
            .querySelectorAll('.ProseMirror-dropcursor, .prosemirror-dropcursor-block, .prosemirror-dropcursor-inline')
            .forEach((element) => element.remove());
        }, 0);
      };

      const controller = new AbortController();
      const listenerOptions = { capture: true, signal: controller.signal };
      const ownerWindow = editorView.dom.ownerDocument.defaultView;

      editorView.dom.ownerDocument.addEventListener('drop', clearFromDocument, listenerOptions);
      editorView.dom.ownerDocument.addEventListener('dragend', clearFromDocument, listenerOptions);
      editorView.dom.ownerDocument.addEventListener('dragcancel', clearFromDocument, listenerOptions);
      ownerWindow?.addEventListener('blur', clearFromDocument, listenerOptions);

      const destroy = view.destroy.bind(view);
      view.destroy = () => {
        controller.abort();
        clearTimeout(view.timeout);
        destroy();
      };

      return view;
    },
  });
}

/** TipTap drop cursor -- ProseMirror plugin with instant clear on drop/dragend. */
export const NoteDropcursor = Extension.create({
  name: 'dropCursor',

  addOptions() {
    return {
      color: false as string | false,
      width: 2,
      class: 'ProseMirror-dropcursor',
    };
  },

  addProseMirrorPlugins() {
    return [immediateDropCursor(this.options)];
  },
});

export default NoteDropcursor;
