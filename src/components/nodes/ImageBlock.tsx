import React from 'react';

export const ImageBlock = ({ node }: any) => {
  return (
    <div
      className="rounded-lg overflow-hidden w-full h-full"
      style={{
        pointerEvents: 'none'
      }}
    >
      <img
        src={node.content}
        alt="Pasted image"
        className="w-full h-full object-contain block"
        draggable={false}
      />
    </div>
  );
};
