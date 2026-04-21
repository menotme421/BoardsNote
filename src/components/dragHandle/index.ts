import DragHandle from '@tiptap/extension-drag-handle';

// Create custom DragHandle extension with minimal configuration
export const CustomDragHandle = DragHandle.extend({
  name: 'dragHandle',

  addOptions() {
    return {
      ...this.parent?.(),
    };
  },
});

export default CustomDragHandle;
