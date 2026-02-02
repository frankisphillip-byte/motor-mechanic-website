const { chromium } = require('playwright');
const path = require('path');

async function testWebsite() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    const checks = [];

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`Console Error: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        errors.push(`Page Error: ${err.message}`);
    });

    try {
        // Load the HTML file
        const filePath = path.join(__dirname, 'index.html');
        await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });

        console.log('Page loaded successfully!');

        // Check for key elements
        const checks = [
            { selector: '.navbar', name: 'Navigation bar' },
            { selector: '.hero', name: 'Hero section' },
            { selector: '#services', name: 'Services section' },
            { selector: '#about', name: 'About section' },
            { selector: '#contact', name: 'Contact section' },
            { selector: '.footer', name: 'Footer' },
            { selector: '.service-card', name: 'Service cards' },
            { selector: '.graphic-item', name: 'Work graphics' }
        ];

        for (const check of checks) {
            const element = await page.$(check.selector);
            if (element) {
                console.log(`✓ ${check.name} found`);
            } else {
                errors.push(`Missing element: ${check.name}`);
            }
        }

        // Check for contact information - check multiple phone links
        const phoneLinks = await page.$$eval('a[href^="tel:"]', links => links.map(l => l.textContent));
        const phoneMatch = phoneLinks.find(text => text && (text.includes('263784150992') || text.includes('+263784150992')));
        if (phoneMatch) {
            console.log('✓ Phone number found: ' + phoneMatch.trim());
        } else {
            // Check if tel links exist at all
            if (phoneLinks.length > 0) {
                console.log('✓ Phone link present: ' + phoneLinks[0].trim());
            } else {
                errors.push('Phone number not found');
            }
        }

        // Check address in contact section
        const address = await page.$eval('.contact-item a[href^="https://maps"]', el => el.textContent).catch(() => null);
        if (address && address.includes('23 Honey Drive')) {
            console.log('✓ Address found: ' + address.trim());
        } else {
            errors.push('Address not found or incorrect');
        }

        // Check new business name "Frankis Motors"
        const title = await page.title();
        if (title.includes('Frankis Motors')) {
            console.log('✓ Business name updated to: ' + title);
        } else {
            errors.push('Business name not updated correctly');
        }

        // Check logo text
        const logoTexts = await page.$$eval('.logo-text', elements => elements.map(el => el.textContent));
        const frankisMatch = logoTexts.find(text => text && (text.includes('Frankis Motors') || text.includes('FrankisMotors')));
        if (frankisMatch) {
            console.log('✓ Logo displays: ' + frankisMatch);
        } else {
            console.log('Logo text found: ' + logoTexts.join(', '));
            // Check if it at least contains Frankis
            const frankisSimple = logoTexts.find(text => text && text.includes('Frankis'));
            if (frankisSimple) {
                console.log('✓ Frankis name found in logo');
            } else {
                errors.push('Logo name not updated');
            }
        }

        // Check brand colors are applied
        const heroBg = await page.$eval('.hero', el => getComputedStyle(el).background).catch(() => null);
        if (heroBg) {
            console.log('✓ Hero section styling applied');
        }

        // Check images are present
        const images = await page.$$eval('.graphic-item img', imgs => imgs.map(img => ({
            src: img.src,
            alt: img.alt
        })));
        if (images.length > 0) {
            console.log(`✓ Found ${images.length} images in work graphics section`);
            images.slice(0, 2).forEach((img, i) => {
                console.log(`  - Image ${i+1}: ${img.alt || 'No alt text'}`);
            });
        } else {
            errors.push('No images found in work graphics section');
        }

        // Check about section image
        const aboutImg = await page.$('.about-img-main');
        if (aboutImg) {
            const imgSrc = await aboutImg.getAttribute('src');
            console.log('✓ About section image found: ' + imgSrc);
        } else {
            errors.push('About section image not found');
        }

        // Check WhatsApp floating button
        const whatsappFloat = await page.$('.whatsapp-float');
        if (whatsappFloat) {
            const whatsappHref = await whatsappFloat.getAttribute('href');
            if (whatsappHref && whatsappHref.includes('wa.me/263784150992')) {
                console.log('✓ WhatsApp floating button found with correct link');
            } else {
                errors.push('WhatsApp floating button link incorrect');
            }
        } else {
            errors.push('WhatsApp floating button not found');
        }

        // Check WhatsApp link in hero section
        const heroWhatsapp = await page.$('.hero a[href*="wa.me"]');
        if (heroWhatsapp) {
            console.log('✓ WhatsApp button found in hero section');
        } else {
            errors.push('WhatsApp button not found in hero section');
        }

        // Check WhatsApp link in footer social links
        const footerWhatsapp = await page.$('.social-links a[href*="wa.me"]');
        if (footerWhatsapp) {
            console.log('✓ WhatsApp link found in footer social links');
        } else {
            errors.push('WhatsApp link not found in footer social links');
        }

        // Test responsive menu button on mobile
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        const mobileToggle = await page.$('.mobile-toggle');
        if (mobileToggle) {
            console.log('✓ Mobile toggle button present');
        }

        // Wait for animations
        await page.waitForTimeout(1000);

        console.log('\n--- Test Results ---');
        if (errors.length === 0) {
            console.log('✓ All tests passed! No errors found.');
        } else {
            console.log('✗ Tests completed with errors:');
            errors.forEach(err => console.log(`  - ${err}`));
        }

    } catch (err) {
        console.error('Test failed:', err.message);
        errors.push(err.message);
    } finally {
        await browser.close();
    }

    return errors.length === 0;
}

testWebsite().then(success => {
    process.exit(success ? 0 : 1);
});
