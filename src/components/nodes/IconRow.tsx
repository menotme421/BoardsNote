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
      className="absolute -top-12 left-0 flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-2 py-1 shadow-md z-50"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Type Switcher */}
      <div className="flex items-center gap-1 border-r border-[var(--border-primary)] pr-2 mr-1">
        <button 
          className={`p-1.5 rounded hover:bg-[var(--bg-secondary)] ${node.type === 'sticky-note' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'sticky-note', backgroundColor: '#fef08a', fontFamily: 'var(--font-kalam)' })}
          title="Sticky Note"
        >
          <FileText size={16} />
        </button>
        <button 
          className={`p-1.5 rounded hover:bg-[var(--bg-secondary)] ${node.type === 'text-block' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'text-block', backgroundColor: 'transparent', fontFamily: 'var(--font-sans)' })}
          title="Text Block"
        >
          <Type size={16} />
        </button>
        <button 
          className={`p-1.5 rounded hover:bg-[var(--bg-secondary)] ${node.type === 'link-card' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'link-card' })}
          title="Link Card"
        >
          <LinkIcon size={16} />
        </button>
        <button 
          className={`p-1.5 rounded hover:bg-[var(--bg-secondary)] ${node.type === 'image-block' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
          onClick={() => onUpdateNode(node.id, { type: 'image-block' })}
          title="Image Block"
        >
          <ImageIcon size={16} />
        </button>
      </div>

      {/* Background Color Picker */}
      {isTextLike && (
        <div className="flex items-center gap-1 border-r border-[var(--border-primary)] pr-2 mr-1">
          {COLORS.map(color => (
            <button
              key={color}
              className={`w-5 h-5 rounded-full border ${node.backgroundColor === color ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[var(--border-primary)]'}`}
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
        <div className="flex items-center gap-1 border-r border-[var(--border-primary)] pr-2 mr-1">
          <button 
            className={`px-2 py-1 text-xs rounded hover:bg-[var(--bg-secondary)] ${node.fontFamily === 'var(--font-kalam)' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
            style={{ fontFamily: 'var(--font-kalam)' }}
            onClick={() => onUpdateNode(node.id, { fontFamily: 'var(--font-kalam)' })}
          >
            Hand
          </button>
          <button 
            className={`px-2 py-1 text-xs rounded hover:bg-[var(--bg-secondary)] ${node.fontFamily === 'var(--font-sans)' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
            style={{ fontFamily: 'var(--font-sans)' }}
            onClick={() => onUpdateNode(node.id, { fontFamily: 'var(--font-sans)' })}
          >
            Sans
          </button>
          <button 
            className={`px-2 py-1 text-xs rounded hover:bg-[var(--bg-secondary)] ${node.fontFamily === 'var(--font-mono)' ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => onUpdateNode(node.id, { fontFamily: 'var(--font-mono)' })}
          >
            Mono
          </button>
        </div>
      )}

      {/* Pin / Lock */}
      <button 
        className={`p-1.5 rounded hover:bg-[var(--bg-secondary)] ${node.isLocked ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-secondary)]'}`}
        onClick={() => onUpdateNode(node.id, { isLocked: !node.isLocked })}
        title={node.isLocked ? "Unlock" : "Lock"}
      >
        {node.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>

      {/* Collapse / Expand (Text Block only) */}
      {node.type === 'text-block' && node.canCollapse && (
        <button 
          className="p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] ml-1"
          onClick={() => onToggleCollapse(node.id)}
          title={node.isCollapsed ? "Expand" : "Collapse"}
        >
          {node.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      )}
    </div>
  );
};
