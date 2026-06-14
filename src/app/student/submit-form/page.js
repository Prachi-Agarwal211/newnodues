'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/landing/PageWrapper';
import SubmitForm from '@/components/student/SubmitForm';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function SubmitFormPageContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => router.push('/')}
          className={`interactive mb-8 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-700 ease-smooth backdrop-blur-md
            ${isDark
              ? 'text-gray-400 hover:text-white bg-white/[0.035] hover:bg-white/[0.06] border border-white/10'
              : 'text-gray-600 hover:text-black bg-white hover:bg-gray-50 border border-black/10'
            }`}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </motion.button>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`p-4 sm:p-6 md:p-8 lg:p-12 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
              ${isDark
                ? 'bg-[#141414] border border-white/8 shadow-[0_8px_24px_rgba(0,0,0,0.5)]'
                : 'bg-white border border-jecrc-red/20 shadow-[0_15px_40px_rgba(0,0,0,0.08)]'
              }`}
          >
            {/* Header */}
            <div className="text-center mb-8 sm:mb-10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col items-center"
              >
                {/* Logo will assume centered positioning via its container style */}
                <div className="mb-4">
                  <Logo size="medium" />
                </div>

                <span className="inline-block text-xs font-bold text-jecrc-red tracking-[0.3em] uppercase mb-2 sm:mb-3">
                  Student Services
                </span>
                <h1 className={`font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 transition-all duration-700
                  ${isDark
                    ? 'bg-gradient-to-r from-white via-gray-100 via-pink-200 via-pink-300 to-jecrc-red bg-clip-text text-transparent [text-shadow:0_0_30px_rgba(255,255,255,0.3)]'
                    : 'bg-gradient-to-r from-[#8B0000] via-jecrc-red to-gray-800 to-gray-700 bg-clip-text text-transparent'
                  }`}>
                  Submit No Dues Form
                </h1>
                <p className={`text-sm font-medium transition-colors duration-700 ease-smooth
                  ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fill in your details to apply for no dues clearance
                </p>
              </motion.div>

              {/* Decorative Line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-[1px] w-24 mx-auto mt-6 bg-gradient-to-r from-transparent via-jecrc-red to-transparent"
              />
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <SubmitForm />
            </motion.div>
          </motion.div>

          {/* Info Card - Restored Legacy Style which is outside main card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className={`mt-6 p-6 rounded-xl backdrop-blur-md transition-all duration-700 ease-smooth
              ${isDark
                ? 'bg-white/[0.02] border border-white/10'
                : 'bg-white border border-black/5 shadow-sm'
              }`}
          >
            <h3 className={`font-serif text-lg font-semibold mb-3 transition-all duration-700
              ${isDark
                ? 'bg-gradient-to-r from-white via-pink-200 to-jecrc-red bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-[#8B0000] to-jecrc-red bg-clip-text text-transparent'
              }`}>
              Important Information
            </h3>
            <ul className={`space-y-2 text-sm transition-colors duration-700 ease-smooth
              ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>You can only submit one form per registration number</span>
              </li>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>All required fields must be filled accurately</span>
              </li>
              <li className="flex gap-2">
                <span className="text-jecrc-red">•</span>
                <span>Certificate will be auto-generated once all departments approve</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function SubmitFormPage() {
  return (
    <ErrorBoundary>
      <PageWrapper>
        <SubmitFormPageContent />
      </PageWrapper>
    </ErrorBoundary>
  );
}