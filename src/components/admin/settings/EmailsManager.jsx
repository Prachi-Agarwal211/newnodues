'use client';

import { useState } from 'react';
import { useEmailsConfig } from '@/hooks/useEmailsConfig';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Email configuration manager
 * Allows admins to configure email-related settings (e.g., college email domain)
 */
export default function EmailsManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    emailConfig, 
    loading, 
    error, 
    updateEmailConfig,
    getCollegeDomain 
  } = useEmailsConfig();

  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleEdit = (key, value) => {
    setEditingKey(key);
    setEditingValue(value || '');
    setIsEditing(true);
    setValidationError('');
  };

  const validateDomain = (domain) => {
    if (!domain) return 'Domain is required';
    if (!domain.startsWith('@')) return 'Domain must start with @';
    if (domain.length < 4) return 'Domain is too short';
    if (!/^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return 'Invalid domain format (e.g., @jecrcu.edu.in)';
    }
    return '';
  };

  const handleSave = async () => {
    // Validate based on key
    if (editingKey === 'college_email_domain') {
      const error = validateDomain(editingValue);
      if (error) {
        setValidationError(error);
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateEmailConfig(editingKey, editingValue);
      setIsEditing(false);
      setEditingKey('');
      setEditingValue('');
    } catch (error) {
      setValidationError(error.message || 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingKey('');
    setEditingValue('');
    setValidationError('');
  };

  const configItems = [
    {
      key: 'college_email_domain',
      label: 'College Email Domain',
      description: 'The email domain used to validate college email addresses (e.g., @jecrcu.edu.in)',
      value: emailConfig.college_email_domain || '@jecrcu.edu.in',
      type: 'text',
      editable: true,
      critical: true
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold transition-colors duration-700 ${
          isDark ? 'text-white' : 'text-ink-black'
        }`}>
          Email Configuration
        </h2>
        <p className={`mt-1 transition-colors duration-700 ${
          isDark ? 'text-white/60' : 'text-gray-600'
        }`}>
          Configure email-related settings for the system
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`p-4 border rounded-lg transition-all duration-700 ${
          isDark
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-red-50 border-red-300'
        }`}>
          <p className={`text-sm transition-colors duration-700 ${
            isDark ? 'text-red-400' : 'text-red-700'
          }`}>
            {error}
          </p>
        </div>
      )}

      {/* Configuration Items */}
      <div className="space-y-4">
        {configItems.map((item) => (
          <div
            key={item.key}
            className={`border rounded-2xl p-6 transition-all duration-700 ${
              isDark
                ? 'bg-white/[0.035] backdrop-blur-xl border-white/10'
                : 'bg-white border-gray-200 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-lg font-medium transition-colors duration-700 ${
                    isDark ? 'text-white' : 'text-ink-black'
                  }`}>
                    {item.label}
                  </h3>
                  {item.critical && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                      Critical
                    </span>
                  )}
                </div>
                <p className={`text-sm mb-4 transition-colors duration-700 ${
                  isDark ? 'text-white/60' : 'text-gray-600'
                }`}>
                  {item.description}
                </p>

                {/* Display or Edit Mode */}
                {isEditing && editingKey === item.key ? (
                  <div className="space-y-3">
                    <input
                      type={item.type}
                      value={editingValue}
                      onChange={(e) => {
                        setEditingValue(e.target.value);
                        setValidationError('');
                      }}
                      placeholder={item.value}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
                        isDark
                          ? 'bg-white/5 border-white/10 text-white placeholder-white/50'
                          : 'bg-white border-gray-300 text-ink-black placeholder-gray-500'
                      }`}
                      disabled={isSaving}
                    />
                    {validationError && (
                      <p className="text-red-400 text-sm">{validationError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 
                                 rounded-lg text-white text-sm font-medium 
                                 hover:from-green-700 hover:to-green-800 transition-all
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className={`px-4 py-2 border rounded-lg text-sm transition-all duration-300 disabled:opacity-50 ${
                          isDark
                            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className={`px-4 py-2 border rounded-lg transition-all duration-700 ${
                      isDark
                        ? 'bg-white/5 border-white/10'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <code className={`transition-colors duration-700 ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>
                        {item.value}
                      </code>
                    </div>
                    {item.editable && (
                      <button
                        onClick={() => handleEdit(item.key, item.value)}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm 
                                 font-medium hover:bg-blue-500/30 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className={`border rounded-lg p-4 transition-all duration-700 ${
        isDark
          ? 'bg-blue-500/10 border-blue-500/20'
          : 'bg-blue-50 border-blue-300'
      }`}>
        <h4 className={`font-medium mb-2 transition-colors duration-700 ${
          isDark ? 'text-blue-400' : 'text-blue-700'
        }`}>
          📌 Email Configuration Guide:
        </h4>
        <ul className={`text-sm space-y-1 list-disc list-inside transition-colors duration-700 ${
          isDark ? 'text-white/70' : 'text-gray-700'
        }`}>
          <li><strong>College Email Domain:</strong> Used to validate student college emails</li>
          <li>Format must be: @domain.extension (e.g., @jecrcu.edu.in)</li>
          <li>Students must provide emails matching this domain</li>
          <li>Personal emails can be from any domain</li>
          <li>Both email fields are required in student forms</li>
        </ul>
      </div>

      {/* Example Display */}
      <div className={`border rounded-2xl p-6 transition-all duration-700 ${
        isDark
          ? 'bg-white/[0.035] backdrop-blur-xl border-white/10'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-lg font-bold mb-4 transition-colors duration-700 ${
          isDark ? 'text-white' : 'text-ink-black'
        }`}>
          Email Validation Example
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-32 transition-colors duration-700 ${
              isDark ? 'text-white/60' : 'text-gray-600'
            }`}>
              Current Domain:
            </span>
            <code className={`px-3 py-1 rounded transition-all duration-700 ${
              isDark
                ? 'bg-white/5 text-green-400'
                : 'bg-green-50 text-green-600'
            }`}>
              {getCollegeDomain()}
            </code>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-32 transition-colors duration-700 ${
              isDark ? 'text-white/60' : 'text-gray-600'
            }`}>
              Valid Example:
            </span>
            <code className={`px-3 py-1 rounded transition-all duration-700 ${
              isDark
                ? 'bg-green-500/20 text-green-400'
                : 'bg-green-100 text-green-700'
            }`}>
              student{getCollegeDomain()}
            </code>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-32 transition-colors duration-700 ${
              isDark ? 'text-white/60' : 'text-gray-600'
            }`}>
              Invalid Example:
            </span>
            <code className={`px-3 py-1 rounded transition-all duration-700 ${
              isDark
                ? 'bg-red-500/20 text-red-400'
                : 'bg-red-100 text-red-700'
            }`}>
              student@gmail.com
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}