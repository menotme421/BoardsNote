import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { LANGUAGES } from './languageRegistry';
import { Button } from '@/components/ui/button';

interface CodeBlockLanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export const CodeBlockLanguageSelector: React.FC<CodeBlockLanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const languageKeys = useMemo(() => Object.keys(LANGUAGES), []);

  const filteredLanguages = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return languageKeys.filter((key) =>
      key.toLowerCase().includes(query)
    );
  }, [searchQuery, languageKeys]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  const handleSelect = useCallback((language: string) => {
    onLanguageChange(language);
    setIsOpen(false);
    setSearchQuery('');
  }, [onLanguageChange]);

  const displayLabel = currentLanguage && LANGUAGES[currentLanguage]
    ? currentLanguage
    : 'Plain text';

  return (
    <div ref={containerRef} className="code-block-language-selector" onKeyDown={handleKeyDown}>
      {/* Language label / trigger */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="code-block-language-label"
        variant="ghost"
        size="sm"
      >
        <span>{displayLabel}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="code-block-language-dropdown">
          {/* Search bar */}
          <div className="code-block-language-search">
            <Search size={14} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="code-block-language-search-input"
            />
          </div>

          {/* Language list */}
          <div className="code-block-language-list">
            {filteredLanguages.length === 0 ? (
              <div className="code-block-language-empty">No languages found</div>
            ) : (
              filteredLanguages.map((language) => (
                <Button
                  key={language}
                  onClick={() => handleSelect(language)}
                  className={`code-block-language-item ${language === currentLanguage ? 'active' : ''}`}
                  variant="ghost"
                  size="sm"
                >
                  <span className="language-name">{language}</span>
                  {language === currentLanguage && (
                    <span className="check-indicator">✓</span>
                  )}
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
