import React, { useCallback, useEffect, useState, useRef } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { type NodeViewProps } from '@tiptap/core';
import { CodeBlockLanguageSelector } from './CodeBlockLanguageSelector';
import { loadLanguage, getLanguageName, LANGUAGES } from './languageRegistry';

// Import lowlight instance that will be passed from the extension
let lowlightInstance: any = null;

export function setLowlightInstance(instance: any) {
  lowlightInstance = instance;
}

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
  if (trimmed.includes('import java.')) return 'Java';
  if (trimmed.includes('const') && trimmed.includes('=') && trimmed.includes('=>')) return 'JavaScript';
  if (trimmed.includes('let ') || trimmed.includes('const ') || trimmed.includes('var ')) {
    // Could be JS or TS, check for TypeScript-specific syntax
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

export const CodeBlockNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  // Get current language from node attrs
  const currentLanguage = node.attrs.language || 'Plain text';
  const langName = getLanguageName(currentLanguage);

  // Apply syntax highlighting
  const applyHighlighting = useCallback(async () => {
    if (!codeRef.current || !lowlightInstance) return;
    if (currentLanguage === 'Plain text') {
      // Remove any existing hljs classes
      const codeEl = codeRef.current.querySelector('code');
      if (codeEl) {
        codeEl.className = 'code-block-content';
        codeEl.removeAttribute('data-language');
      }
      return;
    }

    // Ensure language is loaded
    const loaded = await loadLanguage(lowlightInstance, currentLanguage);
    if (!loaded) return;

    try {
      // Get the text content and highlight it
      const textContent = node.textContent || '';
      if (!textContent) return;

      const result = lowlightInstance.highlight(langName, textContent);
      if (result && codeRef.current) {
        const codeEl = codeRef.current.querySelector('code');
        if (codeEl) {
          codeEl.innerHTML = result.value;
          codeEl.className = 'code-block-content hljs';
          codeEl.setAttribute('data-language', langName);
        }
      }
    } catch (e) {
      console.warn('Highlighting failed:', e);
    }
  }, [currentLanguage, langName, node.textContent]);

  const handleLanguageChange = useCallback(async (language: string) => {
    if (language === currentLanguage) return;

    setIsLoading(true);

    // Load the language module if not "Plain text"
    if (language !== 'Plain text' && lowlightInstance) {
      await loadLanguage(lowlightInstance, language);
    }

    // Update the language attribute
    updateAttributes({ language });
    setIsLoading(false);
  }, [currentLanguage, updateAttributes]);

  // Apply highlighting when language or content changes
  useEffect(() => {
    applyHighlighting();
  }, [applyHighlighting, currentLanguage, node.textContent]);

  // Auto-load language on mount if needed
  useEffect(() => {
    if (currentLanguage !== 'Plain text' && lowlightInstance) {
      loadLanguage(lowlightInstance, currentLanguage);
    }
  }, []);

  // Handle paste to detect language
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData('text/plain');
    if (!pastedText || currentLanguage !== 'Plain text') return;

    const detected = detectLanguage(pastedText);
    if (detected && LANGUAGES[detected]) {
      // Auto-set the detected language
      event.preventDefault();

      // Load the language and insert the content
      loadLanguage(lowlightInstance, detected).then(() => {
        updateAttributes({ language: detected });

        // Insert the pasted content
        const pos = getPos();
        if (typeof pos === 'number') {
          editor?.chain().focus().insertContentAt(pos + 1, pastedText).run();
        }
      });
    }
  }, [currentLanguage, editor, getPos, updateAttributes]);

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className={`code-block-container ${selected ? 'selected' : ''}`}>
        <CodeBlockLanguageSelector
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />
        {isLoading && (
          <div className="code-block-loading">Loading...</div>
        )}
        <pre
          ref={codeRef}
          className="code-block-pre"
          onPaste={handlePaste}
          data-language={langName !== 'plaintext' ? langName : undefined}
        >
          <NodeViewContent as="div" className="code-block-content" />
        </pre>
      </div>
    </NodeViewWrapper>
  );
};
