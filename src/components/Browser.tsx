import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Sun, Moon, Settings, Star, Edit2, Trash2, MoreVertical } from 'lucide-react';
import type { FileItem } from '../App';
import boardsNoteLogo from '../assets/BoardsNote_favicon_logo.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function Browser({
  files, activeMode, onModeChange, theme, onThemeToggle,
  onOpenSettings, onOpenSearch, onFileSelect, onCreateFile, onCreateFileOfType,
  onRenameFile, onTogglePin, onDeleteFile
}: BrowserProps) {
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

  const handleRenameStart = (file: FileItem) => {
    setRenamingFileId(file.id);
    setRenamingTitle(file.title);
  };

  const handleRenameEnd = (id: string) => {
    if (renamingTitle.trim() && onRenameFile) {
      onRenameFile(id, renamingTitle.trim());
    }
    setRenamingFileId(null);
    renamingRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        onCreateFile();
      }
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleSecondaryAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderCard = (file: FileItem) => {
    const isRenaming = renamingFileId === file.id;
    return (
      <Card
        key={file.id}
        className="group cursor-pointer hover:shadow-md hover:border-[var(--color-border)] transition-all overflow-hidden"
        onClick={(e) => {
          if (renamingFileId !== null) return;
          const target = e.target as HTMLElement;
          if (target.closest('.card-menu-button') || target.closest('[data-radix-dropdown-menu-content]')) return;
          onFileSelect(file.id);
        }}
      >
        {file.isPinned && (
          <div className="flex items-center gap-1 px-4 pt-4 pb-0">
            <Star size={12} className="text-amber-500 fill-current" />
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Pinned</span>
          </div>
        )}
        <CardContent className={file.isPinned ? 'pt-2' : 'pt-4'}>
          <div className="flex items-center justify-between gap-2 mb-1">
            {isRenaming ? (
              <Input
                autoFocus
                className="h-7 text-sm px-1 py-0 border-b border-[var(--color-border)] rounded-none bg-transparent focus-visible:border-[var(--color-text-primary)]"
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
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate leading-relaxed flex-1 min-w-0">{file.title || 'Untitled'}</h3>
            )}
            {!isRenaming && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="card-menu-button opacity-0 group-hover:opacity-100 shrink-0">
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin?.(file.id); }}>
                    <Star size={12} className={file.isPinned ? 'text-amber-500 fill-current' : ''} />
                    {file.isPinned ? 'Unfavourite' : 'Favourite'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRenameStart(file); }}>
                    <Edit2 size={12} />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={(e) => { e.stopPropagation(); onDeleteFile?.(file.id); }}>
                    <Trash2 size={12} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
        </CardContent>
        {!isRenaming && (
          <CardFooter className="px-4 pb-4 pt-0">
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
              <span className={`w-2 h-2 rounded-full ${file.type === 'note' ? 'bg-[var(--color-note)]' : 'bg-[var(--color-canvas)]'}`} />
              <span>{formatRelativeTime(file.updatedAt)}</span>
              {file.tags && file.tags.length > 0 && <span className="truncate">· {file.tags.slice(0, 2).join(', ')}</span>}
            </div>
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)]">
      {/* Topbar */}
      <div className="h-12 grid grid-cols-[1fr_auto_1fr] items-center px-4 border-b border-[var(--color-border)] shrink-0">
        <div className="pl-1 justify-self-start">
          <img src={boardsNoteLogo} alt="BoardsNote" className="h-7 w-auto" />
        </div>

        <Tabs value={activeMode} onValueChange={(v) => onModeChange(v as 'notes' | 'canvas')} className="justify-self-center">
          <TabsList className="h-8">
            <TabsTrigger value="notes" className="text-[13px] px-3 py-1 data-[state=active]:text-[var(--color-note)]">Notes</TabsTrigger>
            <TabsTrigger value="canvas" className="text-[13px] px-3 py-1 data-[state=active]:text-[var(--color-canvas)]">Canvas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 justify-self-end">
          <Button variant="ghost" size="icon" onClick={onOpenSearch} title="Search (Cmd K)">
            <Search size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onThemeToggle} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[20.2px] font-semibold text-[var(--color-text-primary)]">{modeLabel}</span>
            {(hasPinned || hasRecent) && <span className="text-sm text-[var(--color-text-muted)]">({modeFiles.length})</span>}
          </div>
          {(hasPinned || hasRecent) && (
            <Button variant="outline" onClick={onCreateFile} className="flex items-center gap-1.5">
              <Plus size={14} />{activeMode === 'notes' ? 'New Note' : 'New Board'}
            </Button>
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
                <Button onClick={onCreateFile}>
                  {activeMode === 'notes' ? 'Start writing' : 'Start drawing'}
                </Button>
                <Button variant="outline" onClick={handleSecondaryAction}>
                  {activeMode === 'notes' ? 'Start drawing' : 'Start writing'}
                </Button>
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
    </div>
  );
}
