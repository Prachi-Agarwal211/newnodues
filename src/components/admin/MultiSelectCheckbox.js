'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, size, offset } from '@floating-ui/react';
import { ChevronDown, Check, Search, Loader2 } from 'lucide-react';

/**
 * Professional MultiSelectCheckbox with Portal rendering
 * Features:
 * - Portal-based dropdown (no clipping issues)
 * - Smart positioning (auto-flips when near viewport edge)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Mobile-optimized (bottom sheet on small screens)
 * - Loading states
 * - Accessibility (ARIA attributes, focus management)
 */
export default function MultiSelectCheckbox({ 
  label, 
  options = [], 
  selectedIds = [], 
  onChange,
  placeholder = "Select items",
  emptyMessage = "No items available",
  isLoading = false,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isMounted, setIsMounted] = useState(false);
  
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Floating UI setup for smart positioning
  const { refs, floatingStyles, placement } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight - 16, 400)}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Client-side only rendering for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle selection
  const toggleOption = useCallback((id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }, [selectedIds, onChange]);

  // Select/Clear all
  const selectAll = useCallback(() => {
    onChange(filteredOptions.map(opt => opt.id));
  }, [filteredOptions, onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          toggleOption(filteredOptions[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        // Allow tabbing away to close dropdown
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredOptions, focusedIndex, toggleOption]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionsListRef.current) {
      const focusedElement = optionsListRef.current.children[focusedIndex];
      focusedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // Reset focus index when search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);

  const selectedCount = selectedIds.length;
  const selectedLabels = options
    .filter(opt => selectedIds.includes(opt.id))
    .map(opt => opt.label);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
        {label}
      </label>
      
      {/* Dropdown Trigger */}
      <button
        ref={(node) => {
          refs.setReference(node);
          triggerRef.current = node;
        }}
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}: ${selectedCount} selected`}
        className={`w-full px-4 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
          disabled || isLoading
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            : 'bg-white dark:bg-black/20 hover:border-jecrc-red/50 cursor-pointer'
        } ${
          isOpen
            ? 'border-jecrc-red ring-2 ring-jecrc-red/20'
            : 'border-gray-200 dark:border-white/10'
        } text-gray-900 dark:text-white outline-none`}
      >
        <span className="text-sm truncate">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </span>
          ) : selectedCount === 0 ? (
            placeholder
          ) : (
            `${selectedCount} selected${selectedCount <= 2 ? `: ${selectedLabels.join(', ')}` : ''}`
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Portal Dropdown Panel */}
      {isMounted && isOpen && createPortal(
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown panel */}
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex: 9999,
            }}
            className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden ${
              isMobile ? 'w-[calc(100vw-2rem)]' : 'min-w-[320px] max-w-[450px]'
            }`}
            role="listbox"
            aria-label={label}
            onKeyDown={handleKeyDown}
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Search options"
                />
              </div>
            </div>

            {/* Action Buttons */}
            {filteredOptions.length > 0 && (
              <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/30">
                <button
                  type="button"
                  onClick={selectAll}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  aria-label={`Select all ${filteredOptions.length} options`}
                >
                  Select All ({filteredOptions.length})
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={selectedCount === 0}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Clear all selections"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Options List */}
            <div 
              ref={optionsListRef}
              className="overflow-y-auto flex-1 p-2"
              style={{ minHeight: '150px', maxHeight: '280px' }}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {options.length === 0 ? emptyMessage : 'No matches found'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-jecrc-red hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = selectedIds.includes(option.id);
                  const isFocused = index === focusedIndex;
                  return (
                    <label
                      key={option.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        isFocused
                          ? 'ring-2 ring-jecrc-red/50 bg-gray-100 dark:bg-white/10'
                          : isSelected 
                            ? 'bg-jecrc-rose dark:bg-jecrc-red/20' 
                            : 'hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-jecrc-red border-jecrc-red' 
                          : 'border-gray-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOption(option.id)}
                        className="sr-only"
                        aria-label={option.label}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm block truncate ${
                          isSelected 
                            ? 'text-jecrc-red dark:text-jecrc-red-bright font-medium' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.label}
                        </span>
                        {option.subtitle && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                            {option.subtitle}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-gray-800/30">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-medium bg-jecrc-red text-white rounded-lg hover:bg-jecrc-red-dark transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}