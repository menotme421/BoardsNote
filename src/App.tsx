import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import boardsNoteLogo from './assets/BoardsNote_brand.png';
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Node, mergeAttributes } from '@tiptap/core';
import ListItem from '@tiptap/extension-list-item';
import { CustomCodeBlockLowlight } from './components/code-block';

function remarkEscapeHtml() {
  return (tree: any) => {
    visit(tree, 'html', (node: any) => {
      node.type = 'text';
    });
  };
}

import { CanvasToolbar } from './components/CanvasToolbar';
import { StickyNote } from './components/nodes/StickyNote';
import { TextBlock } from './components/nodes/TextBlock';
import { LinkCard } from './components/nodes/LinkCard';
import { ImageBlock } from './components/nodes/ImageBlock';
import { IconRow } from './components/nodes/IconRow';
import { getStroke } from 'perfect-freehand';
import {
  Menu, Search, Plus, FileText, LayoutGrid,
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Table as TableIcon, Image as ImageIcon,
  Calculator, MousePointer2, Hand, Square,
  Circle, Type, GitMerge, Eraser, Network,
  ChevronRight, MoreVertical, Folder, Ellipsis,
  Pilcrow, SeparatorHorizontal, SquareCode, Grid2x2, Link2,
  Sun, Moon, Settings, Cloud, Star,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Tag, Trash2, Edit2, X, CheckSquare,
  Check, CheckCircle2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Columns, Rows, Zap, Navigation, Clipboard, Lock, PanelLeft, Info, Baseline, Highlighter
} from 'lucide-react';

type FileType = 'note' | 'canvas' | 'folder';

interface FileItem {
  id: string;
  type: FileType;
  title: string;
  parentId: string | null;
  content?: string;
  elements?: any;
  isOpen?: boolean;
  updatedAt: number;
  tags?: string[];
  isPinned?: boolean;
}

const FONT_OPTIONS = [
  { label: 'Default', name: 'Inter', value: 'font-inter' },
  { label: 'Technical', name: 'JetBrains Mono', value: 'font-jetbrains' },
];

const NOTE_SLASH_COMMANDS = [
  { id: 'h1', label: 'Heading 1', icon: <Heading1 size={14} /> },
  { id: 'h2', label: 'Heading 2', icon: <Heading2 size={14} /> },
  { id: 'h3', label: 'Heading 3', icon: <Heading3 size={14} /> },
  { id: 'paragraph', label: 'Paragraph', icon: <Pilcrow size={14} /> },
  { id: 'bullet', label: 'Bullet Point', icon: <List size={14} /> },
  { id: 'divider', label: 'Divider', icon: <SeparatorHorizontal size={14} /> },
  { id: 'code', label: 'Code Block', icon: <SquareCode size={14} /> },
  { id: 'table', label: 'Table', icon: <Grid2x2 size={14} /> },
  { id: 'image', label: 'Image (URL)', icon: <ImageIcon size={14} /> },
  { id: 'link', label: 'URL / Link', icon: <Link2 size={14} /> },
];

const NoteEditor = ({ file, updateFile, appFontClass }: { file: FileItem, updateFile: any, appFontClass: string, key?: string }) => {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashRange, setSlashRange] = useState<{ from: number, to: number } | null>(null);
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [turnMenuOpen, setTurnMenuOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const [justFinishedDragging, setJustFinishedDragging] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuOpenRef = useRef(false);
  const [tableControlPos, setTableControlPos] = useState<{ top: number; left: number } | null>(null);
  const activeTableElRef = useRef<HTMLElement | null>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredSlash = NOTE_SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(slashQuery) || c.id.includes(slashQuery));
  const textColorOptions = [
    { id: 'default', label: 'Default', color: '#111111' },
    { id: 'red', label: 'Red', color: '#dc2626' },
    { id: 'blue', label: 'Blue', color: '#2563eb' },
  ];
  const highlightOptions = [
    { id: 'default', label: 'Default', color: 'transparent' },
    { id: 'red', label: 'Red', color: '#fecaca' },
    { id: 'yellow', label: 'Yellow', color: '#fef08a' },
    { id: 'green', label: 'Green', color: '#bbf7d0' },
    { id: 'blue', label: 'Blue', color: '#bfdbfe' },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        listItem: false,
        codeBlock: false,
      }),
      CustomCodeBlockLowlight,
      ListItem.extend({
        draggable: true,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Start typing…' }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: file.content || '<p></p>',
    editorProps: {
      attributes: {
        class: `outline-none min-h-[calc(100vh-220px)] prose max-w-none text-[var(--text-primary)] ${appFontClass}`,
      },
      handleDOMEvents: {
        dragstart: () => {
          setIsDragging(true);
          return false;
        },
        dragend: () => {
          setTimeout(() => {
            setIsDragging(false);
            setJustFinishedDragging(true);
            setTimeout(() => setJustFinishedDragging(false), 500);
          }, 100);
          return false;
        },
        drop: () => {
          setTimeout(() => {
            setIsDragging(false);
            setJustFinishedDragging(true);
            setTimeout(() => setJustFinishedDragging(false), 500);
          }, 100);
          return false;
        },
        contextmenu: (view, event) => {
          return false;
        },
        // mouseover: (view, event) => {
        //   const target = event.target as HTMLElement;
        //   const table = target.closest('table');
        //   if (table && view.dom.contains(table)) {
        //     const tablePos = view.posAtDOM(table, 0);
        //     const rect = table.getBoundingClientRect();
        //     setHoveredTablePos({ pos: tablePos, rect });
        //   } else {
        //     setHoveredTablePos(null);
        //   }
        //   return false;
        // },
        // mouseleave: (view, event) => {
        //   const target = event.target as HTMLElement;
        //   if (target.tagName === 'TABLE') {
        //     setHoveredTablePos(null);
        //   }
        //   return false;
        // },
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== file.content) updateFile(file.id, { content: html });
    },
    onSelectionUpdate: ({ editor }) => {
      setForceHide(false);
      const { state, view } = editor;
      const { from, to } = state.selection;
      const { empty } = state.selection;

      const textBefore = state.doc.textBetween(Math.max(0, from - 60), from, '\n', '\0');
      const match = textBefore.match(/(?:^|\s)\/([\w-]*)$/);

      if (match) {
        const query = match[1] || '';
        const start = from - (query.length + 1);
        const coords = view.coordsAtPos(from);
        if (coords) {
          setSlashQuery(query.toLowerCase());
          setSlashSelectedIndex(0);
          setSlashRange({ from: start, to: from });
          setSlashPos({ top: coords.bottom, left: coords.left });
          setSlashOpen(true);
          setFormatMenuOpen(false);
          setTurnMenuOpen(false);
          setLinkPromptOpen(false);
        }
      } else {
        setSlashOpen(false);
        setSlashRange(null);
        setLinkPromptOpen(false);
        if (empty) {
          setFormatMenuOpen(false);
          setTurnMenuOpen(false);
        }
      }

      // Track active table DOM element for the always-visible table controls
      const $from = state.selection.$from;
      let foundTable: HTMLElement | null = null;
      for (let d = $from.depth; d >= 0; d--) {
        const nodeAtDepth = $from.node(d);
        if (nodeAtDepth.type.name === 'table') {
          try {
            const startPos = $from.start(d);
            const dom = view.nodeDOM(startPos) as HTMLElement | null;
            if (dom) {
              foundTable = dom.tagName === 'TABLE' ? dom : (dom.querySelector('table') || dom);
            }
          } catch (_) {}
          break;
        }
      }
      activeTableElRef.current = foundTable;
      if (foundTable) {
        const rect = foundTable.getBoundingClientRect();
        setTableControlPos({ top: rect.top, left: rect.right });
      } else if (!tableMenuOpenRef.current) {
        // Only hide the controls if the dropdown is not open
        // (clicking the ellipsis button moves focus outside the editor)
        setTableControlPos(null);
        setTableMenuOpen(false);
      }
    },
  });

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      setSlashOpen(false);
      setFormatMenuOpen(false);
      setTurnMenuOpen(false);
      setLinkPromptOpen(false);
      setForceHide(true);

      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      // Keep table control in sync with scrolled position
      if (activeTableElRef.current) {
        const rect = activeTableElRef.current.getBoundingClientRect();
        setTableControlPos({ top: rect.top, left: rect.right });
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Enforce drag handle visibility - prevent it from disappearing
  useEffect(() => {
    if (!editor) return;
    
    const enforceDragHandleVisibility = () => {
      const dragHandles = document.querySelectorAll('.drag-handle-fixed, .drag-handle');
      dragHandles.forEach(handle => {
        // Force visibility
        (handle as HTMLElement).style.visibility = 'visible';
        (handle as HTMLElement).style.pointerEvents = 'auto';
        (handle as HTMLElement).style.opacity = '0.4';
      });
    };

    // Run immediately and periodically
    enforceDragHandleVisibility();
    const interval = setInterval(enforceDragHandleVisibility, 500);

    // Also run on mousemove to catch hover states
    const handleMouseMove = () => {
      enforceDragHandleVisibility();
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [editor]);

  useEffect(() => {
    const handleGlobalScroll = () => {
      setSlashOpen(false);
      setFormatMenuOpen(false);
      setTurnMenuOpen(false);
      setLinkPromptOpen(false);
      setForceHide(true);
      
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };
    window.addEventListener('scroll', handleGlobalScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleGlobalScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as HTMLElement)) {
        setTableMenuOpen(false);
        tableMenuOpenRef.current = false;
      }
      // Hide table controls when clicking outside both the menu and the active table
      if (activeTableElRef.current && tableControlPos) {
        const tableRect = activeTableElRef.current.getBoundingClientRect();
        const x = (e as MouseEvent).clientX;
        const y = (e as MouseEvent).clientY;
        const inTable = x >= tableRect.left && x <= tableRect.right && y >= tableRect.top && y <= tableRect.bottom;
        const inMenu = tableMenuRef.current?.contains(e.target as HTMLElement) ?? false;
        if (!inTable && !inMenu) {
          setTableControlPos(null);
          activeTableElRef.current = null;
        }
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [tableControlPos]);

  useEffect(() => {
    if (!slashOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (e.key === 'ArrowDown') {
        setSlashSelectedIndex(prev => (prev + 1) % filteredSlash.length);
      } else if (e.key === 'ArrowUp') {
        setSlashSelectedIndex(prev => (prev - 1 + filteredSlash.length) % filteredSlash.length);
      } else if (e.key === 'Enter') {
        if (filteredSlash.length > 0) {
          runSlashCommand(filteredSlash[slashSelectedIndex].id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [slashOpen, filteredSlash, slashSelectedIndex]);

  useEffect(() => {
    if (!editor) return;
    const next = file.content || '<p></p>';
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next);
    }
  }, [editor, file.id, file.content]);

  const runSlashCommand = (id: string) => {
    if (!editor || !slashRange) return;
    const chain = editor.chain().focus().deleteRange(slashRange);

    if (id === 'h1') chain.toggleHeading({ level: 1 }).run();
    else if (id === 'h2') chain.toggleHeading({ level: 2 }).run();
    else if (id === 'h3') chain.toggleHeading({ level: 3 }).run();
    else if (id === 'paragraph') chain.setParagraph().run();
    else if (id === 'bullet') chain.toggleBulletList().run();
    else if (id === 'divider') chain.setHorizontalRule().run();
    else if (id === 'code') chain.toggleCodeBlock().run();
    else if (id === 'table') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    else if (id === 'image') {
      const url = prompt('Image URL:');
      if (url) chain.setImage({ src: url }).run();
    } else if (id === 'link') {
      setLinkPromptOpen(true);
      return;
    }

    setSlashOpen(false);
  };

  const applyLinkMode = (mode: 'inline' | 'embed') => {
    if (!editor || !slashRange) return;
    const url = prompt('Paste URL:');
    if (!url) {
      setLinkPromptOpen(false);
      return;
    }
    const chain = editor.chain().focus().deleteRange(slashRange);
    if (mode === 'inline') {
      chain.insertContent(url).setTextSelection({ from: slashRange.from, to: slashRange.from + url.length }).setLink({ href: url }).run();
    } else {
      chain.insertContent(`<blockquote><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></blockquote><p></p>`).run();
    }
    setLinkPromptOpen(false);
    setSlashOpen(false);
  };

  if (!editor) return null;

  const calculateSlashPosition = () => {
    const menuHeight = 320;
    const menuWidth = 224;
    const gap = 8;
    let top = slashPos.top + gap;
    let left = slashPos.left;

    if (window.innerHeight - top < menuHeight) {
      top = slashPos.top - menuHeight - gap;
    }

    if (window.innerWidth - left < menuWidth) {
      left = window.innerWidth - menuWidth - 16;
    }

    return { top, left };
  };

  const slashPosition = calculateSlashPosition();

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] relative" ref={editorContainerRef}>
      <div className="flex flex-grow overflow-hidden relative">
        <div className="flex-grow overflow-y-auto print:p-0 bg-[var(--bg-primary)] px-10 py-8" ref={scrollContainerRef}>
          <div className="w-full max-w-4xl mx-auto pb-24">
            <input
              className={`w-full bg-transparent border-none outline-none text-3xl font-semibold mb-5 placeholder:text-[var(--text-secondary)] ${appFontClass}`}
              placeholder="Untitled"
              value={file.title || ''}
              onChange={(e) => updateFile(file.id, { title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  editor.commands.focus('start');
                }
              }}
            />

            <BubbleMenu editor={editor} shouldShow={({ editor }) => {
              if (isScrolling || isDragging || justFinishedDragging || forceHide) return false;
              const { state } = editor;
              const { selection } = state;
              const { empty } = selection;
              return !empty;
            }}>
              <div 
                className="flex items-center gap-0.5 px-1 py-0.5 bg-white border border-[#e0e0e0] rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                style={{ height: '28px' }}
              >
                <button className="p-1 hover:bg-[#f5f5f5] rounded-[1px] text-[#666666] hover:text-[#111111] transition-colors" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></button>
                <button className="p-1 hover:bg-[#f5f5f5] rounded-[1px] text-[#666666] hover:text-[#111111] transition-colors" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></button>
                <button className="p-1 hover:bg-[#f5f5f5] rounded-[1px] text-[#666666] hover:text-[#111111] transition-colors" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={13} /></button>
                <button className="p-1 hover:bg-[#f5f5f5] rounded-[1px] text-[#666666] hover:text-[#111111] transition-colors" onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={13} /></button>
                <button className="p-1 hover:bg-[#f5f5f5] rounded-[1px] text-[#666666] hover:text-[#111111] transition-colors" onClick={() => editor.chain().focus().toggleCode().run()}><Code size={13} /></button>
                <div className="relative">
                  <button
                    className="p-1 hover:bg-[#f5f5f5] rounded-[1px] text-[#666666] hover:text-[#111111] flex items-center gap-0.5 transition-colors"
                    onClick={() => {
                      setFormatMenuOpen((v) => !v);
                      setTurnMenuOpen(false);
                    }}
                    title="Text and highlight colors"
                  >
                    <Type size={13} />
                    <ChevronRight size={10} className={`transition-transform ${formatMenuOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {formatMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 z-[10001] w-44 bg-white border border-[#e0e0e0] rounded-[2px] py-1 shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
                      <div className="px-2 py-1 text-[10px] uppercase text-[#999999] font-medium tracking-tight">Text Color</div>
                      {textColorOptions.map((option) => (
                        <button
                          key={option.id}
                          className="w-full px-2 py-1 text-left text-xs hover:bg-[#f5f5f5] flex items-center gap-2 transition-colors"
                          onClick={() => {
                            if (option.id === 'default') editor.chain().focus().unsetColor().run();
                            else editor.chain().focus().setColor(option.color).run();
                            setFormatMenuOpen(false);
                          }}
                        >
                          <span style={{ color: option.color }}><Baseline size={13} /></span>
                          {option.label}
                        </button>
                      ))}
                      <div className="h-px bg-[#e0e0e0] my-1" />
                      <div className="px-2 py-1 text-[10px] uppercase text-[#999999] font-medium tracking-tight">Highlight</div>
                      {highlightOptions.map((option) => (
                        <button
                          key={option.id}
                          className="w-full px-2 py-1 text-left text-xs hover:bg-[#f5f5f5] flex items-center gap-2 transition-colors"
                          onClick={() => {
                            if (option.id === 'default') editor.chain().focus().unsetHighlight().run();
                            else editor.chain().focus().setHighlight({ color: option.color }).run();
                            setFormatMenuOpen(false);
                          }}
                        >
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-[1px]"
                            style={{
                              backgroundColor: option.id === 'default' ? 'transparent' : option.color,
                              color: option.id === 'default' ? '#666666' : '#111111',
                              border: option.id === 'default' ? '1px solid #e0e0e0' : 'none',
                            }}
                          >
                            <Highlighter size={11} />
                          </span>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    className="text-[10px] bg-transparent border border-[#e0e0e0] rounded-[1px] px-1.5 py-0.5 hover:bg-[#f5f5f5] flex items-center gap-0.5 text-[#666666] hover:text-[#111111] transition-colors"
                    onClick={() => {
                      setTurnMenuOpen((v) => !v);
                      setFormatMenuOpen(false);
                    }}
                  >
                    Turn
                    <ChevronRight size={9} className={`transition-transform ${turnMenuOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {turnMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 z-[10001] w-40 bg-white border border-[#e0e0e0] rounded-[2px] py-1 shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
                      {[
                        { id: 'p', label: 'Paragraph', icon: <Pilcrow size={13} /> },
                        { id: 'h1', label: 'Heading 1', icon: <Heading1 size={13} /> },
                        { id: 'h2', label: 'Heading 2', icon: <Heading2 size={13} /> },
                        { id: 'h3', label: 'Heading 3', icon: <Heading3 size={13} /> },
                        { id: 'code', label: 'Code Block', icon: <SquareCode size={13} /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          className="w-full px-2 py-1 text-left text-xs hover:bg-[#f5f5f5] flex items-center gap-2 transition-colors"
                          onClick={() => {
                            if (item.id === 'p') editor.chain().focus().setParagraph().run();
                            if (item.id === 'h1') editor.chain().focus().setHeading({ level: 1 }).run();
                            if (item.id === 'h2') editor.chain().focus().setHeading({ level: 2 }).run();
                            if (item.id === 'h3') editor.chain().focus().setHeading({ level: 3 }).run();
                            if (item.id === 'code') editor.chain().focus().toggleCodeBlock().run();
                            setTurnMenuOpen(false);
                          }}
                        >
                          <span className="text-[#999999]">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </BubbleMenu>



            <div className="drag-handle-container relative min-h-[100px]">
              <EditorContent editor={editor} />
              <div className="drag-handle-wrapper absolute left-0 top-0 w-full h-full pointer-events-none">
                <DragHandle
                  editor={editor}
                  nested={{
                    rules: [
                      {
                        id: 'excludeTableContent',
                        evaluate: ({ node, $pos }) => {
                          // Allow the table itself
                          if (node.type.name === 'table') {
                            return 0; // Allow table container
                          }
                          
                          // Exclude tableRow, tableCell, tableHeader
                          if (['tableRow', 'tableCell', 'tableHeader'].includes(node.type.name)) {
                            return 1000; // Exclude table children
                          }
                          
                          // Walk up ancestors to find table-related nodes (excluding table itself)
                          let depth = $pos.depth;
                          while (depth >= 0) {
                            const ancestor = $pos.node(depth);
                            if (['tableRow', 'tableCell', 'tableHeader'].includes(ancestor.type.name)) {
                              return 1000; // Exclude nodes inside table elements
                            }
                            depth--;
                          }
                          return 0; // Allow this node
                        }
                      }
                    ]
                  }}
                  computePositionConfig={{
                    middleware: [
                      {
                        name: 'offset',
                        fn: ({ x, y }) => ({ x: x - 40, y }),
                      }
                    ]
                  }}
                  className="drag-handle-fixed opacity-40 hover:opacity-100 !pointer-events-auto !visible transition-opacity duration-150 w-8 h-6 flex items-center justify-center text-[#909090] hover:text-[#606060] cursor-grab active:cursor-grabbing bg-transparent border-none shadow-none z-[100]"
                >
                  <span className="text-base leading-none select-none">⠿</span>
                </DragHandle>
              </div>
            </div>
          </div>
        </div>
      </div>

      {slashOpen && (
        <div 
          className="fixed z-[9999] w-60 bg-[var(--color-shell-bg)] border border-[var(--color-border)] rounded-[2px] py-1 shadow-xl" 
          style={{ top: slashPosition.top, left: slashPosition.left }}
        >
          <div className="px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] font-medium tracking-tight border-b border-[var(--color-border)] mb-1">Commands</div>
          {filteredSlash.map((item, index) => (
            <button
              key={item.id}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-all relative group/item ${slashSelectedIndex === index ? 'bg-[var(--color-surface-hover)]' : 'hover:bg-[var(--color-surface-hover)]'}`}
              onClick={() => runSlashCommand(item.id)}
              onMouseEnter={() => setSlashSelectedIndex(index)}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-accent)] transition-opacity ${slashSelectedIndex === index ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`} />
              <span className={`w-5 flex items-center justify-center transition-colors ${slashSelectedIndex === index ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] group-hover/item:text-[var(--color-accent)]'}`}>{item.icon}</span>
              <span className={`transition-colors ${slashSelectedIndex === index ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)] group-hover/item:text-[var(--color-text-primary)]'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {linkPromptOpen && (
        <div className="fixed z-[10000] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-2 flex gap-2 shadow-xl" style={{ top: slashPosition.top + 12, left: slashPosition.left + 240 }}>
          <button className="px-2 py-1 text-xs border border-[var(--border-secondary)] rounded hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]" onClick={() => applyLinkMode('inline')}>Inline link</button>
          <button className="px-2 py-1 text-xs border border-[var(--border-secondary)] rounded hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]" onClick={() => applyLinkMode('embed')}>Embed</button>
        </div>
      )}

      {/* Always-visible table controls — positioned above the table (outside table cells) */}
      {tableControlPos && editorContainerRef.current && createPortal(
        <div
          ref={tableMenuRef}
          style={{
            position: 'fixed',
            top: tableControlPos.top - 28,
            left: tableControlPos.left - 22,
            zIndex: 10002,
          }}
        >
          {/* Ellipsis trigger — no background, always visible */}
          <button
            className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-tiny)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            onClick={(e) => { e.stopPropagation(); setTableMenuOpen(v => !v); }}
            title="Table options"
          >
            <Ellipsis size={14} />
          </button>

          {/* Dropdown */}
          {tableMenuOpen && (
            <div
              className="absolute right-0 mt-0.5 w-40 bg-[var(--color-shell-bg)] border border-[var(--color-border)] rounded-[var(--radius-tiny)] py-1 shadow-[0_2px_8px_rgba(0,0,0,0.10)]"
              style={{ top: '100%' }}
            >
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                Add
              </div>
              <button
                className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().addRowAfter().run(); setTableMenuOpen(false); }}
              >
                <Plus size={12} className="text-[var(--color-text-muted)]" /> Row below
              </button>
              <button
                className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().addColumnAfter().run(); setTableMenuOpen(false); }}
              >
                <Plus size={12} className="text-[var(--color-text-muted)]" /> Column right
              </button>
              <div className="h-px bg-[var(--color-border)] my-1" />
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                Delete
              </div>
              <button
                className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().deleteRow().run(); setTableMenuOpen(false); }}
              >
                <Trash2 size={12} /> Current row
              </button>
              <button
                className="w-full px-3 py-1.5 text-left text-[13px] flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().deleteColumn().run(); setTableMenuOpen(false); }}
              >
                <Trash2 size={12} /> Current column
              </button>
            </div>
          )}
        </div>,
        editorContainerRef.current
      )}

    </div>
  );
};

export function getSvgPathFromStroke(stroke: { x: number, y: number, p: number }[], settings: any) {
  if (!stroke || !stroke.length) return '';

  const mapped = stroke.map(pt => [pt.x, pt.y, pt.p]);
  const outline = getStroke(mapped, {
    size: settings.type === 'marker' ? settings.width * 4 : settings.width,
    thinning: settings.type === 'pen' ? 0.5 : 0,
    smoothing: 0.5,
    streamline: 0.5,
  });

  if (!outline.length) return '';

  const d = outline.reduce(
    (acc: any[], [x0, y0]: any, i: number, arr: any[]) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...outline[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

const ToolButton = ({ icon, onClick }: { icon: any, onClick: any }) => (
  <button
    className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
    onClick={onClick}
  >
    {icon}
  </button>
);

const CanvasNode = React.memo(({
  node,
  isSelected,
  tool,
  onPointerDown,
  onContentChange,
  onResize,
  isEditing,
  onEditChange,
  onToggleCollapse,
  onUpdateNode
}: {
  node: any,
  isSelected: boolean,
  tool: string,
  onPointerDown: any,
  onContentChange: any,
  onResize?: (id: string, width: number, height: number) => void,
  isEditing?: boolean,
  onEditChange?: (id: string, editing: boolean) => void,
  onToggleCollapse?: (id: string) => void,
  onUpdateNode?: (id: string, updates: any) => void
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sizeRef = useRef({ width: node.width, height: node.height });
  sizeRef.current = { width: node.width, height: node.height };
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const isTextLike = ['text', 'rich-text-card'].includes(node.type);
  const isResizable = ['shape'].includes(node.type);
  const isNewComponent = ['sticky-note', 'text-block', 'link-card', 'image-block'].includes(node.type);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isEditing]);

  useEffect(() => {
    if ((isTextLike || isNewComponent) && nodeRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const borderBox = entry.borderBoxSize?.[0];
          const newWidth = borderBox ? borderBox.inlineSize : entry.target.getBoundingClientRect().width;
          const newHeight = borderBox ? borderBox.blockSize : entry.target.getBoundingClientRect().height;

          if (Math.abs(newWidth - sizeRef.current.width) > 1 || Math.abs(newHeight - sizeRef.current.height) > 1) {
            onResizeRef.current?.(node.id, newWidth, newHeight);
          }
        }
      });
      observer.observe(nodeRef.current);
      return () => observer.disconnect();
    }
  }, [node.id, node.type, isTextLike, isNewComponent]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isTextLike || ['sticky-note', 'text-block'].includes(node.type)) {
      e.stopPropagation();
      if (!node.isLocked) {
        onEditChange?.(node.id, true);
      }
    }
  };

  return (
    <div
      ref={nodeRef}
      onPointerDown={(e) => {
        if (!node.isLocked) {
          onPointerDown(e, node.id);
        } else {
          // If locked, just select it but don't initiate drag
          e.stopPropagation();
          onPointerDown(e, node.id, true); // Pass a flag to indicate it's locked
        }
      }}
      onDoubleClick={handleDoubleClick}
      className={`absolute transition-all duration-200 ${isNewComponent
        ? `${isSelected ? 'ring-2 ring-blue-500/50 z-10' : 'hover:ring-1 hover:ring-blue-500/30'} ${isEditing ? 'ring-2 ring-blue-500' : ''}`
        : isTextLike
          ? `border rounded-md ${isSelected
            ? 'border-[var(--border-primary)] z-10'
            : 'border-transparent hover:border-[var(--border-secondary)]'
          } ${isEditing ? '!border-[var(--text-primary)] !shadow-[inset_0_0_0_1px_var(--text-primary)]' : ''}`
          : `border ${isSelected ? 'ring-2 ring-blue-500/30 z-10' : ''}`
        }`}
      style={{
        left: node.x,
        top: node.y,
        width: (isTextLike || isNewComponent) ? 'fit-content' : node.width,
        height: (isTextLike || isNewComponent) ? 'max-content' : node.height,
        minWidth: (isTextLike || isNewComponent) ? '150px' : undefined,
        minHeight: (isTextLike || isNewComponent) ? '50px' : undefined,
        maxWidth: (isTextLike || isNewComponent) ? (node.maxWidth || 'none') : undefined,
        backgroundColor: !isNewComponent ? (node.type === 'shape' ? node.color || 'transparent' : (node.backgroundColor || 'transparent')) : undefined,
        borderRadius: !isNewComponent ? (node.type === 'shape' ? (node.shapeType === 'circle' ? '50%' : `${node.borderRadius ?? 0}px`) : (isTextLike ? '6px' : '0px')) : undefined,
        borderWidth: !isNewComponent ? (node.type === 'shape' ? `${node.strokeWidth ?? 1}px` : '1px') : undefined,
        borderColor: !isNewComponent ? (node.type === 'shape' ? (node.strokeColor || 'var(--border-primary)') : undefined) : undefined,
        opacity: node.type === 'shape' ? (node.opacity ?? 1) : 1,
        padding: !isNewComponent ? (node.type === 'shape' ? 0 : '0px') : undefined,
        cursor: node.isLocked ? 'default' : (tool === 'select' ? (isEditing ? 'text' : 'move') : 'pointer'),
        zIndex: node.zIndex || 0
      }}
    >
      {isSelected && isNewComponent && onUpdateNode && onToggleCollapse && (
        <IconRow
          node={node}
          onUpdateNode={onUpdateNode}
          onToggleCollapse={onToggleCollapse}
        />
      )}

      {isResizable && isSelected && tool === 'select' && !node.isLocked && (
        <div
          className="absolute right-[-6px] bottom-[-6px] w-3 h-3 bg-white border border-blue-500 rounded-sm cursor-se-resize z-20"
          onPointerDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = node.width;
            const startHeight = node.height;

            const onPointerMove = (moveEvent: PointerEvent) => {
              const container = document.querySelector('.flex-grow.overflow-hidden.relative');
              let scale = 1;
              if (container) {
                const match = container.querySelector('div')?.style.transform.match(/scale\(([^)]+)\)/);
                if (match && match[1]) {
                  scale = parseFloat(match[1]);
                }
              }

              let newWidth = Math.max(10, startWidth + (moveEvent.clientX - startX) / scale);
              let newHeight = Math.max(10, startHeight + (moveEvent.clientY - startY) / scale);

              if (node.shapeType === 'circle') {
                const size = Math.max(newWidth, newHeight);
                newWidth = size;
                newHeight = size;
              }

              onResizeRef.current?.(node.id, newWidth, newHeight);
            };

            const onPointerUp = () => {
              document.removeEventListener('pointermove', onPointerMove);
              document.removeEventListener('pointerup', onPointerUp);
            };

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
          }}
        />
      )}

      {node.type === 'sticky-note' && (
        <StickyNote
          node={node}
          isEditing={isEditing}
          onContentChange={onContentChange}
          onEditChange={onEditChange}
        />
      )}

      {node.type === 'text-block' && (
        <TextBlock
          node={node}
          isEditing={isEditing}
          onContentChange={onContentChange}
          onEditChange={onEditChange}
          onToggleCollapse={onToggleCollapse}
        />
      )}

      {node.type === 'link-card' && (
        <LinkCard node={node} />
      )}

      {node.type === 'image-block' && (
        <ImageBlock node={node} />
      )}

      {isTextLike && (
        <>
          <div
            className={`p-3 whitespace-pre-wrap ${node.fontFamily || 'font-sans'} ${isEditing ? 'invisible' : ''}`}
            style={{
              fontSize: node.fontSize ? `${node.fontSize}px` : '14px',
              fontWeight: node.bold ? 'bold' : 'normal',
              fontStyle: node.italic ? 'italic' : 'normal',
              textAlign: node.align || 'left',
              lineHeight: '1.5',
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
              color: node.textColor || 'inherit',
            }}
          >
            {isEditing ? (
              node.content + '\u200B'
            ) : node.type === 'rich-text-card' ? (
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: node.content || '\u200B' }} />
            ) : (
              <div className="markdown-body">
                <Markdown remarkPlugins={[remarkGfm, remarkBreaks, remarkEscapeHtml]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>{node.content || '\u200B'}</Markdown>
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            className={`absolute inset-0 w-full h-full bg-transparent resize-none outline-none p-3 overflow-hidden ${node.fontFamily || 'font-sans'} ${!isEditing ? 'hidden' : ''}`}
            style={{
              fontSize: node.fontSize ? `${node.fontSize}px` : '14px',
              fontWeight: node.bold ? 'bold' : 'normal',
              fontStyle: node.italic ? 'italic' : 'normal',
              textAlign: node.align || 'left',
              color: node.textColor || 'inherit',
              lineHeight: '1.5',
              letterSpacing: '-0.01em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
            value={node.content}
            onChange={(e) => onContentChange(node.id, e.target.value)}
            placeholder={isEditing ? "Type here..." : ""}
            onPointerDown={e => {
              if (isEditing) e.stopPropagation();
            }}
            onBlur={() => onEditChange?.(node.id, false)}
            readOnly={!isEditing}
            onPaste={(e) => {
              const html = e.clipboardData.getData('text/html');
              if (html && html.includes('<table')) {
                e.preventDefault();
                const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
                const contentToPaste = tableMatch ? tableMatch[0] : html;

                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const newValue = node.content.substring(0, start) + contentToPaste + node.content.substring(end);
                onContentChange(node.id, newValue);

                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + contentToPaste.length;
                  }
                }, 0);
              }
            }}
          />
        </>
      )}
    </div>
  );
});

const CanvasEditor = ({ file, updateFile }: { file: FileItem, updateFile: any, key?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState('select');
  const [nodes, setNodes] = useState<any[]>(file.elements?.nodes || []);
  const [edges, setEdges] = useState<any[]>(file.elements?.edges || []);
  const [arrows, setArrows] = useState<any[]>(file.elements?.arrows || []);
  const [strokes, setStrokes] = useState<any[]>(file.elements?.strokes || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [draggingArrowEndpoint, setDraggingArrowEndpoint] = useState<'start' | 'end' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number, y: number, p: number }[] | null>(null);
  const [currentArrow, setCurrentArrow] = useState<any>(null);
  const [penSettings, setPenSettings] = useState({
    color: 'var(--text-primary)',
    width: 2,
    type: 'pen' as 'pen' | 'pencil' | 'marker'
  });
  const [shapeSettings, setShapeSettings] = useState({
    shapeType: 'rectangle',
    fill: '#e8e8e8',
    strokeWidth: 2,
    strokeColor: '#000000',
    borderRadius: 0,
    opacity: 1
  });
  const [textSettings, setTextSettings] = useState({
    font: 'font-inter',
    size: 16,
    color: '#0c0c0c',
    backgroundColor: 'transparent',
    bold: false,
    italic: false,
    align: 'left'
  });
  const [arrowSettings, setArrowSettings] = useState({
    style: 'straight',
    tailHead: false,
    headArrow: true,
    weight: 'med',
    color: '#0c0c0c'
  });

  const undoStack = useRef<{ nodes: any[], edges: any[], strokes: any[], arrows: any[] }[]>([]);
  const redoStack = useRef<{ nodes: any[], edges: any[], strokes: any[], arrows: any[] }[]>([]);
  const isUndoing = useRef(false);
  const [isErasing, setIsErasing] = useState(false);
  const isTyping = useRef(false);
  const typingTimeout = useRef<any>(null);
  const [forceSave, setForceSave] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const isDrawingRef = useRef(false);
  const isDrawingShapeRef = useRef(false);
  const isDrawingArrowRef = useRef(false);
  const currentShapeStartRef = useRef({ x: 0, y: 0 });
  const currentShapeIdRef = useRef<string | null>(null);
  const currentArrowStartRef = useRef({ x: 0, y: 0 });
  const currentArrowIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const isErasingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const currentStrokeRef = useRef<{ x: number, y: number, p: number }[] | null>(null);

  // High-performance ink and SVG drawing refs
  const livePathRef = useRef<SVGPathElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkPresenterRef = useRef<any>(null);

  useEffect(() => {
    // Feature Request: check if Delegated Ink Trail is supported
    // Disable on Android due to OS-level transform bugs with navigator.ink coordinates
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    const isInkSupported = typeof navigator !== 'undefined' && 'ink' in navigator && !isAndroid;
    if (isInkSupported && liveCanvasRef.current) {
      const initInk = async () => {
        try {
          inkPresenterRef.current = await (navigator as any).ink.requestPresenter({
            presentationArea: liveCanvasRef.current
          });
        } catch (e) {
          console.warn('Failed to initialize navigator.ink', e);
        }
      }
      initInk();
    }
  }, []);

  // Update canvas sizing on mount, window resize, and orientation change
  // Android tablets often change dimensions significantly when rotating
  useEffect(() => {
    const updateSize = () => {
      if (liveCanvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Hardware scaling for high-DPI Android displays
        const dpr = window.devicePixelRatio || 1;
        liveCanvasRef.current.width = rect.width * dpr;
        liveCanvasRef.current.height = rect.height * dpr;

        const ctx = liveCanvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };
    updateSize();

    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  const sortedStrokes = useMemo(() => {
    return [...strokes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [strokes]);

  useEffect(() => {
    if (isUndoing.current) {
      isUndoing.current = false;
      return;
    }
    if (currentStroke !== null || currentArrow !== null || isDragging || isErasing || isTyping.current) return;

    const currentState = { nodes, edges, strokes, arrows };
    const lastState = undoStack.current[undoStack.current.length - 1];

    if (lastState) {
      if (
        JSON.stringify(lastState.nodes) === JSON.stringify(currentState.nodes) &&
        JSON.stringify(lastState.edges) === JSON.stringify(currentState.edges) &&
        JSON.stringify(lastState.strokes) === JSON.stringify(currentState.strokes) &&
        JSON.stringify(lastState.arrows) === JSON.stringify(currentState.arrows)
      ) {
        return;
      }
    }

    undoStack.current.push(currentState);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [nodes, edges, strokes, arrows, currentStroke, currentArrow, isDragging, isErasing, forceSave]);

  const handleUndo = () => {
    if (undoStack.current.length > 1) {
      isUndoing.current = true;
      const currentState = undoStack.current.pop()!;
      redoStack.current.push(currentState);
      const previousState = undoStack.current[undoStack.current.length - 1];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setStrokes(previousState.strokes);
      setArrows(previousState.arrows || []);
    }
  };

  const handleRedo = () => {
    if (redoStack.current.length > 0) {
      isUndoing.current = true;
      const nextState = redoStack.current.pop()!;
      undoStack.current.push(nextState);
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setStrokes(nextState.strokes);
      setArrows(nextState.arrows || []);
    }
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      setNodes(nodes.filter(n => n.id !== selectedNodeId));
      setEdges(edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setArrows(arrows.map(a => {
        const newA = { ...a };
        if (a.startNodeId === selectedNodeId) newA.startNodeId = null;
        if (a.endNodeId === selectedNodeId) newA.endNodeId = null;
        return newA;
      }));
      setSelectedNodeId(null);
    } else if (selectedStrokeId) {
      setStrokes(strokes.filter(s => s.id !== selectedStrokeId));
      setSelectedStrokeId(null);
    } else if (selectedArrowId) {
      setArrows(arrows.filter(a => a.id !== selectedArrowId));
      setSelectedArrowId(null);
    }
  };

  const handleReorderLayers = (draggedId: string, targetId: string, position: 'before' | 'after') => {
    const allElements = [
      ...nodes.map(n => ({ ...n, layerType: 'node' })),
      ...strokes.map(s => ({ ...s, layerType: 'stroke' }))
    ].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const draggedIndex = allElements.findIndex(el => el.id === draggedId);
    if (draggedIndex === -1) return;

    const [draggedElement] = allElements.splice(draggedIndex, 1);

    const newTargetIndex = allElements.findIndex(el => el.id === targetId);
    if (newTargetIndex === -1) {
      allElements.splice(draggedIndex, 0, draggedElement);
    } else {
      if (position === 'before') {
        allElements.splice(newTargetIndex + 1, 0, draggedElement);
      } else {
        allElements.splice(newTargetIndex, 0, draggedElement);
      }
    }

    allElements.forEach((el, index) => {
      el.zIndex = index;
    });

    setNodes(allElements.filter(el => el.layerType === 'node').map(({ layerType, ...rest }) => rest));
    setStrokes(allElements.filter(el => el.layerType === 'stroke').map(({ layerType, ...rest }) => rest));
  };

  const [lastTilt, setLastTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        setLastTilt({ x: e.tiltX, y: e.tiltY });
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    return () => container.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    updateFile(file.id, { elements: { nodes, edges, strokes } });
  }, [nodes, edges, strokes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!e.ctrlKey && !e.metaKey && (target.closest('pre') || target.closest('textarea'))) {
        return; // Allow native scrolling for code blocks and textareas
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, transform.scale * (1 + delta)), 5);

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

        setTransform({ x: newX, y: newY, scale: newScale });
      } else {
        setTransform(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [transform]);

  const getCanvasCoords = (e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale,
      p: (e as any).pressure || 0.5
    };
  };

  const getStrokeBounds = (stroke: any) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      minX, maxX, minY, maxY
    };
  };

  const isPointInStroke = (x: number, y: number, stroke: any, baseTolerance = 10) => {
    const bounds = getStrokeBounds(stroke);
    const tolerance = baseTolerance / transform.scale + (stroke.width || 2) / 2;

    // Quick bounding box check first
    if (
      x < bounds.x - tolerance ||
      x > bounds.x + bounds.width + tolerance ||
      y < bounds.y - tolerance ||
      y > bounds.y + bounds.height + tolerance
    ) {
      return false;
    }

    // Detailed segment check
    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];

      const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
      if (l2 === 0) {
        if (Math.hypot(x - p1.x, y - p1.y) <= tolerance) return true;
        continue;
      }

      let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);

      if (Math.hypot(x - projX, y - projY) <= tolerance) {
        return true;
      }
    }
    return false;
  };

  const isPointInArrow = (x: number, y: number, arrow: any, tolerance = 10) => {
    const minX = Math.min(arrow.startPoint.x, arrow.endPoint.x) - tolerance;
    const maxX = Math.max(arrow.startPoint.x, arrow.endPoint.x) + tolerance;
    const minY = Math.min(arrow.startPoint.y, arrow.endPoint.y) - tolerance;
    const maxY = Math.max(arrow.startPoint.y, arrow.endPoint.y) + tolerance;

    if (x < minX || x > maxX || y < minY || y > maxY) return false;

    const dx = arrow.endPoint.x - arrow.startPoint.x;
    const dy = arrow.endPoint.y - arrow.startPoint.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(x - arrow.startPoint.x, y - arrow.startPoint.y) < tolerance;

    let t = ((x - arrow.startPoint.x) * dx + (y - arrow.startPoint.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = arrow.startPoint.x + t * dx;
    const projY = arrow.startPoint.y + t * dy;

    return Math.hypot(x - projX, y - projY) < tolerance;
  };

  const findNodeAtPoint = (x: number, y: number, tolerance = 20) => {
    // Search top-down by zIndex
    const sortedNodes = [...nodes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    for (const node of sortedNodes) {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      if (Math.hypot(x - cx, y - cy) <= tolerance) {
        return { ...node, x: cx, y: cy }; // return center point as x,y
      }
      // Also check if point is inside the node bounds
      if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
        return { ...node, x: cx, y: cy }; // return center point as x,y
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent default to stop compatibility mouse events from firing after touch/pen
    // But don't prevent default if the target is an input or textarea
    const target = e.target as HTMLElement;
    if (e.pointerType !== 'mouse' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }

    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      setEditingNodeId(null);
    }

    // If we're already tracking a pointer, ignore new ones (prevents multi-touch interference)
    if (activePointerIdRef.current !== null) return;

    // Palm rejection: ignore touch events for drawing
    const isPalmRejected = e.pointerType === 'touch';

    // If palm rejection is on and we are using the pen tool, ignore the touch completely
    if (isPalmRejected && tool === 'pen') {
      return;
    }

    // Pan mode: middle mouse button, space bar, explicit pan tool
    if (e.button === 1 || tool === 'pan' || ((e.nativeEvent as any).code === 'Space' && e.button === 0)) {
      setIsPanning(true);
      isPanningRef.current = true;
      setDragStart({ x: e.clientX, y: e.clientY });
      activePointerIdRef.current = e.pointerId;
      return;
    }

    const coords = getCanvasCoords(e);

    // Eraser button on pen (32) or eraser tool
    if ((e.buttons === 32 || tool === 'erase') && (e.pointerType === 'pen' || tool === 'erase')) {
      setIsErasing(true);
      isErasingRef.current = true;
      activePointerIdRef.current = e.pointerId;
      // Erase logic for strokes
      setStrokes(prev => prev.filter(s => !isPointInStroke(coords.x, coords.y, s, 10)));
      return;
    }

    // PEN TOOL - This should work for mouse, pen, and touch
    if (tool === 'pen') {
      console.log('Starting stroke with:', { pointerType: e.pointerType, tool, pressure: coords.p, x: coords.x, y: coords.y });

      const initialStroke = [{ x: coords.x, y: coords.y, p: coords.p }];
      // BYPASS REACT RECONCILIATION
      currentStrokeRef.current = initialStroke;
      isDrawingRef.current = true;
      activePointerIdRef.current = e.pointerId;

      // Clear live views
      if (livePathRef.current) livePathRef.current.setAttribute('d', '');

      // We removed setPointerCapture because it can be unstable on some tablet browsers

      e.stopPropagation(); // IMPORTANT: Stop event propagation
      return; // Early return to prevent other logic
    }

    if (tool === 'arrow') {
      const maxZ = Math.max(...[...nodes, ...strokes, ...arrows].map(el => el.zIndex || 0), -1);
      const newArrowId = Math.random().toString(36).substr(2, 9);

      const startNode = findNodeAtPoint(coords.x, coords.y, 20 / transform.scale);

      const newArrow = {
        id: newArrowId,
        startPoint: { x: coords.x, y: coords.y },
        endPoint: { x: coords.x, y: coords.y },
        startNodeId: startNode ? startNode.id : null,
        endNodeId: null,
        style: arrowSettings.style,
        tailHead: arrowSettings.tailHead,
        headArrow: arrowSettings.headArrow,
        weight: arrowSettings.weight,
        color: arrowSettings.color,
        zIndex: maxZ + 1
      };

      if (startNode) {
        newArrow.startPoint = { x: startNode.x, y: startNode.y };
      }

      setArrows([...arrows, newArrow]);
      setSelectedArrowId(newArrowId);
      setSelectedNodeId(null);
      setSelectedStrokeId(null);

      isDrawingArrowRef.current = true;
      currentArrowStartRef.current = { x: coords.x, y: coords.y };
      currentArrowIdRef.current = newArrowId;
      activePointerIdRef.current = e.pointerId;
      setIsDragging(true);

      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Other tools below
    if (tool === 'shape') {
      const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);
      const newNodeId = Math.random().toString(36).substr(2, 9);
      const newNode = {
        id: newNodeId,
        type: tool,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        content: '',
        shapeType: shapeSettings.shapeType,
        color: shapeSettings.fill,
        strokeWidth: shapeSettings.strokeWidth,
        strokeColor: shapeSettings.strokeColor,
        borderRadius: shapeSettings.borderRadius,
        opacity: shapeSettings.opacity,
        zIndex: maxZ + 1
      };
      setNodes([...nodes, newNode]);
      setSelectedNodeId(newNodeId);

      isDrawingShapeRef.current = true;
      currentShapeStartRef.current = { x: coords.x, y: coords.y };
      currentShapeIdRef.current = newNodeId;
      activePointerIdRef.current = e.pointerId;
      setIsDragging(true);

      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (tool === 'text') {
      const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);
      const newNode = {
        id: Math.random().toString(36).substr(2, 9),
        type: tool,
        x: coords.x,
        y: coords.y,
        width: 150,
        height: 50,
        content: '',
        fontSize: textSettings.size,
        fontFamily: textSettings.font,
        textColor: textSettings.color,
        backgroundColor: textSettings.backgroundColor,
        bold: textSettings.bold,
        italic: textSettings.italic,
        align: textSettings.align,
        zIndex: maxZ + 1
      };
      setNodes([...nodes, newNode]);
      setTool('select');
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (tool === 'select') {
      setSelectedNodeId(null);
      setSelectedArrowId(null);

      // Check for arrow selection
      let foundArrowId = null;
      for (let i = arrows.length - 1; i >= 0; i--) {
        if (isPointInArrow(coords.x, coords.y, arrows[i], 10 / transform.scale)) {
          foundArrowId = arrows[i].id;
          break;
        }
      }

      if (foundArrowId) {
        setSelectedArrowId(foundArrowId);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        activePointerIdRef.current = e.pointerId;
        e.stopPropagation();
        return;
      }

      // Check for stroke selection (top-down by zIndex)
      let foundStrokeId = null;
      const sortedStrokes = [...strokes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      for (let i = sortedStrokes.length - 1; i >= 0; i--) {
        if (isPointInStroke(coords.x, coords.y, sortedStrokes[i])) {
          foundStrokeId = sortedStrokes[i].id;
          break;
        }
      }
      setSelectedStrokeId(foundStrokeId);

      if (foundStrokeId) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        activePointerIdRef.current = e.pointerId;
      }
      e.stopPropagation();
      return;
    }

    setSelectedNodeId(null);
    setSelectedStrokeId(null);
    setSelectedArrowId(null);
  };

  const [currentPressure, setCurrentPressure] = useState(0);

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only process events for the active pointer (if one is active)
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    if (isPanningRef.current || isPanning) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y)
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawingArrowRef.current && currentArrowIdRef.current) {
      const coords = getCanvasCoords(e);
      const endNode = findNodeAtPoint(coords.x, coords.y, 20 / transform.scale);

      setArrows(prev => prev.map(a => {
        if (a.id === currentArrowIdRef.current) {
          const newA = { ...a, endPoint: { x: coords.x, y: coords.y }, endNodeId: endNode ? endNode.id : null };
          if (endNode) {
            newA.endPoint = { x: endNode.x, y: endNode.y };
          }
          return newA;
        }
        return a;
      }));
      return;
    }

    if (isDrawingShapeRef.current && currentShapeIdRef.current) {
      const coords = getCanvasCoords(e);
      const start = currentShapeStartRef.current;

      let width = Math.abs(coords.x - start.x);
      let height = Math.abs(coords.y - start.y);
      let x = Math.min(coords.x, start.x);
      let y = Math.min(coords.y, start.y);

      // If circle, make it a perfect circle
      if (shapeSettings.shapeType === 'circle') {
        const size = Math.max(width, height);
        width = size;
        height = size;
        x = coords.x < start.x ? start.x - size : start.x;
        y = coords.y < start.y ? start.y - size : start.y;
      }

      setNodes(prev => prev.map(n => n.id === currentShapeIdRef.current ? {
        ...n,
        x,
        y,
        width,
        height
      } : n));
      return;
    }

    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / transform.scale;
      const dy = (e.clientY - dragStart.y) / transform.scale;

      if (selectedNodeId) {
        const node = nodes.find(n => n.id === selectedNodeId);
        if (node) {
          setNodes(prev => prev.map(n => n.id === selectedNodeId ? {
            ...n,
            x: n.x + dx,
            y: n.y + dy
          } : n));

          setArrows(prev => prev.map(a => {
            let updated = false;
            const newA = { ...a };
            if (a.startNodeId === selectedNodeId) {
              newA.startPoint = { x: node.x + dx, y: node.y + dy };
              updated = true;
            }
            if (a.endNodeId === selectedNodeId) {
              newA.endPoint = { x: node.x + dx, y: node.y + dy };
              updated = true;
            }
            return updated ? newA : a;
          }));
        }
      } else if (selectedStrokeId) {
        setStrokes(prev => prev.map(s => s.id === selectedStrokeId ? {
          ...s,
          points: s.points.map((p: any) => ({ ...p, x: p.x + dx, y: p.y + dy }))
        } : s));
      } else if (selectedArrowId) {
        if (draggingArrowEndpoint) {
          const coords = getCanvasCoords(e);
          const snapNode = findNodeAtPoint(coords.x, coords.y, 20 / transform.scale);

          setArrows(prev => prev.map(a => {
            if (a.id === selectedArrowId) {
              const newA = { ...a };
              if (draggingArrowEndpoint === 'start') {
                newA.startPoint = { x: coords.x, y: coords.y };
                newA.startNodeId = snapNode ? snapNode.id : null;
                if (snapNode) newA.startPoint = { x: snapNode.x, y: snapNode.y };
              } else {
                newA.endPoint = { x: coords.x, y: coords.y };
                newA.endNodeId = snapNode ? snapNode.id : null;
                if (snapNode) newA.endPoint = { x: snapNode.x, y: snapNode.y };
              }
              return newA;
            }
            return a;
          }));
        } else {
          setArrows(prev => prev.map(a => a.id === selectedArrowId ? {
            ...a,
            startPoint: { x: a.startPoint.x + dx, y: a.startPoint.y + dy },
            endPoint: { x: a.endPoint.x + dx, y: a.endPoint.y + dy },
            startNodeId: null,
            endNodeId: null
          } : a));
        }
      }
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.pointerType === 'pen') {
      setCurrentPressure(e.pressure);
    }

    // Smooth strokes using coalesced events
    const events = (e.nativeEvent as any).getCoalescedEvents ? (e.nativeEvent as any).getCoalescedEvents() : [e.nativeEvent];
    let hasNewPoints = false;

    for (const ev of events) {
      const coords = getCanvasCoords(ev);

      if (tool === 'pen' && isDrawingRef.current && currentStrokeRef.current) {
        const newPoint = { x: coords.x, y: coords.y, p: coords.p };
        // Push instead of array spreading to avoid allocation overhead on mousemove
        currentStrokeRef.current.push(newPoint);
        hasNewPoints = true;
      }

      if ((tool === 'erase' || isErasingRef.current) && (e.buttons === 1 || e.buttons === 32)) {
        setStrokes(prev => prev.filter(s => !isPointInStroke(coords.x, coords.y, s, 10)));
        setArrows(prev => prev.filter(a => !isPointInArrow(coords.x, coords.y, a, 10 / transform.scale)));
      }
    }

    if (tool === 'pen' && isDrawingRef.current && hasNewPoints && currentStrokeRef.current) {
      const d = getSvgPathFromStroke(currentStrokeRef.current, penSettings);

      // ALWAYS use Path A (imperative SVG) for visual app rendering.
      // This mathematically guarantees 0 visual offset and perfect alignment
      // across all devices, zoom levels, and CSS transforms.
      if (livePathRef.current) {
        livePathRef.current.setAttribute('d', d);
      }

      // Path B: Add Delegated Ink API for ultra-low-latency hardware trails
      // This is drawn directly by the OS compositor AHEAD of the DOM update.
      if (inkPresenterRef.current) {
        try {
          // Supported heavily on Windows Edge/Chrome
          inkPresenterRef.current.updateInkTrailStartPoint(e.nativeEvent, {
            color: penSettings.color,
            diameter: (penSettings.type === 'marker' ? penSettings.width * 4 : penSettings.width) * transform.scale
          });
        } catch (err) {
          // Ignore failures if ink trail disconnected
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Only process events for the active pointer
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }

    if (isErasingRef.current || isErasing) {
      setIsErasing(false);
      isErasingRef.current = false;
    }
    setIsPanning(false);
    isPanningRef.current = false;
    setIsDragging(false);
    setDraggingArrowEndpoint(null);
    setCurrentPressure(0);

    if (tool === 'pen' && isDrawingRef.current && currentStrokeRef.current) {
      const finalStroke = [...currentStrokeRef.current];
      const maxZ = Math.max(...strokes.map(s => s.zIndex || 0), -1);
      setStrokes(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        points: finalStroke,
        color: penSettings.color,
        width: penSettings.width,
        type: penSettings.type,
        opacity: penSettings.type === 'pencil' ? 0.3 : penSettings.type === 'marker' ? 0.6 : 1,
        timestamp: Date.now(),
        zIndex: maxZ + 1
      }]);

      if (livePathRef.current) livePathRef.current.setAttribute('d', '');

      setCurrentStroke(null);
      currentStrokeRef.current = null;
      isDrawingRef.current = false;
    }

    if (isDrawingShapeRef.current) {
      isDrawingShapeRef.current = false;

      setNodes(prev => {
        const shape = prev.find(n => n.id === currentShapeIdRef.current);
        if (shape && shape.width < 10 && shape.height < 10) {
          // If just a click, give it a default size
          const defaultSize = 100;
          return prev.map(n => n.id === currentShapeIdRef.current ? {
            ...n,
            width: defaultSize,
            height: defaultSize,
            x: n.x - defaultSize / 2,
            y: n.y - defaultSize / 2
          } : n);
        }
        return prev;
      });

      currentShapeIdRef.current = null;
      setTool('select');
    }

    if (isDrawingArrowRef.current) {
      isDrawingArrowRef.current = false;

      setArrows(prev => {
        const arrow = prev.find(a => a.id === currentArrowIdRef.current);
        if (arrow && Math.hypot(arrow.endPoint.x - arrow.startPoint.x, arrow.endPoint.y - arrow.startPoint.y) < 10) {
          // If just a click, remove the arrow
          return prev.filter(a => a.id !== currentArrowIdRef.current);
        }
        return prev;
      });

      currentArrowIdRef.current = null;
      setTool('select');
    }

    activePointerIdRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (tool === 'select') {
      const coords = getCanvasCoords(e as any);
      const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);
      const newNode = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 150,
        height: 50,
        content: '',
        fontSize: textSettings.size,
        fontFamily: textSettings.font,
        textColor: textSettings.color,
        backgroundColor: textSettings.backgroundColor,
        bold: textSettings.bold,
        italic: textSettings.italic,
        align: textSettings.align,
        zIndex: maxZ + 1
      };
      setNodes([...nodes, newNode]);
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, id: string, isLocked?: boolean) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (e.pointerType !== 'mouse' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }

    if (id !== editingNodeId && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      setEditingNodeId(null);
    }

    if (activePointerIdRef.current !== null) return;

    if (tool === 'select') {
      setSelectedNodeId(id);
      setSelectedStrokeId(null);
      setSelectedArrowId(null);
      if (!isLocked) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        activePointerIdRef.current = e.pointerId;
      }
    } else if (tool === 'erase') {
      setNodes(nodes.filter(n => n.id !== id));
      setEdges(edges.filter(e => e.source !== id && e.target !== id));
      setArrows(arrows.map(a => {
        const newA = { ...a };
        if (a.startNodeId === id) newA.startNodeId = null;
        if (a.endNodeId === id) newA.endNodeId = null;
        return newA;
      }));
    }
  };

  const handleMindMap = () => {
    const rootId = Math.random().toString(36).substr(2, 9);
    const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);
    setNodes([...nodes, {
      id: rootId,
      type: 'text',
      x: -75,
      y: -25,
      width: 150,
      height: 50,
      content: 'Root Idea',
      fontSize: textSettings.size,
      fontFamily: textSettings.font,
      textColor: textSettings.color,
      backgroundColor: textSettings.backgroundColor,
      bold: textSettings.bold,
      italic: textSettings.italic,
      align: textSettings.align,
      zIndex: maxZ + 1
    }]);
    if (containerRef.current) {
      setTransform({ x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2, scale: 1 });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && tool === 'select') {
          // Don't delete if editing text
          if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
          setNodes(nodes.filter(n => n.id !== selectedNodeId));
          setEdges(edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
          setArrows(arrows.map(a => {
            const newA = { ...a };
            if (a.startNodeId === selectedNodeId) newA.startNodeId = null;
            if (a.endNodeId === selectedNodeId) newA.endNodeId = null;
            return newA;
          }));
          setSelectedNodeId(null);
        } else if (selectedStrokeId && tool === 'select') {
          setStrokes(strokes.filter(s => s.id !== selectedStrokeId));
          setSelectedStrokeId(null);
        } else if (selectedArrowId && tool === 'select') {
          setArrows(arrows.filter(a => a.id !== selectedArrowId));
          setSelectedArrowId(null);
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo
          if (redoStack.current.length > 0) {
            isUndoing.current = true;
            const nextState = redoStack.current.pop()!;
            undoStack.current.push(nextState);
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            setStrokes(nextState.strokes);
          }
        } else {
          // Undo
          if (undoStack.current.length > 1) {
            isUndoing.current = true;
            const currentState = undoStack.current.pop()!;
            redoStack.current.push(currentState);
            const previousState = undoStack.current[undoStack.current.length - 1];
            setNodes(previousState.nodes);
            setEdges(previousState.edges);
            setStrokes(previousState.strokes);
          }
        }
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Redo
        if (redoStack.current.length > 0) {
          isUndoing.current = true;
          const nextState = redoStack.current.pop()!;
          undoStack.current.push(nextState);
          setNodes(nextState.nodes);
          setEdges(nextState.edges);
          setStrokes(nextState.strokes);
        }
      }
    };


    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      const detectClipboardContent = (e: ClipboardEvent): { type: string, content: any, plainText?: string, htmlContent?: string, isCollapsed?: boolean, canCollapse?: boolean } | null => {
        const items = e.clipboardData?.items;
        if (!items) return null;

        // Check for image
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              return { type: 'image-block', content: URL.createObjectURL(blob) };
            }
          }
        }

        let text = e.clipboardData?.getData('text/plain');
        const html = e.clipboardData?.getData('text/html');

        if (html) {
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '_',
            strongDelimiter: '**',
            br: ''
          });

          turndownService.use(gfm);

          let processedHtml = turndownService.turndown(html);

          if (processedHtml) {
            text = processedHtml;
          }
        }

        if (!text) return null;

        try {
          const url = new URL(text);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            return { type: 'link-card', content: text, plainText: text };
          }
        } catch (_) {
          // Not a URL
        }

        const lines = text.split('\n').length;
        if (text.length < 200 && lines < 5) {
          return { type: 'sticky-note', content: text, plainText: text };
        } else {
          return { type: 'text-block', content: text, plainText: text, isCollapsed: true, canCollapse: true };
        }
      };

      const detected = detectClipboardContent(e);
      if (!detected) return;

      e.preventDefault();

      const { type: detectedType, content, plainText, htmlContent, isCollapsed, canCollapse } = detected;

      const id = Math.random().toString(36).substr(2, 9);
      const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);

      let centerX = 0;
      let centerY = 0;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        centerX = (rect.width / 2 - transform.x) / transform.scale;
        centerY = (rect.height / 2 - transform.y) / transform.scale;
      }

      const newNode: any = {
        id,
        type: detectedType,
        x: centerX - 100,
        y: centerY - 50,
        width: detectedType === 'link-card' ? 320 : (detectedType === 'image-block' ? 480 : 280),
        height: detectedType === 'image-block' ? 200 : 100,
        content: plainText || content,
        plainText: plainText,
        htmlContent: htmlContent,
        isCollapsed,
        canCollapse,
        zIndex: maxZ + 1,
      };

      if (['sticky-note', 'text-block', 'text'].includes(detectedType)) {
        newNode.backgroundColor = detectedType === 'sticky-note' ? '#fef08a' : 'transparent';
        newNode.textColor = detectedType === 'sticky-note' ? '#0c0c0c' : textSettings.color;
        newNode.fontSize = detectedType === 'sticky-note' ? Math.max(18, textSettings.size) : textSettings.size;
        newNode.fontFamily = detectedType === 'sticky-note' ? 'var(--font-kalam)' : 'var(--font-sans)';
        newNode.align = textSettings.align;
        newNode.bold = textSettings.bold;
        newNode.italic = textSettings.italic;
        newNode.maxWidth = detectedType === 'text-block' ? 480 : (detectedType === 'sticky-note' ? 280 : 300);
      }

      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(id);
      setTool('select');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [selectedNodeId, selectedStrokeId, selectedArrowId, tool, nodes, edges, strokes, arrows, transform]);

  const performPasteFromClipboard = useCallback(async (x: number, y: number) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        let type = '';
        let content = '';
        let plainText = '';

        if (clipboardItem.types.includes('image/png') || clipboardItem.types.includes('image/jpeg')) {
          const typeMatch = clipboardItem.types.find(t => t.startsWith('image/'));
          if (typeMatch) {
            const blob = await clipboardItem.getType(typeMatch);
            content = URL.createObjectURL(blob);
            type = 'image-block';
          }
        } else if (clipboardItem.types.includes('text/plain')) {
          const blob = await clipboardItem.getType('text/plain');
          plainText = await blob.text();
          content = plainText;

          try {
            const url = new URL(plainText);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              type = 'link-card';
            }
          } catch (_) { }

          if (!type) {
            const lines = plainText.split('\n').length;
            if (plainText.length < 200 && lines < 5) {
              type = 'sticky-note';
            } else {
              type = 'text-block';
            }
          }
        }

        if (type) {
          const id = Math.random().toString(36).substr(2, 9);
          const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);

          const newNode: any = {
            id,
            type,
            x: x - 100,
            y: y - 50,
            width: type === 'link-card' ? 320 : (type === 'image-block' ? 480 : 280),
            height: type === 'image-block' ? 200 : 100,
            content: content,
            plainText: plainText,
            isCollapsed: type === 'text-block',
            canCollapse: type === 'text-block',
            zIndex: maxZ + 1,
          };

          if (['sticky-note', 'text-block', 'text'].includes(type)) {
            newNode.backgroundColor = type === 'sticky-note' ? '#fef08a' : 'transparent';
            newNode.textColor = type === 'sticky-note' ? '#0c0c0c' : textSettings.color;
            newNode.fontSize = type === 'sticky-note' ? Math.max(18, textSettings.size) : textSettings.size;
            newNode.fontFamily = type === 'sticky-note' ? 'var(--font-kalam)' : 'var(--font-sans)';
            newNode.align = textSettings.align;
            newNode.bold = textSettings.bold;
            newNode.italic = textSettings.italic;
            newNode.maxWidth = type === 'text-block' ? 480 : (type === 'sticky-note' ? 280 : 300);
          }

          setNodes(prev => [...prev, newNode]);
          setSelectedNodeId(id);
          setTool('select');
          break;
        }
      }
    } catch (err) {
      console.warn('Fallback paste (text only):', err);
      try {
        const plainText = await navigator.clipboard.readText();
        if (plainText) {
          let type = '';
          try {
            const url = new URL(plainText);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              type = 'link-card';
            }
          } catch (_) { }

          if (!type) {
            const lines = plainText.split('\n').length;
            if (plainText.length < 200 && lines < 5) {
              type = 'sticky-note';
            } else {
              type = 'text-block';
            }
          }

          const id = Math.random().toString(36).substr(2, 9);
          const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);

          const newNode: any = {
            id, type,
            x: x - 100, y: y - 50,
            width: type === 'link-card' ? 320 : 280,
            height: 100,
            content: plainText, plainText: plainText,
            isCollapsed: type === 'text-block', canCollapse: type === 'text-block',
            zIndex: maxZ + 1,
          };

          if (['sticky-note', 'text-block', 'text'].includes(type)) {
            newNode.backgroundColor = type === 'sticky-note' ? '#fef08a' : 'transparent';
            newNode.textColor = type === 'sticky-note' ? '#0c0c0c' : textSettings.color;
            newNode.fontSize = type === 'sticky-note' ? Math.max(18, textSettings.size) : textSettings.size;
            newNode.fontFamily = type === 'sticky-note' ? 'var(--font-kalam)' : 'var(--font-sans)';
            newNode.align = textSettings.align;
            newNode.bold = textSettings.bold;
            newNode.italic = textSettings.italic;
            newNode.maxWidth = type === 'text-block' ? 480 : (type === 'sticky-note' ? 280 : 300);
          }

          setNodes(prev => [...prev, newNode]);
          setSelectedNodeId(id);
          setTool('select');
        }
      } catch (e2) {
        const manualText = window.prompt("Clipboard access blocked by tablet. Paste your text or link here:");
        if (manualText) {
          let type = '';
          try {
            const url = new URL(manualText);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              type = 'link-card';
            }
          } catch (_) { }

          if (!type) {
            const lines = manualText.split('\n').length;
            if (manualText.length < 200 && lines < 5) {
              type = 'sticky-note';
            } else {
              type = 'text-block';
            }
          }

          const id = Math.random().toString(36).substr(2, 9);
          const maxZ = Math.max(...[...nodes, ...strokes].map(el => el.zIndex || 0), -1);

          const newNode: any = {
            id, type,
            x: x - 100, y: y - 50,
            width: type === 'link-card' ? 320 : 280,
            height: 100,
            content: manualText, plainText: manualText,
            isCollapsed: type === 'text-block', canCollapse: type === 'text-block',
            zIndex: maxZ + 1,
          };

          if (['sticky-note', 'text-block', 'text'].includes(type)) {
            newNode.backgroundColor = type === 'sticky-note' ? '#fef08a' : 'transparent';
            newNode.textColor = type === 'sticky-note' ? '#0c0c0c' : textSettings.color;
            newNode.fontSize = type === 'sticky-note' ? Math.max(18, textSettings.size) : textSettings.size;
            newNode.fontFamily = type === 'sticky-note' ? 'var(--font-kalam)' : 'var(--font-sans)';
            newNode.align = textSettings.align;
            newNode.bold = textSettings.bold;
            newNode.italic = textSettings.italic;
            newNode.maxWidth = type === 'text-block' ? 480 : (type === 'sticky-note' ? 280 : 300);
          }

          setNodes(prev => [...prev, newNode]);
          setSelectedNodeId(id);
          setTool('select');
        }
      }
    }
  }, [nodes, strokes, textSettings]);

  const contentBounds = useMemo(() => {
    if (nodes.length === 0 && strokes.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + node.width);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + node.height);
    });

    strokes.forEach(stroke => {
      const bounds = getStrokeBounds(stroke);
      minX = Math.min(minX, bounds.x);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      minY = Math.min(minY, bounds.y);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    if (minX === Infinity) return null;

    return { minX, maxX, minY, maxY };
  }, [nodes, strokes]);

  const isOutOfView = useMemo(() => {
    if (!contentBounds || !containerRef.current) return false;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const viewportMinX = -transform.x / transform.scale;
    const viewportMinY = -transform.y / transform.scale;
    const viewportMaxX = (containerWidth - transform.x) / transform.scale;
    const viewportMaxY = (containerHeight - transform.y) / transform.scale;

    return (
      contentBounds.maxX < viewportMinX ||
      contentBounds.minX > viewportMaxX ||
      contentBounds.maxY < viewportMinY ||
      contentBounds.minY > viewportMaxY
    );
  }, [contentBounds, transform]);

  const handleGoBackToContent = () => {
    if (!contentBounds || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const contentWidth = contentBounds.maxX - contentBounds.minX;
    const contentHeight = contentBounds.maxY - contentBounds.minY;
    const contentCenterX = contentBounds.minX + contentWidth / 2;
    const contentCenterY = contentBounds.minY + contentHeight / 2;

    // Calculate scale to fit content with some padding, max scale 1
    const padding = 40;
    const scaleX = (containerWidth - padding * 2) / Math.max(contentWidth, 1);
    const scaleY = (containerHeight - padding * 2) / Math.max(contentHeight, 1);
    const newScale = Math.min(scaleX, scaleY, 1);

    setTransform({
      x: containerWidth / 2 - contentCenterX * newScale,
      y: containerHeight / 2 - contentCenterY * newScale,
      scale: newScale
    });
  };

  const renderArrow = (arrow: any, isSelected: boolean) => {
    const { startPoint, endPoint, style, tailHead, headArrow, weight, color } = arrow;
    const strokeWidth = weight === 'thin' ? 1.5 : weight === 'med' ? 2.5 : 4;

    let d = '';
    if (style === 'straight') {
      d = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
    } else if (style === 'curved') {
      const mx = (startPoint.x + endPoint.x) / 2;
      const my = (startPoint.y + endPoint.y) / 2;
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const offset = Math.sqrt(dx * dx + dy * dy) * 0.2;
      const nx = -dy;
      const ny = dx;
      const len = Math.sqrt(nx * nx + ny * ny);
      const cx = mx + (nx / len) * offset;
      const cy = my + (ny / len) * offset;
      d = `M ${startPoint.x} ${startPoint.y} Q ${cx} ${cy} ${endPoint.x} ${endPoint.y}`;
    } else if (style === 'elbow') {
      const mx = (startPoint.x + endPoint.x) / 2;
      d = `M ${startPoint.x} ${startPoint.y} L ${mx} ${startPoint.y} L ${mx} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
    }

    return (
      <g key={arrow.id}>
        <path
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          markerStart={tailHead ? `url(#arrowhead-start-${arrow.id})` : undefined}
          markerEnd={headArrow ? `url(#arrowhead-end-${arrow.id})` : undefined}
        />
        {isSelected && (
          <>
            <path
              d={d}
              stroke="var(--text-primary)"
              strokeWidth={strokeWidth + 4}
              strokeOpacity={0.2}
              fill="none"
            />
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={6 / transform.scale}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={2 / transform.scale}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelectedArrowId(arrow.id);
                setDraggingArrowEndpoint('start');
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
                activePointerIdRef.current = e.pointerId;
              }}
            />
            <circle
              cx={endPoint.x}
              cy={endPoint.y}
              r={6 / transform.scale}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={2 / transform.scale}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelectedArrowId(arrow.id);
                setDraggingArrowEndpoint('end');
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
                activePointerIdRef.current = e.pointerId;
              }}
            />
          </>
        )}
        <defs>
          {tailHead && (
            <marker id={`arrowhead-start-${arrow.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          )}
          {headArrow && (
            <marker id={`arrowhead-end-${arrow.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          )}
        </defs>
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <div className="h-12 border-b border-[var(--border-primary)] flex items-center justify-between px-4 shrink-0 z-10 bg-[var(--bg-primary)]">
        <input
          className="bg-transparent text-xl font-semibold outline-none w-1/3"
          value={file.title}
          onChange={(e) => updateFile(file.id, { title: e.target.value })}
        />
        <div className="flex items-center gap-[var(--gap-size)] text-[13px] text-[var(--text-secondary)]">
          <span>{Math.round(transform.scale * 100)}%</span>
          <button onClick={() => setTransform(p => ({ ...p, scale: p.scale * 1.2 }))}>+</button>
          <button onClick={() => setTransform(p => ({ ...p, scale: p.scale / 1.2 }))}>-</button>
          <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}>Fit</button>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden relative">
        <CanvasToolbar
          activeTool={tool}
          onToolChange={setTool}
          nodes={nodes}
          strokes={strokes}
          arrows={arrows}
          selectedNodeId={selectedNodeId}
          selectedStrokeId={selectedStrokeId}
          selectedArrowId={selectedArrowId}
          onSelectNode={setSelectedNodeId}
          onSelectStroke={setSelectedStrokeId}
          onSelectArrow={setSelectedArrowId}
          onPanTo={(x: number, y: number) => {
            if (containerRef.current) {
              setTransform({
                x: containerRef.current.clientWidth / 2 - x * transform.scale,
                y: containerRef.current.clientHeight / 2 - y * transform.scale,
                scale: transform.scale
              });
            }
          }}
          penSettings={penSettings}
          onPenSettingsChange={(settings: any) => {
            setPenSettings(settings);
            if (selectedStrokeId) {
              setStrokes(prev => prev.map(s => s.id === selectedStrokeId ? { ...s, color: settings.color, width: settings.width, type: settings.type } : s));
            }
          }}
          shapeSettings={shapeSettings}
          onShapeSettingsChange={(settings: any) => {
            setShapeSettings(settings);
            if (selectedNodeId) {
              setNodes(prev => prev.map(n => n.id === selectedNodeId && n.type === 'shape' ? { ...n, shapeType: settings.shapeType, color: settings.fill, strokeWidth: settings.strokeWidth, strokeColor: settings.strokeColor, borderRadius: settings.borderRadius, opacity: settings.opacity } : n));
            }
          }}
          textSettings={textSettings}
          onTextSettingsChange={(settings: any) => {
            setTextSettings(settings);
            if (selectedNodeId) {
              setNodes(prev => prev.map(n => n.id === selectedNodeId && n.type === 'text' ? { ...n, fontFamily: settings.font, fontSize: settings.size, textColor: settings.color, backgroundColor: settings.backgroundColor, bold: settings.bold, italic: settings.italic, align: settings.align } : n));
            }
          }}
          arrowSettings={arrowSettings}
          onArrowSettingsChange={(settings: any) => {
            setArrowSettings(settings);
            if (selectedArrowId) {
              setArrows(prev => prev.map(a => a.id === selectedArrowId ? { ...a, style: settings.style, tailHead: settings.tailHead, headArrow: settings.headArrow, weight: settings.weight, color: settings.color } : a));
            }
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          onReorderLayers={handleReorderLayers}
        />

        <div
          ref={containerRef}
          className="flex-grow overflow-hidden relative"
          style={{ cursor: tool === 'pan' || isPanning ? 'grab' : tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
          onPointerDown={(e) => {
            if (contextMenu) setContextMenu(null);
            handlePointerDown(e);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => {
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {contextMenu && (
            <div
              className="absolute bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl rounded py-1 z-50 flex flex-col min-w-[120px] animate-in fade-in"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onPointerDown={e => e.stopPropagation()}
            >
              <button
                className="px-4 py-2 text-sm text-[var(--text-primary)] text-left hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                onClick={() => {
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const x = (contextMenu.x - rect.left - transform.x) / transform.scale;
                    const y = (contextMenu.y - rect.top - transform.y) / transform.scale;
                    performPasteFromClipboard(x, y);
                  }
                  setContextMenu(null);
                }}
              >
                <Clipboard size={14} /> Paste
              </button>
            </div>
          )}

          {/* Path B: Hardware accelerated Live Canvas for Delegated Ink Trails */}
          <canvas
            ref={liveCanvasRef}
            className="absolute inset-0 pointer-events-none z-50"
            style={{ touchAction: 'none' }}
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(var(--border-primary) 1px, transparent 1px)',
              backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
              backgroundPosition: `${transform.x}px ${transform.y}px`
            }}
          />

          {selectedStrokeId && tool === 'select' && (() => {
            const stroke = strokes.find(s => s.id === selectedStrokeId);
            if (!stroke) return null;
            const bounds = getStrokeBounds(stroke);
            return (
              <>
                <div
                  className="absolute bottom-4 left-16 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-2 text-xs font-mono text-[var(--text-secondary)] shadow-lg z-20"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="font-bold text-[var(--text-primary)] mb-1">Stroke #{stroke.id.substring(0, 4)}</div>
                  <div>Size: {stroke.width}px</div>
                  <div>Points: {stroke.points.length}</div>
                  <div>Pos: ({Math.round(bounds.x)}, {Math.round(bounds.y)})</div>
                </div>
                <div
                  className="absolute bottom-12 right-4 flex flex-col gap-1 z-20"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    className="p-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      const maxZ = Math.max(...strokes.map(s => s.zIndex || 0), -1);
                      setStrokes(strokes.map(s => s.id === selectedStrokeId ? { ...s, zIndex: maxZ + 1 } : s));
                    }}
                    title="Bring to Front"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="p-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      const minZ = Math.min(...strokes.map(s => s.zIndex || 0), 1);
                      setStrokes(strokes.map(s => s.id === selectedStrokeId ? { ...s, zIndex: minZ - 1 } : s));
                    }}
                    title="Send to Back"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="p-1.5 bg-[var(--bg-secondary)] border border-red-500/30 rounded hover:bg-red-500/20 text-red-500 shadow-lg mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStrokes(strokes.filter(s => s.id !== selectedStrokeId));
                      setSelectedStrokeId(null);
                    }}
                    title="Delete Stroke"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            );
          })()}

          <div
            className="absolute inset-0 origin-top-left"
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
          >
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-secondary)" />
                </marker>
              </defs>
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;
                const sx = source.x + source.width / 2;
                const sy = source.y + source.height / 2;
                const tx = target.x + target.width / 2;
                const ty = target.y + target.height / 2;
                return <line key={edge.id} x1={sx} y1={sy} x2={tx} y2={ty} stroke="var(--text-secondary)" strokeWidth="2" markerEnd="url(#arrowhead)" />;
              })}
              {arrows.map(arrow => renderArrow(arrow, selectedArrowId === arrow.id))}
              {sortedStrokes.map(stroke => {
                const isSelected = selectedStrokeId === stroke.id;
                const bounds = isSelected ? getStrokeBounds(stroke) : null;
                const d = getSvgPathFromStroke(stroke.points, { type: stroke.type, width: stroke.width || 2 });
                const opacity = stroke.opacity ?? (stroke.type === 'pencil' ? 0.3 : stroke.type === 'marker' ? 0.6 : 1);

                return (
                  <g key={stroke.id}>
                    <path
                      d={d}
                      fill={stroke.color || 'var(--text-primary)'}
                      opacity={opacity}
                      style={{ isolation: 'isolate' }}
                    />
                    {isSelected && bounds && (
                      <rect
                        x={bounds.x - 4}
                        y={bounds.y - 4}
                        width={bounds.width + 8}
                        height={bounds.height + 8}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                )
              })}

              {/* Path A: Live SVG Path - Mutated imperatively to bypass React rendering */}
              <path
                ref={livePathRef}
                fill={penSettings.color}
                opacity={penSettings.type === 'pencil' ? 0.3 : penSettings.type === 'marker' ? 0.6 : 1}
                style={{ pointerEvents: 'none', isolation: 'isolate' }}
              />
            </svg>

            {nodes.map(node => (
              <CanvasNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                tool={tool}
                onPointerDown={handleNodePointerDown}
                onContentChange={(id: string, content: string) => {
                  isTyping.current = true;
                  clearTimeout(typingTimeout.current);
                  typingTimeout.current = setTimeout(() => {
                    isTyping.current = false;
                    setForceSave(prev => prev + 1);
                  }, 1000);
                  setNodes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
                }}
                onResize={(id: string, width: number, height: number) => {
                  setNodes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
                }}
                isEditing={editingNodeId === node.id}
                onEditChange={(id: string, editing: boolean) => {
                  if (editing) {
                    setEditingNodeId(id);
                  } else if (editingNodeId === id) {
                    setEditingNodeId(null);
                  }
                }}
                onToggleCollapse={(id: string) => {
                  setNodes(prev => prev.map(n => n.id === id ? { ...n, isCollapsed: !n.isCollapsed } : n));
                }}
                onUpdateNode={(id: string, updates: any) => {
                  setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
                }}
              />
            ))}
          </div>
        </div>

        {isOutOfView && (
          <button
            onClick={handleGoBackToContent}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-full shadow-lg font-mono text-xs flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-all duration-200 animate-in fade-in slide-in-from-top-4"
          >
            <Navigation size={14} />
            Go back to content
          </button>
        )}
      </div>
    </div>
  );
};

const CanvasTool = ({ icon, active, onClick }: { icon: any, active: boolean, onClick: any }) => (
  <button
    className={`p-1.5 rounded transition-colors ${active ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
    onClick={onClick}
  >
    {icon}
  </button>
);

const CommandPalette = ({
  files,
  onClose,
  onSelect
}: {
  files: FileItem[],
  onClose: () => void,
  onSelect: (id: string) => void
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredFiles = files.filter(f => {
    if (!query) return true;
    const q = query.toLowerCase();

    // Contextual filters
    if (q.startsWith('type:note') && f.type !== 'note') return false;
    if (q.startsWith('type:canvas') && f.type !== 'canvas') return false;

    const searchTerms = q.replace(/type:(note|canvas)/, '').trim();
    if (!searchTerms) return true;

    const inTitle = f.title.toLowerCase().includes(searchTerms);
    const inTags = f.tags?.some(t => t.toLowerCase().includes(searchTerms));

    // Full text search for notes
    let inContent = false;
    if (f.type === 'note' && f.content) {
      // Strip HTML tags for searching
      const textContent = f.content.replace(/<[^>]*>?/gm, '').toLowerCase();
      inContent = textContent.includes(searchTerms);
    }

    // Search in canvas text nodes
    if (f.type === 'canvas' && f.elements?.nodes) {
      inContent = f.elements.nodes.some((n: any) =>
        n.type === 'text' &&
        n.content?.toLowerCase().includes(searchTerms)
      );
    }

    return inTitle || inTags || inContent;
  }).sort((a, b) => b.updatedAt - a.updatedAt);

  const getPreview = (file: FileItem) => {
    if (file.type === 'note' && file.content) {
      const text = file.content.replace(/<[^>]*>?/gm, ' ').trim();
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }
    if (file.type === 'canvas' && file.elements?.nodes) {
      const textNodes = file.elements.nodes.filter((n: any) => n.type === 'text');
      if (textNodes.length > 0) {
        const text = textNodes.map((n: any) => n.content).join(' ');
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
      }
      return `${file.elements.nodes.length} nodes, ${file.elements.edges?.length || 0} edges`;
    }
    return 'No content preview';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center gap-3">
          <Search size={20} className="text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            placeholder="Search notes, tags, or content... (try 'type:note' or 'type:canvas')"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              No results found for "{query}"
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredFiles.map(f => (
                <div
                  key={f.id}
                  className="p-3 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer flex flex-col gap-1 border border-transparent hover:border-[var(--border-primary)] transition-colors"
                  onClick={() => {
                    onSelect(f.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center">
                        {f.type === 'note' ? <FileText size={18} /> : f.type === 'canvas' ? <LayoutGrid size={18} /> : '📁'}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{f.title || 'Untitled'}</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(f.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {f.tags && f.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {f.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[var(--border-primary)] text-[var(--text-secondary)] rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1 opacity-80">
                    {getPreview(f)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] flex justify-between">
          <span><kbd className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">↑</kbd> <kbd className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">↓</kbd> to navigate</span>
          <span><kbd className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">Enter</kbd> to select</span>
          <span><kbd className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};

const SHORTCUTS = [
  { action: 'Command Palette', mac: 'Cmd + K', win: 'Ctrl + K', keywords: ['search', 'find', 'palette', 'command'] },
  { action: 'New Note', mac: 'Cmd + N', win: 'Ctrl + N', keywords: ['new', 'create', 'note'] },
  { action: 'New Canvas', mac: 'Cmd + Shift + N', win: 'Ctrl + Shift + N', keywords: ['new', 'create', 'canvas', 'drawing'] },
  { action: 'Toggle Sidebar', mac: 'Cmd + \\', win: 'Ctrl + \\', keywords: ['sidebar', 'menu', 'toggle', 'hide', 'show'] },
  { action: 'Switch to Notes', mac: 'Cmd + 1', win: 'Ctrl + 1', keywords: ['switch', 'notes', 'mode'] },
  { action: 'Switch to Canvas', mac: 'Cmd + 2', win: 'Ctrl + 2', keywords: ['switch', 'canvas', 'mode'] },
  { action: 'Settings', mac: 'Cmd + ,', win: 'Ctrl + ,', keywords: ['settings', 'preferences', 'options'] },
  { action: 'Delete File', mac: 'Cmd + Backspace', win: 'Ctrl + Backspace', keywords: ['delete', 'remove', 'trash'] },
  { action: 'Toggle Theme', mac: 'Cmd + Shift + L', win: 'Ctrl + Shift + L', keywords: ['theme', 'dark', 'light', 'mode', 'toggle'] },
];

const SettingsPage = ({ appFontClass, onAppFontChange }: { appFontClass: string, onAppFontChange: (value: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'shortcuts'>('preferences');
  const [shortcutSearch, setShortcutSearch] = useState('');

  const filteredShortcuts = SHORTCUTS.filter(s =>
    s.action.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
    s.keywords.some(k => k.toLowerCase().includes(shortcutSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full p-8 md:p-12">
        <h1 className="text-4xl font-semibold mb-2">Settings</h1>
        <p className="text-[var(--text-secondary)] mb-8">Manage your preferences and integrations.</p>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--border-primary)] mb-8">
          <button
            className={`pb-2 px-1 text-[13px] font-medium transition-colors border-b-2 ${activeTab === 'preferences' ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences (early access)
          </button>
          <button
            className={`pb-2 px-1 text-[13px] font-medium transition-colors border-b-2 ${activeTab === 'shortcuts' ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            Keyboard Shortcuts
          </button>
        </div>

        <div className="space-y-12">
          {activeTab === 'preferences' ? (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Type className="text-[var(--text-secondary)]" size={20} />
                <h2 className="text-2xl font-semibold">Appearance</h2>
              </div>
              <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
                Set a default font for the whole app interface and note editor.
              </p>
              <div className="border border-[var(--border-primary)] rounded-lg p-4 bg-[var(--bg-secondary)]">
                <label className="block text-sm font-medium mb-2">Preferred App Font</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FONT_OPTIONS.map((font) => {
                    const isActive = appFontClass === font.value;
                    return (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => onAppFontChange(font.value)}
                        className={`text-left px-3 py-2 rounded-md border transition-colors ${isActive
                            ? 'border-[var(--brand)] bg-[var(--brand-subtle)]'
                            : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--border-secondary)]'
                          }`}
                      >
                        <div className={`text-[13px] font-medium ${font.value}`}>{font.name}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{font.label}</div>
                      </button>
                    );
                  })}
                </div>
                <p className={`mt-3 text-sm text-[var(--text-secondary)] ${appFontClass}`}>
                  Preview: The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </section>
          ) : (
            /* Keyboard Shortcuts Section */
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold">Keyboard Shortcuts</h2>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search shortcuts..."
                    value={shortcutSearch}
                    onChange={(e) => setShortcutSearch(e.target.value)}
                    className="w-full bg-[var(--color-shell-bg)] border border-[var(--color-border)] rounded-full pl-9 pr-4 py-1.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                </div>
              </div>

              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-editor-bg)]">
                <div className="grid grid-cols-3 bg-[var(--color-shell-bg)] border-b border-[var(--color-border)] p-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  <div>Action</div>
                  <div>Windows / Linux</div>
                  <div>macOS</div>
                </div>

                <div className="divide-y divide-[var(--color-border)]">
                  {filteredShortcuts.length > 0 ? (
                    filteredShortcuts.map((shortcut, idx) => (
                      <div key={idx} className="grid grid-cols-3 p-3 items-center hover:bg-[var(--color-surface-hover)] transition-colors">
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">{shortcut.action}</div>
                        <div>
                          <kbd className="px-2 py-1 bg-[var(--color-editor-bg)] border border-[var(--color-border)] rounded text-xs font-mono text-[var(--color-text-muted)]">
                            {shortcut.win}
                          </kbd>
                        </div>
                        <div>
                          <kbd className="px-2 py-1 bg-[var(--color-editor-bg)] border border-[var(--color-border)] rounded text-xs font-mono text-[var(--color-text-muted)]">
                            {shortcut.mac}
                          </kbd>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-[var(--color-text-muted)] text-sm">
                      No shortcuts found for "{shortcutSearch}"
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const HelpWidget = ({
  activeMode,
  noteMeta
}: {
  activeMode: 'notes' | 'canvas',
  noteMeta?: { wordCount: number, lastSaved: number } | null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const widgetRef = useRef<HTMLDivElement>(null);

  const defaultCards = activeMode === 'notes' ? [
    {
      label: 'Insert a block',
      steps: [
        'Place cursor on an empty line',
        'Type /',
        'Use arrow keys or type to filter (e.g. table, heading)',
        'Press Enter to insert'
      ]
    },
    {
      label: 'Format text',
      steps: [
        'Select any text with your cursor',
        'A floating toolbar appears above the selection',
        'Choose block type or character format (B, I, U, S, Link)'
      ]
    }
  ] : [
    {
      label: 'Pan Canvas',
      steps: [
        'Select the Hand tool (H)',
        'Click and drag anywhere on the canvas',
        'Or hold Spacebar and drag with any tool selected',
        'Or use middle mouse button to drag'
      ]
    },
    {
      label: 'Zoom Canvas',
      steps: [
        'Use the + and - buttons in the top right',
        'Or hold Ctrl/Cmd and scroll your mouse wheel',
        'Or use pinch gesture on a trackpad'
      ]
    },
    {
      label: 'Select Elements',
      steps: [
        'Select the Pointer tool (V)',
        'Click on any shape, text, or stroke to select it',
        'Click and drag to move the selected element'
      ]
    },
    {
      label: 'Draw Shapes',
      steps: [
        'Select the Shape tool (S)',
        'Click anywhere on the canvas to place a shape',
        'Change shape type, color, and border in the properties panel'
      ]
    },
    {
      label: 'Add Text',
      steps: [
        'Select the Text tool (T)',
        'Click anywhere on the canvas to add text',
        'Double-click existing text to edit it',
        'Change font size and color in the properties panel'
      ]
    },
    {
      label: 'Freehand Drawing',
      steps: [
        'Select the Pen tool (P)',
        'Click and drag to draw',
        'Change pen type (pen, pencil, marker), color, and width in the properties panel'
      ]
    },
    {
      label: 'Layers Panel',
      steps: [
        'Click the Layers button in the toolbar',
        'View all elements on the canvas',
        'Click an element in the list to select it',
        'Use the trash icon to delete elements'
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleCard = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div ref={widgetRef} className="fixed bottom-4 right-4 z-[300]">
      {isOpen && (
        <div
          className="absolute bottom-10 right-0 w-[260px] max-h-[400px] flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md overflow-hidden"
          style={{
            animation: 'helpWidgetIn 150ms ease forwards',
            boxShadow: 'none'
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">How to…</span>
            <button
              onClick={() => window.open('/docs.html', '_blank')}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {defaultCards.map((card, idx) => {
              const isExpanded = expandedCards[idx];
              return (
                <div key={idx} className="border-b border-[var(--border-primary)] last:border-b-0 px-[12px] py-[10px]">
                  <button
                    className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                    onClick={() => toggleCard(idx)}
                  >
                    <span className="font-sans text-[12px] text-[var(--text-primary)]">{card.label}</span>
                    <span className={`text-[var(--text-secondary)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                      ›
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="pt-[8px]">
                      {card.steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="flex gap-2">
                          <span className="font-mono text-[12px] text-[var(--text-secondary)] shrink-0">{stepIdx + 1}.</span>
                          <span className="font-sans text-[12px] text-[var(--text-secondary)] leading-[1.7]">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {activeMode === 'notes' && noteMeta && (
            <div className="border-t border-[var(--border-primary)] px-3 py-2 bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                {noteMeta.wordCount} words
                <span className="opacity-50">|</span>
                Last saved {new Date(noteMeta.lastSaved).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Info size={14} />
      </button>
    </div>
  );
};

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeMode, setActiveMode] = useState<'notes' | 'canvas'>('notes');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [appFontClass, setAppFontClass] = useState('font-inter');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isResizerHovered, setIsResizerHovered] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showSettings, setShowSettings] = useState(false);

  // File management states
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [taggingFileId, setTaggingFileId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [filesToDelete, setFilesToDelete] = useState<FileItem[] | null>(null);
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const getTagColor = (tag: string) => {
    const colors = [
      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
      'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('inkframe_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
    const savedFont = localStorage.getItem('inkframe_app_font');
    if (savedFont) {
      setAppFontClass(savedFont === 'font-dm-sans' ? 'font-inter' : savedFont);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('inkframe_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('inkframe_app_font', appFontClass);
  }, [appFontClass]);

  useEffect(() => {
    const saved = localStorage.getItem('inkframe_files');
    if (saved) {
      setFiles(JSON.parse(saved));
    } else {
      setFiles([
        { id: '1', type: 'note', title: 'Welcome Note', parentId: null, content: '<h1>Welcome to BoardsNote</h1><p>Start typing...</p>', updatedAt: Date.now() },
        { id: '2', type: 'canvas', title: 'Idea Board', parentId: null, elements: { nodes: [], edges: [], strokes: [] }, updatedAt: Date.now() },
        { id: '3', type: 'note', title: 'Documentation', parentId: null, content: '<h1>Documentation</h1><p>This is your documentation note. You can change its font using the picker above.</p><h2>Features</h2><ul><li>Rich text editing</li><li>Canvas for diagrams</li><li>Slash commands</li></ul>', updatedAt: Date.now() }
      ]);
    }
  }, []);

  useEffect(() => {
    if (unsavedChanges) {
      const timer = setTimeout(() => {
        localStorage.setItem('inkframe_files', JSON.stringify(files));
        setUnsavedChanges(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [files, unsavedChanges]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.file-menu-dropdown')) {
        setOpenFileMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        localStorage.setItem('inkframe_files', JSON.stringify(files));
        setUnsavedChanges(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files]);

  const updateFile = (id: string, updates: Partial<FileItem>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f));
    setUnsavedChanges(true);
  };

  const createFile = (type: FileType) => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: type === 'note' ? '' : `New ${type}`,
      parentId: null,
      updatedAt: Date.now(),
      content: type === 'note' ? '' : undefined,
      elements: type === 'canvas' ? { nodes: [], edges: [], strokes: [] } : undefined
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
    setActiveMode(type === 'note' ? 'notes' : 'canvas');
  };

  const createActiveModeFile = () => {
    createFile(activeMode === 'notes' ? 'note' : 'canvas');
    setShowSettings(false);
  };

  const toggleFolder = (id: string) => {
    updateFile(id, { isOpen: !files.find(f => f.id === id)?.isOpen });
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id && f.parentId !== id));
    if (activeFileId === id) setActiveFileId(null);
    setUnsavedChanges(true);
  };

  const deleteFiles = (ids: string[]) => {
    setFiles(prev => prev.filter(f => !ids.includes(f.id) && !ids.includes(f.parentId as string)));
    if (activeFileId && ids.includes(activeFileId)) setActiveFileId(null);
    setUnsavedChanges(true);
    setSelectedFileIds(new Set());
    setIsSelectionMode(false);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedFileIds(newSelection);
  };

  const renderTree = (parentId: string | null) => {
    return files
      .filter(f => f.parentId === parentId && (activeMode === 'notes' ? f.type !== 'canvas' : f.type !== 'note'))
      .filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(f => !tagFilter || (f.tags && f.tags.includes(tagFilter)))
      .map(f => (
        <div key={f.id}>
          <div
            className={`flex flex-col px-2 py-1.5 cursor-pointer rounded group relative transition-colors ${activeFileId === f.id && !showSettings ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-hover)]'}`}
            onClick={() => {
              if (isSelectionMode) {
                toggleSelection(f.id);
              } else if (f.type === 'folder') {
                toggleFolder(f.id);
              } else {
                setActiveFileId(f.id);
                setShowSettings(false);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center overflow-hidden flex-1">
                {isSelectionMode && (
                  <div className="mr-2 flex items-center justify-center w-4 h-4 rounded border border-[var(--color-border)] shrink-0">
                    {selectedFileIds.has(f.id) && <CheckSquare size={14} className="text-[var(--color-text-primary)]" />}
                  </div>
                )}
                <span className="mr-2 text-sm shrink-0 flex items-center justify-center">
                  {f.type === 'folder' ? (f.isOpen ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} />) : f.type === 'note' ? <FileText size={14} /> : <LayoutGrid size={14} />}
                </span>
                {editingFileId === f.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-transparent border-b border-[var(--color-border)] outline-none text-sm text-[var(--color-text-primary)] min-w-0"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => {
                      if (editingTitle.trim()) updateFile(f.id, { title: editingTitle.trim() });
                      setEditingFileId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (editingTitle.trim()) updateFile(f.id, { title: editingTitle.trim() });
                        setEditingFileId(null);
                      } else if (e.key === 'Escape') {
                        setEditingFileId(null);
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className={`text-[13px] truncate ${activeFileId === f.id && !showSettings ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-text-primary)]'}`}>{f.title || 'Untitled'}</span>
                )}
              </div>

              <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
                {!isSelectionMode && (
                  <>
                    <button
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] rounded"
                      onClick={(e) => { e.stopPropagation(); setEditingFileId(f.id); setEditingTitle(f.title); }}
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] rounded"
                      onClick={(e) => { e.stopPropagation(); setTaggingFileId(taggingFileId === f.id ? null : f.id); setNewTag(''); }}
                      title="Tags"
                    >
                      <Tag size={12} />
                    </button>
                    <button
                      className="p-1 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded"
                      onClick={(e) => { e.stopPropagation(); setFilesToDelete([f]); }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {((f.tags && f.tags.length > 0) || taggingFileId === f.id) && (
              <div className="flex flex-wrap gap-1 mt-1 ml-6">
                {f.tags?.map(tag => (
                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 border rounded flex items-center gap-1 ${getTagColor(tag)}`}>
                    {tag}
                    {taggingFileId === f.id && (
                      <X
                        size={10}
                        className="cursor-pointer opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFile(f.id, { tags: f.tags!.filter(t => t !== tag) });
                        }}
                      />
                    )}
                  </span>
                ))}
                {taggingFileId === f.id && (
                  <input
                    autoFocus
                    className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded outline-none w-20 text-[var(--text-primary)]"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        e.stopPropagation();
                        const tag = newTag.trim();
                        if (!f.tags?.includes(tag)) {
                          updateFile(f.id, { tags: [...(f.tags || []), tag] });
                        }
                        setNewTag('');
                      } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        setTaggingFileId(null);
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            )}
          </div>
          {f.type === 'folder' && f.isOpen && (
            <div className="ml-4 border-l border-[var(--border-primary)]">
              {renderTree(f.id)}
            </div>
          )}
        </div>
      ));
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const noteMeta = useMemo(() => {
    if (!activeFile || activeFile.type !== 'note') return null;
    const text = (activeFile.content || '').replace(/<[^>]*>?/gm, ' ').trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return { wordCount, lastSaved: activeFile.updatedAt };
  }, [activeFile]);
  const isSidebarVisible = sidebarOpen;

  const FileMenuDropdown = ({ file, buttonRef }: { file: FileItem, buttonRef: React.RefObject<HTMLButtonElement | null> }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const isMounted = useRef(false);

    useEffect(() => {
      const handleScroll = () => {
        setOpenFileMenuId(null);
      };
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    useEffect(() => {
      isMounted.current = true;
      const updatePosition = () => {
        if (buttonRef.current && isMounted.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const dropdownWidth = 144; // w-36 = 9rem = 144px
          const dropdownHeight = 120; // Approximate height
          const padding = 8;

          // Position dropdown below and aligned to right edge of button
          let left = rect.right - dropdownWidth;
          let top = rect.bottom + padding;

          // Ensure dropdown stays within viewport
          if (left < padding) left = padding;
          if (left + dropdownWidth > window.innerWidth - padding) {
            left = rect.left;
          }
          if (top + dropdownHeight > window.innerHeight - padding) {
            top = rect.top - dropdownHeight - padding;
          }

          setPosition({ top, left });
        }
      };
      // Small delay to ensure button is rendered
      const timer = setTimeout(updatePosition, 0);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        isMounted.current = false;
        clearTimeout(timer);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [buttonRef]);

    if (!position) return null;

    return createPortal(
      <div
        className="file-menu-dropdown fixed z-[100] w-36 bg-[var(--color-shell-bg)] border border-[var(--color-border)] rounded-lg shadow-xl py-1"
        style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
      >
        <button
          className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-[var(--color-surface-hover)] transition-colors"
          onClick={(e) => { e.stopPropagation(); updateFile(file.id, { isPinned: !file.isPinned }); setOpenFileMenuId(null); }}
        >
          <Star size={12} className={file.isPinned ? 'text-amber-500 fill-current' : 'text-[var(--color-text-muted)]'} />
          <span className="text-[var(--color-text-primary)]">{file.isPinned ? 'Unfavourite' : 'Favourite'}</span>
        </button>
        <button
          className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-[var(--color-surface-hover)] transition-colors"
          onClick={(e) => { e.stopPropagation(); setEditingFileId(file.id); setEditingTitle(file.title); setOpenFileMenuId(null); }}
        >
          <Edit2 size={12} className="text-[var(--color-text-muted)]" />
          <span className="text-[var(--color-text-primary)]">Rename</span>
        </button>
        <button
          className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-red-500/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); setFilesToDelete([file]); setOpenFileMenuId(null); }}
        >
          <Trash2 size={12} className="text-red-500" />
          <span className="text-red-500">Delete</span>
        </button>
      </div>,
      document.body
    );
  };

  const SidebarFileItem = ({ f }: { f: FileItem }) => {
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    return (
      <div key={f.id}>
        <div
          className={`flex flex-col px-2 py-1.5 cursor-pointer rounded group relative transition-colors ${activeFileId === f.id && !showSettings ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-hover)]'}`}
          onClick={() => {
            setActiveFileId(f.id);
            setShowSettings(false);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center overflow-hidden flex-1">
              <span className="mr-2 text-sm shrink-0 flex items-center justify-center">
                {f.type === 'note' ? <FileText size={14} /> : <LayoutGrid size={14} />}
              </span>
              {editingFileId === f.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-transparent border-b border-[var(--color-border)] outline-none text-sm text-[var(--color-text-primary)] min-w-0"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onBlur={() => {
                    if (editingTitle.trim()) updateFile(f.id, { title: editingTitle.trim() });
                    setEditingFileId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (editingTitle.trim()) updateFile(f.id, { title: editingTitle.trim() });
                      setEditingFileId(null);
                    } else if (e.key === 'Escape') {
                      setEditingFileId(null);
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className={`text-[13px] truncate ${activeFileId === f.id && !showSettings ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-text-primary)]'}`}>{f.title || 'Untitled'}</span>
              )}
            </div>

            <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
              <button
                ref={menuButtonRef}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] rounded"
                onClick={(e) => { e.stopPropagation(); setOpenFileMenuId(openFileMenuId === f.id ? null : f.id); }}
                title="More options"
              >
                <MoreVertical size={12} />
              </button>
              {openFileMenuId === f.id && <FileMenuDropdown file={f} buttonRef={menuButtonRef} />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarFileItem = (f: FileItem) => <SidebarFileItem key={f.id} f={f} />;

  return (
    <div className={`app-shell bg-[var(--color-shell-bg)] ${appFontClass}`}>
      {/* Sidebar Panel - Inset style with fixed gap */}
      <div
        className={`flex flex-col h-full app-panel bg-[var(--color-sidebar-bg)] transition-all duration-300 ease-in-out no-print overflow-hidden ${sidebarOpen ? 'ml-2 mr-2 w-[200px] opacity-100' : 'ml-0 mr-0 w-0 opacity-0'}`}
      >

        {/* Mode Tabs — Symmetric padding for a centered look */}
        <div className="flex px-2 py-2 gap-[var(--gap-size)] border-b border-[var(--border-primary)] shrink-0 justify-center">
          <button
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[var(--radius-tiny)] transition-colors ${activeMode === 'notes' && !showSettings ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => { setActiveMode('notes'); setShowSettings(false); }}
          >
            Notes
          </button>
          <button
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[var(--radius-tiny)] transition-colors ${activeMode === 'canvas' && !showSettings ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => { setActiveMode('canvas'); setShowSettings(false); }}
          >
            Canvas
          </button>
        </div>

        {/* Search */}
        <div className="p-2 shrink-0 border-b border-[var(--border-primary)]">
          <button
            className="w-full h-9 flex items-center gap-[var(--gap-size)] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-[var(--radius-tiny)] px-3 text-[13px] text-[var(--text-secondary)] hover:border-[var(--border-secondary)] transition-colors"
            onClick={() => setShowCommandPalette(true)}
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] font-mono bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded-[var(--radius-tiny)] border border-[var(--border-primary)]">Cmd K</kbd>
          </button>
          <button
            className="w-full mt-2 h-9 px-3 rounded-[var(--radius-tiny)] text-[14px] font-medium border border-[var(--border-primary)] flex items-center justify-center gap-1.5 transition-colors"
            style={{
              color: 'var(--brand)',
              backgroundColor: 'transparent',
            }}
            onClick={createActiveModeFile}
            title={activeMode === 'notes' ? 'Create new note' : 'Create new canvas'}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--brand-subtle)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--brand) 30%, var(--border-primary))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            <Plus size={14} />
            {activeMode === 'notes' ? 'Create new note' : 'Create new canvas'}
          </button>
        </div>

        {/* File List */}
        <div className="flex-grow overflow-y-auto p-2">
          <div className="mb-4">
            <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-2 px-2" style={{ letterSpacing: '0.03em' }}>
              Favourite {activeMode === 'notes' ? 'Notes' : 'Canvas'}
            </div>
            {(() => {
              const pinnedFiles = files.filter(f => (activeMode === 'notes' ? f.type !== 'canvas' : f.type !== 'note') && f.type !== 'folder' && f.isPinned);
              if (pinnedFiles.length === 0) {
                return (
                  <div className="px-2 py-1.5 text-[12px] text-[var(--text-secondary)] italic">
                    No favourite {activeMode === 'notes' ? 'notes' : 'canvas'}
                  </div>
                );
              }
              const showScroll = pinnedFiles.length > 5;
              return (
                <div className={`${showScroll ? 'h-[200px] overflow-y-auto pr-1' : ''}`}>
                  {pinnedFiles
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .slice(0, 10)
                    .map(renderSidebarFileItem)}
                </div>
              );
            })()}
          </div>
          <div>
            <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-2 px-2" style={{ letterSpacing: '0.03em' }}>
              Recent {activeMode === 'notes' ? 'Notes' : 'Canvas'}
            </div>
            {files
              .filter(f => (activeMode === 'notes' ? f.type !== 'canvas' : f.type !== 'note') && f.type !== 'folder' && !f.isPinned)
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 15)
              .map(renderSidebarFileItem)}
          </div>
        </div>

        {/* Footer: Actions */}
        <div className="border-t border-[var(--border-primary)] p-2 flex items-center justify-between shrink-0">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-[var(--radius-tiny)] text-[var(--text-secondary)] transition-colors"
            style={{ ['--stroke-width' as any]: '1.2px' }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            className={`p-1.5 rounded-[var(--radius-tiny)] text-[var(--text-secondary)] transition-colors ${showSettings ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]'}`}
            onClick={() => setShowSettings(true)}
            style={{ ['--stroke-width' as any]: '1.2px' }}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Resizer/Gap Area - 8px gap with shell-colored hover */}
      {sidebarOpen ? (
        <div
          className="sidebar-resizer w-2 bg-transparent hover:bg-[var(--color-shell-bg)] transition-all duration-300 ease-in-out relative"
          onClick={() => setSidebarOpen(false)}
          title="Close Sidebar"
        >
          <div className="sidebar-resizer-line opacity-100" />
        </div>
      ) : (
        <>
          {/* Invisible hover detector at shell left edge - full height */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 z-50 cursor-pointer"
            onMouseEnter={() => setIsResizerHovered(true)}
            onMouseLeave={() => setIsResizerHovered(false)}
            onClick={() => setSidebarOpen(true)}
          />
          {/* Visible trigger - conditionally rendered only when hovered */}
          {isResizerHovered && (
            <div
              className="sidebar-resizer-closed absolute top-0 bottom-0 left-2 w-1 z-40 cursor-pointer hover:bg-[var(--color-shell-bg)] rounded-[var(--radius-tiny)] transition-all duration-300 opacity-100"
              onClick={() => setSidebarOpen(true)}
            >
              <div className="sidebar-resizer-line-closed opacity-100" />
            </div>
          )}
        </>
      )}

      {/* Main Content - Equal spacing when closed, shrinks on hover */}
      <div
        className={`flex-grow h-full overflow-hidden bg-[var(--color-editor-bg)] app-panel transition-all duration-300 ease-in-out ${sidebarOpen ? 'ml-0 mr-2' : (isResizerHovered ? 'ml-4 mr-0' : 'ml-0 mr-0')}`}
      >
        {showSettings ? (
          <SettingsPage appFontClass={appFontClass} onAppFontChange={setAppFontClass} />
        ) : activeFile ? (
          activeFile.type === 'note' ? (
            <NoteEditor key={activeFile.id} file={activeFile} updateFile={updateFile} appFontClass={appFontClass} />
          ) : (
            <CanvasEditor key={activeFile.id} file={activeFile} updateFile={updateFile} />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-[var(--gap-size)] content-panel">
            <img src={boardsNoteLogo} alt="BoardsNote" className="h-32 opacity-[0.8] object-contain mx-auto" />
            <p className="text-[var(--text-secondary)] text-[13px] font-medium">Select a note or canvas to start</p>
          </div>
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          files={files}
          onClose={() => setShowCommandPalette(false)}
          onSelect={(id) => {
            setActiveFileId(id);
            setShowSettings(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {filesToDelete && filesToDelete.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-shell-bg)] border border-[var(--color-border)] rounded-lg shadow-xl p-4 w-80">
            <h3 className="font-inter text-lg mb-2 text-[var(--color-text-primary)]">Delete {filesToDelete.length > 1 ? 'Files' : 'File'}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Are you sure you want to delete {filesToDelete.length > 1 ? `${filesToDelete.length} files` : `"${filesToDelete[0].title}"`}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm text-[var(--color-text-primary)] rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                onClick={() => setFilesToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={() => {
                  deleteFiles(filesToDelete.map(f => f.id));
                  setFilesToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <HelpWidget activeMode={activeMode} noteMeta={noteMeta} />
    </div>
  );
}
