import { test, expect } from '@playwright/test';
import { test as base } from './fixtures/test-fixtures';

// Extend base test for performance testing
const perfTest = base.extend({
  // Configure for performance testing
  page: async ({ page }, use) => {
    // Enable performance metrics collection
    await page.addInitScript(() => {
      // Expose performance API for metrics collection
      (window as any).__perfMetrics = {
        marks: new Map(),
        measures: new Map(),
        observer: null
      };
      
      // Collect navigation and paint metrics
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          (window as any).__perfMetrics.measures.set(entry.name, {
            duration: entry.duration || 0,
            startTime: entry.startTime || 0,
            entryType: entry.entryType
          });
        }
      });
      
      observer.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
      (window as any).__perfMetrics.observer = observer;
    });
    
    await use(page);
  },
});

// Performance benchmarks and thresholds
const PERFORMANCE_THRESHOLDS = {
  // Page load performance
  PAGE_LOAD_TIME: 3000, // 3 seconds
  FIRST_CONTENTFUL_PAINT: 1500, // 1.5 seconds
  LARGEST_CONTENTFUL_PAINT: 2500, // 2.5 seconds
  CUMULATIVE_LAYOUT_SHIFT: 0.1, // Layout stability
  
  // File processing performance
  SMALL_FILE_PROCESSING: 2000, // 2 seconds for <10KB files
  MEDIUM_FILE_PROCESSING: 5000, // 5 seconds for <100KB files
  LARGE_FILE_PROCESSING: 10000, // 10 seconds for <1MB files
  
  // AI processing performance
  AI_SUGGESTION_GENERATION: 8000, // 8 seconds for AI response
  CONTENT_OPTIMIZATION: 6000, // 6 seconds for content optimization
  
  // UI interaction performance
  ZOOM_TRANSITION: 300, // 300ms for zoom changes
  VIEW_MODE_SWITCH: 500, // 500ms for switching view modes
  EXPORT_INITIATION: 2000, // 2 seconds to start export
};

perfTest.describe('Performance Regression Tests', () => {
  perfTest.beforeEach(async ({ homePage }) => {
    await homePage.navigateToHome();
    await homePage.setAPIKey('test-performance-key');
  });

  perfTest.describe('Page Load Performance', () => {
    perfTest('should load homepage within performance budget', async ({ page, homePage }) => {
      const startTime = Date.now();
      
      // Measure full page load
      await page.goto('/', { waitUntil: 'networkidle' });
      const totalLoadTime = Date.now() - startTime;
      
      // Check total load time
      expect(totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME);
      
      // Collect Web Vitals metrics
      const metrics = await page.evaluate(() => {
        const perfMetrics = (window as any).__perfMetrics.measures;
        return {
          fcp: perfMetrics.get('first-contentful-paint')?.startTime || 0,
          lcp: perfMetrics.get('largest-contentful-paint')?.startTime || 0,
          cls: perfMetrics.get('cumulative-layout-shift')?.value || 0,
          fid: perfMetrics.get('first-input')?.duration || 0
        };
      });
      
      console.log('Performance metrics:', {
        totalLoadTime,
        ...metrics
      });
      
      // Validate Core Web Vitals
      if (metrics.fcp > 0) {
        expect(metrics.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT);
      }
      if (metrics.lcp > 0) {
        expect(metrics.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT);
      }
      if (metrics.cls > 0) {
        expect(metrics.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CUMULATIVE_LAYOUT_SHIFT);
      }
    });

    perfTest('should handle concurrent user interactions efficiently', async ({ page, resumeEditor }) => {
      await resumeEditor.uploadResumeText();
      
      // Measure concurrent operations
      const startTime = Date.now();
      
      // Perform multiple operations simultaneously
      await Promise.all([
        resumeEditor.switchToPreviewMode(),
        page.selectOption('[data-testid="zoom-select"]', '125%'),
        page.click('[data-testid="workspace-split"]')
      ]);
      
      const concurrentOperationTime = Date.now() - startTime;
      
      // Should handle concurrent operations efficiently
      expect(concurrentOperationTime).toBeLessThan(1500);
      
      console.log('Concurrent operations time:', concurrentOperationTime);
    });
  });

  perfTest.describe('File Processing Performance', () => {
    perfTest('should process small files quickly', async ({ resumeEditor, page }) => {
      const smallContent = `John Smith
Email: john@example.com
Phone: (555) 123-4567

EXPERIENCE
Software Developer at TechCorp (2020-2023)
- Developed web applications`;
      
      const startTime = Date.now();
      await resumeEditor.uploadResumeText(smallContent);
      
      // Wait for processing to complete
      await page.waitForSelector('[data-testid="resume-preview"]', { state: 'visible' });
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SMALL_FILE_PROCESSING);
      console.log('Small file processing time:', processingTime);
    });

    perfTest('should handle medium-sized files within budget', async ({ resumeEditor, page }) => {
      // Generate medium-sized content (~50KB)
      const mediumContent = `JOHN SMITH
Senior Software Engineer
Email: john.smith@example.com | Phone: (555) 123-4567

PROFESSIONAL SUMMARY
${'Experienced software engineer with expertise in full-stack development. '.repeat(50)}

TECHNICAL SKILLS
${'• Programming Languages: JavaScript, TypeScript, Python, Java\n'.repeat(20)}

PROFESSIONAL EXPERIENCE
${Array.from({ length: 10 }, (_, i) => `
Senior Software Engineer | Company ${i + 1} | 2020 - Present
${'• Led development of scalable applications serving thousands of users\n'.repeat(10)}
${'• Implemented modern technologies and best practices\n'.repeat(8)}
${'• Collaborated with cross-functional teams to deliver high-quality solutions\n'.repeat(6)}
`).join('')}

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2014 - 2018
${'Relevant coursework and projects. '.repeat(30)}`;
      
      const startTime = Date.now();
      await resumeEditor.uploadResumeText(mediumContent);
      await page.waitForSelector('[data-testid="resume-preview"]', { state: 'visible' });
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_FILE_PROCESSING);
      console.log('Medium file processing time:', processingTime);
    });

    perfTest('should handle large files without timeout', async ({ resumeEditor, page }) => {
      // Generate large content (~200KB)
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `SECTION ${i + 1}\n${'Large content block with detailed information. '.repeat(50)}\n\n`
      ).join('');
      
      const startTime = Date.now();
      await resumeEditor.uploadResumeText(largeContent);
      
      // Wait for processing with extended timeout for large files
      await page.waitForSelector('[data-testid="resume-preview"]', { 
        state: 'visible',
        timeout: PERFORMANCE_THRESHOLDS.LARGE_FILE_PROCESSING + 5000
      });
      
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_FILE_PROCESSING);
      console.log('Large file processing time:', processingTime);
    });
  });

  perfTest.describe('AI Processing Performance', () => {
    perfTest('should generate AI suggestions within time budget', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      // Mock AI API for consistent performance testing
      await page.route('**/api/optimize-resume', async route => {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            optimizedContent: 'Optimized resume content with AI enhancements',
            suggestions: [
              { id: 1, text: 'Enhanced professional summary', type: 'improvement' },
              { id: 2, text: 'Added technical skills', type: 'addition' }
            ]
          })
        });
      });
      
      const startTime = Date.now();
      await resumeEditor.generateAISuggestions();
      
      // Wait for AI suggestions to appear
      await page.waitForSelector('[data-testid="ai-suggestions"]', { state: 'visible' });
      const aiProcessingTime = Date.now() - startTime;
      
      expect(aiProcessingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AI_SUGGESTION_GENERATION);
      console.log('AI suggestion generation time:', aiProcessingTime);
    });

    perfTest('should handle AI optimization requests efficiently', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      // Navigate to optimization page
      await page.click('[data-testid="optimize-with-ai"]');
      
      const startTime = Date.now();
      
      // Mock content optimization endpoint
      await page.route('**/api/optimize-content', async route => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            optimizedSections: {
              summary: 'Enhanced professional summary',
              experience: 'Improved experience descriptions',
              skills: 'Optimized technical skills section'
            }
          })
        });
      });
      
      await page.click('[data-testid="start-optimization"]');
      await page.waitForSelector('[data-testid="optimization-results"]', { state: 'visible' });
      
      const optimizationTime = Date.now() - startTime;
      
      expect(optimizationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONTENT_OPTIMIZATION);
      console.log('Content optimization time:', optimizationTime);
    });
  });

  perfTest.describe('UI Interaction Performance', () => {
    perfTest('should handle zoom transitions smoothly', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      await resumeEditor.switchToPreviewMode();
      
      const zoomLevels = ['75%', '100%', '125%', '150%'];
      
      for (const zoom of zoomLevels) {
        const startTime = Date.now();
        
        await page.selectOption('[data-testid="zoom-select"]', zoom);
        
        // Wait for zoom transition to complete
        await page.waitForFunction(
          (expectedZoom) => {
            const preview = document.querySelector('[data-testid="resume-preview"]');
            const computedStyle = window.getComputedStyle(preview);
            const transform = computedStyle.transform;
            return transform.includes('scale') || transform === 'none';
          },
          zoom,
          { timeout: 1000 }
        );
        
        const transitionTime = Date.now() - startTime;
        expect(transitionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ZOOM_TRANSITION);
        
        console.log(`Zoom to ${zoom} transition time:`, transitionTime);
      }
    });

    perfTest('should switch view modes efficiently', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      const viewModes = ['editor', 'preview', 'split'];
      
      for (const mode of viewModes) {
        const startTime = Date.now();
        
        await page.click(`[data-testid="workspace-${mode}"]`);
        
        // Wait for view mode transition
        await page.waitForSelector(`[data-testid="${mode}-view"]`, { 
          state: 'visible',
          timeout: 1000
        });
        
        const switchTime = Date.now() - startTime;
        expect(switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VIEW_MODE_SWITCH);
        
        console.log(`Switch to ${mode} mode time:`, switchTime);
      }
    });

    perfTest('should initiate exports quickly', async ({ resumeEditor, page }) => {
      await resumeEditor.uploadResumeText();
      
      const exportFormats = ['docx', 'pdf', 'txt'];
      
      for (const format of exportFormats) {
        const startTime = Date.now();
        
        // Mock export endpoint
        await page.route(`**/api/export-${format}`, async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/octet-stream',
            body: Buffer.from(`Mock ${format.toUpperCase()} content`)
          });
        });
        
        await page.click(`[data-testid="export-${format}"]`);
        
        // Wait for export to initiate (download starts)
        const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
        const download = await downloadPromise;
        
        const exportInitTime = Date.now() - startTime;
        expect(exportInitTime).toBeLessThan(PERFORMANCE_THRESHOLDS.EXPORT_INITIATION);
        
        console.log(`${format.toUpperCase()} export initiation time:`, exportInitTime);
        
        // Clean up download
        await download.cancel();
      }
    });
  });

  perfTest.describe('Memory Usage Performance', () => {
    perfTest('should maintain reasonable memory usage during heavy operations', async ({ page, resumeEditor }) => {
      await resumeEditor.uploadResumeText();
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          };
        }
        return { used: 0, total: 0 };
      });
      
      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.selectOption('[data-testid="zoom-select"]', '150%');
        await page.selectOption('[data-testid="zoom-select"]', '50%');
        await resumeEditor.switchToPreviewMode();
        await page.click('[data-testid="workspace-editor"]');
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          };
        }
        return { used: 0, total: 0 };
      });
      
      // Calculate memory increase
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;
      
      console.log('Memory usage:', {
        initial: initialMemory,
        final: finalMemory,
        increase: memoryIncrease,
        increasePercent: memoryIncreasePercent
      });
      
      // Memory usage should not increase by more than 50% during operations
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });
});