'use client';

import { useState } from 'react';
import { useBranchesConfig } from '@/hooks/useBranchesConfig';
import { useCoursesConfig } from '@/hooks/useCoursesConfig';
import { useSchoolsConfig } from '@/hooks/useSchoolsConfig';
import { useTheme } from '@/contexts/ThemeContext';
import ConfigTable from './ConfigTable';
import ConfigModal from './ConfigModal';

/**
 * Branches management component
 * Allows admins to manage branches (specializations) linked to courses
 */
export default function BranchesManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branches, loading, error, addBranch, updateBranch, deleteBranch } = useBranchesConfig();
  const { courses } = useCoursesConfig();
  const { schools } = useSchoolsConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter courses by selected school
  const filteredCourses = selectedSchool === 'all'
    ? courses
    : courses.filter(c => c.school_id === selectedSchool);

  // Filter branches by selected school, course, and search term
  const filteredBranches = branches.filter(b => {
    // Filter by course/school
    if (selectedCourse !== 'all' && b.course_id !== selectedCourse) return false;
    if (selectedSchool !== 'all') {
      const course = courses.find(c => c.id === b.course_id);
      if (course?.school_id !== selectedSchool) return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const course = courses.find(c => c.id === b.course_id);
      const school = schools.find(s => s.id === course?.school_id);
      const searchLower = searchTerm.toLowerCase();
      return (
        b.name.toLowerCase().includes(searchLower) ||
        course?.name.toLowerCase().includes(searchLower) ||
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
        const course = courses.find(c => c.id === item.course_id);
        const school = schools.find(s => s.id === course?.school_id);
        return school?.name || '-';
      }
    },
    {
      key: 'course_name',
      label: 'Course',
      type: 'text',
      render: (value, item) => {
        const course = courses.find(c => c.id === item.course_id);
        return course?.name || '-';
      }
    },
    { key: 'name', label: 'Branch Name', type: 'text' },
    { key: 'display_order', label: 'Display Order', type: 'number' },
    { key: 'is_active', label: 'Status', type: 'boolean' }
  ];

  const fields = [
    {
      name: 'course_id',
      label: 'Course',
      type: 'select',
      required: true,
      options: courses
        .filter(c => c.is_active)
        .map(c => {
          const school = schools.find(s => s.id === c.school_id);
          return {
            value: c.id,
            label: `${school?.name || ''} - ${c.name}`
          };
        }),
      disabled: !!editingBranch,
      helpText: editingBranch ? 'Course cannot be changed after creation' : 'Select the course this branch belongs to'
    },
    {
      name: 'name',
      label: 'Branch Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Computer Science, Finance, Corporate Law',
      validate: (value) => {
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 100) return 'Name must be less than 100 characters';
        return null;
      }
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      required: true,
      defaultValue: branches.length + 1,
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
      helpText: 'Inactive branches are hidden from students'
    }
  ];

  const handleAdd = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, formData);
      } else {
        await addBranch(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to save branch');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (branchId) => {
    try {
      await deleteBranch(branchId);
    } catch (error) {
      alert(error.message || 'Failed to delete branch');
    }
  };

  const handleToggleStatus = async (branchId, newStatus) => {
    try {
      await updateBranch(branchId, { is_active: newStatus });
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
            Branches Configuration
          </h2>
          <p className={`mt-1 transition-colors duration-700 ${
            isDark ? 'text-white/60' : 'text-gray-600'
          }`}>
            Manage branches/specializations within each course
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={courses.length === 0}
          className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg
                   text-white font-medium hover:from-red-700 hover:to-red-800
                   transition-all shadow-lg hover:shadow-red-500/25
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Branch
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
              placeholder="Search by branch, course, or school name..."
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
          <div className="flex items-center gap-2">
          <label className={`font-medium transition-colors duration-700 ${
            isDark ? 'text-white/80' : 'text-gray-700'
          }`}>
            School:
          </label>
          <select
            value={selectedSchool}
            onChange={(e) => {
              setSelectedSchool(e.target.value);
              setSelectedCourse('all');
            }}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
              isDark
                ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]'
                : 'bg-white border-gray-300 text-ink-black'
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

          {/* Course Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500/50 transition-all duration-700 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]'
                  : 'bg-gray-50 border-gray-200 text-ink-black'
              }`}
            >
              <option value="all">All Courses</option>
              {filteredCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warning if no courses */}
      {courses.length === 0 && (
        <div className={`p-4 border rounded-lg transition-all duration-700 ${
          isDark
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <p className={`text-sm transition-colors duration-700 ${
            isDark ? 'text-yellow-400' : 'text-yellow-700'
          }`}>
            ⚠️ Please add at least one course before adding branches.
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
          data={filteredBranches}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          isLoading={loading}
          emptyMessage="No branches configured for the selected filters."
        />
      </div>

      {/* Add/Edit Modal */}
      <ConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        fields={fields}
        initialData={editingBranch}
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
          <li>Branches are specializations within courses (e.g., CSE in B.Tech)</li>
          <li>Each branch is linked to a specific course</li>
          <li>Inactive branches won't appear in student forms</li>
          <li>Students select: School → Course → Branch during form submission</li>
        </ul>
      </div>
    </div>
  );
}