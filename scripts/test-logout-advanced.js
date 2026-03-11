/**
 * ADVANCED PLAYWRIGHT LOGOUT TEST
 * More comprehensive test to find and test logout functionality
 * 
 * Usage: node scripts/test-logout-advanced.js
 */

const { chromium } = require('playwright');

async function testLogout() {
    console.log('🎭 ADVANCED PLAYWRIGHT LOGOUT TEST');
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

        // Step 2: Find logout functionality
        console.log('\n🔍 Step 2: Finding logout functionality...');
        
        // Look for common logout patterns
        const logoutPatterns = [
            // Direct logout buttons
            'button:has-text("Logout")',
            'a:has-text("Logout")',
            'button:has-text("Sign Out")',
            'a:has-text("Sign Out")',
            
            // Common selectors
            '[data-testid="logout"]',
            '.logout-btn',
            '#logout',
            '.sign-out',
            '#sign-out',
            
            // Menu items
            'nav a:has-text("Logout")',
            'header a:has-text("Logout")',
            '.navbar a:has-text("Logout")',
            '.menu a:has-text("Logout")',
            
            // User profile dropdown
            '.user-profile',
            '.user-menu',
            '.profile-dropdown',
            '.avatar',
            '.user-avatar'
        ];

        let logoutElement = null;
        let logoutMethod = '';

        // Check each pattern
        for (const selector of logoutPatterns) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`   🔍 Found elements with selector: ${selector}`);
                    
                    for (const element of elements) {
                        const isVisible = await element.isVisible();
                        if (isVisible) {
                            logoutElement = element;
                            logoutMethod = selector;
                            console.log(`   ✅ Found visible logout element: ${selector}`);
                            break;
                        }
                    }
                    if (logoutElement) break;
                }
            } catch (e) {
                // Continue trying
            }
        }

        // If still no logout element, try clicking on user areas
        if (!logoutElement) {
            console.log('   🔍 Trying to find user menu areas...');
            
            const clickableAreas = [
                'header button',
                'nav button',
                '.header button',
                '.navbar button',
                'button[aria-label*="user"]',
                'button[aria-label*="profile"]',
                'button[aria-label*="menu"]',
                '.dropdown-toggle',
                '[data-toggle="dropdown"]'
            ];

            for (const selector of clickableAreas) {
                try {
                    const elements = await page.$$(selector);
                    for (const element of elements) {
                        const isVisible = await element.isVisible();
                        if (isVisible) {
                            console.log(`   📂 Clicking on: ${selector}`);
                            await element.click();
                            await page.waitForTimeout(1000);
                            
                            // Look for logout in the opened menu
                            for (const logoutSelector of logoutPatterns) {
                                const logoutBtn = await page.$(logoutSelector);
                                if (logoutBtn && await logoutBtn.isVisible()) {
                                    logoutElement = logoutBtn;
                                    logoutMethod = `Clicked ${selector} then found ${logoutSelector}`;
                                    console.log(`   ✅ Found logout after clicking menu: ${logoutSelector}`);
                                    break;
                                }
                            }
                            if (logoutElement) break;
                            
                            // If no logout found, close menu and continue
                            await page.keyboard.press('Escape');
                            await page.waitForTimeout(500);
                        }
                    }
                    if (logoutElement) break;
                } catch (e) {
                    // Continue trying
                }
            }
        }

        // Step 3: Test logout
        console.log('\n🚪 Step 3: Testing logout...');
        
        if (logoutElement) {
            console.log(`   ✅ Using logout method: ${logoutMethod}`);
            
            // Take screenshot before logout
            await page.screenshot({ path: 'backups/before_logout_click.png' });
            
            // Click logout
            await logoutElement.click();
            console.log('   ✅ Logout clicked');
            
        } else {
            console.log('   ⚠️  No logout element found, trying JavaScript logout...');
            
            // Try JavaScript logout methods
            const logoutResult = await page.evaluate(() => {
                try {
                    // Try common logout functions
                    if (typeof window.logout === 'function') {
                        window.logout();
                        return 'Called window.logout()';
                    }
                    if (typeof window.signOut === 'function') {
                        window.signOut();
                        return 'Called window.signOut()';
                    }
                    if (typeof window.handleLogout === 'function') {
                        window.handleLogout();
                        return 'Called window.handleLogout()';
                    }
                    
                    // Try Supabase logout
                    if (window.supabase && window.supabase.auth) {
                        window.supabase.auth.signOut();
                        return 'Called supabase.auth.signOut()';
                    }
                    
                    // Navigate to logout URL
                    window.location.href = '/staff/logout';
                    return 'Navigated to /staff/logout';
                } catch (e) {
                    return `Error: ${e.message}`;
                }
            });
            
            console.log(`   📝 JavaScript logout result: ${logoutResult}`);
        }

        // Step 4: Monitor logout process
        console.log('\n🔍 Step 4: Monitoring logout process...');
        
        // Wait for navigation or timeout
        let logoutSuccess = false;
        const startTime = Date.now();
        
        try {
            await page.waitForFunction(() => {
                const url = window.location.href;
                return url.includes('/login') || url.includes('/auth') || url.includes('/signin');
            }, { timeout: 8000 });
            logoutSuccess = true;
            console.log('   ✅ Logout redirect detected');
        } catch (e) {
            console.log('   ⚠️  Timeout waiting for logout redirect');
        }

        const logoutTime = Date.now() - startTime;
        console.log(`   ⏱️  Logout process took: ${logoutTime}ms`);

        // Wait for page to settle
        await page.waitForTimeout(2000);

        // Take screenshot after logout
        await page.screenshot({ path: 'backups/after_logout_complete.png' });
        console.log('   📸 Post-logout screenshot saved');

        // Step 5: Final verification
        console.log('\n🔍 Step 5: Final verification...');
        
        const finalUrl = page.url();
        const isOnAuthPage = finalUrl.includes('/login') || finalUrl.includes('/auth') || finalUrl.includes('/signin');
        
        console.log(`   📍 Final URL: ${finalUrl}`);
        console.log(`   🎯 On auth page: ${isOnAuthPage}`);
        console.log(`   ⏱️  Logout time: ${logoutTime}ms`);
        console.log(`   ❌ Errors detected: ${logoutErrors.length}`);

        // Check page title
        const title = await page.title();
        console.log(`   📄 Page title: ${title}`);

        // Look for any error messages
        const errorElements = await page.$$eval('*', elements => 
            elements
                .filter(el => {
                    const text = el.textContent || '';
                    return text.includes('Oops') || text.includes('Something went wrong') || text.includes('error');
                })
                .map(el => ({
                    tag: el.tagName,
                    class: el.className,
                    text: (el.textContent || '').substring(0, 100)
                }))
        );

        if (errorElements.length > 0) {
            console.log('\n   ❌ Error elements found:');
            errorElements.forEach((el, i) => {
                console.log(`      ${i + 1}. ${el.tag}.${el.class}: ${el.text}`);
            });
        }

        // Final assessment
        console.log('\n📊 FINAL ASSESSMENT:');
        if (isOnAuthPage && logoutErrors.length === 0) {
            console.log('   ✅ SUCCESS: Logout completed without errors!');
            console.log('   ✅ The logout fix is working properly');
            console.log('   ✅ No "Oops! Something went wrong" messages');
        } else if (logoutErrors.length > 0) {
            console.log('   ❌ FAILURE: Logout errors detected');
            console.log('   ❌ The logout fix may need more work');
            console.log(`   ❌ Errors: ${logoutErrors.join(', ')}`);
        } else {
            console.log('   ⚠️  UNCLEAR: Logout behavior needs manual verification');
            console.log('   ⚠️  Check screenshots for details');
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        
        if (page) {
            await page.screenshot({ path: 'backups/test_error.png' });
            console.log('   📸 Error screenshot saved');
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🧹 Browser closed');
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎭 ADVANCED PLAYWRIGHT TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📁 Screenshots saved in backups/ directory');
    console.log('🔍 Review screenshots to verify logout behavior');
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run the test
testLogout().catch(console.error);
