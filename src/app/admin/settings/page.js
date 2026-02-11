'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import MultiSelectCheckbox from '@/components/admin/MultiSelectCheckbox';
import {
  Settings, Save, Plus, Trash2, Edit,
  Building2, School, Mail, Users,
  CheckCircle, XCircle, Loader2, BookOpen, GitBranch, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'departments';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  // Data States
  const [departments, setDepartments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [emailConfig, setEmailConfig] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});

  // Edit States
  const [editingDept, setEditingDept] = useState(null);
  const [editingSchool, setEditingSchool] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingEmail, setEditingEmail] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    full_name: '',
    department_name: '',
    school_ids: [],
    course_ids: [],
    branch_ids: []
  });

  // Fetch Functions
  const fetchDepartments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/departments?include_inactive=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setDepartments(json.departments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/schools?include_inactive=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setSchools(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/courses?include_inactive=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setCourses(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/branches?include_inactive=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setBranches(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/emails', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setEmailConfig(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found for fetchStaff');
        return;
      }

      const res = await fetch('/api/admin/staff', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });

      const json = await res.json();
      if (json.success) {
        setStaffList(json.data || []);
      } else {
        console.error('Fetch Staff Error:', json.error);
        toast.error('Failed to load staff list: ' + (json.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Fetch Staff Exception:', e);
      toast.error('Network error loading staff list');
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setSystemSettings(json.settings || {});
    } catch (e) {
      console.error(e);
    }
  };

  // Update Functions
  const updateDepartment = async (dept) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/departments', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dept)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Department updated');
        fetchDepartments();
        setEditingDept(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateSchool = async (school) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/schools', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(school)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('School updated');
        fetchSchools();
        setEditingSchool(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (course) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/courses', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(course)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Course updated');
        fetchCourses();
        setEditingCourse(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateBranch = async (branch) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/branches', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(branch)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Branch updated');
        fetchBranches();
        setEditingBranch(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateEmailConfig = async (config) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/emails', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Email config updated');
        fetchEmailConfig();
        setEditingEmail(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const createStaff = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.full_name || !newStaff.department_name) {
      toast.error('Email, password, name, and department are required');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newStaff.email,
          password: newStaff.password,
          full_name: newStaff.full_name,
          department_name: newStaff.department_name,
          school_ids: newStaff.school_ids.length > 0 ? newStaff.school_ids : null,
          course_ids: newStaff.course_ids.length > 0 ? newStaff.course_ids : null,
          branch_ids: newStaff.branch_ids.length > 0 ? newStaff.branch_ids : null
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Staff account created with scope restrictions');
        fetchStaff();
        setNewStaff({
          email: '',
          password: '',
          full_name: '',
          department_name: '',
          school_ids: [],
          course_ids: [],
          branch_ids: []
        });
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (staffId) => {
    if (!confirm('Delete this staff account?')) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/staff?id=${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Staff deleted');
        fetchStaff();
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Deletion failed');
    } finally {
      setLoading(false);
    }
  };

  const updateStaff = async (staff) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: staff.id,
          full_name: staff.full_name,
          department_name: staff.department_name,
          school_ids: staff.school_ids && staff.school_ids.length > 0 ? staff.school_ids : null,
          course_ids: staff.course_ids && staff.course_ids.length > 0 ? staff.course_ids : null,
          branch_ids: staff.branch_ids && staff.branch_ids.length > 0 ? staff.branch_ids : null
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Staff account updated');
        fetchStaff();
        setEditingStaff(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/admin/login');
    };
    checkAuth();
    fetchDepartments();
    fetchSchools();
    fetchCourses();
    fetchCourses();
    fetchBranches();
    fetchEmailConfig();
    fetchStaff();
    fetchSystemSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab]);

  const updateSetting = async (key, value) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/admin/config/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value })
      });
      fetchSystemSettings();
      toast.success('Setting updated');
    } catch (e) {
      toast.error('Failed to update setting');
    }
  };

  // ==================== CASCADING SCOPING FILTERS ====================
  // Track if we're in the middle of a selection to prevent UI jumps
  const isSelectingRef = useRef(false);
  const pendingUpdateRef = useRef(null);

  // Filter courses based on selected schools for NEW STAFF
  const filteredCoursesForNewStaff = useMemo(() => {
    if (!newStaff.school_ids || newStaff.school_ids.length === 0) {
      // No schools selected - show all active courses
      return courses.filter(c => c.is_active);
    }
    // Filter courses that belong to selected schools
    return courses.filter(c =>
      c.is_active && newStaff.school_ids.includes(c.school_id)
    );
  }, [courses, newStaff.school_ids]);

  // Filter branches based on selected courses for NEW STAFF
  const filteredBranchesForNewStaff = useMemo(() => {
    if (!newStaff.course_ids || newStaff.course_ids.length === 0) {
      // No courses selected - show all active branches
      return branches.filter(b => b.is_active);
    }
    // Filter branches that belong to selected courses
    return branches.filter(b =>
      b.is_active && newStaff.course_ids.includes(b.course_id)
    );
  }, [branches, newStaff.course_ids]);

  // Filter courses based on selected schools for EDITING STAFF
  const filteredCoursesForEditStaff = useMemo(() => {
    if (!editingStaff) return courses.filter(c => c.is_active);

    if (!editingStaff.school_ids || editingStaff.school_ids.length === 0) {
      return courses.filter(c => c.is_active);
    }
    return courses.filter(c =>
      c.is_active && editingStaff.school_ids.includes(c.school_id)
    );
  }, [courses, editingStaff?.school_ids, editingStaff]);

  // Filter branches based on selected courses for EDITING STAFF
  const filteredBranchesForEditStaff = useMemo(() => {
    if (!editingStaff) return branches.filter(b => b.is_active);

    if (!editingStaff.course_ids || editingStaff.course_ids.length === 0) {
      return branches.filter(b => b.is_active);
    }
    return branches.filter(b =>
      b.is_active && editingStaff.course_ids.includes(b.course_id)
    );
  }, [branches, editingStaff?.course_ids, editingStaff]);

  // Helper function to process cascading updates with delay
  const processCascadingUpdate = useCallback((updateFn) => {
    if (isSelectingRef.current) {
      // If we're selecting, delay the update
      pendingUpdateRef.current = updateFn;
      return;
    }
    updateFn();
  }, []);

  // Process pending updates after selection completes
  useEffect(() => {
    if (!isSelectingRef.current && pendingUpdateRef.current) {
      const updateFn = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      // Small delay to let the UI settle
      const timer = setTimeout(() => updateFn(), 50);
      return () => clearTimeout(timer);
    }
  }, [newStaff.school_ids, newStaff.course_ids, editingStaff?.school_ids, editingStaff?.course_ids]);

  // Handle school selection change for NEW STAFF - with debounced cascade
  const handleNewStaffSchoolChange = useCallback((schoolIds) => {
    // Immediately update school_ids without cascading
    setNewStaff(prev => ({
      ...prev,
      school_ids: schoolIds
    }));

    // Delay the cascading filter to prevent UI jump
    setTimeout(() => {
      setNewStaff(prev => {
        // If schools changed, filter out invalid courses
        if (schoolIds.length > 0) {
          const validCourseIds = courses
            .filter(c => c.is_active && schoolIds.includes(c.school_id))
            .map(c => c.id);

          // Keep only courses that belong to selected schools
          const newCourseIds = prev.course_ids.filter(id => validCourseIds.includes(id));

          // If courses changed, filter out invalid branches
          const validBranchIds = branches
            .filter(b => b.is_active && newCourseIds.includes(b.course_id))
            .map(b => b.id);
          const newBranchIds = prev.branch_ids.filter(id => validBranchIds.includes(id));

          return {
            ...prev,
            school_ids: schoolIds,
            course_ids: newCourseIds,
            branch_ids: newBranchIds
          };
        }
        return { ...prev, school_ids: schoolIds };
      });
    }, 100);
  }, [courses, branches]);

  // Handle course selection change for NEW STAFF - with debounced cascade
  const handleNewStaffCourseChange = useCallback((courseIds) => {
    // Immediately update course_ids without cascading
    setNewStaff(prev => ({
      ...prev,
      course_ids: courseIds
    }));

    // Delay the cascading filter to prevent UI jump
    setTimeout(() => {
      setNewStaff(prev => {
        // If courses changed, filter out invalid branches
        if (courseIds.length > 0) {
          const validBranchIds = branches
            .filter(b => b.is_active && courseIds.includes(b.course_id))
            .map(b => b.id);
          const newBranchIds = prev.branch_ids.filter(id => validBranchIds.includes(id));

          return {
            ...prev,
            course_ids: courseIds,
            branch_ids: newBranchIds
          };
        }
        return { ...prev, course_ids: courseIds };
      });
    }, 100);
  }, [branches]);

  // Handle school selection change for EDITING STAFF - with debounced cascade
  const handleEditStaffSchoolChange = useCallback((schoolIds) => {
    // Immediately update school_ids without cascading
    setEditingStaff(prev => {
      if (!prev) return prev;
      return { ...prev, school_ids: schoolIds };
    });

    // Delay the cascading filter to prevent UI jump
    setTimeout(() => {
      setEditingStaff(prev => {
        if (!prev) return prev;

        if (schoolIds.length > 0) {
          const validCourseIds = courses
            .filter(c => c.is_active && schoolIds.includes(c.school_id))
            .map(c => c.id);
          const newCourseIds = (prev.course_ids || []).filter(id => validCourseIds.includes(id));

          const validBranchIds = branches
            .filter(b => b.is_active && newCourseIds.includes(b.course_id))
            .map(b => b.id);
          const newBranchIds = (prev.branch_ids || []).filter(id => validBranchIds.includes(id));

          return {
            ...prev,
            school_ids: schoolIds,
            course_ids: newCourseIds,
            branch_ids: newBranchIds
          };
        }
        return { ...prev, school_ids: schoolIds };
      });
    }, 100);
  }, [courses, branches]);

  // Handle course selection change for EDITING STAFF - with debounced cascade
  const handleEditStaffCourseChange = useCallback((courseIds) => {
    // Immediately update course_ids without cascading
    setEditingStaff(prev => {
      if (!prev) return prev;
      return { ...prev, course_ids: courseIds };
    });

    // Delay the cascading filter to prevent UI jump
    setTimeout(() => {
      setEditingStaff(prev => {
        if (!prev) return prev;

        if (courseIds.length > 0) {
          const validBranchIds = branches
            .filter(b => b.is_active && courseIds.includes(b.course_id))
            .map(b => b.id);
          const newBranchIds = (prev.branch_ids || []).filter(id => validBranchIds.includes(id));

          return {
            ...prev,
            course_ids: courseIds,
            branch_ids: newBranchIds
          };
        }
        return { ...prev, course_ids: courseIds };
      });
    }, 100);
  }, [branches]);

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'schools', label: 'Schools', icon: School },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'branches', label: 'Branches', icon: GitBranch },
    { id: 'emails', label: 'Email Config', icon: Mail },
    { id: 'staff', label: 'Staff Accounts', icon: Users }
  ];

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
              <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage departments, schools, and staff</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap border ${activeTab === tab.id
                ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red border-jecrc-red'
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">System Configuration</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Allow Re-application</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">If enabled, rejected students can re-submit for approval.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={systemSettings.allow_reapplication === true}
                    onChange={(e) => updateSetting('allow_reapplication', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-jecrc-red"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Internal Maintenance Mode</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Disable student access temporarily during updates.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={systemSettings.maintenance_mode === true}
                    onChange={(e) => updateSetting('maintenance_mode', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-jecrc-red"></div>
                </label>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Current Academic Year</h4>
                <input
                  type="text"
                  className="w-full max-w-xs px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20"
                  value={systemSettings.academic_year || ''}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, academic_year: e.target.value }))}
                  onBlur={(e) => updateSetting('academic_year', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Changes are saved automatically on blur.</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* DEPARTMENTS TAB */}
        {activeTab === 'departments' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Department Management</h3>
            <div className="space-y-3">
              {departments.map(dept => (
                <div key={dept.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingDept?.name === dept.name ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red/50 focus:border-transparent transition-all shadow-sm"
                        value={editingDept.display_name}
                        onChange={(e) => setEditingDept({ ...editingDept, display_name: e.target.value })}
                      />
                      <input
                        type="email"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red/50 focus:border-transparent transition-all shadow-sm"
                        value={editingDept.email || ''}
                        onChange={(e) => setEditingDept({ ...editingDept, email: e.target.value })}
                        placeholder="Email (optional)"
                      />

                      <div className="w-full space-y-4 mt-4 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">🔒 Scope Restriction (Optional)</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Restrict this department to specific schools, courses, or branches.</p>
                        <MultiSelectCheckbox
                          options={schools.filter(s => s.is_active).map(s => ({ id: s.id, label: s.name }))}
                          selectedIds={editingDept.allowed_school_ids || []}
                          onChange={(ids) => setEditingDept({ ...editingDept, allowed_school_ids: ids })}
                          placeholder="All Schools (no restriction)"
                          label="Restrict to Schools"
                          emptyMessage="No active schools available"
                        />
                        {(editingDept.allowed_school_ids?.length > 0) && (
                          <MultiSelectCheckbox
                            options={courses.filter(c => c.is_active && editingDept.allowed_school_ids.includes(c.school_id)).map(c => ({ 
                              id: c.id, 
                              label: c.name,
                              subtitle: c.config_schools?.name
                            }))}
                            selectedIds={editingDept.allowed_course_ids || []}
                            onChange={(ids) => setEditingDept({ ...editingDept, allowed_course_ids: ids })}
                            placeholder="All Courses in Selected Schools"
                            label="Restrict to Courses"
                            emptyMessage="No courses available for selected schools"
                          />
                        )}
                        {(editingDept.allowed_course_ids?.length > 0) && (
                          <MultiSelectCheckbox
                            options={branches.filter(b => b.is_active && editingDept.allowed_course_ids.includes(b.course_id)).map(b => ({ 
                              id: b.id, 
                              label: b.name,
                              subtitle: b.config_courses?.name
                            }))}
                            selectedIds={editingDept.allowed_branch_ids || []}
                            onChange={(ids) => setEditingDept({ ...editingDept, allowed_branch_ids: ids })}
                            placeholder="All Branches in Selected Courses"
                            label="Restrict to Branches"
                            emptyMessage="No branches available for selected courses"
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateDepartment(editingDept)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20 transition-all active:scale-95"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingDept(null)}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-all active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-white">{dept.display_name}</span>
                          {dept.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {dept.email || 'No email set'} • Order: {dept.display_order}
                          {dept.allowed_school_ids?.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Targeted Scope
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingDept({ ...dept })}
                        className="p-2 text-jecrc-red dark:text-jecrc-red-bright hover:bg-jecrc-rose dark:hover:bg-jecrc-red/20 rounded-lg transition-colors border border-transparent hover:border-jecrc-red/30 dark:hover:border-jecrc-red/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* SCHOOLS TAB */}
        {activeTab === 'schools' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">School Management</h3>
            <div className="space-y-3">
              {schools.map(school => (
                <div key={school.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingSchool?.id === school.id ? (
                    <div className="flex-1 flex gap-3">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                        value={editingSchool.name}
                        onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                      />
                      <button
                        onClick={() => updateSchool(editingSchool)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingSchool(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-white">{school.name}</span>
                          {school.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Order: {school.display_order}</span>
                      </div>
                      <button
                        onClick={() => setEditingSchool({ ...school })}
                        className="p-2 text-jecrc-red dark:text-jecrc-red-bright hover:bg-jecrc-rose dark:hover:bg-jecrc-red/20 rounded-lg transition-colors border border-transparent hover:border-jecrc-red/30 dark:hover:border-jecrc-red/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Course Management</h3>
            <div className="space-y-3">
              {courses.map(course => (
                <div key={course.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingCourse?.id === course.id ? (
                    <div className="flex-1 flex gap-3">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                        value={editingCourse.name}
                        onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                      />
                      <button
                        onClick={() => updateCourse(editingCourse)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingCourse(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-white">{course.name}</span>
                          {course.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {course.config_schools?.name} • Order: {course.display_order}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingCourse({ ...course })}
                        className="p-2 text-jecrc-red dark:text-jecrc-red-bright hover:bg-jecrc-rose dark:hover:bg-jecrc-red/20 rounded-lg transition-colors border border-transparent hover:border-jecrc-red/30 dark:hover:border-jecrc-red/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* BRANCHES TAB */}
        {activeTab === 'branches' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Branch Management</h3>
            <div className="space-y-3">
              {branches.map(branch => (
                <div key={branch.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingBranch?.id === branch.id ? (
                    <div className="flex-1 flex gap-3">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                        value={editingBranch.name}
                        onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                      />
                      <button
                        onClick={() => updateBranch(editingBranch)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingBranch(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-white">{branch.name}</span>
                          {branch.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {branch.config_courses?.name} ({branch.config_courses?.config_schools?.name}) • Order: {branch.display_order}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingBranch({ ...branch })}
                        className="p-2 text-jecrc-red dark:text-jecrc-red-bright hover:bg-jecrc-rose dark:hover:bg-jecrc-red/20 rounded-lg transition-colors border border-transparent hover:border-jecrc-red/30 dark:hover:border-jecrc-red/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* EMAIL CONFIG TAB */}
        {activeTab === 'emails' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Email Configuration</h3>
            <div className="space-y-3">
              {emailConfig.map(config => (
                <div key={config.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingEmail?.key === config.key ? (
                    <div className="flex-1 flex gap-3">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                        value={editingEmail.value}
                        onChange={(e) => setEditingEmail({ ...editingEmail, value: e.target.value })}
                      />
                      <button
                        onClick={() => updateEmailConfig(editingEmail)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingEmail(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 dark:text-white block">{config.key}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{config.value}</span>
                        {config.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{config.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingEmail({ ...config })}
                        className="p-2 text-jecrc-red dark:text-jecrc-red-bright hover:bg-jecrc-rose dark:hover:bg-jecrc-red/20 rounded-lg transition-colors border border-transparent hover:border-jecrc-red/30 dark:hover:border-jecrc-red/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Create New Staff */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Staff Account</h3>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                  type="email"
                  placeholder="Email *"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Password (min 6 chars) *"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Full Name *"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                />
                <select
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                  value={newStaff.department_name}
                  onChange={(e) => setNewStaff({ ...newStaff, department_name: e.target.value })}
                >
                  <option value="">Select Department *</option>
                  {departments.filter(d => d.is_active).map(dept => (
                    <option key={dept.name} value={dept.name}>{dept.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Scope Restrictions */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  🔒 Access Scope (Optional - Leave empty for full access)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Restrict this staff member to specific schools, courses, or branches. Click to open dropdown and use checkboxes to select multiple items.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Schools Checkbox Multi-Select */}
                  <MultiSelectCheckbox
                    label="Schools"
                    placeholder="Select schools (optional)"
                    emptyMessage="No active schools available"
                    options={schools
                      .filter(s => s.is_active)
                      .map(school => ({
                        id: school.id,
                        label: school.name
                      }))
                    }
                    selectedIds={newStaff.school_ids}
                    onChange={handleNewStaffSchoolChange}
                  />

                  {/* Courses Checkbox Multi-Select - FILTERED BY SELECTED SCHOOLS */}
                  <MultiSelectCheckbox
                    label="Courses"
                    placeholder={
                      newStaff.school_ids.length > 0
                        ? "Select courses (filtered by schools)"
                        : "Select courses (optional)"
                    }
                    emptyMessage={
                      newStaff.school_ids.length > 0
                        ? "No courses available for selected schools"
                        : "No active courses available"
                    }
                    options={filteredCoursesForNewStaff.map(course => ({
                      id: course.id,
                      label: course.name,
                      subtitle: course.config_schools?.name
                    }))}
                    selectedIds={newStaff.course_ids}
                    onChange={handleNewStaffCourseChange}
                  />

                  {/* Branches Checkbox Multi-Select - FILTERED BY SELECTED COURSES */}
                  <MultiSelectCheckbox
                    label="Branches"
                    placeholder={
                      newStaff.course_ids.length > 0
                        ? "Select branches (filtered by courses)"
                        : "Select branches (optional)"
                    }
                    emptyMessage={
                      newStaff.course_ids.length > 0
                        ? "No branches available for selected courses"
                        : "No active branches available"
                    }
                    options={filteredBranchesForNewStaff.map(branch => ({
                      id: branch.id,
                      label: branch.name,
                      subtitle: branch.config_courses?.name
                    }))}
                    selectedIds={newStaff.branch_ids}
                    onChange={(ids) => setNewStaff({ ...newStaff, branch_ids: ids })}
                  />
                </div>
              </div>

              <button
                onClick={createStaff}
                disabled={loading}
                className="w-full px-6 py-2.5 bg-jecrc-red hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 font-medium shadow-lg shadow-jecrc-red/20 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Staff Account with Scope
              </button>
            </GlassCard>

            {/* Staff List */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Existing Staff ({staffList.length})</h3>
                <button
                  onClick={fetchStaff}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Refresh List"
                >
                  <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {staffList.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No staff accounts found.</p>
                    <p className="text-xs mt-1">Create a new account above to get started.</p>
                  </div>
                )}
                {staffList.map(staff => (
                  <div key={staff.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                    {editingStaff?.id === staff.id ? (
                      // EDIT MODE
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Full Name"
                            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                            value={editingStaff.full_name}
                            onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                          />
                          <select
                            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent"
                            value={editingStaff.department_name}
                            onChange={(e) => setEditingStaff({ ...editingStaff, department_name: e.target.value })}
                          >
                            <option value="">Select Department</option>
                            {departments.filter(d => d.is_active).map(dept => (
                              <option key={dept.name} value={dept.name}>{dept.display_name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            🔒 Access Scope
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MultiSelectCheckbox
                              label="Schools"
                              placeholder="Select schools"
                              emptyMessage="No schools"
                              options={schools.filter(s => s.is_active).map(school => ({
                                id: school.id,
                                label: school.name
                              }))}
                              selectedIds={editingStaff.school_ids || []}
                              onChange={handleEditStaffSchoolChange}
                            />
                            {/* Courses - FILTERED BY SELECTED SCHOOLS */}
                            <MultiSelectCheckbox
                              label="Courses"
                              placeholder={
                                (editingStaff.school_ids || []).length > 0
                                  ? "Select courses (filtered by schools)"
                                  : "Select courses"
                              }
                              emptyMessage={
                                (editingStaff.school_ids || []).length > 0
                                  ? "No courses for selected schools"
                                  : "No courses"
                              }
                              options={filteredCoursesForEditStaff.map(course => ({
                                id: course.id,
                                label: course.name,
                                subtitle: course.config_schools?.name
                              }))}
                              selectedIds={editingStaff.course_ids || []}
                              onChange={handleEditStaffCourseChange}
                            />
                            {/* Branches - FILTERED BY SELECTED COURSES */}
                            <MultiSelectCheckbox
                              label="Branches"
                              placeholder={
                                (editingStaff.course_ids || []).length > 0
                                  ? "Select branches (filtered by courses)"
                                  : "Select branches"
                              }
                              emptyMessage={
                                (editingStaff.course_ids || []).length > 0
                                  ? "No branches for selected courses"
                                  : "No branches"
                              }
                              options={filteredBranchesForEditStaff.map(branch => ({
                                id: branch.id,
                                label: branch.name,
                                subtitle: branch.config_courses?.name
                              }))}
                              selectedIds={editingStaff.branch_ids || []}
                              onChange={(ids) => setEditingStaff({ ...editingStaff, branch_ids: ids })}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStaff(editingStaff)}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingStaff(null)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // VIEW MODE
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-bold text-gray-900 dark:text-white block">{staff.full_name}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{staff.email}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500 block mt-1">
                            {staff.department_name} • Created: {new Date(staff.created_at).toLocaleDateString()}
                          </span>
                          {(staff.school_ids || staff.course_ids || staff.branch_ids) && (
                            <div className="flex gap-2 mt-2">
                              {staff.school_ids && (
                                <span className="px-2 py-0.5 bg-jecrc-rose dark:bg-jecrc-red/20 text-jecrc-red dark:text-jecrc-red-bright rounded text-xs font-medium">
                                  🏫 {staff.school_ids.length} Schools
                                </span>
                              )}
                              {staff.course_ids && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                  📚 {staff.course_ids.length} Courses
                                </span>
                              )}
                              {staff.branch_ids && (
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                                  🎓 {staff.branch_ids.length} Branches
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingStaff({ ...staff })}
                            className="p-2 text-jecrc-red dark:text-jecrc-red-bright hover:bg-jecrc-rose dark:hover:bg-jecrc-red/20 rounded-lg transition-colors border border-transparent hover:border-jecrc-red/30 dark:hover:border-jecrc-red/30"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteStaff(staff.id)}
                            disabled={loading}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
