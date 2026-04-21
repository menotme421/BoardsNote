import type { NodeViewRendererProps } from '@tiptap/core';
import { LANGUAGES, loadLanguage, getLanguageName, lowlight } from './index';

// Simple language detection based on common patterns
function detectLanguage(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // Check for shebang
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.startsWith('#!')) {
    if (firstLine.includes('python')) return 'Python';
    if (firstLine.includes('node') || firstLine.includes('bash') || firstLine.includes('sh')) return 'Bash';
    if (firstLine.includes('ruby')) return 'Ruby';
  }

  // Check for file extensions in comments or code patterns
  if (trimmed.includes('import React') || trimmed.includes('from \'react\'') || trimmed.includes('from "react"')) return 'JavaScript';
  if (trimmed.includes('interface ') && trimmed.includes(':')) return 'TypeScript';
  if (trimmed.includes('function') && trimmed.includes(':') && (trimmed.includes('string') || trimmed.includes('number'))) return 'TypeScript';
  if (trimmed.includes('def ') && trimmed.includes(':') && !trimmed.includes('{')) return 'Python';
  if (trimmed.includes('package main') || trimmed.includes('func ')) return 'Go';
  if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE html')) return 'HTML';
  if (trimmed.includes('<?php')) return 'PHP';
  if (trimmed.includes('using System;') || trimmed.includes('namespace ') && trimmed.includes('class ')) return 'C#';
  if (trimmed.includes('#include <') && trimmed.includes('stdio.h')) return 'C';
  if (trimmed.includes('import java.') || trimmed.includes('public class') || trimmed.includes('public static void main') || trimmed.includes('System.out.println') || trimmed.includes('private String') || trimmed.includes('package ') && trimmed.includes(';')) return 'Java';
  if (trimmed.includes('const') && trimmed.includes('=') && trimmed.includes('=>')) return 'JavaScript';
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

export function createCodeBlockNodeView({ node, editor, getPos }: NodeViewRendererProps) {
  // Keep track of current node (will be updated in update method)
  let currentNode = node;

  // Create container
  const container = document.createElement('div');
  container.className = 'code-block-wrapper';

  // Create inner container
  const innerContainer = document.createElement('div');
  innerContainer.className = 'code-block-container';
  container.appendChild(innerContainer);

  // Create language selector
  const selector = document.createElement('div');
  selector.className = 'code-block-language-selector';
  innerContainer.appendChild(selector);

  // Create language label/button
  const label = document.createElement('button');
  label.className = 'code-block-language-label';
  label.type = 'button';
  selector.appendChild(label);

  // Label text
  const labelText = document.createElement('span');
  label.appendChild(labelText);

  // Chevron icon
  const chevron = document.createElement('span');
  chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  chevron.style.transition = 'transform 0.2s ease';
  label.appendChild(chevron);

  // Create dropdown (hidden by default)
  const dropdown = document.createElement('div');
  dropdown.className = 'code-block-language-dropdown';
  dropdown.style.display = 'none';
  selector.appendChild(dropdown);

  // Search bar
  const searchDiv = document.createElement('div');
  searchDiv.className = 'code-block-language-search';
  dropdown.appendChild(searchDiv);

  const searchIcon = document.createElement('span');
  searchIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  searchIcon.className = 'search-icon';
  searchDiv.appendChild(searchIcon);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search...';
  searchInput.className = 'code-block-language-search-input';
  searchDiv.appendChild(searchInput);

  // Language list
  const listDiv = document.createElement('div');
  listDiv.className = 'code-block-language-list';
  dropdown.appendChild(listDiv);

  // Create language items
  const languageKeys = Object.keys(LANGUAGES);
  let currentItems: HTMLElement[] = [];

  function renderLanguages(filter = '') {
    listDiv.innerHTML = '';
    currentItems = [];

    const filtered = filter
      ? languageKeys.filter(k => k.toLowerCase().includes(filter.toLowerCase()))
      : languageKeys;

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'code-block-language-empty';
      empty.textContent = 'No languages found';
      listDiv.appendChild(empty);
      return;
    }

    filtered.forEach(lang => {
      const item = document.createElement('button');
      item.className = 'code-block-language-item';
      item.type = 'button';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'language-name';
      nameSpan.textContent = lang;
      item.appendChild(nameSpan);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentLang = currentNode.attrs.language || 'Plain text';
        if (lang !== currentLang) {
          // Load language and update
          if (lang !== 'Plain text') {
            loadLanguage(lowlight, lang);
          }
          // Update node attributes
          const pos = getPos();
          if (typeof pos === 'number') {
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeAttribute(pos, 'language', lang);
              return true;
            }).run();
          }
        }
        dropdown.style.display = 'none';
        searchInput.value = '';
        renderLanguages();
      });

      listDiv.appendChild(item);
      currentItems.push(item);
    });

    updateActiveState();
  }

  function updateActiveState() {
    const currentLang = currentNode.attrs.language || 'Plain text';
    labelText.textContent = currentLang;

    currentItems.forEach(item => {
      const langName = item.querySelector('.language-name')?.textContent;
      if (langName === currentLang) {
        item.classList.add('active');
        // Add checkmark
        if (!item.querySelector('.check-indicator')) {
          const check = document.createElement('span');
          check.className = 'check-indicator';
          check.textContent = '✓';
          item.appendChild(check);
        }
      } else {
        item.classList.remove('active');
        const check = item.querySelector('.check-indicator');
        if (check) check.remove();
      }
    });
  }

  // Toggle dropdown
  let isOpen = false;
  function toggleDropdown() {
    isOpen = !isOpen;
    dropdown.style.display = isOpen ? 'block' : 'none';
    chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (isOpen) {
      searchInput.focus();
      renderLanguages(searchInput.value);
    }
  }

  label.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  });

  // Search input
  searchInput.addEventListener('input', () => {
    renderLanguages(searchInput.value);
  });

  // Close on click outside
  function handleClickOutside(e: MouseEvent) {
    if (!selector.contains(e.target as Node)) {
      isOpen = false;
      dropdown.style.display = 'none';
      chevron.style.transform = '';
      searchInput.value = '';
    }
  }

  document.addEventListener('mousedown', handleClickOutside);

  // Escape to close
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isOpen = false;
      dropdown.style.display = 'none';
      chevron.style.transform = '';
      searchInput.value = '';
      label.focus();
    }
  });

  // Paste detection
  container.addEventListener('paste', (e) => {
    const pastedText = e.clipboardData?.getData('text/plain') || '';
    const currentLang = currentNode.attrs.language || 'Plain text';

    if (pastedText && currentLang === 'Plain text') {
      const detected = detectLanguage(pastedText);
      if (detected && LANGUAGES[detected]) {
        e.preventDefault();
        loadLanguage(lowlight, detected).then(() => {
          // Update node attribute
          const nodePos = getPos();
          if (typeof nodePos === 'number') {
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeAttribute(nodePos, 'language', detected);
              return true;
            }).run();
          }
          const pos = getPos();
          if (typeof pos === 'number') {
            editor.chain().focus().insertContentAt(pos + 1, pastedText).run();
          }
        });
      }
    }
  });

  // Initial render
  renderLanguages();

  // Create pre element for content (this is where ProseMirror puts the editable content)
  const pre = document.createElement('pre');
  pre.className = 'code-block-pre';
  innerContainer.appendChild(pre);

  // Keep track of current getPos function
  let currentGetPos = getPos;

  // Return node view spec
  return {
    dom: container,
    contentDOM: pre,
    update: (updatedNode, updateGetPos) => {
      if (updatedNode.type !== currentNode.type) return false;
      currentNode = updatedNode;
      if (updateGetPos) currentGetPos = updateGetPos;
      updateActiveState();
      return true;
    },
    destroy: () => {
      document.removeEventListener('mousedown', handleClickOutside);
    },
    selectNode: () => {
      innerContainer.classList.add('selected');
    },
    deselectNode: () => {
      innerContainer.classList.remove('selected');
    },
    ignoreMutation: (mutation) => {
      return !pre.contains(mutation.target);
    },
    stopEvent: (event) => {
      const target = event.target as Node;
      return target !== null && selector.contains(target);
    },
  };
}
