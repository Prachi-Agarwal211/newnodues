'use client';

import { useState } from 'react';
import { useDepartmentsConfig } from '@/hooks/useDepartmentsConfig';
import { useTheme } from '@/contexts/ThemeContext';
import ConfigTable from './ConfigTable';
import ConfigModal from './ConfigModal';

/**
 * Departments management component
 * Allows admins to UPDATE department info (no add/delete - system critical)
 */
export default function DepartmentsManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    departments, 
    loading, 
    error, 
    updateDepartment 
  } = useDepartmentsConfig();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'name', label: 'Department Code', type: 'text' },
    { key: 'display_name', label: 'Display Name', type: 'text' },
    {
      key: 'is_school_specific',
      label: 'School-Specific',
      type: 'boolean',
      render: (value) => value ? (
        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
          School-Specific
        </span>
      ) : (
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
          Global
        </span>
      )
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      render: (value) => value || <span className="text-white/30">Not set</span>
    },
    { key: 'display_order', label: 'Display Order', type: 'number' },
    { key: 'is_active', label: 'Status', type: 'boolean' }
  ];

  const fields = [
    {
      name: 'name',
      label: 'Department Code',
      type: 'text',
      disabled: true,
      helpText: 'Department code cannot be changed (system critical)'
    },
    {
      name: 'display_name',
      label: 'Display Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Head of Department, Library Services',
      validate: (value) => {
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 100) return 'Name must be less than 100 characters';
        return null;
      },
      helpText: 'Friendly name shown to students'
    },
    {
      name: 'is_school_specific',
      label: 'School-Specific Department',
      type: 'checkbox',
      helpText: 'If enabled, staff can only see students from their assigned school'
    },
    {
      name: 'email',
      label: 'Department Email',
      type: 'email',
      required: true,
      placeholder: 'e.g., hod@jecrcu.edu.in',
      validate: (value) => {
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Invalid email format';
        return null;
      },
      helpText: 'Email for approval notifications'
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      required: true,
      helpText: 'Order in which department appears in status display',
      validate: (value) => {
        if (value < 1) return 'Order must be at least 1';
        return null;
      }
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      helpText: 'Inactive departments are skipped in approval workflow'
    }
  ];

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      await updateDepartment(editingDepartment.id, formData);
      setIsModalOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to update department');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (deptId, newStatus) => {
    try {
      await updateDepartment(deptId, { is_active: newStatus });
    } catch (error) {
      alert(error.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-700 ${
            isDark ? 'text-white' : 'text-ink-black'
          }`}>
            Departments Configuration
          </h2>
          <p className={`mt-1 transition-colors duration-700 ${
            isDark ? 'text-white/60' : 'text-gray-600'
          }`}>
            Update department emails and display settings (Add/Delete not allowed)
          </p>
        </div>
        <div className={`px-4 py-2 border rounded-lg transition-all duration-700 ${
          isDark
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <span className={`text-sm font-medium transition-colors duration-700 ${
            isDark ? 'text-yellow-400' : 'text-yellow-700'
          }`}>
            🔒 System Critical - Edit Only
          </span>
        </div>
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

      {/* Table */}
      <div className={`border rounded-2xl p-6 transition-all duration-700 ${
        isDark
          ? 'bg-white/[0.035] backdrop-blur-xl border-white/10'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <ConfigTable
          data={departments}
          columns={columns}
          onEdit={handleEdit}
          onDelete={null} // No delete allowed
          onToggleStatus={handleToggleStatus}
          isLoading={loading}
          emptyMessage="No departments found in the system."
        />
      </div>

      {/* Edit Modal */}
      <ConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title="Edit Department"
        fields={fields}
        initialData={editingDepartment}
        isLoading={isSaving}
      />

      {/* Info Box */}
      <div className={`border rounded-lg p-4 transition-all duration-700 ${
        isDark
          ? 'bg-blue-500/10 border-blue-500/20'
          : 'bg-blue-50 border-blue-300'
      }`}>
        <h4 className={`font-medium mb-2 transition-colors duration-700 ${
          isDark ? 'text-blue-400' : 'text-blue-700'
        }`}>
          📌 Important Notes:
        </h4>
        <ul className={`text-sm space-y-1 list-disc list-inside transition-colors duration-700 ${
          isDark ? 'text-white/70' : 'text-gray-700'
        }`}>
          <li>Departments are system-critical and cannot be added or deleted</li>
          <li>Each department has a unique code (e.g., 'school_hod', 'library')</li>
          <li><strong>School-Specific departments:</strong> Staff only sees students from their assigned school</li>
          <li><strong>Global departments:</strong> Staff sees all students (e.g., Library, Hostel)</li>
          <li>Department emails are used for approval notifications</li>
          <li>Display order determines the sequence in status tracking</li>
          <li>Inactive departments are skipped in the approval workflow</li>
          <li>All students must get clearance from active departments</li>
        </ul>
      </div>

      {/* Current Departments List */}
      <div className={`border rounded-2xl p-6 transition-all duration-700 ${
        isDark
          ? 'bg-white/[0.035] backdrop-blur-xl border-white/10'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-lg font-bold mb-4 transition-colors duration-700 ${
          isDark ? 'text-white' : 'text-ink-black'
        }`}>
          System Departments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id || dept.name}
              className={`p-4 border rounded-lg transition-all duration-700 ${
                isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-50 border-gray-200'
              } ${!dept.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>
                  {dept.display_name}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  dept.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {dept.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className={`text-sm transition-colors duration-700 ${
                isDark ? 'text-white/50' : 'text-gray-600'
              }`}>
                Code: {dept.name}
              </p>
              <p className={`text-sm transition-colors duration-700 ${
                isDark ? 'text-white/50' : 'text-gray-600'
              }`}>
                Type: {dept.is_school_specific ? (
                  <span className="text-purple-400">School-Specific</span>
                ) : (
                  <span className="text-blue-400">Global</span>
                )}
              </p>
              <p className={`text-sm transition-colors duration-700 ${
                isDark ? 'text-white/50' : 'text-gray-600'
              }`}>
                Email: {dept.email || <span className="text-red-400">Not set</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}