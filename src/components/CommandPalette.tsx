import React, { useEffect, useRef } from 'react';
import { FileText, LayoutGrid, Star, Trash2, Settings, Search as SearchIcon, Sun, Moon, FileDown } from 'lucide-react';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewNote: () => void;
  onNewCanvas: () => void;
  onToggleFavourites: () => void;
  onToggleDeleted: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  onExport: () => void;
  onOpen: (path: string) => void;
}

const COMMANDS = [
  { id: 'new-note', label: 'New Note', icon: <FileText size={14} />, keywords: 'note write text document' },
  { id: 'new-canvas', label: 'New Canvas', icon: <LayoutGrid size={14} />, keywords: 'canvas board draw sketch' },
  { id: 'favourites', label: 'Show Favourites', icon: <Star size={14} />, keywords: 'starred pinned favorites' },
  { id: 'deleted', label: 'Recently Deleted', icon: <Trash2 size={14} />, keywords: 'trash bin deleted' },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} />, keywords: 'preferences config' },
  { id: 'theme', label: 'Toggle Theme', icon: <Sun size={14} />, keywords: 'dark light mode appearance' },
  { id: 'export', label: 'Export...', icon: <FileDown size={14} />, keywords: 'export save download' },
];

export function CommandPalette({ isOpen, onClose, onNewNote, onNewCanvas, onToggleFavourites, onToggleDeleted, onOpenSettings, onToggleTheme, theme, onExport }: CommandPaletteProps) {
  const handleSelect = (id: string) => {
    onClose();
    switch (id) {
      case 'new-note': onNewNote(); break;
      case 'new-canvas': onNewCanvas(); break;
      case 'favourites': onToggleFavourites(); break;
      case 'deleted': onToggleDeleted(); break;
      case 'settings': onOpenSettings(); break;
      case 'theme': onToggleTheme(); break;
      case 'export': onExport(); break;
      default: break;
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          {COMMANDS.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
              {cmd.icon}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
