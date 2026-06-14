'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSchoolsConfig } from '@/hooks/useSchoolsConfig';
import ConfigTable from './ConfigTable';
import ConfigModal from './ConfigModal';

/**
 * Schools management component
 * Allows admins to add, edit, delete, and toggle schools
 */
export default function SchoolsManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { schools, loading, error, addSchool, updateSchool, deleteSchool } = useSchoolsConfig();
  
  // Debug logging
  console.log('SchoolsManager Debug:', {
    schoolsCount: schools.length,
    loading,
    error,
    schoolsData: schools
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'name', label: 'School Name', type: 'text' },
    { key: 'display_order', label: 'Display Order', type: 'number' },
    { key: 'is_active', label: 'Status', type: 'boolean' }
  ];

  const fields = [
    {
      name: 'name',
      label: 'School Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Engineering',
      validate: (value) => {
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 50) return 'Name must be less than 50 characters';
        return null;
      }
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      required: true,
      defaultValue: schools.length + 1,
      helpText: 'Lower numbers appear first',
      validate: (value) => {
        if (value < 1) return 'Order must be at least 1';
        return null;
      }
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'Inactive schools are hidden from students'
    }
  ];

  const handleAdd = () => {
    setEditingSchool(null);
    setIsModalOpen(true);
  };

  const handleEdit = (school) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (editingSchool) {
        await updateSchool(editingSchool.id, formData);
      } else {
        await addSchool(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to save school');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (schoolId) => {
    try {
      await deleteSchool(schoolId);
    } catch (error) {
      alert(error.message || 'Failed to delete school');
    }
  };

  const handleToggleStatus = async (schoolId, newStatus) => {
    try {
      await updateSchool(schoolId, { is_active: newStatus });
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
            Schools Configuration
          </h2>
          <p className={`mt-1 transition-colors duration-700 ${
            isDark ? 'text-white/60' : 'text-gray-600'
          }`}>
            Manage academic schools (Engineering, Management, Law, etc.)
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg
                   text-white font-medium hover:from-red-700 hover:to-red-800
                   transition-all shadow-lg hover:shadow-red-500/25"
        >
          + Add School
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`p-4 border rounded-lg transition-all duration-700 ${
          isDark
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-red-50 border-red-200'
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
          data={schools}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          isLoading={loading}
          emptyMessage="No schools configured. Add your first school to get started."
        />
      </div>

      {/* Add/Edit Modal */}
      <ConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title={editingSchool ? 'Edit School' : 'Add New School'}
        fields={fields}
        initialData={editingSchool}
        isLoading={isSaving}
      />

      {/* Info Box */}
      <div className={`border rounded-lg p-4 transition-all duration-700 ${
        isDark
          ? 'bg-blue-500/10 border-blue-500/20'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <h4 className={`font-medium mb-2 transition-colors duration-700 ${
          isDark ? 'text-blue-400' : 'text-blue-700'
        }`}>
          📌 Important Notes:
        </h4>
        <ul className={`text-sm space-y-1 list-disc list-inside transition-colors duration-700 ${
          isDark ? 'text-white/70' : 'text-gray-700'
        }`}>
          <li>Schools are the top-level academic divisions</li>
          <li>Courses are linked to schools (e.g., B.Tech under Engineering)</li>
          <li>Inactive schools won't appear in student forms</li>
          <li>Deleting a school will affect all linked courses and branches</li>
        </ul>
      </div>
    </div>
  );
}