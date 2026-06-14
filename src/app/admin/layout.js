import PageWrapper from '@/components/landing/PageWrapper';

// Force dynamic rendering to prevent static export errors
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Admin Dashboard | JECRC UNIVERSITY NO DUES',
  description: 'Administrative control panel for JECRC UNIVERSITY NO DUES System',
};

export default function AdminLayout({ children }) {
  return (
    <PageWrapper showThemeToggle={false} showSupportButton={false}>
      {children}
    </PageWrapper>
  );
}
