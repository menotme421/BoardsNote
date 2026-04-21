import React, { useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export const TextBlock = ({ node, isEditing, onContentChange, onEditChange, onToggleCollapse }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }, 50);
    }
  }, [isEditing]);

  const isCollapsed = node.isCollapsed;

  return (
    <div 
      className="relative w-full h-full group"
      style={{
        backgroundColor: node.backgroundColor || 'transparent',
        color: node.textColor || 'var(--text-primary)',
        fontFamily: node.fontFamily || 'var(--font-sans)',
        fontSize: node.fontSize ? `${node.fontSize}px` : '14px',
        maxWidth: '480px',
        minHeight: '80px',
        wordWrap: 'break-word',
        borderRadius: '8px',
        height: isCollapsed ? '160px' : 'auto',
        overflow: isCollapsed ? 'hidden' : 'visible',
      }}
    >
      <div 
        className={`p-4 ${isEditing ? 'invisible' : ''}`}
        style={{
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.6',
          letterSpacing: '-0.01em',
          overflowX: 'hidden',
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
        className={`absolute inset-0 w-full h-full bg-transparent resize-none outline-none p-4 overflow-hidden ${!isEditing ? 'hidden' : ''}`}
        style={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.6',
          letterSpacing: '-0.01em',
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

      {isCollapsed && !isEditing && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none rounded-b-8px" />
      )}
      
      {node.canCollapse && !isEditing && (
        <button
          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-3 py-1 text-xs flex items-center gap-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(node.id);
          }}
        >
          {isCollapsed ? (
            <>Expand <ChevronDown size={14} /></>
          ) : (
            <>Collapse <ChevronUp size={14} /></>
          )}
        </button>
      )}
    </div>
  );
};
