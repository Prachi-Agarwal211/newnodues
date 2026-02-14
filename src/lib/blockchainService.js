/**
 * blockchainService.js
 * Handles certificate verification and QR code generation
 * Note: This is a placeholder for future blockchain integration
 * Currently uses database-backed verification
 */

import crypto from 'crypto';

// Production URL - Hardcoded for reliability
const PRODUCTION_URL = 'https://newnodues.vercel.app';

/**
 * Generate QR data for certificate
 * @param {Object} blockchainRecord - Blockchain record with transaction info
 * @param {Object} certificateData - Certificate information (formId, registrationNo, studentName)
 * @returns {Object} QR code data object
 */
export function generateQRData(blockchainRecord, certificateData) {
  const { formId, registrationNo, studentName } = certificateData;

  // Create verification URL with form ID
  const verificationUrl = `${PRODUCTION_URL}/verify/${formId}`;

  return {
    url: verificationUrl,
    id: formId,
    regNo: registrationNo,
    name: studentName,
    txId: blockchainRecord.transactionId,
    hash: blockchainRecord.certificateHash.substring(0, 16), // Shortened hash for QR
    timestamp: Date.now()
  };
}

/**
 * Verify certificate authenticity by comparing stored hash
 * @param {Object} certificateData - Certificate data to verify
 * @param {string} storedHash - Hash stored in database
 * @returns {Object} Verification result
 */
export function verifyCertificate(certificateData, storedHash) {
  try {
    // Recalculate hash from certificate data
    // IMPORTANT: Must match the structure in generateCertificateHash() exactly
    const dataToHash = {
      student_id: certificateData.formId,
      registration_no: certificateData.registrationNo,
      full_name: certificateData.studentName,
      course: certificateData.course,
      branch: certificateData.branch,
      status: 'completed'
      // NOTE: completed_at is intentionally excluded to match generateCertificateHash
    };

    const dataString = JSON.stringify(dataToHash);
    const computedHash = crypto.createHash('sha256').update(dataString).digest('hex');

    // Compare first 64 chars (full SHA256)
    const hashMatch = computedHash === storedHash;

    if (!hashMatch) {
      return {
        valid: false,
        message: 'Certificate data has been tampered with',
        tamperedFields: ['hash_mismatch']
      };
    }

    return {
      valid: true,
      message: 'Certificate is authentic and valid'
    };

  } catch (error) {
    console.error('[blockchainService] Verification error:', error);
    return {
      valid: false,
      message: 'Verification failed due to technical error'
    };
  }
}

/**
 * Verify QR code data structure (synchronous validation)
 * @param {Object} parsedData - Parsed QR code data object
 * @returns {Object} Validation result
 */
export function verifyQRData(parsedData) {
  try {
    // Check for required fields based on our QR data structure
    const { id, url, hash, timestamp, txId } = parsedData;

    // Check required fields
    if (!id) {
      return {
        valid: false,
        error: 'Missing certificate ID in QR code'
      };
    }

    if (!hash) {
      return {
        valid: false,
        error: 'Missing hash in QR code'
      };
    }

    if (!timestamp) {
      return {
        valid: false,
        error: 'Missing timestamp in QR code'
      };
    }

    // Check if timestamp is reasonable (not in future)
    const now = Date.now();
    const qrAge = now - timestamp;

    if (qrAge < -60000) { // Allow 1 minute clock skew
      return {
        valid: false,
        error: 'QR code timestamp is in the future'
      };
    }

    // NOTE: Removed 2-year expiry check - certificates are permanent documents
    // QR codes should remain valid indefinitely for archival purposes

    // Extract formId from the id field or url
    let formId = id;
    if (url && url.includes('/verify/')) {
      const urlParts = url.split('/verify/');
      if (urlParts[1]) {
        formId = urlParts[1].split('?')[0];
      }
    }

    return {
      valid: true,
      formId,
      transactionId: txId,
      hash
    };

  } catch (error) {
    console.error('[blockchainService] QR validation error:', error);
    return {
      valid: false,
      error: 'QR code validation failed'
    };
  }
}

/**
 * Generate certificate hash for blockchain
 * @param {Object} certificateData - Certificate data
 * @returns {string} SHA-256 hash
 */
export function generateCertificateHash(certificateData) {
  // Generate consistent hash WITHOUT completed_at to avoid timestamp mismatches
  // This hash is used for tamper detection, not time validation
  const dataString = JSON.stringify({
    student_id: certificateData.student_id,
    registration_no: certificateData.registration_no,
    full_name: certificateData.full_name,
    course: certificateData.course,
    branch: certificateData.branch,
    status: certificateData.status
    // NOTE: completed_at is intentionally excluded for consistency
  });

  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Generate blockchain transaction ID
 * @returns {string} Unique transaction ID
 */
export function generateTransactionId() {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `JECRC-TX-${timestamp}-${randomBytes}`;
}

/**
 * Create blockchain record for certificate
 * @param {Object} certificateData - Certificate data
 * @returns {Promise<Object>} Blockchain record
 */
export async function createBlockchainRecord(certificateData) {
  try {
    // Generate certificate hash
    const certificateHash = generateCertificateHash(certificateData);

    // Generate transaction ID
    const transactionId = generateTransactionId();

    // Generate block number (simulated)
    const blockNumber = Math.floor(Date.now() / 1000);

    // Create blockchain record
    const blockchainRecord = {
      success: true,
      certificateHash,
      transactionId,
      blockNumber,
      timestamp: new Date().toISOString(),
      studentData: {
        student_id: certificateData.student_id,
        registration_no: certificateData.registration_no,
        full_name: certificateData.full_name,
        course: certificateData.course,
        branch: certificateData.branch
      },
      department_statuses: certificateData.department_statuses || []
    };

    console.log('[blockchainService] Blockchain record created:', transactionId);

    return blockchainRecord;
  } catch (error) {
    console.error('[blockchainService] Error creating blockchain record:', error);
    throw new Error('Failed to create blockchain record');
  }
}

/**
 * Future: Store certificate hash on blockchain
 * Currently a placeholder for future blockchain integration
 */
export async function storeOnBlockchain(certificateData) {
  // Blockchain storage - Currently using simulated ledger
  // Future: Integrate with Ethereum/Polygon for production
  console.log('[blockchainService] Blockchain storage not yet implemented for:', certificateData.id);
  return { success: true, txHash: 'mock-tx-hash' };
}