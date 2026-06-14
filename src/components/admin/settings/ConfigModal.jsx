'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Save, X, RefreshCw, Check } from 'lucide-react';

/**
 * Professional ConfigModal with enhanced UX
 * Features:
 * - localStorage auto-save (persists across sessions)
 * - Debounced auto-save with visual indicator
 * - Framer Motion animations
 * - Keyboard shortcuts (ESC to close, CMD/CTRL+S to save)
 * - Inline validation
 * - Better mobile support
 */
export default function ConfigModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields = [],
  initialData = null,
  isLoading = false
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | saving | saved
  const [lastSavedTime, setLastSavedTime] = useState(null);
  
  // Generate unique storage key
  const storageKey = `form_draft_${title.replace(/\s+/g, '_')}_${initialData ? 'edit' : 'add'}`;

  // Load persisted data from localStorage
  const loadPersistedData = useCallback(() => {
    try {
      const persisted = localStorage.getItem(storageKey);
      if (persisted) {
        return JSON.parse(persisted);
      }
    } catch (error) {
      console.error('Error loading persisted form data:', error);
    }
    return null;
  }, [storageKey]);

  // Save form data to localStorage with debounce
  const persistFormData = useCallback((data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setAutoSaveStatus('saved');
      setLastSavedTime(new Date());
      
      // Reset status after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error persisting form data:', error);
    }
  }, [storageKey]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing persisted form data:', error);
    }
  }, [storageKey]);

  // Initialize form data
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      // Editing existing item - use initialData
      setFormData(initialData);
      clearPersistedData();
    } else {
      // Adding new item - try to load persisted data first
      const persisted = loadPersistedData();
      if (persisted) {
        setFormData(persisted);
      } else {
        // No persisted data - set default values
        const defaults = {};
        fields.forEach(field => {
          defaults[field.name] = field.defaultValue || (field.type === 'multi-checkbox' ? [] : '');
        });
        setFormData(defaults);
      }
    }
    setErrors({});
  }, [initialData, isOpen, fields, loadPersistedData, clearPersistedData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      // CMD/CTRL + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, formData]);

  if (!isOpen) return null;

  const handleChange = (fieldName, value) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    
    // Auto-save to localStorage (only when adding new items)
    if (!initialData) {
      setAutoSaveStatus('saving');
      // Debounce the save
      const timeoutId = setTimeout(() => {
        persistFormData(newFormData);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validate) {
        const error = field.validate(formData[field.name], formData);
        if (error) newErrors[field.name] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      await onSave(formData);
      clearPersistedData();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleClearForm = () => {
    const defaults = {};
    fields.forEach(field => {
      defaults[field.name] = field.defaultValue || (field.type === 'multi-checkbox' ? [] : '');
    });
    setFormData(defaults);
    clearPersistedData();
    setErrors({});
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none transition-all ${
              error 
                ? 'border-red-500 ring-2 ring-red-500/20' 
                : 'focus:border-jecrc-red focus:ring-2 focus:ring-red-600/20'
            } ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50 [&>option]:bg-[#0f0f0f] [&>option]:text-white'
                : 'bg-white border-gray-300 text-ink-black'
            }`}
            disabled={field.disabled || isLoading}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none transition-all ${
              error 
                ? 'border-red-500 ring-2 ring-red-500/20 animate-shake' 
                : 'focus:border-jecrc-red focus:ring-2 focus:ring-red-600/20'
            } ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none transition-all ${
              error 
                ? 'border-red-500 ring-2 ring-red-500/20 animate-shake' 
                : 'focus:border-jecrc-red focus:ring-2 focus:ring-red-600/20'
            } ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-jecrc-red focus:ring-jecrc-red/50"
            disabled={field.disabled || isLoading}
          />
        );

      case 'multi-checkbox':
        return (
          <div className={`space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl border transition-all ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}>
            {field.options && field.options.length > 0 ? (
              <>
                <div className="flex gap-2 pb-2 border-b border-white/10 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allValues = field.options.map(opt => opt.value);
                      handleChange(field.name, allValues);
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDark
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    disabled={field.disabled || isLoading}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange(field.name, [])}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDark
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                    disabled={field.disabled || isLoading}
                  >
                    Clear All
                  </button>
                </div>
                
                {field.options.map(option => {
                  const isChecked = Array.isArray(value) && value.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                      } ${field.disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const currentValues = Array.isArray(value) ? value : [];
                          const newValues = e.target.checked
                            ? [...currentValues, option.value]
                            : currentValues.filter(v => v !== option.value);
                          handleChange(field.name, newValues);
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-jecrc-red focus:ring-jecrc-red/50"
                        disabled={field.disabled || isLoading}
                      />
                      <span className={`text-sm transition-colors ${
                        isDark ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </>
            ) : (
              <p className={`text-sm text-center py-4 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                {field.placeholder || 'No options available'}
              </p>
            )}
          </div>
        );

      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none transition-all ${
              error 
                ? 'border-red-500 ring-2 ring-red-500/20 animate-shake' 
                : 'focus:border-jecrc-red focus:ring-2 focus:ring-red-600/20'
            } ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none transition-all ${
              error 
                ? 'border-red-500 ring-2 ring-red-500/20 animate-shake' 
                : 'focus:border-jecrc-red focus:ring-2 focus:ring-red-600/20'
            } ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
            }`}
            disabled={field.disabled || isLoading}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors ${
          isDark ? 'bg-[#0a0a0a]/80' : 'bg-black/40'
        }`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full max-w-md max-h-[90vh] border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              isDark
                ? 'bg-[#141414] backdrop-blur-xl border-white/10'
                : 'bg-white border-gray-300'
            }`}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-ink-black'}`}>
                  {title}
                </h3>
                {/* Auto-save indicator */}
                {!initialData && (
                  <div className="flex items-center gap-2 mt-1">
                    {autoSaveStatus === 'saving' && (
                      <span className="text-xs text-yellow-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Saving draft...
                      </span>
                    )}
                    {autoSaveStatus === 'saved' && lastSavedTime && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Draft saved {new Date(lastSavedTime).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'hover:bg-white/10 text-white/60 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {fields.map(field => (
                <div key={field.name}>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2">
                      {renderField(field)}
                      {field.helpText && (
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          {field.helpText}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {renderField(field)}
                      {field.helpText && (
                        <p className={`mt-1 text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          {field.helpText}
                        </p>
                      )}
                    </>
                  )}
                  
                  {errors[field.name] && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-xs text-red-400 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      {errors[field.name]}
                    </motion.p>
                  )}
                </div>
              ))}

              {/* Actions */}
              <div className="space-y-2 pt-4">
                {!initialData && (
                  <button
                    type="button"
                    onClick={handleClearForm}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      isDark
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20'
                        : 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Form
                  </button>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2.5 border rounded-xl transition-all disabled:opacity-50 font-medium ${
                      isDark
                        ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-jecrc-red to-red-700 rounded-xl text-white font-medium hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-jecrc-red/20 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {initialData ? 'Update' : 'Add'}
                      </>
                    )}
                  </button>
                </div>
                
                {/* Keyboard hint */}
                <p className={`text-xs text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">ESC</kbd> to close or{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">⌘/Ctrl+S</kbd> to save
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}