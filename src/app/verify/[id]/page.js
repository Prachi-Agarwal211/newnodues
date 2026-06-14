'use client';

import { createClient } from '@supabase/supabase-js';
import { Shield, CheckCircle, XCircle, AlertTriangle, Calendar, Clock, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyCertificate(formId) {
  try {
    const { data: formData, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        admission_year,
        passing_year,
        certificate_url,
        final_certificate_generated,
        certificate_generated_at,
        updated_at,
        created_at,
        status,
        no_dues_status (
          department_name,
          status,
          action_at
        )
      `)
      .eq('id', formId)
      .single();

    if (formError || !formData) {
      return { valid: false, error: 'Certificate not found in our database', message: 'No certificate found with this ID' };
    }

    if (!formData.final_certificate_generated || !formData.certificate_url) {
      return {
        valid: false,
        error: 'Certificate not yet generated',
        message: 'This certificate has not been generated yet. Please wait for all departments to approve the No Dues request.'
      };
    }

    const { count: verificationCount } = await supabaseAdmin
      .from('certificate_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);

    const certificate = {
      studentName: formData.student_name,
      registrationNo: formData.registration_no,
      course: formData.course || 'N/A',
      branch: formData.branch || 'N/A',
      admissionYear: formData.admission_year || 'N/A',
      passingYear: formData.passing_year || 'N/A',
      issueDate: formData.certificate_generated_at || formData.updated_at,
      certificateUrl: formData.certificate_url,
      verificationCount: verificationCount || 0,
      departmentStatuses: formData.no_dues_status || []
    };

    return { valid: true, certificate, message: 'Certificate is authentic and verified' };
  } catch (err) {
    console.error('Verification error:', err);
    return { valid: false, error: err.message, message: 'Failed to verify certificate' };
  }
}

async function logVerificationAttempt({ formId, result }) {
  try {
    await supabaseAdmin
      .from('certificate_verifications')
      .insert({
        form_id: formId,
        verification_result: result,
        verified_by_ip: 'server-side',
        verified_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging verification:', error);
  }
}

export default async function PublicVerifyPage({ params }) {
  const { id: formId } = params;
  const result = await verifyCertificate(formId);

  logVerificationAttempt({ formId, result: result.valid ? 'VALID' : 'INVALID' });

  const certificate = result.certificate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-red-600 dark:text-red-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">JECRC University</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Certificate Verification System</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {!result.valid ? (
          <div className="space-y-6">
            <div className="rounded-xl shadow-lg p-8 bg-red-50 dark:bg-red-900/20 border-2 border-red-500">
              <div className="flex items-start gap-4">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-100">✗ Verification Failed</h2>
                  <p className="text-lg text-red-700 dark:text-red-300">{result.message}</p>
                </div>
              </div>
            </div>

            {result.error && result.error !== result.message && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Verification Details</h3>
                    <p className="text-slate-700 dark:text-slate-300">{result.error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl p-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">About Certificate Verification</h4>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2"><span className="text-red-600 mt-0.5">•</span><span>All JECRC University No Dues Certificates are digitally signed and verified</span></li>
                <li className="flex items-start gap-2"><span className="text-red-600 mt-0.5">•</span><span>Each certificate has a unique QR code for instant verification</span></li>
                <li className="flex items-start gap-2"><span className="text-red-600 mt-0.5">•</span><span>For assistance, contact the Registration Office at JECRC University</span></li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl shadow-lg p-8 bg-green-50 dark:bg-green-900/20 border-2 border-green-500">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2 text-green-900 dark:text-green-100">✓ Certificate Verified</h2>
                  <p className="text-lg text-green-700 dark:text-green-300">{result.message}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                    <Shield className="w-4 h-4" />
                    <span>This certificate is authentic and has been issued by JECRC University</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-red-600" />
                Certificate Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Student Name</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{certificate.studentName}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Registration Number</p>
                  <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white">{certificate.registrationNo}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Course</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{certificate.course}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Branch</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{certificate.branch}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Issue Date
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {new Date(certificate.issueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Times Verified
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {certificate.verificationCount} {certificate.verificationCount === 1 ? 'time' : 'times'}
                  </p>
                </div>
              </div>

              {certificate.departmentStatuses && certificate.departmentStatuses.length > 0 && (
                <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Departmental Clearance Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {certificate.departmentStatuses.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                        <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                          {dept.department_name ? dept.department_name.replace(/_/g, ' ') : 'Department'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          dept.status === 'approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : dept.status === 'rejected'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {dept.status === 'approved' ? 'CLEARED' : (dept.status || 'PENDING').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {certificate.certificateUrl && (
                <div className="mt-6">
                  <a href={certificate.certificateUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Certificate
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">© {new Date().getFullYear()} JECRC University. All rights reserved.</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Certificate Verification System v2.0</p>
        </div>
      </div>
    </div>
  );
}