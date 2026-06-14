'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileCheck, Search } from 'lucide-react';
// import PageWrapper from '@/components/landing/PageWrapper'; // Removed to reduce wrapper bloat
import EnhancedActionCard from '@/components/landing/EnhancedActionCard';
import LiquidTitle from '@/components/landing/LiquidTitle';
import Logo from '@/components/ui/Logo';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { useTheme } from '@/contexts/ThemeContext';
import GlobalBackground from '@/components/ui/GlobalBackground'; // Direct import
import ThemeToggle from '@/components/landing/ThemeToggle';
import EnhancedSupportButton from '@/components/landing/EnhancedSupportButton';
import MinimalFooter from '@/components/landing/MinimalFooter';
import Button from '@/components/ui/Button';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();

  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <>
      <GlobalBackground />
      <ThemeToggle />
      <EnhancedSupportButton />

      <div className={`
        min-h-screen flex flex-col items-center justify-start px-4 pt-6 sm:pt-10 pb-4 relative overflow-hidden
        ${isDark ? 'text-white' : 'text-ink-black'}
      `} style={{ overflow: 'hidden' }}>

        {/* Centered Header / Branding */}
        <motion.header
          className="flex flex-col items-center mb-6 sm:mb-8 text-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 sm:mb-6"
          >
            <Logo size="medium" priority={true} />
          </motion.div>

          {/* Enhanced Liquid Title */}
          <LiquidTitle />
        </motion.header>

        {/* Main Content Area with Stagger Animation */}
        <main className="w-full max-w-7xl px-4 sm:px-6 md:px-8 pb-6 sm:pb-10 mt-2 sm:mt-0">
          <StaggerContainer
            staggerDelay={0.15}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-10 items-stretch max-w-4xl mx-auto"
          >
            <StaggerItem>
              <EnhancedActionCard
                index={0}
                title="Submit New Form"
                subtitle="Submit a new no-dues application for semester end or degree completion."
                icon={FileCheck}
                onClick={() => router.push('/student/submit-form')}
              />
            </StaggerItem>
            <StaggerItem>
              <EnhancedActionCard
                index={1}
                title="Check Status"
                subtitle="Track the status of your no dues application using your registration number."
                icon={Search}
                onClick={() => router.push('/student/check-status')}
              />
            </StaggerItem>
          </StaggerContainer>
        </main>

        {/* Minimal Footer with Fade-in Animation */}
        <MinimalFooter />
      </div>
    </>
  );
}
