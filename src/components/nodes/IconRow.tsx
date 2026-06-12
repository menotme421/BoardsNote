import React from 'react';
import { Type, Image as ImageIcon, Link as LinkIcon, FileText, Lock, Unlock, ChevronDown, ChevronUp, Palette } from 'lucide-react';

const COLORS = [
  '#fef08a', // yellow
  '#fecaca', // red
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#e9d5ff', // purple
  'transparent',
  '#ffffff',
];

export const IconRow = ({ 
  node, 
  onUpdateNode, 
  onToggleCollapse 
}: any) => {
  const isTextLike = ['sticky-note', 'text-block'].includes(node.type);

  return (
    <div 
      className="absolute -top-12 left-0 flex items-center gap-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-2 py-1 shadow-md z-50"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Type Switcher */}
      <div className="flex items-center gap-1 border-r border-[var(--color-border)] pr-2 mr-1">
        <button 
          className={`p-1.5 rounded hover:bg-[var(--color-bg-secondary)] ${node.type === 'sticky-note' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'sticky-note', backgroundColor: '#fef08a', fontFamily: 'var(--font-kalam)' })}
          title="Sticky Note"
        >
          <FileText size={16} />
        </button>
        <button 
          className={`p-1.5 rounded hover:bg-[var(--color-bg-secondary)] ${node.type === 'text-block' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'text-block', backgroundColor: 'transparent', fontFamily: 'var(--font-sans)' })}
          title="Text Block"
        >
          <Type size={16} />
        </button>
        <button 
          className={`p-1.5 rounded hover:bg-[var(--color-bg-secondary)] ${node.type === 'link-card' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'link-card' })}
          title="Link Card"
        >
          <LinkIcon size={16} />
        </button>
        <button 
          className={`p-1.5 rounded hover:bg-[var(--color-bg-secondary)] ${node.type === 'image-block' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'image-block' })}
          title="Image Block"
        >
          <ImageIcon size={16} />
        </button>
      </div>

      {/* Background Color Picker */}
      {isTextLike && (
        <div className="flex items-center gap-1 border-r border-[var(--color-border)] pr-2 mr-1">
          {COLORS.map(color => (
            <button
              key={color}
              className={`w-5 h-5 rounded-full border ${node.backgroundColor === color ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}
              style={{ backgroundColor: color === 'transparent' ? '#f5f5f5' : color }}
              onClick={() => onUpdateNode(node.id, { backgroundColor: color })}
              title={color === 'transparent' ? 'Transparent' : color}
            >
              {color === 'transparent' && <span className="block w-full h-full text-[8px] leading-tight text-gray-400 text-center">/</span>}
            </button>
          ))}
        </div>
      )}

      {/* Font Family */}
      {isTextLike && (
        <div className="flex items-center gap-1 border-r border-[var(--color-border)] pr-2 mr-1">
          <button 
            className={`px-2 py-1 text-xs rounded hover:bg-[var(--color-bg-secondary)] ${node.fontFamily === 'var(--font-kalam)' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
            style={{ fontFamily: 'var(--font-kalam)' }}
            onClick={() => onUpdateNode(node.id, { fontFamily: 'var(--font-kalam)' })}
          >
            Hand
          </button>
          <button 
            className={`px-2 py-1 text-xs rounded hover:bg-[var(--color-bg-secondary)] ${node.fontFamily === 'var(--font-sans)' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
            style={{ fontFamily: 'var(--font-sans)' }}
            onClick={() => onUpdateNode(node.id, { fontFamily: 'var(--font-sans)' })}
          >
            Sans
          </button>
          <button 
            className={`px-2 py-1 text-xs rounded hover:bg-[var(--color-bg-secondary)] ${node.fontFamily === 'var(--font-mono)' ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => onUpdateNode(node.id, { fontFamily: 'var(--font-mono)' })}
          >
            Mono
          </button>
        </div>
      )}

      {/* Pin / Lock */}
      <button 
        className={`p-1.5 rounded hover:bg-[var(--color-bg-secondary)] ${node.isLocked ? 'text-[var(--color-accent)] bg-[var(--color-accent-tint)]' : 'text-[var(--color-text-secondary)]'}`}
        onClick={() => onUpdateNode(node.id, { isLocked: !node.isLocked })}
        title={node.isLocked ? "Unlock" : "Lock"}
      >
        {node.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>

      {/* Collapse / Expand (Text Block only) */}
      {node.type === 'text-block' && node.canCollapse && (
        <button 
          className="p-1.5 rounded hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] ml-1"
          onClick={() => onToggleCollapse(node.id)}
          title={node.isCollapsed ? "Expand" : "Collapse"}
        >
          {node.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      )}
    </div>
  );
};
