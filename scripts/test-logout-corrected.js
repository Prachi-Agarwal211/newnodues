/**
 * CORRECTED PLAYWRIGHT LOGOUT TEST
 * Tests the logout functionality with proper URL handling
 * 
 * Usage: node scripts/test-logout-corrected.js
 */

const { chromium } = require('playwright');

async function testLogout() {
    console.log('🎭 CORRECTED PLAYWRIGHT LOGOUT TEST');
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
        
        // Wait for redirect (could be /admin or /staff/dashboard)
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`   ✅ Logged in, redirected to: ${currentUrl}`);

        // Take screenshot of dashboard
        await page.screenshot({ path: 'backups/dashboard_before_logout.png' });
        console.log('   📸 Dashboard screenshot saved');

        // Step 3: Test logout functionality
        console.log('\n🚪 Step 3: Testing logout functionality...');
        
        // Set up error monitoring
        let errorDetected = false;
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log(`   ❌ Console Error: ${msg.text()}`);
                if (msg.text().includes('Oops') || msg.text().includes('Something went wrong')) {
                    errorDetected = true;
                }
            }
        });

        page.on('pageerror', (error) => {
            console.log(`   ❌ Page Error: ${error.message}`);
            if (error.message.includes('Oops') || error.message.includes('Something went wrong')) {
                errorDetected = true;
            }
        });

        // Look for logout button
        console.log('   🔍 Looking for logout button...');
        
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
                    console.log(`   🔍 Found logout button: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue trying
            }
        }

        // If no direct logout button, try user menu
        if (!logoutButton) {
            console.log('   🔍 Looking for user menu...');
            
            const menuSelectors = [
                '.user-menu',
                '.profile-dropdown',
                '[data-testid="user-menu"]',
                '.avatar',
                '.user-avatar',
                'button[aria-label*="menu"]',
                'button[aria-label*="profile"]'
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

        // Try alternative logout methods
        if (!logoutButton) {
            console.log('   🔍 Trying alternative logout methods...');
            
            // Look for any element with logout text
            const logoutElements = await page.$$('text=Logout');
            if (logoutElements.length > 0) {
                logoutButton = logoutElements[0];
                console.log('   🔍 Found logout text element');
            }
            
            // Look for sign out
            if (!logoutButton) {
                const signOutElements = await page.$$('text=Sign Out');
                if (signOutElements.length > 0) {
                    logoutButton = signOutElements[0];
                    console.log('   🔍 Found Sign Out text element');
                }
            }
        }

        // Execute logout
        if (logoutButton) {
            console.log('   ✅ Clicking logout button...');
            await logoutButton.click();
        } else {
            console.log('   ⚠️  Logout button not found, trying direct navigation...');
            
            // Try direct logout URL
            await page.goto('https://jecrc-no-dues-system.reverbex.in/staff/logout', {
                waitUntil: 'networkidle',
                timeout: 10000
            });
        }

        // Step 4: Monitor logout process
        console.log('\n🔍 Step 4: Monitoring logout process...');
        
        // Wait for redirect or timeout
        let logoutSuccess = false;
        try {
            await page.waitForFunction(() => {
                const url = window.location.href;
                return url.includes('/staff/login') || url.includes('/login') || url.includes('/auth');
            }, { timeout: 10000 });
            logoutSuccess = true;
            console.log('   ✅ Logout redirect detected');
        } catch (e) {
            console.log('   ⚠️  Timeout waiting for logout redirect');
        }

        // Wait for page to settle
        await page.waitForTimeout(3000);

        // Take screenshot after logout
        await page.screenshot({ path: 'backups/after_logout.png' });
        console.log('   📸 Post-logout screenshot saved');

        // Step 5: Verify results
        console.log('\n🔍 Step 5: Verifying logout results...');
        
        const finalUrl = page.url();
        const isOnLoginPage = finalUrl.includes('/staff/login') || finalUrl.includes('/login') || finalUrl.includes('/auth');
        
        console.log(`   📍 Final URL: ${finalUrl}`);
        console.log(`   🎯 On login page: ${isOnLoginPage}`);
        console.log(`   ❌ Errors detected: ${errorDetected}`);

        if (isOnLoginPage && !errorDetected) {
            console.log('\n   ✅ SUCCESS: Logout completed without errors!');
            console.log('   ✅ No "Oops! Something went wrong" message detected');
            console.log('   ✅ Properly redirected to login page');
        } else if (errorDetected) {
            console.log('\n   ❌ FAILURE: "Oops! Something went wrong" error detected');
            console.log('   ❌ The logout fix may not be working properly');
        } else {
            console.log('\n   ⚠️  UNCLEAR: Logout may not have completed properly');
            console.log('   ⚠️  Check the screenshots for more details');
        }

        // Check for any visible error messages
        const errorTexts = await page.$$eval('[class*="error"], [class*="alert"], .error-message', elements => 
            elements.map(el => el.textContent).filter(text => text.includes('Oops') || text.includes('Something went wrong'))
        );

        if (errorTexts.length > 0) {
            console.log('\n   ❌ Error messages found on page:');
            errorTexts.forEach((text, i) => {
                console.log(`      ${i + 1}. ${text}`);
            });
        } else {
            console.log('\n   ✅ No error messages found on page');
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
    console.log('🔍 Check screenshots to verify logout behavior');
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run the test
testLogout().catch(console.error);
