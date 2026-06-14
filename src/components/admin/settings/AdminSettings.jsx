'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import SchoolsManager from './SchoolsManager';
import CoursesManager from './CoursesManager';
import BranchesManager from './BranchesManager';
import DepartmentsManager from './DepartmentsManager';
import EmailsManager from './EmailsManager';
import DepartmentStaffManager from './DepartmentStaffManager';

/**
 * Main Admin Settings component with tabbed navigation
 * Allows configuration of all system settings
 */
export default function AdminSettings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('schools');

  const tabs = [
    { id: 'schools', label: 'Schools', icon: '🏫' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'branches', label: 'Branches', icon: '🎓' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'staff', label: 'Staff Accounts', icon: '👥' },
    { id: 'emails', label: 'Email Config', icon: '📧' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'schools':
        return <SchoolsManager />;
      case 'courses':
        return <CoursesManager />;
      case 'branches':
        return <BranchesManager />;
      case 'departments':
        return <DepartmentsManager />;
      case 'staff':
        return <DepartmentStaffManager />;
      case 'emails':
        return <EmailsManager />;
      default:
        return <SchoolsManager />;
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 transition-colors duration-700 ${
          isDark ? 'text-white' : 'text-ink-black'
        }`}>
          ⚙️ System Settings
        </h1>
        <p className={`transition-colors duration-700 ${
          isDark ? 'text-white/60' : 'text-gray-600'
        }`}>
          Configure schools, courses, branches, departments, staff accounts, and email settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={`border rounded-2xl p-2 mb-6 transition-all duration-700 ${
        isDark ? 'bg-white/[0.035] border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : isDark
                    ? 'text-white/70 hover:text-white hover:bg-white/5'
                    : 'text-gray-700 hover:text-ink-black hover:bg-gray-100'
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {renderContent()}
      </div>

      {/* Help Section */}
      <div className={`mt-8 border rounded-2xl p-6 transition-all duration-700 ${
        isDark ? 'bg-white/[0.035] border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-lg font-bold mb-3 transition-colors duration-700 ${
          isDark ? 'text-white' : 'text-ink-black'
        }`}>
          💡 Configuration Help
        </h3>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm transition-colors duration-700 ${
          isDark ? 'text-white/70' : 'text-gray-600'
        }`}>
          <div>
            <h4 className={`font-medium mb-2 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Configuration Hierarchy:
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Schools → Courses → Branches</li>
              <li>Students select in this order during form submission</li>
              <li>Each level must be active to appear in forms</li>
            </ul>
          </div>
          <div>
            <h4 className={`font-medium mb-2 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Best Practices:
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Configure schools first, then courses, then branches</li>
              <li>Use clear, descriptive names for all items</li>
              <li>Set display orders to control the sequence</li>
              <li>Test with inactive status before deleting</li>
            </ul>
          </div>
          <div>
            <h4 className={`font-medium mb-2 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Department Notes:
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Departments cannot be added or deleted</li>
              <li>Update department emails for notifications</li>
              <li>Inactive departments are skipped in workflow</li>
            </ul>
          </div>
          <div>
            <h4 className={`font-medium mb-2 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Email Configuration:
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Set the college email domain (e.g., @jecrcu.edu.in)</li>
              <li>Students must provide both personal and college emails</li>
              <li>College email must match the configured domain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}