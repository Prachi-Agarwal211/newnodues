/**
 * STAFF LOGOUT API
 * Handles logout requests and redirects to staff login
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log('🚪 Staff logout API called');

    // Get the session token from cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (accessToken || refreshToken) {
      try {
        // Sign out from Supabase
        const { error } = await supabase.auth.admin.signOut(
          accessToken ? { access_token: accessToken } : { refresh_token: refreshToken }
        );

        if (error) {
          console.log('⚠️ Supabase logout error:', error.message);
          // Continue with clearing cookies even if Supabase logout fails
        } else {
          console.log('✅ Successfully signed out from Supabase');
        }
      } catch (signOutError) {
        console.log('⚠️ Error during Supabase sign out:', signOutError.message);
      }
    }

    // Clear all auth cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
      'supabase.auth.refreshToken',
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url'
    ];

    const response = NextResponse.redirect(new URL('/staff/login', request.url), {
      status: 302
    });

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });

    console.log('✅ Staff logout completed, redirecting to /staff/login');
    return response;

  } catch (error) {
    console.error('❌ Staff logout API error:', error.message);
    
    // Even if there's an error, try to redirect to login
    const response = NextResponse.redirect(new URL('/staff/login', request.url), {
      status: 302
    });

    // Clear cookies on error as well
    response.cookies.set('sb-access-token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;
  }
}

export async function GET(request) {
  // Handle GET requests the same way as POST
  return POST(request);
}
