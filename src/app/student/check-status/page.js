'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, memo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, AlertCircle, FileText, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import PageWrapper from '@/components/landing/PageWrapper';
import Input from '@/components/ui/Input';
import GlassCard from '@/components/ui/GlassCard'; // ✅ Import GlassCard

import StatusTracker from '@/components/student/StatusTracker';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Memoized student info card for performance
const StudentInfoCard = memo(({ formData, isDark, onReset }) => (
  // ✅ Use GlassCard instead of div
  <GlassCard className="mb-6 p-6">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Registration Number</p>
        <p className="font-mono text-2xl font-bold text-jecrc-red">{formData.registration_no}</p>
      </div>
      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-4 py-2 rounded-lg font-manrope font-medium transition-all duration-700 active:scale-95
          ${isDark
            ? 'bg-white/[0.04] text-white border border-white/15 hover:bg-white/[0.08] hover:border-jecrc-red/50'
            : 'bg-white text-jecrc-red border border-jecrc-red/50 hover:bg-jecrc-rose/40'
          }`}
      >
        Check Another
      </motion.button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
      {/* Student Name */}
      <div>
        <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Student Name</p>
        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.student_name}</p>
      </div>

      {/* Parent Name */}
      {formData.parent_name && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Parent Name</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.parent_name}</p>
        </div>
      )}

      {/* Contact Number */}
      {formData.contact_no && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Contact Number</p>
          <p className={`font-medium font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.contact_no}</p>
        </div>
      )}

      {/* Personal Email */}
      {formData.personal_email && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Personal Email</p>
          <p className={`font-medium text-xs break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.personal_email}</p>
        </div>
      )}

      {/* College Email */}
      {formData.college_email && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>College Email</p>
          <p className={`font-medium text-xs break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.college_email}</p>
        </div>
      )}

      {/* School */}
      {formData.school && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>School</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.school}</p>
        </div>
      )}

      {/* Course */}
      {formData.course && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Course</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.course}</p>
        </div>
      )}

      {/* Branch */}
      {formData.branch && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Branch</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.branch}</p>
        </div>
      )}

      {/* Admission Year */}
      {formData.admission_year && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Admission Year</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.admission_year}</p>
        </div>
      )}

      {/* Passing Year */}
      {formData.passing_year && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Passing Year</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.passing_year}</p>
        </div>
      )}

      {/* Submitted Date */}
      {formData.submitted_at && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Submitted On</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {new Date(formData.submitted_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      )}

      {/* Application Status */}
      {formData.status && (
        <div>
          <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Application Status</p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
              ${formData.status === 'completed'
                ? (isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-200 text-green-900')
                : formData.status === 'pending'
                  ? (isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-200 text-yellow-900')
                  : formData.status === 'rejected'
                    ? (isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-200 text-red-900')
                    : (isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-200 text-blue-900')
              }`}>
              {formData.status}
            </span>
          </p>
        </div>
      )}
    </div>
  </GlassCard>
));
StudentInfoCard.displayName = 'StudentInfoCard';

function CheckStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const performSearch = useCallback(async (regNo) => {
    const searchRegNo = (regNo || registrationNumber).trim();

    if (!searchRegNo) {
      setError('Please enter a registration number');
      return;
    }

    const regNoPattern = /^[A-Z0-9]{6,15}$/i;
    if (!regNoPattern.test(searchRegNo)) {
      setError('Invalid registration number format. Use alphanumeric characters (6-15 characters)');
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);
    setFormData(null);

    try {
      const response = await fetch(
        `/api/check-status?registration_no=${encodeURIComponent(searchRegNo.toUpperCase())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error(result.error || 'Failed to fetch status');
      }

      if (result.success && result.data) {
        setFormData(result.data.form);
        router.replace(`/student/check-status?reg=${searchRegNo.toUpperCase()}`, { scroll: false });
      } else {
        setNotFound(true);
      }

    } catch (err) {
      console.error('Error fetching form:', err);
      let errorMessage = 'Failed to fetch status. Please try again.';
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [registrationNumber, router]);

  useEffect(() => {
    const regFromUrl = searchParams.get('reg');
    if (regFromUrl && !formData && !loading) {
      setRegistrationNumber(regFromUrl.toUpperCase());
      performSearch(regFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    await performSearch();
  }, [performSearch]);

  const handleReset = useCallback(() => {
    setRegistrationNumber('');
    setFormData(null);
    setNotFound(false);
    setError('');
    router.replace('/student/check-status', { scroll: false });
  }, [router]);

  return (
    <PageWrapper>
      <div className="relative z-10 min-h-screen pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className={`interactive mb-8 flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-md active:scale-95 border
              ${isDark
                ? 'bg-white/[0.035] text-white border-white/12 hover:text-white hover:bg-white/[0.06] hover:border-jecrc-red/40'
                : 'bg-white text-jecrc-red border-jecrc-red/40 hover:bg-jecrc-rose/40'
              }`}
          >
            <ArrowLeft size={18} />
            <span className="font-medium text-sm">Back to Home</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <div className="flex flex-col items-center mb-6">
              <Logo size="medium" />
            </div>
            <h1 className={`font-serif text-4xl md:text-5xl font-bold mb-4 transition-all duration-700
              ${isDark
                ? 'bg-gradient-to-r from-jecrc-red via-white to-red-400 bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(255,255,255,0.3)]'
                : 'bg-gradient-to-r from-[#8B0000] via-jecrc-red to-gray-900 bg-clip-text text-transparent'
              }`}>
              Check No Dues Form Status
            </h1>
            <p className={`text-lg max-w-2xl mx-auto transition-colors duration-700
              ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Enter your registration number to view the current status of your No Dues application
            </p>
          </motion.div>

          {/* Search Form */}
          {!formData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Instructions Card - Standardized */}
              <div className={`rounded-2xl border p-6 transition-all duration-700 ${isDark
                ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                    <Info className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`
                      font-bold text-lg mb-3 font-serif
                      bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400
                      bg-clip-text text-transparent
                    `}>
                      Important Instructions
                    </h3>
                    <ul className="space-y-2">
                      {[
                        'Enter your registration number exactly as it appears on your ID card',
                        'Status updates may take 24-48 hours after department verification',
                        'If rejected, you can reapply after addressing the mentioned concerns',
                        'Download your No Dues Certificate once all departments approve'
                      ].map((instruction, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'
                            }`} />
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'
                            }`}>
                            {instruction}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Search Form Card - Use GlassCard ✅ */}
              <GlassCard className={`p-8 rounded-2xl backdrop-blur-md transition-all duration-700 ${isDark ? 'bg-[#141414] border border-white/8' : 'bg-white border border-jecrc-red/20 shadow-lg'}`}>
                <form onSubmit={handleSearch} className="space-y-6">
                  <Input
                    label="Registration Number"
                    name="registrationNumber"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., 21EJECS001"
                    error={error}
                    disabled={loading}
                    endIcon={<Search className="w-5 h-5" />}
                  />

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-jecrc-red to-jecrc-red/80 text-white rounded-xl font-manrope font-semibold hover:shadow-xl hover:shadow-jecrc-red/25 transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Check Status
                      </>
                    )}
                  </motion.button>
                </form>
              </GlassCard>
            </motion.div>
          )}

          {/* Not Found Message - Use GlassCard ✅ */}
          {notFound && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <GlassCard className="p-8 text-center border-orange-500/20 dark:border-orange-400/20">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className={`font-serif text-2xl font-bold mb-3 transition-all duration-700
                ${isDark
                    ? 'bg-gradient-to-r from-white via-red-300 to-orange-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-[#8B0000] to-orange-600 bg-clip-text text-transparent'
                  }`}>
                  No Application Found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  We couldn't find a No Dues application with registration number{' '}
                  <span className="font-mono font-bold text-jecrc-red">{registrationNumber}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.button
                    onClick={handleReset}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gray-200 dark:bg-[#1a1a1a] text-gray-900 dark:text-white rounded-xl font-manrope font-semibold hover:bg-gray-300 dark:hover:bg-[#222] transition-all duration-700"
                  >
                    Try Again
                  </motion.button>
                  <Link href="/student/submit-form">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 bg-gradient-to-r from-jecrc-red to-jecrc-red/80 text-white rounded-xl font-manrope font-semibold hover:shadow-xl hover:shadow-jecrc-red/25 transition-all duration-700 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Submit Application
                    </motion.button>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Status Tracker */}
          {formData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <StudentInfoCard
                formData={formData}
                isDark={isDark}
                onReset={handleReset}
              />

              <StatusTracker
                formId={formData.id}
                registrationNo={formData.registration_no}
              />
            </motion.div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

import StudentAuthGuard from '@/components/student/StudentAuthGuard';

export default function CheckStatusPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-[#0A0A0A] dark:via-[#111111] dark:to-[#0A0A0A]">
          <div className="w-8 h-8 border-4 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin" />
        </div>
      }>
        <StudentAuthGuard>
          <CheckStatusContent />
        </StudentAuthGuard>
      </Suspense>
    </ErrorBoundary>
  );
}
