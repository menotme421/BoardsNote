import React, { useState, useEffect } from 'react';

export const LinkCard = ({ node }: any) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const url = new URL(node.content);
      setMetadata({
        title: url.hostname,
        url: node.content,
        favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`,
        description: 'Link preview not available in this environment.'
      });
    } catch (e) {
      setMetadata({
        title: 'Invalid Link',
        url: node.content,
        favicon: '',
        description: ''
      });
    }
    setLoading(false);
  }, [node.content]);

  return (
    <div 
      className="w-[320px] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => window.open(node.content, '_blank')}
    >
      {loading ? (
        <div className="p-4 text-sm text-[var(--text-secondary)]">Loading preview...</div>
      ) : (
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {metadata?.favicon && (
              <img src={metadata.favicon} alt="" className="w-4 h-4 rounded-sm" />
            )}
            <span className="text-xs text-[var(--text-secondary)] truncate">{metadata?.url}</span>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
            {metadata?.title}
          </h3>
          {metadata?.description && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {metadata.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
