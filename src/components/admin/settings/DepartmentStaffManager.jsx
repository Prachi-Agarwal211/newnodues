'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useDepartmentStaff } from '@/hooks/useDepartmentStaff';
import { useDepartmentsConfig } from '@/hooks/useDepartmentsConfig';
import { useSchoolsConfig } from '@/hooks/useSchoolsConfig';
import { useCoursesConfig } from '@/hooks/useCoursesConfig';
import { useBranchesConfig } from '@/hooks/useBranchesConfig';
import ConfigModal from './ConfigModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Department Staff Manager component
 * Allows admins to create, edit, and delete department staff accounts
 */
export default function DepartmentStaffManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { staff, loading, error, addStaff, updateStaff, deleteStaff } = useDepartmentStaff();
  const { departments } = useDepartmentsConfig();
  const { schools } = useSchoolsConfig();
  const { courses } = useCoursesConfig();
  const { branches } = useBranchesConfig();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');

  // Memoize fields to prevent unnecessary re-renders of ConfigModal
  const fields = useMemo(() => [
    {
      name: 'full_name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., John Doe',
      validate: (value) => {
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 100) return 'Name must be less than 100 characters';
        return null;
      }
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'e.g., john.doe@gmail.com or staff@jecrcu.edu.in',
      disabled: !!editingStaff,
      helpText: editingStaff ? 'Email cannot be changed after creation' : 'Can use any email address (Gmail, Outlook, college email, etc.)',
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Invalid email format';
        return null;
      }
    },
    ...(!editingStaff ? [{
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Minimum 6 characters',
      helpText: 'Staff member will use this to login',
      validate: (value) => {
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (value.length > 50) return 'Password must be less than 50 characters';
        return null;
      }
    }] : []),
    {
      name: 'department_name',
      label: 'Department',
      type: 'select',
      required: true,
      options: departments
        .filter(d => d.is_active)
        .map(d => ({ value: d.name, label: d.display_name || d.name })),
      helpText: 'Staff member will only see requests for this department'
    },
    {
      name: 'school_ids',
      label: 'School Access (Optional)',
      type: 'multi-checkbox',
      options: schools
        .filter(s => s.is_active)
        .map(s => ({ value: s.id, label: s.name })),
      helpText: 'Leave empty for ALL schools. Select specific schools to restrict access.',
      placeholder: 'No schools configured yet'
    },
    {
      name: 'course_ids',
      label: 'Course Access (Optional)',
      type: 'multi-checkbox',
      options: courses
        .filter(c => c.is_active)
        .map(c => ({ value: c.id, label: c.name })),
      helpText: 'Leave empty for ALL courses. Select specific courses to restrict access.',
      placeholder: 'No courses configured yet'
    },
    {
      name: 'branch_ids',
      label: 'Branch Access (Optional)',
      type: 'multi-checkbox',
      options: branches
        .filter(b => b.is_active)
        .map(b => ({ value: b.id, label: b.name })),
      helpText: 'Leave empty for ALL branches. Select specific branches to restrict access.',
      placeholder: 'No branches configured yet'
    }
  ], [departments, schools, courses, branches, editingStaff]);

  const handleAdd = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (editingStaff) {
        await updateStaff(editingStaff.id, formData);
      } else {
        await addStaff(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to save staff account');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (staffId, staffName) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This will permanently remove their account and they will lose access immediately.`)) {
      return;
    }

    try {
      await deleteStaff(staffId);
    } catch (error) {
      alert(error.message || 'Failed to delete staff account');
    }
  };

  // Filter staff based on search and department
  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || s.department_name === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Get department display name
  const getDepartmentDisplayName = (deptName) => {
    const dept = departments.find(d => d.name === deptName);
    return dept?.display_name || deptName;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-700 ${
            isDark ? 'text-white' : 'text-ink-black'
          }`}>
            Department Staff Management
          </h2>
          <p className={`mt-1 transition-colors duration-700 ${
            isDark ? 'text-white/60' : 'text-gray-600'
          }`}>
            Create and manage department staff login accounts
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg
                   text-white font-medium hover:from-red-700 hover:to-red-800
                   transition-all shadow-lg hover:shadow-red-500/25"
        >
          + Add Staff Member
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

      {/* Filters */}
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg transition-all duration-700 ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-ink-black placeholder-gray-400'
              }`}
            />
          </div>
          {/* Department Filter */}
          <div className="sm:w-64">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg transition-all duration-700 ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white [&>option]:bg-[#0f0f0f] [&>option]:text-white [&>option:hover]:bg-[#1a1a1a]'
                  : 'bg-gray-50 border border-gray-200 text-ink-black'
              }`}
            >
              <option value="all">All Departments</option>
              {departments.filter(d => d.is_active).map(dept => (
                <option key={dept.name} value={dept.name}>
                  {dept.display_name || dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className={`border rounded-2xl p-6 transition-all duration-700 ${
        isDark
          ? 'bg-white/[0.035] backdrop-blur-xl border-white/10'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👤</div>
            <p className={`text-lg font-medium mb-2 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              {staff.length === 0 ? 'No Staff Members Yet' : 'No Matching Staff Found'}
            </p>
            <p className={`transition-colors duration-700 ${
              isDark ? 'text-white/60' : 'text-gray-600'
            }`}>
              {staff.length === 0 
                ? 'Add your first department staff member to get started'
                : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b transition-colors duration-700 ${
                  isDark ? 'border-white/10' : 'border-gray-200'
                }`}>
                  <th className={`text-left py-3 px-4 font-medium transition-colors duration-700 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    Name
                  </th>
                  <th className={`text-left py-3 px-4 font-medium transition-colors duration-700 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    Email
                  </th>
                  <th className={`text-left py-3 px-4 font-medium transition-colors duration-700 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    Department
                  </th>
                  <th className={`text-left py-3 px-4 font-medium transition-colors duration-700 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    Access Scope
                  </th>
                  <th className={`text-left py-3 px-4 font-medium transition-colors duration-700 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    Created
                  </th>
                  <th className={`text-right py-3 px-4 font-medium transition-colors duration-700 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staffMember) => (
                  <tr
                    key={staffMember.id}
                    className={`border-b transition-colors duration-700 ${
                      isDark
                        ? 'border-white/5 hover:bg-white/5'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`py-4 px-4 transition-colors duration-700 ${
                      isDark ? 'text-white' : 'text-ink-black'
                    }`}>
                      <div className="font-medium">{staffMember.full_name}</div>
                    </td>
                    <td className={`py-4 px-4 transition-colors duration-700 ${
                      isDark ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      {staffMember.email}
                    </td>
                    <td className={`py-4 px-4 transition-colors duration-700 ${
                      isDark ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-700 ${
                        isDark
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {getDepartmentDisplayName(staffMember.department_name)}
                      </span>
                    </td>
                    <td className={`py-4 px-4 transition-colors duration-700 ${
                      isDark ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      <div className="text-xs space-y-1">
                        {staffMember.school_ids && staffMember.school_ids.length > 0 ? (
                          <div className={`flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                            <span>🏫</span>
                            <span>{staffMember.school_ids.length} school(s)</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                            <span>🌍</span>
                            <span>All Schools</span>
                          </div>
                        )}
                        {staffMember.course_ids && staffMember.course_ids.length > 0 ? (
                          <div className={`flex items-center gap-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                            <span>📚</span>
                            <span>{staffMember.course_ids.length} course(s)</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                            <span>📖</span>
                            <span>All Courses</span>
                          </div>
                        )}
                        {staffMember.branch_ids && staffMember.branch_ids.length > 0 ? (
                          <div className={`flex items-center gap-1 ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                            <span>🎓</span>
                            <span>{staffMember.branch_ids.length} branch(es)</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                            <span>🌐</span>
                            <span>All Branches</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`py-4 px-4 transition-colors duration-700 ${
                      isDark ? 'text-white/60' : 'text-gray-500'
                    }`}>
                      {new Date(staffMember.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(staffMember)}
                          className={`px-3 py-1 rounded-lg font-medium transition-all ${
                            isDark
                              ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(staffMember.id, staffMember.full_name)}
                          className={`px-3 py-1 rounded-lg font-medium transition-all ${
                            isDark
                              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <ConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
        fields={fields}
        initialData={editingStaff}
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
          <li><strong>Department:</strong> Staff can only act on requests for their assigned department</li>
          <li><strong>Access Scope:</strong> Optionally restrict by school, course, or branch. Leave empty for full access</li>
          <li><strong>Example 1:</strong> Library staff → No scope restrictions → Sees all students</li>
          <li><strong>Example 2:</strong> CSE HOD → Engineering school + B.Tech course + CSE branch → Sees only Engineering B.Tech CSE students</li>
          <li><strong>Example 3:</strong> Dean → Engineering school + All courses + All branches → Sees all Engineering students</li>
          <li>Staff login at <code className="px-1 py-0.5 bg-black/20 dark:bg-white/10 rounded">/staff/login</code> using their email and password</li>
          <li>Email addresses cannot be changed after account creation</li>
          <li>Deleting a staff account immediately revokes their access</li>
        </ul>
      </div>
    </div>
  );
}
