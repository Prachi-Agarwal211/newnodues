import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCertificate, verifyQRData } from '@/lib/blockchainService';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/certificate/verify
 * Verify a certificate using QR code data
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: 'QR data is required' },
        { status: 400 }
      );
    }

    // Parse QR data (it's JSON string)
    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid QR code format',
          message: 'This does not appear to be a valid JECRC certificate QR code'
        },
        { status: 400 }
      );
    }

    // Verify QR data structure
    const qrVerification = verifyQRData(parsedData);
    if (!qrVerification.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid QR code structure',
          message: qrVerification.error
        },
        { status: 400 }
      );
    }

    const { formId, transactionId, hash } = qrVerification;

    // Fetch certificate data from database
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
        blockchain_hash,
        blockchain_tx,
        blockchain_block,
        blockchain_timestamp,
        blockchain_verified,
        final_certificate_generated,
        created_at,
        updated_at
      `)
      .eq('id', formId)
      .single();

    if (formError || !formData) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Certificate not found',
          message: 'No certificate found with this ID in our database'
        },
        { status: 404 }
      );
    }

    // Check if certificate has blockchain data
    if (!formData.blockchain_hash || !formData.blockchain_tx) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Certificate not blockchain-secured',
          message: 'This certificate does not have blockchain verification'
        },
        { status: 400 }
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid QR code structure',
          message: 'Missing transaction ID in QR code'
        },
        { status: 400 }
      );
    }

    // Verify transaction ID matches
    if (formData.blockchain_tx !== transactionId) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Transaction ID mismatch',
          message: 'The QR code transaction ID does not match our records',
          tamperedFields: ['transactionId']
        },
        { status: 400 }
      );
    }

    // Verify QR short hash matches stored hash prefix
    if (hash && formData.blockchain_hash && !formData.blockchain_hash.startsWith(hash)) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Hash mismatch',
          message: 'The QR code hash does not match our records',
          tamperedFields: ['hash']
        },
        { status: 400 }
      );
    }

    // Verify blockchain hash by recalculating
    const certificateData = {
      studentName: formData.student_name,
      registrationNo: formData.registration_no,
      course: formData.course,
      branch: formData.branch,
      admissionYear: formData.admission_year,
      passingYear: formData.passing_year,
      formId: formData.id
    };

    const verification = await verifyCertificate(certificateData, formData.blockchain_hash);

    if (!verification.valid) {
      // Log tampering attempt
      await logVerificationAttempt({
        formId,
        transactionId,
        result: 'TAMPERED',
        tamperedFields: verification.tamperedFields,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        {
          valid: false,
          error: 'Certificate has been tampered with',
          message: 'The certificate data does not match the blockchain hash',
          tamperedFields: verification.tamperedFields,
          severity: 'HIGH'
        },
        { status: 400 }
      );
    }

    // Fetch verification history count
    const { count: verificationCount } = await supabaseAdmin
      .from('certificate_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);

    // Log successful verification
    await logVerificationAttempt({
      formId,
      transactionId,
      result: 'VALID',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Return success with full details
    return NextResponse.json({
      valid: true,
      message: 'Certificate is authentic and has not been tampered with',
      certificate: {
        studentName: formData.student_name,
        registrationNo: formData.registration_no,
        course: formData.course,
        branch: formData.branch,
        admissionYear: formData.admission_year,
        passingYear: formData.passing_year,
        certificateUrl: formData.certificate_url,
        issueDate: formData.updated_at,
        transactionId: formData.blockchain_tx,
        blockNumber: formData.blockchain_block,
        blockchainTimestamp: formData.blockchain_timestamp,
        verificationCount: verificationCount + 1
      },
      blockchain: {
        hash: formData.blockchain_hash,
        transactionId: formData.blockchain_tx,
        blockNumber: formData.blockchain_block,
        timestamp: formData.blockchain_timestamp,
        verified: formData.blockchain_verified
      },
      verification: {
        timestamp: new Date().toISOString(),
        method: 'QR_SCAN',
        hashMatch: true,
        transactionMatch: true
      }
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/certificate/verify?formId=xxx
 * Get verification history for a certificate
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Fetch verification history
    const { data: verifications, error } = await supabaseAdmin
      .from('certificate_verifications')
      .select('*')
      .eq('form_id', formId)
      .order('verified_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    // Fetch certificate info with department statuses
    const { data: formData, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        student_name, 
        registration_no, 
        blockchain_tx, 
        updated_at,
        no_dues_status (
          department_name,
          status,
          action_at
        )
      `)
      .eq('id', formId)
      .single();

    if (formError) {
      throw formError;
    }

    return NextResponse.json({
      success: true,
      certificate: formData,
      departmentStatuses: formData.no_dues_status || [],
      verifications: verifications || [],
      totalVerifications: verifications?.length || 0
    });

  } catch (error) {
    console.error('Error fetching verification history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification history' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log verification attempts
 */
async function logVerificationAttempt({ formId, transactionId, result, tamperedFields, ipAddress }) {
  try {
    await supabaseAdmin
      .from('certificate_verifications')
      .insert({
        form_id: formId,
        transaction_id: transactionId,
        verification_result: result,
        tampered_fields: tamperedFields,
        verified_by_ip: ipAddress,
        verified_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging verification attempt:', error);
    // Don't throw - logging failure shouldn't break verification
  }
}
