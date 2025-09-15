const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });

  // Navigate to login page
  await page.goto('http://localhost:8000/static/html/index.html');
  
  // Set onboarded flag
  await page.evaluate(() => {
    localStorage.setItem('onboarded', '1');
  });
  
  // Fill in login form
  await page.fill('#login-username', 'testuser');
  await page.fill('#login-password', 'testpass123');
  
  // Click login button and watch what happens
  await page.click('#login-btn');
  
  // Wait a bit to see what happens
  await page.waitForTimeout(5000);
  
  console.log('Current URL:', page.url());
  console.log('Local storage onboarded:', await page.evaluate(() => localStorage.getItem('onboarded')));
  
  await browser.close();
})();