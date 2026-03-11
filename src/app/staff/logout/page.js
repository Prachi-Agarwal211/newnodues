/**
 * STAFF LOGOUT PAGE
 * Handles client-side logout and redirects to login
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        console.log('🚪 Performing staff logout...');

        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.log('⚠️ Supabase logout error:', error.message);
        } else {
          console.log('✅ Successfully signed out from Supabase');
        }

        // Call logout API to clear server-side session
        try {
          const response = await fetch('/api/staff/logout', {
            method: 'POST',
            credentials: 'include'
          });

          if (response.ok) {
            console.log('✅ Server logout successful');
          } else {
            console.log('⚠️ Server logout response:', response.status);
          }
        } catch (apiError) {
          console.log('⚠️ API logout error:', apiError.message);
        }

        // Always redirect to login page
        console.log('🔄 Redirecting to /staff/login');
        router.push('/staff/login');
        
      } catch (error) {
        console.error('❌ Logout error:', error.message);
        // Even if there's an error, redirect to login
        router.push('/staff/login');
      }
    };

    // Perform logout immediately
    performLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Logging out...</h2>
        <p className="text-gray-500">Please wait while we sign you out.</p>
      </div>
    </div>
  );
}
