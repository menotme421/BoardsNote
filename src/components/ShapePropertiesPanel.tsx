import React from 'react';
import { Square, Circle, Plus } from 'lucide-react';

const IMPORTANT_COLORS = [
  '#000000', // Black
  '#FF4444', // Red
  '#4488FF', // Blue
];

export const ShapePropertiesPanel = ({ settings, onChange }: any) => {
  return (
    <div className="properties-panel-content">
      <div className="properties-header">Shape Settings</div>
      
      {/* Shape Type */}
      <div className="properties-group">
        <label className="properties-label">Type</label>
        <div className="button-group">
          {[
            { id: 'rectangle', icon: <Square size={14} /> },
            { id: 'circle', icon: <Circle size={14} /> }
          ].map(item => (
            <button
              key={item.id}
              className={`button-group-item ${settings.shapeType === item.id ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, shapeType: item.id })}
              title={item.id.charAt(0).toUpperCase() + item.id.slice(1)}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div className="properties-group">
        <label className="properties-label">Fill</label>
        <div className="color-picker">
          <button
            className={`color-swatch ${settings.fill === 'transparent' ? 'active' : ''}`}
            style={{ 
              backgroundColor: 'transparent', 
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 4px 4px',
              border: settings.fill === 'transparent' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)'
            }}
            onClick={() => onChange({ ...settings, fill: 'transparent' })}
            title="Transparent"
          />
          {IMPORTANT_COLORS.map(color => (
            <button
              key={color}
              className={`color-swatch ${settings.fill === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange({ ...settings, fill: color })}
            />
          ))}
          <div className="relative">
            <button
              className={`color-swatch flex items-center justify-center border border-dashed border-[var(--color-border)] ${settings.fill !== 'transparent' && !IMPORTANT_COLORS.includes(settings.fill) ? 'active' : ''}`}
              style={{ backgroundColor: settings.fill !== 'transparent' && !IMPORTANT_COLORS.includes(settings.fill) ? settings.fill : 'transparent' }}
              onClick={() => document.getElementById('shape-fill-custom')?.click()}
            >
              <Plus size={14} className={settings.fill !== 'transparent' && !IMPORTANT_COLORS.includes(settings.fill) ? 'text-white mix-blend-difference' : 'text-[var(--color-text-muted)]'} />
            </button>
            <input
              id="shape-fill-custom"
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={settings.fill === 'transparent' ? '#ffffff' : settings.fill}
              onChange={(e) => onChange({ ...settings, fill: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Stroke Width */}
      <div className="properties-group">
        <label className="properties-label">Stroke</label>
        <div className="button-group">
          {[
            { label: 'None', value: 0, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" strokeDasharray="4 4" /></svg> },
            { label: 'Thin', value: 1, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /></svg> },
            { label: 'Med', value: 3, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /></svg> },
            { label: 'Bold', value: 6, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /></svg> },
          ].map(opt => (
            <button
              key={opt.label}
              className={`button-group-item ${settings.strokeWidth === opt.value ? 'active' : ''}`}
              onClick={() => onChange({ ...settings, strokeWidth: opt.value })}
              title={opt.label}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Color */}
      {settings.strokeWidth > 0 && (
        <div className="properties-group">
          <label className="properties-label">Stroke Color</label>
          <div className="color-picker">
            {IMPORTANT_COLORS.map(color => (
              <button
                key={color}
                className={`color-swatch ${settings.strokeColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange({ ...settings, strokeColor: color })}
              />
            ))}
            <div className="relative">
              <button
                className={`color-swatch flex items-center justify-center border border-dashed border-[var(--color-border)] ${!IMPORTANT_COLORS.includes(settings.strokeColor || '#000000') ? 'active' : ''}`}
                style={{ backgroundColor: !IMPORTANT_COLORS.includes(settings.strokeColor || '#000000') ? (settings.strokeColor || '#000000') : 'transparent' }}
                onClick={() => document.getElementById('shape-stroke-custom')?.click()}
              >
                <Plus size={14} className={!IMPORTANT_COLORS.includes(settings.strokeColor || '#000000') ? 'text-white mix-blend-difference' : 'text-[var(--color-text-secondary)]'} />
              </button>
              <input
                id="shape-stroke-custom"
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={settings.strokeColor || '#000000'}
                onChange={(e) => onChange({ ...settings, strokeColor: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Corner Radius */}
      {settings.shapeType === 'rectangle' && (
        <div className="properties-group">
          <label className="properties-label">Corners</label>
          <div className="button-group">
            {[
              { label: 'Sharp', value: 0, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="0" ry="0" /></svg> },
              { label: 'Rounded', value: 16, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="6" ry="6" /></svg> },
            ].map(opt => (
              <button
                key={opt.label}
                className={`button-group-item ${settings.borderRadius === opt.value ? 'active' : ''}`}
                onClick={() => onChange({ ...settings, borderRadius: opt.value })}
                title={opt.label}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opacity */}
      <div className="properties-group">
        <div className="flex justify-between items-center mb-2">
          <label className="properties-label !mb-0">opacity</label>
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">{Math.round((settings.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.opacity ?? 1}
          onChange={(e) => onChange({ ...settings, opacity: parseFloat(e.target.value) })}
          className="w-full accent-[var(--color-text-primary)]"
        />
      </div>
    </div>
  );
};
