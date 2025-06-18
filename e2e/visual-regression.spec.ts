import { test, expect } from '@playwright/test';
import { test as base } from './fixtures/test-fixtures';

// Extend base test with custom fixtures for visual testing
const visualTest = base.extend({
  // Configure for visual testing stability
  page: async ({ page }, use) => {
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    });
    
    // Wait for fonts to load
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.fonts.ready);
    
    await use(page);
  },
});

visualTest.describe('Visual Regression Tests', () => {
  visualTest.beforeEach(async ({ homePage }) => {
    await homePage.navigateToHome();
    await homePage.setAPIKey('test-api-key-for-visual-testing');
  });

  visualTest.describe('Resume Preview Component', () => {
    visualTest('should render resume preview at different zoom levels', async ({ resumeEditor, page }) => {
      // Upload test resume content
      await resumeEditor.uploadResumeText();
      await resumeEditor.switchToPreviewMode();
      
      // Wait for content to stabilize
      await page.waitForSelector('[data-testid="resume-preview"]', { state: 'visible' });
      await page.waitForTimeout(1000); // Allow for any async rendering
      
      // Test different zoom levels
      const zoomLevels = [50, 75, 100, 125, 150];
      
      for (const zoom of zoomLevels) {
        // Set zoom level
        await page.selectOption('[data-testid="zoom-select"]', `${zoom}%`);
        await page.waitForTimeout(500); // Allow zoom transition
        
        // Take screenshot at this zoom level
        await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot(
          `resume-preview-zoom-${zoom}.png`,
          {
            mask: [page.locator('[data-testid="timestamp"]')], // Mask dynamic content
            threshold: 0.2, // Allow for minor rendering differences
          }
        );
      }
    });

    visualTest('should render different content structures correctly', async ({ resumeEditor, page }) => {
      const contentVariations = [
        {
          name: 'minimal-resume',
          content: `John Smith
Email: john@example.com
Phone: (555) 123-4567

EXPERIENCE
Software Developer at TechCorp (2020-2023)
- Developed web applications`
        },
        {
          name: 'detailed-resume',
          content: `JOHN SMITH
Senior Software Engineer
Email: john.smith@example.com | Phone: (555) 123-4567 | LinkedIn: linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Experienced software engineer with 8+ years of expertise in full-stack development, cloud architecture, and team leadership.

TECHNICAL SKILLS
• Programming Languages: JavaScript, TypeScript, Python, Java, Go
• Frameworks: React, Node.js, Express, Django, Spring Boot
• Cloud Platforms: AWS, Azure, Google Cloud Platform
• Databases: PostgreSQL, MongoDB, Redis, Elasticsearch

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Inc. | 2020 - Present
• Led development of microservices architecture serving 1M+ daily users
• Implemented CI/CD pipelines reducing deployment time by 75%
• Mentored team of 5 junior developers and conducted code reviews
• Designed and built real-time analytics dashboard using React and D3.js

Software Engineer | StartupXYZ | 2018 - 2020
• Developed RESTful APIs handling 10K+ requests per minute
• Built responsive web applications using React and Redux
• Collaborated with product team to define technical requirements
• Optimized database queries improving application performance by 40%

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2014 - 2018`
        }
      ];

      for (const variation of contentVariations) {
        await resumeEditor.uploadResumeText(variation.content);
        await resumeEditor.switchToPreviewMode();
        
        // Wait for content to render completely
        await page.waitForSelector('[data-testid="resume-preview"]', { state: 'visible' });
        await page.waitForTimeout(1500);
        
        // Take screenshot of this content variation
        await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot(
          `resume-content-${variation.name}.png`,
          {
            fullPage: true,
            threshold: 0.2,
          }
        );
      }
    });

    visualTest('should render correctly in mobile viewport', async ({ resumeEditor, page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await resumeEditor.uploadResumeText();
      await resumeEditor.switchToPreviewMode();
      
      await page.waitForSelector('[data-testid="resume-preview"]', { state: 'visible' });
      await page.waitForTimeout(1000);
      
      // Mobile preview screenshot
      await expect(page).toHaveScreenshot('resume-preview-mobile.png', {
        fullPage: true,
        threshold: 0.3, // Allow more variance for mobile rendering
      });
    });
  });

  visualTest.describe('Content Preview with AI Suggestions', () => {
    visualTest('should highlight AI suggestions correctly', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      // Navigate to AI optimization
      await page.click('[data-testid="optimize-with-ai"]');
      await page.waitForSelector('[data-testid="content-preview"]', { state: 'visible' });
      
      // Mock AI suggestions response to ensure consistent visual testing
      await page.route('**/api/optimize-resume', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            optimizedContent: `John Smith
<span class="ai-suggestion">Senior Software Engineer | Full-Stack Developer</span>
Email: john@example.com
Phone: (555) 123-4567

PROFESSIONAL SUMMARY
<span class="ai-suggestion">Results-driven software engineer with 5+ years of experience in building scalable web applications and leading cross-functional teams.</span>

EXPERIENCE
Software Developer at TechCorp (2020-2023)
- Developed web applications <span class="ai-suggestion">using React, Node.js, and PostgreSQL</span>
- <span class="ai-suggestion">Improved application performance by 30% through code optimization</span>
- <span class="ai-suggestion">Collaborated with product managers and designers to deliver user-centric solutions</span>`,
            suggestions: [
              { id: 1, text: 'Added professional title', type: 'enhancement' },
              { id: 2, text: 'Enhanced professional summary', type: 'expansion' },
              { id: 3, text: 'Added technical details', type: 'technical' },
            ]
          })
        });
      });
      
      await resumeEditor.generateAISuggestions();
      await page.waitForTimeout(2000); // Wait for AI response and rendering
      
      // Screenshot with AI suggestions highlighted
      await expect(page.locator('[data-testid="content-preview"]')).toHaveScreenshot(
        'content-preview-ai-suggestions.png',
        {
          threshold: 0.2,
          mask: [page.locator('[data-testid="loading-indicator"]')]
        }
      );
      
      // Test suggestion interaction states
      await page.hover('.ai-suggestion:first-child');
      await page.waitForTimeout(300);
      
      await expect(page.locator('[data-testid="content-preview"]')).toHaveScreenshot(
        'content-preview-suggestion-hover.png',
        { threshold: 0.2 }
      );
    });

    visualTest('should show diff highlighting correctly', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      // Go through AI optimization flow
      await page.click('[data-testid="optimize-with-ai"]');
      await resumeEditor.generateAISuggestions();
      
      // Wait for diff view to load
      await page.waitForSelector('[data-testid="diff-view"]', { state: 'visible' });
      await page.waitForTimeout(1000);
      
      // Test different diff view modes
      const diffModes = ['side-by-side', 'unified'];
      
      for (const mode of diffModes) {
        if (await page.locator(`[data-testid="diff-mode-${mode}"]`).isVisible()) {
          await page.click(`[data-testid="diff-mode-${mode}"]`);
          await page.waitForTimeout(500);
          
          await expect(page.locator('[data-testid="diff-view"]')).toHaveScreenshot(
            `diff-view-${mode}.png`,
            { threshold: 0.2 }
          );
        }
      }
    });
  });

  visualTest.describe('Resume Workspace Layout', () => {
    visualTest('should render split-pane layout correctly', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      // Test different workspace modes
      const workspaceModes = [
        { mode: 'split', testId: 'split-view' },
        { mode: 'editor', testId: 'editor-only' },
        { mode: 'preview', testId: 'preview-only' }
      ];
      
      for (const { mode, testId } of workspaceModes) {
        if (await page.locator(`[data-testid="workspace-${mode}"]`).isVisible()) {
          await page.click(`[data-testid="workspace-${mode}"]`);
          await page.waitForTimeout(800); // Allow layout transition
          
          await expect(page).toHaveScreenshot(`workspace-${mode}-layout.png`, {
            fullPage: true,
            threshold: 0.3
          });
        }
      }
    });

    visualTest('should handle responsive layout changes', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop-large' },
        { width: 1366, height: 768, name: 'desktop-medium' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500); // Allow responsive layout
        
        await expect(page).toHaveScreenshot(`workspace-responsive-${viewport.name}.png`, {
          fullPage: true,
          threshold: 0.3
        });
      }
    });
  });

  visualTest.describe('Print Preview Mode', () => {
    visualTest('should render print preview correctly', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      await resumeEditor.switchToPreviewMode();
      
      // Simulate print preview by adding print media query
      await page.addStyleTag({
        content: `
          @media print {
            body * { visibility: hidden; }
            #resume-preview, #resume-preview * { visibility: visible; }
            #resume-preview { position: absolute; left: 0; top: 0; }
          }
        `
      });
      
      // Take screenshot with print styles applied
      await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot(
        'resume-print-preview.png',
        {
          threshold: 0.2,
          fullPage: true
        }
      );
    });
  });

  visualTest.describe('Loading and Error States', () => {
    visualTest('should render loading states correctly', async ({ page, homePage }) => {
      await homePage.navigateToHome();
      
      // Intercept file upload to simulate slow loading
      await page.route('**/api/upload-resume', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });
      
      // Start file upload to capture loading state
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-resume.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test resume content')
      });
      
      // Capture loading state
      await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'visible' });
      await expect(page.locator('[data-testid="upload-section"]')).toHaveScreenshot(
        'upload-loading-state.png',
        { threshold: 0.2 }
      );
    });

    visualTest('should render error states correctly', async ({ page, homePage }) => {
      await homePage.navigateToHome();
      
      // Mock API error response
      await page.route('**/api/upload-resume', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File processing failed' })
        });
      });
      
      // Trigger file upload error
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'invalid-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Invalid content')
      });
      
      // Wait for error message
      await page.waitForSelector('[data-testid="error-message"]', { state: 'visible' });
      await expect(page.locator('[data-testid="upload-section"]')).toHaveScreenshot(
        'upload-error-state.png',
        { threshold: 0.2 }
      );
    });
  });
});