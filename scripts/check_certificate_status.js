/**
 * Certificate Status Check Script
 * 
 * This script checks all completed students and their certificate generation status
 * to identify gaps and ensure all eligible students have certificates generated.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => fetch(url, {
        ...options,
        cache: 'no-store',
      }),
    },
  }
);

async function checkCertificateStatus() {
  console.log('🔍 Checking certificate generation status for all completed students...\n');

  try {
    // 1. Get all completed forms
    const { data: completedForms, error: completedError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        course,
        branch,
        status,
        final_certificate_generated,
        certificate_url,
        blockchain_hash,
        blockchain_tx,
        blockchain_verified,
        updated_at,
        created_at,
        no_dues_status (
          department_name,
          status,
          action_at
        )
      `)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (completedError) {
      console.error('❌ Error fetching completed forms:', completedError);
      return;
    }

    console.log(`📊 Found ${completedForms.length} completed forms\n`);

    // 2. Analyze certificate status
    const analysis = {
      totalCompleted: completedForms.length,
      certificatesGenerated: 0,
      certificatesPending: 0,
      certificatesFailed: 0,
      blockchainVerified: 0,
      issues: []
    };

    const detailedStatus = [];

    for (const form of completedForms) {
      const status = {
        formId: form.id,
        registrationNo: form.registration_no,
        studentName: form.student_name,
        course: form.course,
        branch: form.branch,
        completedAt: form.updated_at,
        certificateGenerated: form.final_certificate_generated,
        certificateUrl: form.certificate_url,
        blockchainHash: form.blockchain_hash,
        blockchainTx: form.blockchain_tx,
        blockchainVerified: form.blockchain_verified,
        status: 'unknown',
        issues: []
      };

      // Determine certificate status
      if (form.final_certificate_generated && form.certificate_url) {
        status.status = 'generated';
        analysis.certificatesGenerated++;
        
        if (form.blockchain_verified) {
          analysis.blockchainVerified++;
        }
      } else if (form.final_certificate_generated === false) {
        status.status = 'failed';
        analysis.certificatesFailed++;
        status.issues.push('Certificate generation failed');
      } else {
        status.status = 'pending';
        analysis.certificatesPending++;
        status.issues.push('Certificate not generated');
      }

      // Check for potential issues
      if (!form.certificate_url && form.final_certificate_generated) {
        status.issues.push('Certificate marked as generated but no URL found');
        analysis.issues.push({
          formId: form.id,
          registrationNo: form.registration_no,
          issue: 'Missing certificate URL'
        });
      }

      if (form.blockchain_hash && !form.blockchain_tx) {
        status.issues.push('Blockchain hash exists but no transaction ID');
      }

      detailedStatus.push(status);
    }

    // 3. Print summary
    console.log('📈 CERTIFICATE GENERATION SUMMARY:');
    console.log('=====================================');
    console.log(`Total Completed Students: ${analysis.totalCompleted}`);
    console.log(`✅ Certificates Generated: ${analysis.certificatesGenerated}`);
    console.log(`⏳ Certificates Pending: ${analysis.certificatesPending}`);
    console.log(`❌ Certificates Failed: ${analysis.certificatesFailed}`);
    console.log(`🔗 Blockchain Verified: ${analysis.blockchainVerified}`);
    console.log(`⚠️ Issues Found: ${analysis.issues.length}`);

    const successRate = analysis.totalCompleted > 0 
      ? Math.round((analysis.certificatesGenerated / analysis.totalCompleted) * 100)
      : 0;
    console.log(`📊 Success Rate: ${successRate}%\n`);

    // 4. Print detailed status for pending/failed certificates
    if (analysis.certificatesPending > 0 || analysis.certificatesFailed > 0) {
      console.log('🔍 DETAILED STATUS FOR PENDING/FAILED CERTIFICATES:');
      console.log('==================================================');
      
      detailedStatus
        .filter(status => status.status === 'pending' || status.status === 'failed')
        .forEach(status => {
          console.log(`\n📋 ${status.studentName} (${status.registrationNo})`);
          console.log(`   Status: ${status.status.toUpperCase()}`);
          console.log(`   Course: ${status.course} - ${status.branch}`);
          console.log(`   Completed: ${new Date(status.completedAt).toLocaleString()}`);
          if (status.issues.length > 0) {
            console.log(`   Issues: ${status.issues.join(', ')}`);
          }
        });
    }

    // 5. Print critical issues
    if (analysis.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES REQUIRING ATTENTION:');
      console.log('=======================================');
      analysis.issues.forEach(issue => {
        console.log(`❌ Form ${issue.formId} (${issue.registrationNo}): ${issue.issue}`);
      });
    }

    // 6. Generate SQL queries for fixing issues
    if (analysis.certificatesPending > 0) {
      console.log('\n🔧 SQL QUERIES TO FIX PENDING CERTIFICATES:');
      console.log('==========================================');
      
      const pendingForms = detailedStatus.filter(s => s.status === 'pending');
      console.log('-- Get pending certificate details:');
      console.log(`SELECT id, registration_no, student_name, final_certificate_generated, certificate_url 
FROM no_dues_forms 
WHERE status = 'completed' 
AND (final_certificate_generated IS NULL OR final_certificate_generated = false)
AND id IN (${pendingForms.map(f => f.formId).join(', ')});`);
      
      console.log('\n-- Trigger certificate generation for pending forms:');
      console.log('-- You can use the certificate trigger API or call finalizeCertificate function');
    }

    return {
      analysis,
      detailedStatus,
      successRate
    };

  } catch (error) {
    console.error('❌ Error checking certificate status:', error);
    throw error;
  }
}

// Run the check
if (require.main === module) {
  checkCertificateStatus()
    .then(result => {
      console.log('\n✅ Certificate status check completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Certificate status check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkCertificateStatus };
