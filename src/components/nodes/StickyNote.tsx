import React, { useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// Tag color palette mapping for sticky notes
const TAG_COLORS = [
  { bg: 'var(--tag-red)', border: 'var(--tag-red-border)' },
  { bg: 'var(--tag-orange)', border: 'var(--tag-orange-border)' },
  { bg: 'var(--tag-amber)', border: 'var(--tag-amber-border)' },
  { bg: 'var(--tag-green)', border: 'var(--tag-green-border)' },
  { bg: 'var(--tag-emerald)', border: 'var(--tag-emerald-border)' },
  { bg: 'var(--tag-teal)', border: 'var(--tag-teal-border)' },
  { bg: 'var(--tag-cyan)', border: 'var(--tag-cyan-border)' },
  { bg: 'var(--tag-blue)', border: 'var(--tag-blue-border)' },
  { bg: 'var(--tag-indigo)', border: 'var(--tag-indigo-border)' },
  { bg: 'var(--tag-violet)', border: 'var(--tag-violet-border)' },
  { bg: 'var(--tag-purple)', border: 'var(--tag-purple-border)' },
  { bg: 'var(--tag-fuchsia)', border: 'var(--tag-fuchsia-border)' },
  { bg: 'var(--tag-pink)', border: 'var(--tag-pink-border)' },
  { bg: 'var(--tag-rose)', border: 'var(--tag-rose-border)' },
];

const DEFAULT_TAG_INDEX = 2; // amber as default

export const StickyNote = ({ node, isEditing, onContentChange, onEditChange }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }, 50);
    }
  }, [isEditing]);

  // Determine tag color based on node.tagColorIndex or default
  const tagColorIndex = node.tagColorIndex ?? DEFAULT_TAG_INDEX;
  const tagColor = TAG_COLORS[tagColorIndex] || TAG_COLORS[DEFAULT_TAG_INDEX];

  // Allow node.backgroundColor to override for backwards compatibility
  const backgroundColor = node.backgroundColor || tagColor.bg;
  const borderColor = node.borderColor || tagColor.border;

  return (
    <div
      className="relative w-full h-full sticky-note-curl"
      style={{
        backgroundColor,
        color: node.textColor || 'var(--color-text-primary)',
        fontFamily: node.fontFamily || 'var(--font-sans)',
        fontSize: node.fontSize ? `${node.fontSize}px` : 'var(--font-base)',
        maxWidth: '280px',
        minHeight: '100px',
        wordWrap: 'break-word',
        boxShadow: '2px 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        borderRadius: '2px 12px 12px 2px',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className={`${isEditing ? 'invisible' : ''}`}
        style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.8',
          letterSpacing: '-0.01em',
          overflowX: 'hidden',
          padding: '12px',
        }}
      >
        <div className="markdown-body">
          <Markdown 
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              pre: ({ node: _node, ...props }: any) => (
                <pre 
                  style={{ overflowX: 'auto', maxWidth: '100%', boxSizing: 'border-box' }} 
                  onPointerDown={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                  {...props} 
                />
              ),
              code: ({ node: _node, inline, className, children, ...props }: any) => {
                return (
                  <code 
                    className={className}
                    style={inline ? { whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' } : {}}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
            }}
          >
            {node.content || '\u200B'}
          </Markdown>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className={`absolute inset-0 w-full h-full bg-transparent resize-none outline-none overflow-hidden ${!isEditing ? 'hidden' : ''}`}
        style={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.8',
          letterSpacing: '-0.01em',
          padding: '12px',
        }}
        value={node.content}
        onChange={(e) => onContentChange(node.id, e.target.value)}
        onBlur={() => onEditChange(node.id, false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onEditChange(node.id, false);
          }
        }}
      />
    </div>
  );
};
