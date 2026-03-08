'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Check, X, Info, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

import { useTheme } from '@/contexts/ThemeContext';
// import { supabase } from '@/lib/supabaseClient'; // Not using file upload anymore
import { useFormConfig } from '@/hooks/useFormConfig';
import { DropdownWithErrorBoundary } from '@/components/ui/DropdownErrorBoundary';
import { createLogger } from '@/lib/errorLogger';

const logger = createLogger('SubmitForm');

export default function SubmitForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Load dynamic configuration
  const {
    schools,
    courses,
    branches,
    collegeDomain,
    countryCodes,
    loading: configLoading,
    coursesLoading,
    branchesLoading,
    fetchCoursesBySchool,
    fetchBranchesByCourse,
    fetchAllConfig,
    error: configError
  } = useFormConfig();

  const [formData, setFormData] = useState({
    registration_no: '',
    student_name: '',
    admission_year: '',
    passing_year: '',
    parent_name: '',
    school: '',
    course: '',
    branch: '',
    country_code: '+91',
    contact_no: '',
    personal_email: '',
    college_email: '',
    alumni_profile_link: '',
  });

  // Filtered options based on selections
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formId, setFormId] = useState(null);

  // Student data fetching states
  const [fetchingStudent, setFetchingStudent] = useState(false);
  const [studentDataFound, setStudentDataFound] = useState(null);
  const [studentFetchError, setStudentFetchError] = useState('');

  // Ref to prevent useEffects from resetting values during auto-fill
  const isAutoFilling = useRef(false);

  useEffect(() => {
    // 🛑 CRITICAL: During auto-fill, we handle course loading manually to prevent race conditions.
    if (isAutoFilling.current) return;

    const loadCourses = async () => {
      if (formData.school) {
        const coursesForSchool = await fetchCoursesBySchool(formData.school);
        setAvailableCourses(coursesForSchool);

        // Only reset if NOT currently auto-filling
        setFormData(prev => ({ ...prev, course: '', branch: '' }));
        setAvailableBranches([]);
      } else {
        setAvailableCourses([]);
        setAvailableBranches([]);
      }
    };
    loadCourses();
  }, [formData.school, fetchCoursesBySchool]);

  useEffect(() => {
    // 🛑 CRITICAL: During auto-fill, skip manual resetting.
    if (isAutoFilling.current) return;

    const loadBranches = async () => {
      if (formData.course) {
        const branchesForCourse = await fetchBranchesByCourse(formData.course);
        setAvailableBranches(branchesForCourse);

        // Only reset if NOT currently auto-filling
        setFormData(prev => ({ ...prev, branch: '' }));
      } else {
        setAvailableBranches([]);
      }
    };
    loadBranches();
  }, [formData.course, fetchBranchesByCourse]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'school') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        course: '',
        branch: ''
      }));
    } else if (name === 'course') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        branch: ''
      }));
    } else if (name === 'registration_no') {
      // Auto-convert to uppercase as user types
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const checkExistingForm = async () => {
    if (!formData.registration_no) {
      setError('Please enter registration number');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const response = await fetch(`/api/student?registration_no=${encodeURIComponent(formData.registration_no.trim().toUpperCase())}`);
      const result = await response.json();

      // If success is true, it means a form exists (according to getStudentStatus in ApplicationService)
      if (response.ok && result.success && result.data) {
        setError('A form already exists for this registration number. Redirecting to status page...');
        setTimeout(() => {
          router.push(`/student/check-status?reg=${formData.registration_no.toUpperCase()}`);
        }, 2000);
        return;
      }

      // If 404 or success: false, it means no form exists, which is good for submission
      if (response.status === 404 || !result.success) {
        setError('');
        toast.success('✅ No existing form found. You can proceed.');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check form status');
      }
    } catch (err) {
      console.error('Error checking form:', err);
      // If it's just not found, that's fine
      if (err.message.includes('No form found')) {
        setError('');
        toast.success('✅ No existing form found. You can proceed.');
      } else {
        setError(err.message || 'Failed to check existing form');
      }
    } finally {
      setChecking(false);
    }
  };

  const fetchStudentData = async (registrationNo) => {
    if (!registrationNo) {
      setStudentFetchError('Please enter registration number first');
      return;
    }

    setFetchingStudent(true);
    setStudentFetchError('');
    setStudentDataFound(null);

    // Set flag to prevent useEffects from resetting dropdown values
    isAutoFilling.current = true;

    try {
      const response = await fetch(`/api/student/lookup?registration_no=${encodeURIComponent(registrationNo.trim().toUpperCase())}`);
      const result = await response.json();

      if (response.ok && result.success) {
        const studentData = result.data;

        if (studentData.no_dues_status === 'pending') {
          toast('⚠️ You already have a pending application.');
        } else if (studentData.no_dues_status === 'completed') {
          toast.success('✅ Your No Dues process is already completed.');
        }

        // 🔍 ROBUST ID RESOLUTION (Unified State Approach)
        let resolvedSchoolId = '';
        let resolvedCourseId = '';
        let resolvedBranchId = '';
        let activeCourses = [];
        let activeBranches = [];

        // 🏫 Step 1: Resolve School
        const schoolValue = studentData.school_id || studentData.school;
        if (schoolValue) {
          const matched = schools.find(s =>
            s.id === schoolValue ||
            s.name?.toLowerCase() === schoolValue.toString().toLowerCase()
          );
          if (matched) resolvedSchoolId = matched.id;
        }

        // 📚 Step 2: Resolve Course (Parallel fetching for speed)
        if (resolvedSchoolId) {
          activeCourses = await fetchCoursesBySchool(resolvedSchoolId);

          const courseValue = studentData.course_id || studentData.course;
          if (courseValue) {
            const matched = activeCourses.find(c =>
              c.id === courseValue ||
              c.name?.toLowerCase() === courseValue.toString().toLowerCase()
            );
            if (matched) resolvedCourseId = matched.id;
          }
        }

        // 🌿 Step 3: Resolve Branch
        if (resolvedCourseId) {
          activeBranches = await fetchBranchesByCourse(resolvedCourseId);

          const branchValue = studentData.branch_id || studentData.branch;
          if (branchValue) {
            const matched = activeBranches.find(b =>
              b.id === branchValue ||
              b.name?.toLowerCase() === branchValue.toString().toLowerCase()
            );
            if (matched) resolvedBranchId = matched.id;
          }
        }

        // 📝 Step 4: Final Unified State Commit
        // We set options first, then the values to ensure React selects them correctly.
        setAvailableCourses(activeCourses);
        setAvailableBranches(activeBranches);

        setFormData(prev => ({
          ...prev,
          student_name: studentData.student_name || prev.student_name,
          admission_year: studentData.admission_year || prev.admission_year,
          passing_year: studentData.passing_year || prev.passing_year,
          parent_name: studentData.parent_name || prev.parent_name,
          school: resolvedSchoolId || prev.school,
          course: resolvedCourseId || prev.course,
          branch: resolvedBranchId || prev.branch,
          country_code: studentData.country_code || prev.country_code,
          contact_no: studentData.contact_no || prev.contact_no,
          personal_email: studentData.personal_email || prev.personal_email,
          college_email: studentData.college_email || prev.college_email,
          alumni_profile_link: studentData.alumni_profile_link || prev.alumni_profile_link
        }));

        setStudentDataFound(studentData);
        setError('');

        // Show success message with details
        if (resolvedSchoolId && resolvedCourseId && resolvedBranchId) {
          toast.success('✅ All details auto-filled successfully!');
        } else if (resolvedSchoolId) {
          toast('⚠️ Some dropdown values could not be matched. Please verify.');
        } else {
          toast('🔍 Student found, but School/Course matching failed. Please select manually.');
        }
      } else {
        setStudentFetchError(result.message || 'Student not found in database');
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      setStudentFetchError('Failed to fetch student data.');
    } finally {
      setFetchingStudent(false);
      // Reset the auto-filling flag after a short delay to ensure React has processed all state updates
      setTimeout(() => {
        isAutoFilling.current = false;
      }, 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validations
      if (!formData.registration_no?.trim()) throw new Error('Registration number is required');
      if (!formData.student_name?.trim()) throw new Error('Student name is required');
      if (!formData.school) throw new Error('School selection is required');
      if (!formData.course) throw new Error('Course selection is required');
      if (!formData.branch) throw new Error('Branch selection is required');
      if (!formData.personal_email?.trim()) throw new Error('Personal email is required');
      if (!formData.college_email?.trim()) throw new Error('College email is required');
      if (!formData.contact_no?.trim()) throw new Error('Contact number is required');

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.personal_email.trim())) throw new Error('Invalid personal email format');
      if (!emailPattern.test(formData.college_email.trim())) throw new Error('Invalid college email format');
      if (collegeDomain && !formData.college_email.toLowerCase().endsWith(collegeDomain.toLowerCase())) {
        throw new Error(`College email must end with ${collegeDomain}`);
      }

      // Resolve names from the dropdown options
      const selectedSchool = schools.find(s => s.id === formData.school);
      const selectedCourse = availableCourses.find(c => c.id === formData.course);
      const selectedBranch = availableBranches.find(b => b.id === formData.branch);

      const sanitizedData = {
        registration_no: formData.registration_no.trim().toUpperCase(),
        student_name: formData.student_name.trim(),
        admission_year: formData.admission_year?.trim() || null,
        passing_year: formData.passing_year?.trim() || null,
        parent_name: formData.parent_name?.trim() || null,
        school: formData.school,
        school_name: selectedSchool?.name || '',
        course: formData.course,
        course_name: selectedCourse?.name || '',
        branch: formData.branch,
        branch_name: selectedBranch?.name || '',
        country_code: formData.country_code,
        contact_no: formData.contact_no.trim(),
        personal_email: formData.personal_email.trim().toLowerCase(),
        college_email: formData.college_email.trim().toLowerCase(),
        alumni_profile_link: (formData.alumni_profile_link || '').trim()
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 409 || result.duplicate) {
          throw new Error('Form already exists. Redirecting...');
        }
        const error = new Error(result.error || 'Failed to submit form');
        if (result.details) error.details = result.details;
        throw error;
      }

      setFormId(result.data.id);
      setSuccess(true);

      // Use window.location.href instead of router.push to ensure cookie is preserved
      setTimeout(() => {
        window.location.href = `/student/check-status?reg=${sanitizedData.registration_no}`;
      }, 3000);

    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection.');
      } else {
        const errorMsg = err.message || 'An unexpected error occurred.';
        // Read details attached to the error object
        const details = err.details || '';
        setError(details ? `${errorMsg} (Details: ${details})` : errorMsg);
      }
      if (err.message && err.message.includes('already exists')) {
        setTimeout(() => {
          window.location.href = `/student/check-status?reg=${formData.registration_no.toUpperCase()}`;
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-lg mx-auto text-center p-8 sm:p-12 rounded-3xl shadow-2xl ${isDark ? 'bg-gradient-to-br from-gray-900 to-black border border-white/10' : 'bg-white border border-gray-100'
          }`}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center"
        >
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Application Submitted!
        </h2>
        <p className={`text-sm sm:text-base mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your no dues application has been successfully recorded. You are now automatically logged in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.href = `/student/check-status?reg=${formData.registration_no}`}>
            Track Status
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6 sm:space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >

      {/* Instructions Pane - Restored similar to legacy */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          p-6 rounded-xl border
          ${isDark
            ? 'bg-blue-900/10 border-blue-500/20'
            : 'bg-blue-100/30 border-blue-200'
          }
        `}
      >
        <h3 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
          <Info className="w-5 h-5" />
          Instructions
        </h3>
        <ul className={`space-y-2 text-sm list-disc pl-5 ${isDark ? 'text-blue-200' : 'text-blue-600'}`}>
          <li>Fields marked <span className="text-red-500">*</span> are mandatory.</li>
          <li>Ensure details match official college records.</li>
          <li>Register at <a href="https://jualumni.in" target="_blank" className="underline font-bold hover:text-jecrc-red transition-colors">jualumni.in</a> and obtain your <strong>Profile Link</strong> (from the Profile section) before applying.</li>
        </ul>
      </motion.div>

      {/* Config Error Display */}
      {configError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-xl border flex items-start gap-4 mb-6 transition-all ${isDark
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-red-50 border-red-100 text-red-600 shadow-sm'
            }`}
        >
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-base mb-1">Configuration Loading Failed</h4>
            <p className="text-sm opacity-90 mb-3">
              We couldn't load the Schools/Courses data. This is required to submit the form.
              <br />
              <span className="text-xs font-mono mt-1 block px-2 py-1 bg-black/5 rounded">Error: {configError}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchAllConfig}
              className="h-8 border-current hover:bg-red-500/10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Try Again
            </Button>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex gap-3 ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Legacy Arrangement: Registration Top, then Grid */}
      <div className="space-y-4">
        <Input
          label="Registration Number"
          name="registration_no"
          value={formData.registration_no}
          onChange={handleInputChange}
          required
          placeholder="e.g., 22BCAN001"
          disabled={loading}
          // Error handling for student fetch
          error={studentFetchError}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fetchStudentData(formData.registration_no)}
            disabled={fetchingStudent || !formData.registration_no}
            loading={fetchingStudent}
            className="w-full sm:w-auto h-[50px]"
          >
            {!fetchingStudent && "Auto-Fill details"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={checkExistingForm}
            disabled={checking || !formData.registration_no}
            loading={checking}
            className="w-full sm:w-auto h-[50px]"
          >
            {!checking && "Check Status"}
          </Button>
        </div>

        {/* Success/Error Message for Auto-Fill */}
        {(studentDataFound) && (
          <div className={`p-3 rounded-lg text-sm flex gap-2 items-center ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'}`}>
            <Check className="w-4 h-4" /> Found: {studentDataFound.student_name}
          </div>
        )}
      </div>

      {/* MAIN GRID LAYOUT - Restored Legacy density */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Input
          label="Student Name"
          name="student_name"
          value={formData.student_name}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="Enter your full name as per records"
        />

        <Input
          label="Country Code"
          name="country_code"
          type="select"
          value={formData.country_code}
          onChange={handleInputChange}
          required
          disabled={loading}
          options={countryCodes.map(c => ({ value: c.dial_code, label: `${c.country_name} (${c.dial_code})` }))}
        />

        <Input
          label="Contact Number"
          name="contact_no"
          type="tel"
          value={formData.contact_no}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. 9876543210"
        />

        <Input
          label="Personal Email"
          name="personal_email"
          type="email"
          value={formData.personal_email}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. student@gmail.com"
        />
        {/* Note: Legacy might have had College Email in grid, but usually emails are long, span-2 looks better on laptop. Legacy was 2-col? Let's stick to strict 2-col unless it overflows. I'll make it span-2 for better laptop UI as requested "laptop friendly". */}

        <Input
          label="College Email"
          name="college_email"
          type="email"
          value={formData.college_email}
          onChange={handleInputChange}
          required
          disabled={loading}
          className="md:col-span-2"
          placeholder="e.g. student.id@jecrc.ac.in"
        />

        <Input
          label="Admission Year"
          name="admission_year"
          value={formData.admission_year}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. 2022"
        />

        <Input
          label="Passing Year"
          name="passing_year"
          value={formData.passing_year}
          onChange={handleInputChange}
          required
          disabled={loading}
          placeholder="e.g. 2026"
        />

        <div className="md:col-span-2">
          <Input
            label="Parent Name"
            name="parent_name"
            value={formData.parent_name}
            onChange={handleInputChange}
            required
            disabled={loading}
            placeholder="Enter Father's or Mother's Name"
          />
        </div>

        <div className="md:col-span-2">
          <DropdownWithErrorBoundary componentName="SchoolDropdown" onReset={() => window.location.reload()}>
            <Input
              label="School"
              name="school"
              type="select"
              value={formData.school}
              onChange={handleInputChange}
              required
              disabled={loading || configLoading}
              placeholder="Select your School"
              options={(schools || []).map(s => ({
                value: s.id || '',
                label: s.name || 'Unnamed School'
              }))}
            />
          </DropdownWithErrorBoundary>
        </div>

        <DropdownWithErrorBoundary componentName="CourseDropdown">
          <Input
            label="Course"
            name="course"
            type="select"
            value={formData.course}
            onChange={handleInputChange}
            required
            disabled={loading || !formData.school}
            placeholder={!formData.school ? "Select school first" : "Select your Course"}
            options={(availableCourses || []).map(c => ({
              value: c.id || '',
              label: c.name || 'Unnamed Course'
            }))}
          />
        </DropdownWithErrorBoundary>

        <DropdownWithErrorBoundary componentName="BranchDropdown">
          <Input
            label="Branch"
            name="branch"
            type="select"
            value={formData.branch}
            onChange={handleInputChange}
            required
            disabled={loading || !formData.course}
            placeholder={!formData.course ? "Select course first" : "Select your Branch"}
            options={(availableBranches || []).map(b => ({
              value: b.id || '',
              label: b.name || 'Unnamed Branch'
            }))}
          />
        </DropdownWithErrorBoundary>

        <div className="md:col-span-2">
          <Input
            label="JU Alumni Profile Link"
            name="alumni_profile_link"
            value={formData.alumni_profile_link}
            onChange={handleInputChange}
            required
            disabled={loading}
            placeholder="e.g. https://jualumni.in/p/username or https://jualumni.in/profile/123456"
            description={
              <span>
                Go to <a href="https://jualumni.in" target="_blank" className="underline hover:text-jecrc-red">JU Alumni</a> → <strong>Profile</strong> section → Copy the link from browser address bar
              </span>
            }
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          className="w-full sm:w-auto px-10 py-4 text-lg font-bold shadow-xl shadow-red-500/20"
        >
          Submit Application
        </Button>
      </div>
    </motion.form>
  );
}