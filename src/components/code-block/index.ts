import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import type { CodeOptions } from '@tiptap/extension-code';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { createCodeBlockNodeView } from './codeBlockNodeView';
import { LANGUAGES, getLanguageName } from './languageRegistry';

// Create lowlight instance with common languages synchronously
const lowlight = createLowlight(common);

// Language detection based on common patterns
export function detectLanguage(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const firstLine = trimmed.split('\n')[0];
  if (firstLine.startsWith('#!')) {
    if (firstLine.includes('python')) return 'Python';
    if (firstLine.includes('node') || firstLine.includes('bash') || firstLine.includes('sh')) return 'Bash';
    if (firstLine.includes('ruby')) return 'Ruby';
  }

  if (trimmed.includes('import React') || trimmed.includes('from \'react\'') || trimmed.includes('from "react"')) return 'JavaScript';
  if (trimmed.includes('interface ') && trimmed.includes(':')) return 'TypeScript';
  if (trimmed.includes('function') && trimmed.includes(':') && (trimmed.includes('string') || trimmed.includes('number'))) return 'TypeScript';
  if (trimmed.includes('def ') && trimmed.includes(':') && !trimmed.includes('{')) return 'Python';
  if (trimmed.includes('package main') || trimmed.includes('func ')) return 'Go';
  if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE html')) return 'HTML';
  if (trimmed.includes('<?php')) return 'PHP';
  if (trimmed.includes('using System;') || trimmed.includes('namespace ') && trimmed.includes('class ')) return 'C#';
  if (trimmed.includes('#include <') && trimmed.includes('stdio.h')) return 'C';
  if (trimmed.includes('import java.') || trimmed.includes('public class') || trimmed.includes('public static void main') || trimmed.includes('System.out.println') || trimmed.includes('private String') || (trimmed.includes('package ') && trimmed.includes(';'))) return 'Java';
  if (trimmed.includes('let ') || trimmed.includes('const ') || trimmed.includes('var ')) {
    if (trimmed.includes(': ') && (trimmed.includes('string') || trimmed.includes('number') || trimmed.includes('boolean'))) {
      return 'TypeScript';
    }
    return 'JavaScript';
  }
  if (trimmed.includes('<style') || trimmed.includes('@media')) return 'CSS';
  if (trimmed.includes('SELECT') && trimmed.includes('FROM')) return 'SQL';
  if (trimmed.includes('console.log')) return 'JavaScript';
  if (trimmed.includes('print(')) return 'Python';
  if (trimmed.includes('fn ') && trimmed.includes('{') && trimmed.includes('let')) return 'Rust';
  if (trimmed.includes('<?xml')) return 'XML';

  return null;
}

// Create the extended code block extension
export const CustomCodeBlockLowlight = CodeBlockLowlight.extend<CodeOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight,
      defaultLanguage: 'plaintext',
      HTMLAttributes: {
        class: 'code-block',
      },
    };
  },

  addAttributes() {
    return {
      language: {
        default: 'Plain text',
        parseHTML: (element) => {
          const className = element.getAttribute('class');
          if (className) {
            const match = className.match(/language-(\w+)/);
            if (match) {
              const langName = match[1];
              // Find the display name for this language
              const langKey = Object.keys(LANGUAGES).find(
                (key) => LANGUAGES[key].name === langName
              );
              return langKey || 'Plain text';
            }
          }
          return 'Plain text';
        },
        renderHTML: (attributes) => {
          const langName = getLanguageName(attributes.language || 'Plain text');
          if (langName === 'plaintext') {
            return {};
          }
          return {
            class: `language-${langName}`,
            'data-language': attributes.language,
          };
        },
      },
    };
  },

  addNodeView() {
    return createCodeBlockNodeView;
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      new Plugin({
        key: new PluginKey('codeBlockPasteHandler'),
        props: {
          handlePaste: (view, event, slice) => {
            // Only process if there's no rich text/HTML - pure plain text only
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // Check if HTML content exists - if so, let default handler deal with rich text
            const hasHtml = clipboardData.types.includes('text/html');
            if (hasHtml) return false;

            // Only process plain text pastes
            const pastedText = clipboardData.getData('text/plain');
            if (!pastedText) return false;

            const trimmed = pastedText.trim();

            // Require: reasonable length
            if (trimmed.length < 15) return false;

            // Must have strong code block indicators
            const hasCodeStructure = /[{};<>]/.test(trimmed) ||
              /\s{4,}\w+/.test(trimmed) || // Python-style indentation
              /(def |class |import |from |print\s*\(|if __name__|try:|except:|finally:|with |for |while |elif |else:|lambda |yield |raise )/.test(trimmed);

            if (!hasCodeStructure) return false;

            const detected = detectLanguage(trimmed);
            if (detected) {
              event.preventDefault();
              const codeBlock = this.type.create(
                { language: detected },
                view.state.schema.text(pastedText)
              );
              const tr = view.state.tr.replaceSelectionWith(codeBlock);
              view.dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      ...this.parent?.(),
    };
  },
});

// Export components and utilities
export { createCodeBlockNodeView } from './codeBlockNodeView';
export { LANGUAGES, loadLanguage, getLanguageName, getLanguageKeyByName } from './languageRegistry';
export { lowlight };
