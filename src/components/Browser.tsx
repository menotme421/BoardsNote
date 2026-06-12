import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Sun, Moon, Settings, LayoutGrid, Star, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { FileItem } from '../App';
import boardsNoteLogo from '../assets/BoardsNote_favicon_logo.svg';

interface BrowserProps {
  files: FileItem[];
  activeMode: 'notes' | 'canvas';
  onModeChange: (mode: 'notes' | 'canvas') => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onFileSelect: (id: string) => void;
  onCreateFile: () => void;
  onCreateFileOfType?: (type: 'note' | 'canvas') => void;
  onRenameFile?: (id: string, title: string) => void;
  onTogglePin?: (id: string) => void;
  onDeleteFile?: (id: string) => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DROPDOWN_WIDTH = 144;
const DROPDOWN_HEIGHT = 120;
const PADDING = 8;

export function Browser({
  files, activeMode, onModeChange, theme, onThemeToggle,
  onOpenSettings, onOpenSearch, onFileSelect, onCreateFile, onCreateFileOfType,
  onRenameFile, onTogglePin, onDeleteFile
}: BrowserProps) {
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; top: number; left: number } | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const renamingRef = useRef<string | null>(null);
  renamingRef.current = renamingFileId;

  const modeFiles = files.filter(f => activeMode === 'notes' ? f.type === 'note' : f.type === 'canvas');
  const pinnedFiles = modeFiles.filter(f => f.isPinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const recentFiles = modeFiles.filter(f => !f.isPinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const hasPinned = pinnedFiles.length > 0;
  const hasRecent = recentFiles.length > 0;

  const modeLabel = activeMode === 'notes' ? 'Notes' : 'Canvas';

  const handleSecondaryAction = () => {
    const targetType = activeMode === 'notes' ? 'canvas' : 'note';
    if (onCreateFileOfType) {
      onCreateFileOfType(targetType);
    }
  };

  const renderCard = (file: FileItem) => {
    const isRenaming = renamingFileId === file.id;
    return (
      <div
        key={file.id}
        className="relative flex flex-col p-4 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-tiny)] shadow-sm hover:shadow-md hover:border-[var(--color-border)] transition-all cursor-pointer group"
        onClick={(e) => {
          if (renamingFileId !== null) return;
          const target = e.target as HTMLElement;
          if (target.closest('.card-menu-button') || target.closest('.file-menu-dropdown')) return;
          onFileSelect(file.id);
        }}
      >
        {file.isPinned && (
          <div className="flex items-center gap-1 mb-1">
            <Star size={12} className="text-amber-500 fill-current" />
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Pinned</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mb-1">
          {isRenaming ? (
            <input
              autoFocus
              className="flex-1 bg-transparent border-b border-[var(--color-border)] outline-none text-sm text-[var(--color-text-primary)] min-w-0"
              value={renamingTitle}
              onChange={e => setRenamingTitle(e.target.value)}
              onBlur={() => handleRenameEnd(file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRenameEnd(file.id);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setRenamingFileId(null);
                }
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate leading-relaxed">{file.title || 'Untitled'}</h3>
          )}
          {!isRenaming && (
            <button
              className="card-menu-button p-1 shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded opacity-0 group-hover:opacity-100 transition-all"
              onClick={(e) => handleMenuOpen(e, file.id)}
            >
              <MoreVertical size={14} />
            </button>
          )}
        </div>
        {!isRenaming && (
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed mb-3">
            {file.type === 'note'
              ? stripHtml(file.content || '').substring(0, 200)
              : `${file.elements?.nodes?.length || 0} nodes · ${file.elements?.strokes?.length || 0} strokes`
            }
          </p>
        )}
        {!isRenaming && (
          <div className="flex items-center gap-2 mt-auto text-[11px] text-[var(--color-text-muted)]">
            <span className={`w-2 h-2 rounded-full ${file.type === 'note' ? 'bg-[var(--color-note)]' : 'bg-[var(--color-canvas)]'}`} />
            <span>{formatRelativeTime(file.updatedAt)}</span>
            {file.tags && file.tags.length > 0 && <span className="truncate">· {file.tags.slice(0, 2).join(', ')}</span>}
          </div>
        )}
      </div>
    );
  };

  const handleMenuOpen = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let left = rect.right - DROPDOWN_WIDTH;
    let top = rect.bottom + PADDING;

    if (left < PADDING) left = PADDING;
    if (left + DROPDOWN_WIDTH > window.innerWidth - PADDING) {
      left = rect.left;
    }
    if (top + DROPDOWN_HEIGHT > window.innerHeight - PADDING) {
      top = rect.top - DROPDOWN_HEIGHT - PADDING;
    }

    setMenuAnchor(prev => prev?.id === fileId ? null : { id: fileId, top, left });
  };

  const handleRenameStart = (file: FileItem) => {
    setRenamingFileId(file.id);
    setRenamingTitle(file.title);
    setMenuAnchor(null);
  };

  const handleRenameEnd = (id: string) => {
    if (renamingTitle.trim() && onRenameFile) {
      onRenameFile(id, renamingTitle.trim());
    }
    setRenamingFileId(null);
    renamingRef.current = null;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.file-menu-dropdown') && !target.closest('.card-menu-button')) {
        setMenuAnchor(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentMenuFile = menuAnchor ? files.find(f => f.id === menuAnchor.id) : undefined;
  const anchorId = menuAnchor?.id;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)]">
      {/* Topbar */}
      <div className="h-12 grid grid-cols-[1fr_auto_1fr] items-center px-4 border-b border-[var(--color-border)] shrink-0">
        <div className="pl-1 justify-self-start">
          <img src={boardsNoteLogo} alt="BoardsNote" className="h-7 w-auto" />
        </div>

        <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--color-bg-tertiary)] justify-self-center">
          <button
            className={`px-3 py-1 text-[13px] font-medium rounded-full transition-colors ${
              activeMode === 'notes'
                ? 'bg-[var(--color-bg-primary)] text-[var(--color-note)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
            onClick={() => onModeChange('notes')}
          >
            Notes
          </button>
          <button
            className={`px-3 py-1 text-[13px] font-medium rounded-full transition-colors ${
              activeMode === 'canvas'
                ? 'bg-[var(--color-bg-primary)] text-[var(--color-canvas)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
            onClick={() => onModeChange('canvas')}
          >
            Canvas
          </button>
        </div>

        <div className="flex items-center gap-1 justify-self-end">
          <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-[var(--radius-tiny)] text-[var(--color-text-secondary)] transition-colors" onClick={onOpenSearch} title="Search (Cmd K)">
            <Search size={18} />
          </button>
          <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-[var(--radius-tiny)] text-[var(--color-text-secondary)] transition-colors" onClick={onThemeToggle} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-[var(--radius-tiny)] text-[var(--color-text-secondary)] transition-colors" onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[20.2px] font-semibold text-[var(--color-text-primary)]">{modeLabel}</span>
            {(hasPinned || hasRecent) && <span className="text-sm text-[var(--color-text-muted)]">({modeFiles.length})</span>}
          </div>
          {(hasPinned || hasRecent) && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-tiny)] border border-[var(--color-border)] text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors" onClick={onCreateFile}>
              <Plus size={14} />{activeMode === 'notes' ? 'New Note' : 'New Board'}
            </button>
          )}
        </div>

        {hasPinned || hasRecent ? (
          <div className="flex flex-col gap-6 pb-6">
            {hasPinned && (
              <div>
                <div className="flex items-center gap-2 px-6 mb-3">
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">Pinned</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{pinnedFiles.length}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6">
                  {pinnedFiles.map(file => renderCard(file))}
                </div>
              </div>
            )}
            {hasRecent && (
              <div>
                {hasPinned && (
                  <div className="flex items-center gap-2 px-6 mb-3">
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">Recent</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{recentFiles.length}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6">
                  {recentFiles.map(file => renderCard(file))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-grow px-6 pb-6">
            <div className="max-w-md">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] leading-tight mb-2">Notes and canvas. Nothing more, nothing less.</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">Write something. Draw something. See what happens.</p>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-[13px] font-medium rounded-[var(--radius-tiny)] bg-[var(--brand)] text-white hover:brightness-110 transition-all" onClick={onCreateFile}>
                  {activeMode === 'notes' ? 'Start writing' : 'Start drawing'}
                </button>
                <button className="px-4 py-2 text-[13px] font-medium rounded-[var(--radius-tiny)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors" onClick={handleSecondaryAction}>
                  {activeMode === 'notes' ? 'Start drawing' : 'Start writing'}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[11px] font-mono">N</kbd> for a new note · <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[11px] font-mono">C</kbd> for a new canvas
              </p>
            </div>
            {activeMode === 'canvas' && (
              <div className="mt-auto flex justify-center opacity-[0.18] dark:opacity-[0.10] select-none pointer-events-none">
                <svg width="320" height="200" viewBox="0 0 320 200" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-primary)]">
                  <path d="M60 140 L60 60 C60 55 64 50 70 50 L190 50 C195 50 200 55 200 60 L200 130 C200 135 195 140 190 140 Z" strokeLinejoin="round" />
                  <path d="M200 130 L210 130 C215 130 220 125 220 120 L220 50" strokeDasharray="3 3" />
                  <path d="M200 130 L200 135 C200 138 197 140 194 140 L60 140" strokeDasharray="2 2" />
                  <path d="M78 80 C90 78 95 85 108 80 C120 75 125 82 140 78" strokeLinecap="round" />
                  <path d="M78 95 C95 93 100 100 118 95 C135 90 145 98 168 93" strokeLinecap="round" />
                  <path d="M78 110 C92 108 98 115 115 110 C130 105 140 112 155 108" strokeLinecap="round" />
                  <path d="M220 80 C240 75 250 65 260 55" strokeLinecap="round" strokeDasharray="4 2" />
                  <circle cx="275" cy="50" r="18" />
                  <circle cx="275" cy="50" r="10" strokeDasharray="2 2" />
                  <path d="M260 120 C255 110 265 100 270 95" strokeLinecap="round" strokeDasharray="4 2" />
                  <path d="M255 140 L280 120 L285 145 Z" strokeLinejoin="round" />
                  <rect x="100" y="155" width="14" height="14" rx="2" strokeDasharray="3 3" />
                  <path d="M120 162 L160 162" strokeLinecap="round" />
                  <path d="M155 158 L160 162 L155 166" strokeLinecap="round" />
                  <circle cx="50" cy="100" r="2" fill="currentColor" />
                  <circle cx="230" cy="150" r="1.5" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dropdown portal */}
      {currentMenuFile && anchorId && menuAnchor && createPortal(
        <div
          className="file-menu-dropdown fixed z-[100] w-36 bg-[var(--color-shell-bg)] border border-[var(--color-border)] rounded-lg shadow-xl py-1"
          style={{ top: menuAnchor.top, left: menuAnchor.left }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-[var(--color-surface-hover)] transition-colors"
            onClick={(e) => { e.stopPropagation(); onTogglePin?.(currentMenuFile.id); setMenuAnchor(null); }}
          >
            <Star size={12} className={currentMenuFile.isPinned ? 'text-amber-500 fill-current' : 'text-[var(--color-text-muted)]'} />
            <span className="text-[var(--color-text-primary)]">{currentMenuFile.isPinned ? 'Unfavourite' : 'Favourite'}</span>
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-[var(--color-surface-hover)] transition-colors"
            onClick={(e) => { e.stopPropagation(); handleRenameStart(currentMenuFile); }}
          >
            <Edit2 size={12} className="text-[var(--color-text-muted)]" />
            <span className="text-[var(--color-text-primary)]">Rename</span>
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-red-500/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDeleteFile?.(currentMenuFile.id); setMenuAnchor(null); }}
          >
            <Trash2 size={12} className="text-red-500" />
            <span className="text-red-500">Delete</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
