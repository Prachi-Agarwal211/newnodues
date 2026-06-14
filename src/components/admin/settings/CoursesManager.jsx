'use client';

import { useState, useEffect } from 'react';
import { useCoursesConfig } from '@/hooks/useCoursesConfig';
import { useSchoolsConfig } from '@/hooks/useSchoolsConfig';
import { useTheme } from '@/contexts/ThemeContext';
import ConfigTable from './ConfigTable';
import ConfigModal from './ConfigModal';

/**
 * Courses management component
 * Allows admins to manage courses linked to schools
 */
export default function CoursesManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { courses, loading, error, addCourse, updateCourse, deleteCourse } = useCoursesConfig();
  const { schools } = useSchoolsConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter courses by selected school and search term
  const filteredCourses = courses.filter(c => {
    // Filter by school
    if (selectedSchool !== 'all' && c.school_id !== selectedSchool) return false;
    
    // Filter by search term
    if (searchTerm) {
      const school = schools.find(s => s.id === c.school_id);
      const searchLower = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(searchLower) ||
        c.level.toLowerCase().includes(searchLower) ||
        school?.name.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const columns = [
    {
      key: 'school_name',
      label: 'School',
      type: 'text',
      render: (value, item) => {
        const school = schools.find(s => s.id === item.school_id);
        return school?.name || '-';
      }
    },
    { key: 'name', label: 'Course Name', type: 'text' },
    {
      key: 'level',
      label: 'Level',
      type: 'text',
      render: (value) => {
        const badges = {
          'UG': <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">UG</span>,
          'PG': <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">PG</span>,
          'PhD': <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">PhD</span>
        };
        return badges[value] || value;
      }
    },
    { key: 'display_order', label: 'Display Order', type: 'number' },
    { key: 'is_active', label: 'Status', type: 'boolean' }
  ];

  const fields = [
    {
      name: 'school_id',
      label: 'School',
      type: 'select',
      required: true,
      options: schools
        .filter(s => s.is_active)
        .map(s => ({ value: s.id, label: s.name })),
      disabled: !!editingCourse, // Can't change school when editing
      helpText: editingCourse ? 'School cannot be changed after creation' : 'Select the school this course belongs to'
    },
    {
      name: 'name',
      label: 'Course Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., B.Tech, MBA, BA LLB',
      validate: (value) => {
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 50) return 'Name must be less than 50 characters';
        return null;
      }
    },
    {
      name: 'level',
      label: 'Course Level',
      type: 'select',
      required: true,
      options: [
        { value: 'UG', label: 'Undergraduate (UG)' },
        { value: 'PG', label: 'Postgraduate (PG)' },
        { value: 'PhD', label: 'Doctoral (PhD)' }
      ],
      helpText: 'Select the academic level of this course'
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      required: true,
      defaultValue: courses.length + 1,
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
      helpText: 'Inactive courses are hidden from students'
    }
  ];

  const handleAdd = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
      } else {
        await addCourse(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to save course');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (courseId) => {
    try {
      await deleteCourse(courseId);
    } catch (error) {
      alert(error.message || 'Failed to delete course');
    }
  };

  const handleToggleStatus = async (courseId, newStatus) => {
    try {
      await updateCourse(courseId, { is_active: newStatus });
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
            Courses Configuration
          </h2>
          <p className={`mt-1 transition-colors duration-700 ${
            isDark ? 'text-white/60' : 'text-gray-600'
          }`}>
            Manage courses within each school (B.Tech, MBA, etc.)
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={schools.length === 0}
          className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg
                   text-white font-medium hover:from-red-700 hover:to-red-800
                   transition-all shadow-lg hover:shadow-red-500/25
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Course
        </button>
      </div>

      {/* Search and Filters */}
      <div className={`border rounded-2xl p-4 transition-all duration-700 ${
        isDark
          ? 'bg-white/[0.035] backdrop-blur-xl border-white/10'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by course name, level, or school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg transition-all duration-700 ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-ink-black placeholder-gray-400'
              }`}
            />
          </div>
          
          {/* School Filter */}
          <div className="sm:w-64">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]'
                  : 'bg-gray-50 border-gray-200 text-ink-black'
              }`}
            >
              <option value="all">All Schools</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warning if no schools */}
      {schools.length === 0 && (
        <div className={`p-4 border rounded-lg transition-all duration-700 ${
          isDark
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <p className={`text-sm transition-colors duration-700 ${
            isDark ? 'text-yellow-400' : 'text-yellow-700'
          }`}>
            ⚠️ Please add at least one school before adding courses.
          </p>
        </div>
      )}

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
          data={filteredCourses}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          isLoading={loading}
          emptyMessage={
            selectedSchool === 'all'
              ? "No courses configured. Add your first course to get started."
              : "No courses found for the selected school."
          }
        />
      </div>

      {/* Add/Edit Modal */}
      <ConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title={editingCourse ? 'Edit Course' : 'Add New Course'}
        fields={fields}
        initialData={editingCourse}
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
          <li>Courses are linked to specific schools and academic levels</li>
          <li>UG = Undergraduate (B.Tech, BBA, BCA, etc.)</li>
          <li>PG = Postgraduate (MBA, M.Tech, MCA, etc.)</li>
          <li>PhD = Doctoral level programs</li>
          <li>Each course can have multiple branches (specializations)</li>
          <li>Inactive courses won't appear in student forms</li>
          <li>Deleting a course will affect all linked branches</li>
        </ul>
      </div>
    </div>
  );
}