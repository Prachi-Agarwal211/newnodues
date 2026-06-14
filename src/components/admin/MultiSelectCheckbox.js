'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, Loader2, X } from 'lucide-react';

/**
 * Professional MultiSelectCheckbox with Portal rendering
 * 
 * FIXED ISSUES:
 * - Dropdown no longer closes when clicking scrollbar
 * - Position is stable during selection (no jumping)
 * - Options list doesn't disappear during cascading filter updates
 * - Larger, more comfortable UI
 * 
 * Features:
 * - Portal-based dropdown (no clipping issues)
 * - Fixed positioning (stable, no auto-update jumps)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Mobile-optimized
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);
  const dropdownRef = useRef(null);
  const isInteractingRef = useRef(false);

  // Client-side only rendering for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate and fix dropdown position when opening
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 450; // Approximate max height
      
      // Decide if dropdown should appear above or below
      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownPosition({
        top: showAbove ? rect.top - 10 : rect.bottom + 10,
        left: rect.left,
        width: Math.max(rect.width, 380),
        placement: showAbove ? 'top' : 'bottom'
      });
    }
  }, []);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      
      // Lock body scroll when dropdown is open
      document.body.style.overflow = 'hidden';
      
      // Focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      setSearchTerm('');
      setFocusedIndex(-1);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, updatePosition]);

  // Filter options based on search - memoized for performance
  const filteredOptions = useMemo(() => 
    options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [options, searchTerm]
  );

  // Toggle selection
  const toggleOption = useCallback((id) => {
    isInteractingRef.current = true;
    
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
    
    // Keep dropdown open after selection
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 100);
  }, [selectedIds, onChange]);

  // Select/Clear all
  const selectAll = useCallback(() => {
    isInteractingRef.current = true;
    onChange(filteredOptions.map(opt => opt.id));
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 100);
  }, [filteredOptions, onChange]);

  const clearAll = useCallback(() => {
    isInteractingRef.current = true;
    onChange([]);
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 100);
  }, [onChange]);

  // Handle backdrop click - only close if not interacting with dropdown
  const handleBackdropClick = useCallback((e) => {
    // Don't close if clicking on the dropdown itself
    if (dropdownRef.current?.contains(e.target)) {
      return;
    }
    // Don't close if we're in the middle of an interaction
    if (isInteractingRef.current) {
      return;
    }
    setIsOpen(false);
  }, []);

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
        e.stopPropagation();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          toggleOption(filteredOptions[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredOptions, focusedIndex, toggleOption]);

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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      {/* Dropdown Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}: ${selectedCount} selected`}
        className={`w-full px-4 py-3 rounded-xl border transition-all flex items-center justify-between min-h-[52px] ${
          disabled || isLoading
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-[#1a1a1a]'
            : 'bg-white dark:bg-[#111111] hover:border-jecrc-red/50 cursor-pointer'
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
        <ChevronDown className={`w-5 h-5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Portal Dropdown Panel */}
      {isMounted && isOpen && createPortal(
        <>
          {/* Backdrop overlay - doesn't block dropdown interaction */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
          
          {/* Dropdown panel - Fixed position for stability */}
          <div
            ref={dropdownRef}
            className={`fixed z-[9999] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
              isMobile ? 'w-[calc(100vw-2rem)] left-4' : ''
            }`}
            style={{
              top: dropdownPosition.placement === 'top' ? 'auto' : dropdownPosition.top,
              bottom: dropdownPosition.placement === 'top' ? `calc(100vh - ${dropdownPosition.top}px + 10px)` : 'auto',
              left: dropdownPosition.left,
              width: isMobile ? undefined : `${dropdownPosition.width}px`,
              maxWidth: '500px'
            }}
            role="listbox"
            aria-label={label}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            {/* Header with Search */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a]/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {label}
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close dropdown"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Search options"
                />
              </div>
            </div>

            {/* Action Buttons */}
            {filteredOptions.length > 0 && (
              <div className="flex gap-3 p-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a]/30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAll();
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  aria-label={`Select all ${filteredOptions.length} options`}
                >
                  Select All ({filteredOptions.length})
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  disabled={selectedCount === 0}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Clear all selections"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Options List */}
            <div 
              ref={optionsListRef}
              className="overflow-y-auto overflow-x-hidden flex-1 p-2"
              style={{ minHeight: '180px', maxHeight: '320px' }}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {options.length === 0 ? emptyMessage : 'No matches found'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm('');
                      }}
                      className="text-sm text-jecrc-red hover:underline"
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
                    <div
                      key={option.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all select-none ${
                        isFocused
                          ? 'ring-2 ring-jecrc-red/50 bg-gray-100 dark:bg-white/10'
                          : isSelected 
                            ? 'bg-jecrc-rose dark:bg-jecrc-red/20' 
                            : 'hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleOption(option.id);
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      {/* Checkbox */}
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-jecrc-red border-jecrc-red' 
                          : 'border-gray-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-base block truncate ${
                          isSelected 
                            ? 'text-jecrc-red dark:text-jecrc-red-bright font-medium' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.label}
                        </span>
                        {option.subtitle && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                            {option.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-[#1a1a1a]/30">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="px-5 py-2.5 text-sm font-medium bg-jecrc-red text-white rounded-xl hover:bg-jecrc-red-dark transition-colors shadow-sm"
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
