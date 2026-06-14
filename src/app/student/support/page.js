'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PageWrapper from '@/components/landing/PageWrapper';
import { MessageSquare, ArrowLeft, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

export default function StudentSupport() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [submitting, setSubmitting] = useState(false);

  // Simplified form state - Only email and message
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    if (formData.message.trim().length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          message: formData.message,
          requesterType: 'student'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit ticket');
      }

      toast.success('Support request submitted! Our admin team will respond soon.');
      setFormData({ email: '', message: '' });

    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative z-10">

        {/* Back Button - Matches SubmitForm style */}
        <div className="w-full max-w-2xl mb-6 sm:mb-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push('/')}
            className={`
              interactive flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
              ${isDark
                ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                : 'text-gray-600 hover:text-black bg-white hover:bg-gray-50 border border-black/10'
              }
            `}
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-medium text-sm">Back to Home</span>
          </motion.button>
        </div>

        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`
              p-8 rounded-2xl overflow-hidden transition-all duration-500
              ${isDark
                ? 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                : 'bg-white border border-gray-200 shadow-xl'
              }
            `}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className={`
                w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4
                ${isDark ? 'bg-jecrc-red/10' : 'bg-jecrc-red/5'}
              `}>
                <MessageSquare className="w-8 h-8 text-jecrc-red" />
              </div>
              <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Student Support
              </h1>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Submit your issue or question. Our admin team will help you.
              </p>
            </div>

            {/* Support Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Email <span className="text-jecrc-red">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={submitting}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student.email@college.edu"
                  className={`
                    w-full p-4 rounded-xl border outline-none font-medium transition-all
                    ${isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red/50 focus:bg-white/[0.06]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:bg-white'
                    }
                  `}
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Message <span className="text-jecrc-red">*</span>
                </label>
                <textarea
                  required
                  disabled={submitting}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your issue or question in detail (min 10 chars)..."
                  rows="6"
                  className={`
                    w-full p-4 rounded-xl border outline-none font-medium resize-none transition-all
                    ${isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red/50 focus:bg-white/[0.06]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:bg-white'
                    }
                  `}
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {formData.message.length} / 10 characters minimum
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]
                  ${submitting ? 'opacity-70 cursor-wait' : 'hover:scale-[1.01]'}
                  bg-gradient-to-br from-jecrc-red to-jecrc-red-dark text-white hover:shadow-jecrc-red/25
                `}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Support Request
                  </>
                )}
              </button>
            </form>

            <div className={`
              mt-6 p-4 rounded-xl border
              ${isDark
                ? 'bg-blue-900/10 border-blue-800/30'
                : 'bg-blue-50 border-blue-100'
              }
            `}>
              <p className={`text-sm text-center ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                💡 <strong>Tip:</strong> Our admin team monitors support requests in realtime and will respond as soon as possible.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}