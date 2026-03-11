/**
 * FINAL PLAYWRIGHT LOGOUT TEST
 * Tests the complete logout functionality with new endpoint
 * 
 * Usage: node scripts/test-logout-final.js
 */

const { chromium } = require('playwright');

async function testLogout() {
    console.log('🎭 FINAL PLAYWRIGHT LOGOUT TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 Testing: https://jecrc-no-dues-system.reverbex.in/');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let browser;
    let page;

    try {
        // Launch browser
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 500
        });
        
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 }
        });
        page = await context.newPage();

        // Monitor for errors
        let logoutErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const errorText = msg.text();
                console.log(`   ❌ Console: ${errorText}`);
                if (errorText.includes('Oops') || errorText.includes('Something went wrong')) {
                    logoutErrors.push(errorText);
                }
            }
        });

        page.on('pageerror', (error) => {
            const errorText = error.message;
            console.log(`   ❌ Page: ${errorText}`);
            if (errorText.includes('Oops') || errorText.includes('Something went wrong')) {
                logoutErrors.push(errorText);
            }
        });

        // Step 1: Login
        console.log('📍 Step 1: Logging in...');
        await page.goto('https://jecrc-no-dues-system.reverbex.in/staff/login');
        await page.waitForTimeout(2000);
        
        await page.fill('input[type="email"]', 'admin@jecrcu.edu.in');
        await page.fill('input[type="password"]', 'JECRC@2026');
        await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
        
        await page.waitForTimeout(3000);
        console.log(`   ✅ Logged in to: ${page.url()}`);

        // Step 2: Test direct logout navigation
        console.log('\n🚪 Step 2: Testing direct logout navigation...');
        
        // Take screenshot before logout
        await page.screenshot({ path: 'backups/before_final_logout.png' });
        
        // Navigate to logout page
        const startTime = Date.now();
        await page.goto('https://jecrc-no-dues-system.reverbex.in/staff/logout');
        
        // Wait for redirect to login page
        try {
            await page.waitForURL('**/staff/login', { timeout: 10000 });
            const logoutTime = Date.now() - startTime;
            console.log(`   ✅ Logout redirect successful in ${logoutTime}ms`);
            
            // Wait for page to load
            await page.waitForTimeout(2000);
            
            // Take screenshot after logout
            await page.screenshot({ path: 'backups/after_final_logout.png' });
            console.log('   📸 Post-logout screenshot saved');
            
            // Verify we're on login page
            const finalUrl = page.url();
            const isOnLoginPage = finalUrl.includes('/staff/login');
            
            console.log(`   📍 Final URL: ${finalUrl}`);
            console.log(`   🎯 On login page: ${isOnLoginPage}`);
            console.log(`   ⏱️  Logout time: ${logoutTime}ms`);
            console.log(`   ❌ Errors detected: ${logoutErrors.length}`);
            
            // Check page title
            const title = await page.title();
            console.log(`   📄 Page title: ${title}`);
            
            // Look for login form elements
            const emailInput = await page.$('input[type="email"]');
            const passwordInput = await page.$('input[type="password"]');
            const loginButton = await page.$('button[type="submit"]');
            
            console.log(`   📧 Email input found: ${emailInput ? 'Yes' : 'No'}`);
            console.log(`   🔒 Password input found: ${passwordInput ? 'Yes' : 'No'}`);
            console.log(`   🔑 Login button found: ${loginButton ? 'Yes' : 'No'}`);
            
            // Final assessment
            console.log('\n📊 FINAL ASSESSMENT:');
            if (isOnLoginPage && logoutErrors.length === 0 && emailInput && passwordInput) {
                console.log('   ✅ SUCCESS: Logout completed successfully!');
                console.log('   ✅ Redirected to /staff/login');
                console.log('   ✅ Login page is properly loaded');
                console.log('   ✅ No "Oops! Something went wrong" messages');
                console.log('   ✅ Your logout fix is working perfectly!');
            } else {
                console.log('   ⚠️  PARTIAL SUCCESS: Some issues detected');
                if (!isOnLoginPage) console.log('   ❌ Not redirected to login page');
                if (logoutErrors.length > 0) console.log(`   ❌ Errors: ${logoutErrors.join(', ')}`);
                if (!emailInput || !passwordInput) console.log('   ❌ Login form not fully loaded');
            }
            
        } catch (e) {
            console.log(`   ❌ Logout redirect failed: ${e.message}`);
            
            // Check current URL
            const currentUrl = page.url();
            console.log(`   📍 Current URL: ${currentUrl}`);
            
            // Take screenshot of error state
            await page.screenshot({ path: 'backups/logout_error_state.png' });
            console.log('   📸 Error state screenshot saved');
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        
        if (page) {
            await page.screenshot({ path: 'backups/test_final_error.png' });
            console.log('   📸 Error screenshot saved');
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🧹 Browser closed');
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎭 FINAL PLAYWRIGHT TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📁 Screenshots saved in backups/ directory');
    console.log('🔍 Logout should now redirect to /staff/login');
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run the test
testLogout().catch(console.error);
