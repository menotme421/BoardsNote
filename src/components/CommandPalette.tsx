import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface PaletteItem {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  preview?: string;
  data?: any;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: PaletteItem[];
  onSelect: (item: PaletteItem) => void;
  placeholder?: string;
  renderItem?: (item: PaletteItem, index: number) => React.ReactNode;
}

export const CommandPalette = ({
  isOpen,
  onClose,
  items,
  onSelect,
  placeholder = 'Search...',
  renderItem
}: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredItems = items.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
      (item.preview && item.preview.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3">
          <Search size={20} className="text-[var(--color-text-secondary)]" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]"
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-secondary)]">
              {query ? `No results found for "${query}"` : 'Start typing to search...'}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredItems.map((item, index) =>
                renderItem ? (
                  renderItem(item, index)
                ) : (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg hover:bg-[var(--color-bg-tertiary)] cursor-pointer flex flex-col gap-1 border border-transparent hover:border-[var(--color-border)] transition-colors"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <span className="flex items-center justify-center">{item.icon}</span>}
                      <span className="font-medium text-[var(--color-text-primary)] text-sm">{item.label}</span>
                      {item.subLabel && (
                        <span className="text-xs text-[var(--color-text-secondary)]">{item.subLabel}</span>
                      )}
                    </div>
                    {item.preview && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-1 opacity-80">
                        {item.preview}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-xs text-[var(--color-text-secondary)] flex justify-between">
          <span><kbd className="bg-[var(--color-bg-primary)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">↑</kbd> <kbd className="bg-[var(--color-bg-primary)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">↓</kbd> to navigate</span>
          <span><kbd className="bg-[var(--color-bg-primary)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">Enter</kbd> to select</span>
          <span><kbd className="bg-[var(--color-bg-primary)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
