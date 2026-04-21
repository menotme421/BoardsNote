import React, { useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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

  return (
    <div 
      className="relative w-full h-full sticky-note-curl"
      style={{
        backgroundColor: node.backgroundColor || '#fef08a',
        color: node.textColor || '#0c0c0c',
        fontFamily: node.fontFamily || 'var(--font-kalam)',
        fontSize: node.fontSize ? `${node.fontSize}px` : '18px',
        maxWidth: '280px',
        minHeight: '100px',
        wordWrap: 'break-word',
        boxShadow: '2px 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        borderRadius: '2px 12px 12px 2px',
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
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
    </div>
  );
};
