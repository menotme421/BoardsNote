import React from 'react';
import { Square, Circle, Plus } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';

const IMPORTANT_COLORS = ['#000000', '#FF4444', '#4488FF'];

export const ShapePropertiesPanel = ({ settings, onChange }: any) => {
  return (
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">Shape Settings</div>
      
      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Type</label>
        <ToggleGroup type="single" value={settings.shapeType} onValueChange={(v) => v && onChange({ ...settings, shapeType: v })} className="gap-1">
          <ToggleGroupItem value="rectangle" size="sm" aria-label="Rectangle"><Square size={14} /></ToggleGroupItem>
          <ToggleGroupItem value="circle" size="sm" aria-label="Circle"><Circle size={14} /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Fill</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`w-6 h-6 rounded-full border-2 cursor-pointer ${settings.fill === 'transparent' ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}
            style={{
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)',
              backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px'
            }}
            onClick={() => onChange({ ...settings, fill: 'transparent' })}
            title="Transparent"
          />
          {IMPORTANT_COLORS.map(color => (
            <button key={color} className={`w-6 h-6 rounded-full border-2 cursor-pointer hover:scale-110 active:scale-90 ${settings.fill === color ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-editor-bg)_inset]' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => onChange({ ...settings, fill: color })} />
          ))}
          <div className="relative">
            <button className={`w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer`} onClick={() => document.getElementById('shape-fill-custom')?.click()}>
              <Plus size={14} className="text-[var(--color-text-muted)]" />
            </button>
            <input id="shape-fill-custom" type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={settings.fill === 'transparent' ? '#ffffff' : settings.fill} onChange={(e) => onChange({ ...settings, fill: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Stroke</label>
        <ToggleGroup type="single" value={String(settings.strokeWidth)} onValueChange={(v) => v && onChange({ ...settings, strokeWidth: parseInt(v) })} className="gap-1">
          {[
            { label: 'None', value: 0 },
            { label: 'Thin', value: 1 },
            { label: 'Med', value: 3 },
            { label: 'Bold', value: 6 },
          ].map(opt => (
            <ToggleGroupItem key={opt.label} value={String(opt.value)} size="sm" className="text-[10px] px-2">{opt.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {settings.strokeWidth > 0 && (
        <div className="mb-4">
          <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Stroke Color</label>
          <div className="flex flex-wrap gap-1.5">
            {IMPORTANT_COLORS.map(color => (
              <button key={color} className={`w-6 h-6 rounded-full border-2 cursor-pointer hover:scale-110 active:scale-90 ${settings.strokeColor === color ? 'border-[var(--color-accent)] shadow-[0_0_0_2px_var(--color-editor-bg)_inset]' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => onChange({ ...settings, strokeColor: color })} />
            ))}
            <div className="relative">
              <button className="w-6 h-6 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center cursor-pointer" onClick={() => document.getElementById('shape-stroke-custom')?.click()}>
                <Plus size={14} className="text-[var(--color-text-muted)]" />
              </button>
              <input id="shape-stroke-custom" type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={settings.strokeColor || '#000000'} onChange={(e) => onChange({ ...settings, strokeColor: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {settings.shapeType === 'rectangle' && (
        <div className="mb-4">
          <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Corners</label>
          <ToggleGroup type="single" value={String(settings.borderRadius)} onValueChange={(v) => v && onChange({ ...settings, borderRadius: parseInt(v) })} className="gap-1">
            <ToggleGroupItem value="0" size="sm" className="text-[10px] px-2">Sharp</ToggleGroupItem>
            <ToggleGroupItem value="16" size="sm" className="text-[10px] px-2">Rounded</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block">Opacity</label>
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">{Math.round((settings.opacity ?? 1) * 100)}%</span>
        </div>
        <Slider value={[settings.opacity ?? 1]} onValueChange={([v]) => onChange({ ...settings, opacity: v })} min={0} max={1} step={0.05} />
      </div>
    </div>
  );
};
