/**
 * TEST LOGOUT API DIRECTLY
 * Tests the logout API endpoint directly
 * 
 * Usage: node scripts/test-logout-api.js
 */

const https = require('https');
const http = require('http');

async function testLogoutAPI() {
    console.log('🔌 TESTING LOGOUT API DIRECTLY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 Testing: https://jecrc-no-dues-system.reverbex.in/api/staff/logout');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const url = 'https://jecrc-no-dues-system.reverbex.in/api/staff/logout';
    
    try {
        console.log('📍 Step 1: Testing GET request to logout API...');
        
        // Make GET request
        const response = await new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            
            const req = lib.request(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.end();
        });
        
        console.log(`   📊 Status Code: ${response.statusCode}`);
        console.log(`   📍 Location Header: ${response.headers.location || 'None'}`);
        console.log(`   📄 Content-Type: ${response.headers['content-type'] || 'None'}`);
        
        if (response.statusCode === 302 || response.statusCode === 301) {
            const redirectUrl = response.headers.location;
            console.log(`   ✅ Redirect found: ${redirectUrl}`);
            
            if (redirectUrl && redirectUrl.includes('/staff/login')) {
                console.log('   ✅ SUCCESS: Redirects to /staff/login');
            } else {
                console.log(`   ⚠️  Redirects to: ${redirectUrl} (expected /staff/login)`);
            }
        } else if (response.statusCode === 404) {
            console.log('   ❌ FAILURE: API endpoint not found (404)');
        } else if (response.statusCode === 500) {
            console.log('   ❌ FAILURE: Server error (500)');
        } else {
            console.log(`   ⚠️  Unexpected status: ${response.statusCode}`);
            console.log(`   📄 Response body: ${response.body.substring(0, 200)}...`);
        }

        console.log('\n📍 Step 2: Testing POST request to logout API...');
        
        // Make POST request
        const postResponse = await new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            
            const req = lib.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.write(JSON.stringify({}));
            req.end();
        });
        
        console.log(`   📊 Status Code: ${postResponse.statusCode}`);
        console.log(`   📍 Location Header: ${postResponse.headers.location || 'None'}`);
        
        if (postResponse.statusCode === 302 || postResponse.statusCode === 301) {
            const redirectUrl = postResponse.headers.location;
            console.log(`   ✅ POST Redirect found: ${redirectUrl}`);
            
            if (redirectUrl && redirectUrl.includes('/staff/login')) {
                console.log('   ✅ SUCCESS: POST redirects to /staff/login');
            } else {
                console.log(`   ⚠️  POST redirects to: ${redirectUrl} (expected /staff/login)`);
            }
        } else if (postResponse.statusCode === 404) {
            console.log('   ❌ FAILURE: POST API endpoint not found (404)');
        } else {
            console.log(`   ⚠️  POST Unexpected status: ${postResponse.statusCode}`);
        }

    } catch (error) {
        console.error('❌ API Test Error:', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔌 API TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 If API shows 404, the Next.js server needs to be restarted');
    console.log('💡 If API shows 302 redirect to /staff/login, it\'s working correctly');
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run the test
testLogoutAPI().catch(console.error);
