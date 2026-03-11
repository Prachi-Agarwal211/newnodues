/**
 * QR CODE GENERATOR SCRIPT
 * Generates QR code for the JECRC No Dues System
 * 
 * Usage: node scripts/generate-qr-code.js
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jecrc-no-dues-system.reverbex.in/';

console.log('🔳 QR CODE GENERATOR');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🌐 Site URL: ${SITE_URL}`);
console.log('═══════════════════════════════════════════════════════════════\n');

async function generateQRCode() {
    try {
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'public', 'qr-codes');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 Created directory: ${outputDir}`);
        }

        // Generate different QR code formats
        const qrOptions = {
            errorCorrectionLevel: 'H', // High error correction
            type: 'png',
            quality: 0.92,
            margin: 2,
            color: {
                dark: '#000000', // Black dots
                light: '#FFFFFF' // White background
            },
            width: 300
        };

        // 1. Standard QR Code (300x300)
        const qrCodePath1 = path.join(outputDir, 'jecrc-no-dues-300.png');
        await QRCode.toFile(qrCodePath1, SITE_URL, qrOptions);
        console.log(`✅ Generated: ${qrCodePath1}`);

        // 2. Large QR Code (500x500)
        const qrOptionsLarge = { ...qrOptions, width: 500 };
        const qrCodePath2 = path.join(outputDir, 'jecrc-no-dues-500.png');
        await QRCode.toFile(qrCodePath2, SITE_URL, qrOptionsLarge);
        console.log(`✅ Generated: ${qrCodePath2}`);

        // 3. Small QR Code (150x150)
        const qrOptionsSmall = { ...qrOptions, width: 150 };
        const qrCodePath3 = path.join(outputDir, 'jecrc-no-dues-150.png');
        await QRCode.toFile(qrCodePath3, SITE_URL, qrOptionsSmall);
        console.log(`✅ Generated: ${qrCodePath3}`);

        // 4. SVG format (scalable)
        const qrCodePath4 = path.join(outputDir, 'jecrc-no-dues.svg');
        await QRCode.toFile(qrCodePath4, SITE_URL, {
            type: 'svg',
            errorCorrectionLevel: 'H',
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        console.log(`✅ Generated: ${qrCodePath4}`);

        // 5. Generate base64 data URL for web use
        const qrDataURL = await QRCode.toDataURL(SITE_URL, {
            errorCorrectionLevel: 'H',
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Save data URL to file
        const dataURLPath = path.join(outputDir, 'qr-data-url.txt');
        fs.writeFileSync(dataURLPath, qrDataURL);
        console.log(`✅ Generated: ${dataURLPath}`);

        // Create HTML preview file
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JECRC No Dues System - QR Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
        }
        .qr-container {
            margin: 20px 0;
            padding: 20px;
            border: 2px solid #ddd;
            border-radius: 10px;
            background: #f9f9f9;
        }
        .qr-code {
            margin: 20px auto;
        }
        .url {
            font-size: 18px;
            color: #0066cc;
            margin: 10px 0;
            word-break: break-all;
        }
        .sizes {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
            margin: 20px 0;
        }
        .size-item {
            text-align: center;
        }
        .size-item img {
            border: 1px solid #ddd;
            padding: 10px;
            background: white;
        }
        .download-btn {
            background: #0066cc;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 5px;
        }
        .download-btn:hover {
            background: #0052a3;
        }
    </style>
</head>
<body>
    <h1>🔳 JECRC No Dues System - QR Code</h1>
    
    <div class="qr-container">
        <h2>Scan to Access JECRC No Dues System</h2>
        <div class="url">🌐 ${SITE_URL}</div>
        
        <div class="qr-code">
            <img src="${qrDataURL}" alt="JECRC No Dues System QR Code" style="max-width: 300px;">
        </div>
    </div>

    <div class="sizes">
        <div class="size-item">
            <h3>Small (150x150)</h3>
            <img src="/qr-codes/jecrc-no-dues-150.png" alt="Small QR Code">
            <br>
            <a href="/qr-codes/jecrc-no-dues-150.png" class="download-btn" download>Download</a>
        </div>
        
        <div class="size-item">
            <h3>Medium (300x300)</h3>
            <img src="/qr-codes/jecrc-no-dues-300.png" alt="Medium QR Code">
            <br>
            <a href="/qr-codes/jecrc-no-dues-300.png" class="download-btn" download>Download</a>
        </div>
        
        <div class="size-item">
            <h3>Large (500x500)</h3>
            <img src="/qr-codes/jecrc-no-dues-500.png" alt="Large QR Code">
            <br>
            <a href="/qr-codes/jecrc-no-dues-500.png" class="download-btn" download>Download</a>
        </div>
        
        <div class="size-item">
            <h3>SVG (Scalable)</h3>
            <img src="/qr-codes/jecrc-no-dues.svg" alt="SVG QR Code" style="max-width: 200px;">
            <br>
            <a href="/qr-codes/jecrc-no-dues.svg" class="download-btn" download>Download</a>
        </div>
    </div>

    <div class="qr-container">
        <h3>📱 How to Use</h3>
        <p>1. Open your phone's camera or QR code scanner app</p>
        <p>2. Point it at any of the QR codes above</p>
        <p>3. Tap the link that appears to open the JECRC No Dues System</p>
        <p>4. Log in with your credentials</p>
    </div>

    <div class="qr-container">
        <h3>🔧 Technical Details</h3>
        <p><strong>Error Correction:</strong> High (H) - Can withstand up to 30% damage</p>
        <p><strong>Format:</strong> PNG (150px, 300px, 500px) and SVG (scalable)</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

        const htmlPath = path.join(outputDir, 'qr-preview.html');
        fs.writeFileSync(htmlPath, htmlContent);
        console.log(`✅ Generated: ${htmlPath}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ QR CODE GENERATION COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`🌐 URL: ${SITE_URL}`);
        console.log(`📁 Output Directory: ${outputDir}`);
        console.log('\n📁 Files Generated:');
        console.log('   • jecrc-no-dues-150.png (Small)');
        console.log('   • jecrc-no-dues-300.png (Medium)');
        console.log('   • jecrc-no-dues-500.png (Large)');
        console.log('   • jecrc-no-dues.svg (Scalable)');
        console.log('   • qr-data-url.txt (Base64 for web)');
        console.log('   • qr-preview.html (Preview page)');
        console.log('\n🔗 You can access the preview at:');
        console.log(`   https://jecrc-no-dues-system.reverbex.in/qr-codes/qr-preview.html`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error generating QR code:', error.message);
    }
}

generateQRCode();
