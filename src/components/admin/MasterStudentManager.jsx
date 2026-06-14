'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Filter, Download, Upload, User, Mail, Phone, GraduationCap, Building, BookOpen, ChevronDown, X, Check, AlertCircle, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

export default function MasterStudentManager() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State management
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    schoolId: '',
    courseId: '',
    branchId: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Configuration data
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fileInputRef = useRef(null);

  // Debounced search value
  const debouncedSearch = useDebounce(filters.search, 500);

  // Load configuration data
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Load students when filters or page changes
  useEffect(() => {
    if (debouncedSearch) {
      searchAllStudents(debouncedSearch);
    } else {
      loadStudents();
    }
  }, [currentPage, debouncedSearch]);

  const loadConfiguration = async () => {
    try {
      // Load schools
      const schoolsResponse = await fetch('/api/admin/config/schools');
      const schoolsData = await schoolsResponse.json();
      if (schoolsData.success) {
        setSchools(schoolsData.schools || []);
      }

      // Load courses
      const coursesResponse = await fetch('/api/admin/config/courses');
      const coursesData = await coursesResponse.json();
      if (coursesData.success) {
        setCourses(coursesData.courses || []);
      }

      // Load branches
      const branchesResponse = await fetch('/api/admin/config/branches');
      const branchesData = await branchesResponse.json();
      if (branchesData.success) {
        setBranches(branchesData.branches || []);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      });

      const response = await fetch(`/api/admin/students?${params}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      } else {
        toast.error(data.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const searchAllStudents = async (searchTerm) => {
    if (!searchTerm.trim()) {
      // If search is empty, load normal paginated data
      loadStudents();
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        noPagination: 'true', // Flag to get all data
        search: searchTerm.trim(),
        ...Object.fromEntries(Object.entries(filters).filter(([key, value]) => 
          key !== 'search' && value // Exclude search from filters to avoid duplication
        ))
      });

      const response = await fetch(`/api/admin/students?${params}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.data || []);
        setTotalPages(1); // No pagination when showing all results
        setTotalItems(data.count || 0);
        
        // Show info about total results found
        if (data.count > 0) {
          toast.success(`Found ${data.count} students matching "${searchTerm}"`);
        } else {
          toast.info(`No students found matching "${searchTerm}"`);
        }
      } else {
        toast.error(data.error || 'Failed to search students');
      }
    } catch (error) {
      console.error('Error searching students:', error);
      toast.error('Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingStudent ? '/api/admin/students' : '/api/admin/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const payload = editingStudent
        ? { id: editingStudent.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingStudent ? 'Student updated successfully' : 'Student created successfully');
        setShowModal(false);
        setEditingStudent(null);
        setFormData({});
        loadStudents();
      } else {
        toast.error(result.error || 'Failed to save student');
      }
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to save student');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      registration_no: student.registration_no,
      student_name: student.student_name,
      parent_name: student.parent_name,
      school_id: student.school_id,
      course_id: student.course_id,
      branch_id: student.branch_id,
      country_code: student.country_code,
      contact_no: student.contact_no,
      personal_email: student.personal_email,
      college_email: student.college_email,
      alumni_profile_link: student.alumni_profile_link,
      admission_year: student.admission_year,
      passing_year: student.passing_year
    });
    setShowModal(true);
  };

  const handleDelete = async (student) => {
    if (!confirm(`Are you sure you want to delete ${student.student_name} (${student.registration_no})?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/students?id=${student.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Student deleted successfully');
        loadStudents();
      } else {
        toast.error(result.error || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      schoolId: '',
      courseId: '',
      branchId: '',
      status: ''
    });
    setCurrentPage(1);
  };

  const exportStudents = async () => {
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      // Build query parameters with current filters
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      );

      const response = await fetch(`/api/admin/students/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `students_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Students exported successfully');
    } catch (error) {
      console.error('Error exporting students:', error);
      toast.error(error.message || 'Failed to export students');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/students/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Successfully imported ${result.count} students`);
        loadStudents();
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast.error(result.error || 'Import failed');
        if (result.errors && result.errors.length > 0) {
          console.error('Import errors:', result.errors);
          toast.error(`Check console for ${result.errors.length} row errors`);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to upload file');
    } finally {
      setImporting(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    !filters.schoolId || course.school_id === filters.schoolId
  );

  const filteredBranches = branches.filter(branch =>
    !filters.courseId || branch.course_id === filters.courseId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Student Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage all student records and applications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportStudents}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".csv"
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {importing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
              Import CSV
            </label>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-jecrc-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#141414] p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</p>
            </div>
            <User className="w-8 h-8 text-jecrc-red" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#141414] p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{students.filter(s => s.status === 'pending').length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#141414] p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{students.filter(s => s.status === 'in_progress').length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#141414] p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{students.filter(s => s.status === 'completed').length}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#141414] p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Certificates Issued</p>
              <p className="text-2xl font-bold text-green-600">{students.filter(s => s.status === 'completed' && (s.certificate_url || s.final_certificate_generated)).length}</p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#141414] p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, registration, or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filters.schoolId || filters.courseId || filters.branchId || filters.status) && (
              <span className="w-2 h-2 bg-jecrc-red rounded-full"></span>
            )}
          </button>

          {Object.values(filters).some(v => v) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <select
              value={filters.schoolId}
              onChange={(e) => handleFilterChange('schoolId', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
            >
              <option value="">All Schools</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>

            <select
              value={filters.courseId}
              onChange={(e) => handleFilterChange('courseId', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
            >
              <option value="">All Courses</option>
              {filteredCourses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>

            <select
              value={filters.branchId}
              onChange={(e) => handleFilterChange('branchId', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
            >
              <option value="">All Branches</option>
              {filteredBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#1a1a1a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Certificate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jecrc-red"></div>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.student_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{student.parent_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{student.registration_no}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{student.course || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{student.branch || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="text-sm">{student.personal_email}</div>
                      <div className="text-xs text-gray-500">{student.college_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${student.status === 'completed' ? 'bg-green-100 text-green-800' :
                          student.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            student.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                        }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.status === 'completed' ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${ (student.certificate_status === 'generated' || student.certificate_url) ? 'bg-green-100 text-green-800' : student.certificate_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800' }`}>
                            {student.certificate_status || (student.certificate_url ? 'generated' : 'pending')}
                          </span>
                          {(student.certificate_url) && (
                            <a 
                              href={student.certificate_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 text-green-600 hover:text-green-800 transition-colors"
                              title="Download Certificate"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems} students
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#141414] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingStudent(null);
                    setFormData({});
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      value={formData.registration_no || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, registration_no: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="e.g. 21BCE1234"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      value={formData.student_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parent Name
                    </label>
                    <input
                      type="text"
                      value={formData.parent_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="Richard Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      School
                    </label>
                    <select
                      value={formData.school_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, school_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                    >
                      <option value="">Select School</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Course
                    </label>
                    <select
                      value={formData.course_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                    >
                      <option value="">Select Course</option>
                      {filteredCourses.map(course => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Branch
                    </label>
                    <select
                      value={formData.branch_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                    >
                      <option value="">Select Branch</option>
                      {filteredBranches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Personal Email *
                    </label>
                    <input
                      type="email"
                      value={formData.personal_email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, personal_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="john.doe@gmail.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      College Email *
                    </label>
                    <input
                      type="email"
                      value={formData.college_email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, college_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="john.doe@jecrcu.edu.in"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_no || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_no: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="+919876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alumni Profile Link
                    </label>
                    <input
                      type="url"
                      value={formData.alumni_profile_link || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, alumni_profile_link: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="https://jualumni.in/profile/123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Admission Year
                    </label>
                    <input
                      type="text"
                      value={formData.admission_year || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, admission_year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="2020"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Passing Year
                    </label>
                    <input
                      type="text"
                      value={formData.passing_year || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, passing_year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-jecrc-red focus:border-transparent bg-white dark:bg-[#111111] text-gray-900 dark:text-white"
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingStudent(null);
                      setFormData({});
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-jecrc-red text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {editingStudent ? 'Update' : 'Create'} Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
