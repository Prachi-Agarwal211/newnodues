/**
 * Generate QR Code for No Dues Portal
 * Run: node scripts/generate-qr.js
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../public/qr-code.png');
const WEBSITE_URL = 'https://jecrc-no-dues.reverbex.in';

async function generateQR() {
  try {
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(WEBSITE_URL, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    // Save to public folder
    fs.writeFileSync(OUTPUT_PATH, qrBuffer);
    console.log(`✅ QR Code generated successfully!`);
    console.log(`📍 Saved to: ${OUTPUT_PATH}`);
    console.log(`🔗 URL: ${WEBSITE_URL}`);
    
    // Also output as data URL for direct embedding
    const dataUrl = await QRCode.toDataURL(WEBSITE_URL, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log(`\n📧 Data URL (copy this for HTML embedding):`);
    console.log(dataUrl.substring(0, 80) + '...');
    
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    process.exit(1);
  }
}

generateQR();
