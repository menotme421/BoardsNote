import React from 'react';

export const ImageBlock = ({ node }: any) => {
  return (
    <div 
      className="max-w-[480px] rounded-lg overflow-hidden shadow-sm"
      style={{
        pointerEvents: 'none' // Let the parent handle dragging
      }}
    >
      <img 
        src={node.content} 
        alt="Pasted image" 
        className="w-full h-auto block"
        draggable={false}
      />
    </div>
  );
};
