import React, { useState } from 'react';
import { 
  MousePointer2, Hand, HandIcon, PenTool, Square, Type, 
  Eraser, Circle,
  Undo, Redo, Trash2, Layers,
  Pencil, Highlighter, Plus,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  GripVertical
} from 'lucide-react';

import { ShapePropertiesPanel } from './ShapePropertiesPanel';

const IMPORTANT_COLORS = [
  '#000000', // Black
  '#FF4444', // Red
  '#4488FF', // Blue
];

const TEXT_SIZES = [
  { label: 'H1', value: 32 },
  { label: 'H2', value: 24 },
  { label: 'H3', value: 18 },
  { label: 'P', value: 14 },
  { label: 'XS', value: 11 },
];


const LayersPanel = ({ nodes, strokes, selectedNodeId, selectedStrokeId, onSelectNode, onSelectStroke, onReorderLayers }: any) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);

  const allLayers = [
    ...nodes.map((n: any) => ({ ...n, layerType: 'node' })),
    ...strokes.map((s: any) => ({ ...s, layerType: 'stroke' }))
  ].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? 'before' : 'after';
    
    setDragOverId(id);
    setDragPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id && dragPosition && onReorderLayers) {
      onReorderLayers(draggedId, id, dragPosition);
    }
    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  return (
    <div className="properties-panel-content">
      <div className="properties-header">Layers</div>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
        {allLayers.length === 0 ? (
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono text-center py-4 italic">
            No elements yet
          </div>
        ) : (
          allLayers.map((layer: any) => {
            const isSelected = layer.layerType === 'node' 
              ? selectedNodeId === layer.id 
              : selectedStrokeId === layer.id;
            
            let icon = <PenTool size={12} />;
            let label = `Stroke #${layer.id.substring(0, 4)}`;

            if (layer.layerType === 'node') {
              if (layer.type === 'text') {
                icon = <Type size={12} />;
                label = layer.content?.trim() || 'Empty Text';
              } else if (layer.type === 'shape') {
                icon = layer.shapeType === 'circle' ? <Circle size={12} /> : <Square size={12} />;
                label = `${layer.shapeType.charAt(0).toUpperCase() + layer.shapeType.slice(1)}`;
              }
            }

            return (
              <div
                key={layer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, layer.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                className={`relative ${draggedId === layer.id ? 'opacity-50' : ''}`}
              >
                {dragOverId === layer.id && dragPosition === 'before' && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] z-10" />
                )}
                <button
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                    isSelected 
                      ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)] border border-[var(--color-accent)]/20' 
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                  }`}
                  onClick={() => {
                    if (layer.layerType === 'node') {
                      onSelectNode(layer.id);
                      onSelectStroke(null);
                    } else {
                      onSelectStroke(layer.id);
                      onSelectNode(null);
                    }
                  }}
                >
                  <div className="shrink-0 text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing hover:text-[var(--color-text-primary)]">
                    <GripVertical size={12} />
                  </div>
                  <div className={`shrink-0 ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
                    {icon}
                  </div>
                  <span className="text-[11px] font-mono truncate flex-1">
                    {label}
                  </span>
                </button>
                {dragOverId === layer.id && dragPosition === 'after' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] z-10" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const PenPropertiesPanel = ({ settings, onChange }: any) => {
  return (
    <div className="properties-panel-content">
      <div className="properties-header">Pen Settings</div>
      
      {/* Type Selection */}
      <div className="properties-group">
        <label className="properties-label">Type</label>
        <div className="button-group">
          {[
            { id: 'pen', icon: <PenTool size={14} /> },
            { id: 'pencil', icon: <Pencil size={14} /> },
            { id: 'marker', icon: <Highlighter size={14} /> }
          ].map(item => (
            <button
              key={item.id}
              className={`button-group-item ${settings.type === item.id ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, type: item.id })}
              title={item.id.toUpperCase()}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div className="properties-group">
        <label className="properties-label">Color</label>
        <div className="color-picker">
          {IMPORTANT_COLORS.map(color => (
            <button
              key={color}
              className={`color-swatch ${settings.color === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange({ ...settings, color })}
            />
          ))}
          <div className="relative">
            <button
              className={`color-swatch flex items-center justify-center border border-dashed border-[var(--color-border)] ${!IMPORTANT_COLORS.includes(settings.color) ? 'active' : ''}`}
              style={{ backgroundColor: !IMPORTANT_COLORS.includes(settings.color) ? settings.color : 'transparent' }}
              onClick={() => document.getElementById('pen-color-custom')?.click()}
            >
              <Plus size={14} className={!IMPORTANT_COLORS.includes(settings.color) ? 'text-white mix-blend-difference' : 'text-[var(--color-text-muted)]'} />
            </button>
            <input
              id="pen-color-custom"
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={settings.color}
              onChange={(e) => onChange({ ...settings, color: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Width Selection */}
      <div className="properties-group">
        <label className="properties-label flex justify-between">
          <span>Width</span>
          <span>{settings.width}px</span>
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={settings.width}
          onChange={(e) => onChange({ ...settings, width: parseInt(e.target.value) })}
          className="w-full accent-[var(--color-accent)]"
        />
      </div>
    </div>
  );
};

const TextPropertiesPanel = ({ settings, onChange }: any) => {
  return (
    <div className="properties-panel-content">
      <div className="properties-header">Text Settings</div>
      
      {/* Font Selection */}
      <div className="properties-group">
        <label className="properties-label">Font</label>
        <select
          value={settings.font}
          onChange={(e) => onChange({ ...settings, font: e.target.value })}
          className="text-select"
        >
          <option value="font-dm-sans">DM Sans</option>
          <option value="font-source-serif">Source Serif 4</option>
          <option value="font-lora">Lora</option>
          <option value="font-jetbrains">JetBrains Mono</option>
          <option value="font-atkinson">Atkinson Hyperlegible</option>
        </select>
      </div>

      {/* Font Size Selection */}
      <div className="properties-group">
        <label className="properties-label">Size</label>
        <div className="button-group">
          {TEXT_SIZES.map(size => (
            <button
              key={size.label}
              className={`button-group-item ${settings.size === size.value ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, size: size.value })}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Style Selection */}
      <div className="properties-group">
        <label className="properties-label">Style</label>
        <div className="button-group">
          <button
            className={`button-group-item ${settings.bold ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, bold: !settings.bold })}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            className={`button-group-item ${settings.italic ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, italic: !settings.italic })}
            title="Italic"
          >
            <Italic size={16} />
          </button>
        </div>
      </div>

      {/* Text Alignment Selection */}
      <div className="properties-group">
        <label className="properties-label">Alignment</label>
        <div className="button-group">
          <button
            className={`button-group-item ${settings.align === 'left' ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, align: 'left' })}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            className={`button-group-item ${settings.align === 'center' ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, align: 'center' })}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            className={`button-group-item ${settings.align === 'right' ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, align: 'right' })}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          <button
            className={`button-group-item ${settings.align === 'justify' ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, align: 'justify' })}
            title="Justify"
          >
            <AlignJustify size={16} />
          </button>
        </div>
      </div>

      {/* Color Selection */}
      <div className="properties-group">
        <label className="properties-label">Text Color</label>
        <div className="color-picker">
          {IMPORTANT_COLORS.map(color => (
            <button
              key={color}
              className={`color-swatch ${settings.color === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange({ ...settings, color })}
            />
          ))}
          <div className="relative">
            <button
              className={`color-swatch flex items-center justify-center border border-dashed border-[var(--color-border)] ${!IMPORTANT_COLORS.includes(settings.color) ? 'active' : ''}`}
              style={{ backgroundColor: !IMPORTANT_COLORS.includes(settings.color) ? settings.color : 'transparent' }}
              onClick={() => document.getElementById('text-color-custom')?.click()}
            >
              <Plus size={14} className={!IMPORTANT_COLORS.includes(settings.color) ? 'text-white mix-blend-difference' : 'text-[var(--color-text-muted)]'} />
            </button>
            <input
              id="text-color-custom"
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={settings.color}
              onChange={(e) => onChange({ ...settings, color: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Background Color Selection */}
      <div className="properties-group">
        <label className="properties-label">Background</label>
        <div className="color-picker">
          <button
            className={`color-swatch flex items-center justify-center border border-dashed border-[var(--color-border)] ${settings.backgroundColor === 'transparent' ? 'active' : ''}`}
            style={{ backgroundColor: 'transparent' }}
            onClick={() => onChange({ ...settings, backgroundColor: 'transparent' })}
            title="Transparent"
          >
            <div className="w-full h-full rounded-full" style={{ background: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }} />
          </button>
          {IMPORTANT_COLORS.map(color => (
            <button
              key={color}
              className={`color-swatch ${settings.backgroundColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange({ ...settings, backgroundColor: color })}
            />
          ))}
          <div className="relative">
            <button
              className={`color-swatch flex items-center justify-center border border-dashed border-[var(--color-border)] ${settings.backgroundColor !== 'transparent' && !IMPORTANT_COLORS.includes(settings.backgroundColor) ? 'active' : ''}`}
              style={{ backgroundColor: settings.backgroundColor !== 'transparent' && !IMPORTANT_COLORS.includes(settings.backgroundColor) ? settings.backgroundColor : 'transparent' }}
              onClick={() => document.getElementById('text-bg-color-custom')?.click()}
            >
              <Plus size={14} className={settings.backgroundColor !== 'transparent' && !IMPORTANT_COLORS.includes(settings.backgroundColor) ? 'text-white mix-blend-difference' : 'text-[var(--color-text-muted)]'} />
            </button>
            <input
              id="text-bg-color-custom"
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={settings.backgroundColor === 'transparent' ? '#ffffff' : settings.backgroundColor}
              onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CanvasToolbar = ({
  activeTool,
  onToolChange,
  nodes,
  strokes,
  selectedNodeId,
  selectedStrokeId,
  onSelectNode,
  onSelectStroke,
  onPanTo,
  penSettings,
  onPenSettingsChange,
  shapeSettings,
  onShapeSettingsChange,
  textSettings,
  onTextSettingsChange,
  onUndo,
  onRedo,
  onDelete,
  onReorderLayers
}: any) => {
  const [showLayers, setShowLayers] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const handleToolSelect = (tool: string) => {
    onToolChange(tool);
  };

  const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);
  const selectedStroke = strokes.find((s: any) => s.id === selectedStrokeId);

  const effectiveShapeSettings = selectedNode && selectedNode.type === 'shape' ? {
    shapeType: selectedNode.shapeType || shapeSettings.shapeType,
    fill: selectedNode.color || shapeSettings.fill,
    strokeWidth: selectedNode.strokeWidth ?? shapeSettings.strokeWidth,
    strokeColor: selectedNode.strokeColor || shapeSettings.strokeColor,
    borderRadius: selectedNode.borderRadius ?? shapeSettings.borderRadius,
    opacity: selectedNode.opacity ?? shapeSettings.opacity
  } : shapeSettings;

  const effectiveTextSettings = selectedNode && selectedNode.type === 'text' ? {
    font: selectedNode.fontFamily || textSettings.font,
    size: selectedNode.fontSize || textSettings.size,
    color: selectedNode.textColor || textSettings.color,
    backgroundColor: selectedNode.backgroundColor || textSettings.backgroundColor,
    bold: selectedNode.bold ?? textSettings.bold,
    italic: selectedNode.italic ?? textSettings.italic,
    align: selectedNode.align || textSettings.align
  } : textSettings;

  const effectivePenSettings = selectedStroke ? {
    ...penSettings,
    color: selectedStroke.color || penSettings.color,
    width: selectedStroke.width || penSettings.width,
    type: selectedStroke.type || penSettings.type
  } : penSettings;

  const activePanel = 
    activeTool === 'pen' ? 'pen' :
    activeTool === 'shape' ? 'shape' :
    activeTool === 'text' ? 'text' :
    selectedStroke ? 'pen' :
    (selectedNode && selectedNode.type === 'shape') ? 'shape' :
    (selectedNode && selectedNode.type === 'text') ? 'text' : null;

  const hasSettings = activePanel !== null;

  return (
    <>
      {/* Layers Panel on the Left */}
      {showLayers && (
        <div className="canvas-properties-panel-left">
          <LayersPanel 
            nodes={nodes}
            strokes={strokes}
            selectedNodeId={selectedNodeId}
            selectedStrokeId={selectedStrokeId}
            onSelectNode={onSelectNode}
            onSelectStroke={onSelectStroke}
            onReorderLayers={onReorderLayers}
          />
        </div>
      )}

      {/* Dynamic Properties Panel on the Right */}
      {hasSettings && (
        <div className="canvas-properties-panel">
          {activePanel === 'pen' ? (
            <PenPropertiesPanel
              settings={effectivePenSettings}
              onChange={onPenSettingsChange}
            />
          ) : activePanel === 'shape' ? (
            <ShapePropertiesPanel
              settings={effectiveShapeSettings}
              onChange={onShapeSettingsChange}
            />
          ) : activePanel === 'text' ? (
            <TextPropertiesPanel
              settings={effectiveTextSettings}
              onChange={onTextSettingsChange}
            />
          ) : null}
        </div>
      )}

      {/* Bottom-centered Floating Toolbar */}
      <div 
        className="absolute bottom-[24px] touch-none sm:bottom-12 left-1/2 -translate-x-1/2 canvas-toolbar"
        style={{ bottom: 'calc(max(24px, env(safe-area-inset-bottom)) + 12px)' }}
      >
        {/* Navigation Group */}
        <button
          className={`toolbar-btn toolbar-btn-primary ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => handleToolSelect('select')}
          title="Select (V)"
        >
          <MousePointer2 size={20} />
        </button>
        <button
          className={`toolbar-btn toolbar-btn-primary ${activeTool === 'pan' ? 'active' : ''}`}
          onClick={() => handleToolSelect('pan')}
          title="Pan (H)"
        >
          {isPanning ? <HandIcon size={20} /> : <Hand size={20} />}
        </button>
        
        <div className="toolbar-divider" />
        
        {/* Drawing Group */}
        <button
          className={`toolbar-btn toolbar-btn-primary ${activeTool === 'pen' ? 'active' : ''}`}
          onClick={() => handleToolSelect('pen')}
          title="Pen (P)"
        >
          <PenTool size={20} />
        </button>
        <button
          className={`toolbar-btn toolbar-btn-primary ${activeTool === 'shape' ? 'active' : ''}`}
          onClick={() => handleToolSelect('shape')}
          title="Shape (S)"
        >
          <Square size={20} />
        </button>
        <button
          className={`toolbar-btn toolbar-btn-primary ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => handleToolSelect('text')}
          title="Text (T)"
        >
          <Type size={20} />
        </button>
        <button
          className={`toolbar-btn toolbar-btn-primary ${activeTool === 'erase' ? 'active' : ''}`}
          onClick={() => handleToolSelect('erase')}
          title="Erase (E)"
        >
          <Eraser size={20} />
        </button>
        
        <div className="toolbar-divider" />
        
        {/* Actions Group */}
        <button
          className="toolbar-btn toolbar-btn-secondary"
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          className="toolbar-btn toolbar-btn-secondary"
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
        <button
          className="toolbar-btn toolbar-btn-secondary hover:!bg-red-500 hover:!text-white"
          onClick={onDelete}
          title="Delete (Del)"
        >
          <Trash2 size={16} />
        </button>
        <button
          className={`toolbar-btn toolbar-btn-secondary ${showLayers ? 'active' : ''}`}
          onClick={() => setShowLayers(!showLayers)}
          title="Layers"
        >
          <Layers size={16} />
        </button>
      </div>
    </>
  );
};
