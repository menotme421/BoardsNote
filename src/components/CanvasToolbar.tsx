import React, { useState } from 'react';
import { 
  MousePointer2, Hand, PenTool, Square, Type, 
  Eraser, Circle, Spline,
  Undo, Redo, Trash2, Layers,
  Pencil, Highlighter, Plus,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  GripVertical, ArrowRight, ArrowRightLeft, Minus
} from 'lucide-react';
import { ShapePropertiesPanel } from './ShapePropertiesPanel';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const IMPORTANT_COLORS = [
  '#000000', '#FF4444', '#4488FF',
];

const TEXT_SIZES = [
  { label: 'H1', value: 32 },
  { label: 'H2', value: 24 },
  { label: 'H3', value: 18 },
  { label: 'P', value: 14 },
  { label: 'XS', value: 11 },
];

const LayersPanel = ({ nodes, strokes, edges, selectedNodeId, selectedStrokeId, selectedEdgeId, onSelectNode, onSelectStroke, onSelectEdge, onReorderLayers }: any) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);

  const allLayers = [
    ...nodes.map((n: any) => ({ ...n, layerType: 'node' })),
    ...edges.map((e: any) => ({ ...e, layerType: 'edge' })),
    ...strokes.map((s: any) => ({ ...s, layerType: 'stroke' }))
  ];

  return (
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">Layers</div>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] pr-1">
        {allLayers.length === 0 ? (
          <div className="text-[10px] text-[var(--color-text-muted)] text-center py-4 italic">
            No elements yet
          </div>
        ) : (
          allLayers.map((layer: any) => {
            const isSelected = layer.layerType === 'node'
              ? selectedNodeId === layer.id
              : layer.layerType === 'edge'
                ? selectedEdgeId === layer.id
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
            } else if (layer.layerType === 'edge') {
              icon = <Spline size={12} />;
              label = layer.label?.trim() || `Arrow #${layer.id.substring(0, 4)}`;
            }

            return (
              <div
                key={layer.id}
                draggable={layer.layerType !== 'edge'}
                onDragStart={(e) => { setDraggedId(layer.id); e.dataTransfer.setData('text/plain', layer.id); }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedId === layer.id) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setDragOverId(layer.id);
                  setDragPosition((e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after');
                }}
                onDragLeave={() => { setDragOverId(null); setDragPosition(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedId && draggedId !== layer.id && dragPosition && onReorderLayers) {
                    onReorderLayers(draggedId, layer.id, dragPosition);
                  }
                  setDraggedId(null); setDragOverId(null); setDragPosition(null);
                }}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null); setDragPosition(null); }}
                className={`relative ${draggedId === layer.id ? 'opacity-50' : ''}`}
              >
                {dragOverId === layer.id && dragPosition === 'before' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] z-10" />}
                <Button
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`w-full justify-start gap-2 px-2 py-1.5 h-auto text-[11px] ${isSelected ? '!bg-[var(--color-accent-tint)] !text-[var(--color-accent)]' : ''}`}
                  onClick={() => {
                    if (layer.layerType === 'node') { onSelectNode(layer.id); onSelectStroke(null); onSelectEdge?.(null); }
                    else if (layer.layerType === 'edge') { onSelectEdge?.(layer.id); onSelectNode(null); onSelectStroke(null); }
                    else { onSelectStroke(layer.id); onSelectNode(null); onSelectEdge?.(null); }
                  }}
                >
                  <GripVertical size={12} className="shrink-0 text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing" />
                  <span className={isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}>{icon}</span>
                  <span className="font-mono truncate flex-1 text-left">{label}</span>
                </Button>
                {dragOverId === layer.id && dragPosition === 'after' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] z-10" />}
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
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">Pen Settings</div>
      
      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Type</label>
        <ToggleGroup type="single" value={settings.type} onValueChange={(v) => v && onChange({ ...settings, type: v })} className="gap-1">
          <ToggleGroupItem value="pen" size="sm" aria-label="Pen"><PenTool size={14} /></ToggleGroupItem>
          <ToggleGroupItem value="pencil" size="sm" aria-label="Pencil"><Pencil size={14} /></ToggleGroupItem>
          <ToggleGroupItem value="marker" size="sm" aria-label="Marker"><Highlighter size={14} /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {IMPORTANT_COLORS.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer hover:scale-110 active:scale-90 ${settings.color === color ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-editor-bg)_inset]' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange({ ...settings, color })}
            />
          ))}
          <div className="relative">
            <button
              className={`w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer ${!IMPORTANT_COLORS.includes(settings.color) ? 'border-[var(--color-accent)]' : ''}`}
              style={{ backgroundColor: !IMPORTANT_COLORS.includes(settings.color) ? settings.color : 'transparent' }}
              onClick={() => document.getElementById('pen-color-custom')?.click()}
            >
              <Plus size={14} className={!IMPORTANT_COLORS.includes(settings.color) ? 'text-white mix-blend-difference' : 'text-[var(--color-text-muted)]'} />
            </button>
            <input id="pen-color-custom" type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={settings.color} onChange={(e) => onChange({ ...settings, color: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2 flex justify-between">
          <span>Width</span>
          <span>{settings.width}px</span>
        </label>
        <Slider value={[settings.width]} onValueChange={([v]) => onChange({ ...settings, width: v })} min={1} max={20} step={1} />
      </div>
    </div>
  );
};

const TextPropertiesPanel = ({ settings, onChange }: any) => {
  return (
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">Text Settings</div>
      
      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Font</label>
        <Select value={settings.font} onValueChange={(v) => onChange({ ...settings, font: v })}>
          <SelectTrigger className="h-8 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="font-dm-sans">DM Sans</SelectItem>
            <SelectItem value="font-source-serif">Source Serif 4</SelectItem>
            <SelectItem value="font-lora">Lora</SelectItem>
            <SelectItem value="font-jetbrains">JetBrains Mono</SelectItem>
            <SelectItem value="font-atkinson">Atkinson Hyperlegible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Size</label>
        <ToggleGroup type="single" value={String(settings.size)} onValueChange={(v) => v && onChange({ ...settings, size: parseInt(v) })} className="gap-0.5">
          {TEXT_SIZES.map(size => (
            <ToggleGroupItem key={size.label} value={String(size.value)} size="sm" className="text-[10px] px-1.5">{size.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Style</label>
        <ToggleGroup type="multiple" value={[settings.bold ? 'bold' : '', settings.italic ? 'italic' : ''].filter(Boolean)} className="gap-1">
          <ToggleGroupItem value="bold" size="sm" aria-label="Bold" onClick={() => onChange({ ...settings, bold: !settings.bold })} data-state={settings.bold ? 'on' : 'off'}><Bold size={16} /></ToggleGroupItem>
          <ToggleGroupItem value="italic" size="sm" aria-label="Italic" onClick={() => onChange({ ...settings, italic: !settings.italic })} data-state={settings.italic ? 'on' : 'off'}><Italic size={16} /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Alignment</label>
        <ToggleGroup type="single" value={settings.align} onValueChange={(v) => v && onChange({ ...settings, align: v })} className="gap-1">
          <ToggleGroupItem value="left" size="sm" aria-label="Left"><AlignLeft size={16} /></ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm" aria-label="Center"><AlignCenter size={16} /></ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm" aria-label="Right"><AlignRight size={16} /></ToggleGroupItem>
          <ToggleGroupItem value="justify" size="sm" aria-label="Justify"><AlignJustify size={16} /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Text Color</label>
        <div className="flex flex-wrap gap-1.5">
          {IMPORTANT_COLORS.map(color => (
            <button key={color} className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer hover:scale-110 active:scale-90 ${settings.color === color ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-editor-bg)_inset]' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => onChange({ ...settings, color })} />
          ))}
          <div className="relative">
            <button className={`w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer ${!IMPORTANT_COLORS.includes(settings.color) ? 'border-[var(--color-accent)]' : ''}`} style={{ backgroundColor: !IMPORTANT_COLORS.includes(settings.color) ? settings.color : 'transparent' }} onClick={() => document.getElementById('text-color-custom')?.click()}>
              <Plus size={14} className={!IMPORTANT_COLORS.includes(settings.color) ? 'text-white mix-blend-difference' : 'text-[var(--color-text-muted)]'} />
            </button>
            <input id="text-color-custom" type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={settings.color} onChange={(e) => onChange({ ...settings, color: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Background</label>
        <div className="flex flex-wrap gap-1.5">
          <button className={`w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer ${settings.backgroundColor === 'transparent' ? 'border-[var(--color-accent)]' : ''}`} style={{ background: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }} onClick={() => onChange({ ...settings, backgroundColor: 'transparent' })} />
          {IMPORTANT_COLORS.map(color => (
            <button key={color} className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer hover:scale-110 active:scale-90 ${settings.backgroundColor === color ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-editor-bg)_inset]' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => onChange({ ...settings, backgroundColor: color })} />
          ))}
          <div className="relative">
            <button className={`w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer`} onClick={() => document.getElementById('text-bg-color-custom')?.click()}>
              <Plus size={14} className="text-[var(--color-text-muted)]" />
            </button>
            <input id="text-bg-color-custom" type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={settings.backgroundColor === 'transparent' ? '#ffffff' : settings.backgroundColor} onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ArrowPropertiesPanel = ({ edge, onEdgeUpdate, onDelete }: any) => {
  if (!edge) return null;
  return (
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">Arrow Settings</div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Style</label>
        <ToggleGroup type="single" value={edge.style || 'arrow'} onValueChange={(v) => v && onEdgeUpdate(edge.id, { style: v })} className="gap-1">
          <ToggleGroupItem value="arrow" size="sm" aria-label="Arrow"><ArrowRight size={14} /></ToggleGroupItem>
          <ToggleGroupItem value="double-arrow" size="sm" aria-label="Double"><ArrowRightLeft size={14} /></ToggleGroupItem>
          <ToggleGroupItem value="line" size="sm" aria-label="Line"><Minus size={14} /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Shaft</label>
        <ToggleGroup type="single" value={edge.shaft || 'solid'} onValueChange={(v) => v && onEdgeUpdate(edge.id, { shaft: v })} className="gap-1">
          <ToggleGroupItem value="solid" size="sm" aria-label="Solid"><Minus size={14} /></ToggleGroupItem>
          <ToggleGroupItem value="dashed" size="sm" aria-label="Dashed">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="12" x2="20" y2="12" strokeDasharray="4 4" /></svg>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Color</label>
        <div className="flex flex-wrap gap-1.5">
          <button className={`w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] cursor-pointer ${!edge.color ? 'border-[var(--color-accent)]' : ''}`} style={{ background: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }} onClick={() => onEdgeUpdate(edge.id, { color: null })} title="Default" />
          {IMPORTANT_COLORS.map(color => (
            <button key={color} className={`w-6 h-6 rounded-full border-2 cursor-pointer hover:scale-110 active:scale-90 ${edge.color === color ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-editor-bg)_inset]' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => onEdgeUpdate(edge.id, { color })} />
          ))}
          <div className="relative">
            <button className="w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer" onClick={() => document.getElementById('arrow-color-custom')?.click()}>
              <Plus size={14} className="text-[var(--color-text-muted)]" />
            </button>
            <input id="arrow-color-custom" type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={edge.color || '#000000'} onChange={(e) => onEdgeUpdate(edge.id, { color: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Label</label>
        <input className="flex h-8 w-full rounded-[var(--radius-tiny)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-[12px] outline-none placeholder:text-[var(--color-text-muted)]" type="text" value={edge.label || ''} onChange={(e) => onEdgeUpdate(edge.id, { label: e.target.value })} placeholder="Add a label..." />
      </div>

      <Button variant="destructive" size="sm" className="w-full gap-2" onClick={onDelete}>
        <Trash2 size={14} />
        Delete Arrow
      </Button>
    </div>
  );
};

export const CanvasToolbar = ({
  activeTool,
  onToolChange,
  nodes,
  strokes,
  edges,
  selectedNodeId,
  selectedStrokeId,
  selectedEdgeId,
  onSelectNode,
  onSelectStroke,
  onSelectEdge,
  onEdgeUpdate,
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
    selectedEdgeId ? 'arrow' :
    selectedStroke ? 'pen' :
    (selectedNode && selectedNode.type === 'shape') ? 'shape' :
    (selectedNode && selectedNode.type === 'text') ? 'text' : null;

  const hasSettings = activePanel !== null;

  const toolButtons = [
    { id: 'select', icon: <MousePointer2 size={20} />, title: 'Select (V)' },
    { id: 'pan', icon: <Hand size={20} />, title: 'Pan (H)' },
    { id: 'pen', icon: <PenTool size={20} />, title: 'Pen (P)' },
    { id: 'shape', icon: <Square size={20} />, title: 'Shape (S)' },
    { id: 'text', icon: <Type size={20} />, title: 'Text (T)' },
    { id: 'erase', icon: <Eraser size={20} />, title: 'Erase (E)' },
    { id: 'arrow', icon: <Spline size={20} />, title: 'Arrow (A)' },
  ];

  return (
    <>
      {showLayers && (
        <div className="canvas-properties-panel-left">
          <LayersPanel 
            nodes={nodes} strokes={strokes} edges={edges}
            selectedNodeId={selectedNodeId} selectedStrokeId={selectedStrokeId} selectedEdgeId={selectedEdgeId}
            onSelectNode={onSelectNode} onSelectStroke={onSelectStroke} onSelectEdge={onSelectEdge}
            onReorderLayers={onReorderLayers}
          />
        </div>
      )}

      {hasSettings && (
        <div className="canvas-properties-panel">
          {activePanel === 'pen' ? (
            <PenPropertiesPanel settings={effectivePenSettings} onChange={onPenSettingsChange} />
          ) : activePanel === 'shape' ? (
            <ShapePropertiesPanel settings={effectiveShapeSettings} onChange={onShapeSettingsChange} />
          ) : activePanel === 'text' ? (
            <TextPropertiesPanel settings={effectiveTextSettings} onChange={onTextSettingsChange} />
          ) : activePanel === 'arrow' ? (
            <ArrowPropertiesPanel edge={edges?.find((e: any) => e.id === selectedEdgeId)} onEdgeUpdate={onEdgeUpdate} onDelete={onDelete} />
          ) : null}
        </div>
      )}

      <div 
        className="absolute bottom-[24px] touch-none sm:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[var(--color-editor-bg)] border border-[var(--color-border)] rounded-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.08)] z-20"
        style={{ bottom: 'calc(max(24px, env(safe-area-inset-bottom)) + 12px)' }}
      >
        <ToggleGroup type="single" value={activeTool} onValueChange={(v) => v && onToolChange(v)} className="gap-0.5">
          {toolButtons.slice(0, 2).map(t => (
            <ToggleGroupItem key={t.id} value={t.id} size="lg" className="w-10 h-10 p-0 data-[state=on]:bg-[var(--color-accent-tint)] data-[state=on]:text-[var(--color-accent)]" title={t.title}>
              {t.icon}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6 mx-0.5" />

        <ToggleGroup type="single" value={activeTool} onValueChange={(v) => v && onToolChange(v)} className="gap-0.5">
          {toolButtons.slice(2).map(t => (
            <ToggleGroupItem key={t.id} value={t.id} size="lg" className="w-10 h-10 p-0 data-[state=on]:bg-[var(--color-accent-tint)] data-[state=on]:text-[var(--color-accent)]" title={t.title}>
              {t.icon}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6 mx-0.5" />

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={onUndo} title="Undo (Ctrl+Z)">
            <Undo size={16} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRedo} title="Redo (Ctrl+Y)">
            <Redo size={16} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Delete (Del)" className="hover:!bg-red-500 hover:!text-white">
            <Trash2 size={16} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowLayers(!showLayers)} title="Layers" className={showLayers ? '!bg-[var(--color-accent-tint)] !text-[var(--color-accent)]' : ''}>
            <Layers size={16} />
          </Button>
        </div>
      </div>
    </>
  );
};
