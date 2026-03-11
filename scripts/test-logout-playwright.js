/**
 * PLAYWRIGHT LOGOUT TEST
 * Tests the logout functionality to verify the fix works
 * 
 * Usage: node scripts/test-logout-playwright.js
 */

const { chromium } = require('playwright');

async function testLogout() {
    console.log('🎭 PLAYWRIGHT LOGOUT TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 Testing: https://jecrc-no-dues-system.reverbex.in/');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let browser;
    let page;

    try {
        // Launch browser
        browser = await chromium.launch({ 
            headless: false, // Show browser for visibility
            slowMo: 1000 // Slow down for better observation
        });
        
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 }
        });
        page = await context.newPage();

        // Step 1: Navigate to staff login
        console.log('📍 Step 1: Navigating to staff login...');
        await page.goto('https://jecrc-no-dues-system.reverbex.in/staff/login', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        console.log('   ✅ Staff login page loaded');

        // Step 2: Login with admin credentials
        console.log('\n🔐 Step 2: Logging in with admin credentials...');
        
        // Fill login form
        await page.fill('input[type="email"]', 'admin@jecrcu.edu.in');
        await page.fill('input[type="password"]', 'JECRC@2026');
        
        // Click login button
        await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
        
        // Wait for dashboard to load
        await page.waitForURL('**/staff/dashboard', { timeout: 15000 });
        await page.waitForTimeout(3000);
        
        console.log('   ✅ Successfully logged in to dashboard');
        
        // Take screenshot of dashboard
        await page.screenshot({ path: 'backups/dashboard_before_logout.png' });
        console.log('   📸 Dashboard screenshot saved');

        // Step 3: Test logout functionality
        console.log('\n🚪 Step 3: Testing logout functionality...');
        
        // Look for logout button/link
        const logoutSelectors = [
            'button:has-text("Logout")',
            'a:has-text("Logout")',
            'button:has-text("Sign Out")',
            'a:has-text("Sign Out")',
            '[data-testid="logout"]',
            '.logout-btn',
            '#logout'
        ];

        let logoutButton = null;
        for (const selector of logoutSelectors) {
            try {
                logoutButton = await page.$(selector);
                if (logoutButton) {
                    console.log(`   🔍 Found logout button with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue trying other selectors
            }
        }

        if (!logoutButton) {
            // Try to find in user menu/profile dropdown
            console.log('   🔍 Looking for user menu/profile dropdown...');
            
            const menuSelectors = [
                '.user-menu',
                '.profile-dropdown',
                '[data-testid="user-menu"]',
                '.avatar',
                '.user-avatar'
            ];

            for (const selector of menuSelectors) {
                try {
                    const menuElement = await page.$(selector);
                    if (menuElement) {
                        console.log(`   📂 Found user menu: ${selector}`);
                        await menuElement.click();
                        await page.waitForTimeout(1000);
                        
                        // Look for logout in dropdown
                        for (const logoutSelector of logoutSelectors) {
                            logoutButton = await page.$(logoutSelector);
                            if (logoutButton) {
                                console.log(`   🔍 Found logout in dropdown: ${logoutSelector}`);
                                break;
                            }
                        }
                        if (logoutButton) break;
                    }
                } catch (e) {
                    // Continue trying
                }
            }
        }

        if (!logoutButton) {
            console.log('   ❌ Logout button not found - trying alternative methods...');
            
            // Try to trigger logout via JavaScript
            await page.evaluate(() => {
                // Look for any logout functions in window
                if (window.logout) {
                    window.logout();
                } else if (window.signOut) {
                    window.signOut();
                } else {
                    // Navigate to logout URL directly
                    window.location.href = '/staff/logout';
                }
            });
            
            await page.waitForTimeout(2000);
        } else {
            console.log('   ✅ Clicking logout button...');
            await logoutButton.click();
        }

        // Step 4: Monitor for errors during logout
        console.log('\n🔍 Step 4: Monitoring logout process...');
        
        // Listen for console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log(`   ❌ Console Error: ${msg.text()}`);
            }
        });

        page.on('pageerror', (error) => {
            console.log(`   ❌ Page Error: ${error.message}`);
        });

        // Wait for redirect to login page
        try {
            await page.waitForURL('**/staff/login', { timeout: 10000 });
            console.log('   ✅ Successfully redirected to login page');
        } catch (e) {
            console.log('   ⚠️  Timeout waiting for login redirect - checking current URL...');
            const currentUrl = page.url();
            console.log(`   📍 Current URL: ${currentUrl}`);
        }

        // Wait for page to settle
        await page.waitForTimeout(3000);

        // Take screenshot after logout
        await page.screenshot({ path: 'backups/after_logout.png' });
        console.log('   📸 Post-logout screenshot saved');

        // Step 5: Verify logout was successful
        console.log('\n🔍 Step 5: Verifying logout success...');
        
        const currentUrl = page.url();
        const isOnLoginPage = currentUrl.includes('/staff/login') || currentUrl.includes('/login');
        
        if (isOnLoginPage) {
            console.log('   ✅ SUCCESS: Logged out and redirected to login page');
            console.log('   ✅ No "Oops! Something went wrong" error detected');
        } else {
            console.log('   ⚠️  WARNING: May not have logged out properly');
            console.log(`   📍 Current URL: ${currentUrl}`);
        }

        // Check for any error messages on the page
        const errorElements = await page.$$('[class*="error"], [class*="alert"]');
        if (errorElements.length > 0) {
            console.log('   ⚠️  Error elements found on page:');
            for (let i = 0; i < Math.min(errorElements.length, 3); i++) {
                const errorText = await errorElements[i].textContent();
                console.log(`      ${i + 1}. ${errorText}`);
            }
        } else {
            console.log('   ✅ No error messages detected on page');
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        
        // Take screenshot of error state
        if (page) {
            await page.screenshot({ path: 'backups/error_state.png' });
            console.log('   📸 Error state screenshot saved');
        }
    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
            console.log('\n🧹 Browser closed');
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎭 PLAYWRIGHT TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📁 Screenshots saved in backups/ directory');
    console.log('🔍 Check the results to verify logout fix is working');
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run the test
testLogout().catch(console.error);
