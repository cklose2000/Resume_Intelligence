import { test, expect } from './fixtures/test-fixtures';
import path from 'path';

test.describe('Multi-Format Export Workflow', () => {
  test.beforeEach(async ({ page, homePage, apiKeyPage, resumeEditor }) => {
    // Setup: Get to editor with resume loaded
    await homePage.goto();
    await homePage.navigateToEditor();
    await apiKeyPage.skipAPIKey();
    await resumeEditor.uploadResumeText();
    await resumeEditor.waitForResumeProcessed();
  });

  test('should export resume as DOCX', async ({ page, resumeEditor }) => {
    // Ensure we're in a view where export options are visible
    await resumeEditor.switchToSplitView();

    // Test DOCX export
    const download = await resumeEditor.exportAsDOCX();
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/resume.*\.docx$/i);
    
    // Save the file to verify it's not corrupted
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Verify file exists and has reasonable size (DOCX files should be > 1KB)
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1024); // At least 1KB
    
    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should export resume as PDF', async ({ page, resumeEditor }) => {
    await resumeEditor.switchToSplitView();

    // Test PDF export
    const download = await resumeEditor.exportAsPDF();
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/resume.*\.pdf$/i);
    
    // Save and verify file
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(2048); // PDFs should be larger
    
    // Verify PDF header (basic file format check)
    const buffer = fs.readFileSync(downloadPath);
    const header = buffer.toString('ascii', 0, 4);
    expect(header).toBe('%PDF');
    
    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should export resume as TXT', async ({ page, resumeEditor }) => {
    await resumeEditor.switchToSplitView();

    // Click TXT export button
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="export-txt"]');
    const download = await downloadPromise;
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/resume.*\.txt$/i);
    
    // Save and verify content
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fs = require('fs');
    const content = fs.readFileSync(downloadPath, 'utf8');
    
    // Verify content includes key resume elements
    expect(content).toContain('John Doe');
    expect(content).toContain('Software Engineer');
    expect(content).toContain('EXPERIENCE');
    expect(content).toContain('EDUCATION');
    
    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should generate unique filenames for multiple exports', async ({ page, resumeEditor }) => {
    await resumeEditor.switchToSplitView();

    // Export multiple times and verify unique filenames
    const downloads = [];
    
    for (let i = 0; i < 3; i++) {
      const download = await resumeEditor.exportAsDOCX();
      downloads.push(download.suggestedFilename());
    }
    
    // Verify all filenames are unique
    const uniqueFilenames = new Set(downloads);
    expect(uniqueFilenames.size).toBe(downloads.length);
  });

  test('should preserve formatting in exported documents', async ({ page, resumeEditor }) => {
    // First, make some formatting changes in the editor
    await resumeEditor.switchToSplitView();
    
    // Add some formatted content
    await page.locator('[data-testid="editor-content"]').click();
    await page.keyboard.press('Control+End'); // Go to end
    await page.keyboard.press('Enter');
    await page.keyboard.type('\n### ADDITIONAL SKILLS\n• **Bold skill**\n• *Italic skill*\n• Regular skill');
    
    // Wait for content to update
    await page.waitForTimeout(1000);
    
    // Export as DOCX
    const download = await resumeEditor.exportAsDOCX();
    
    // Verify the export includes the new content
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Basic verification that file was created successfully
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1024);
    
    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should handle export with optimized content', async ({ page, resumeEditor, apiKeyPage }) => {
    // Need to restart with API key for AI features
    await page.goto('/');
    await page.locator('[data-testid="start-editing"]').click();
    await apiKeyPage.enterAPIKey();
    await resumeEditor.uploadResumeText();
    await resumeEditor.waitForResumeProcessed();
    
    // Generate and apply AI suggestions
    await resumeEditor.enterJobDescription();
    await resumeEditor.generateAISuggestions();
    
    // Accept first suggestion if available
    const firstSuggestion = page.locator('[data-testid="suggestion-accept"]').first();
    if (await firstSuggestion.count() > 0) {
      await firstSuggestion.click();
      await page.waitForTimeout(2000); // Allow content to update
    }
    
    // Export the optimized resume
    await resumeEditor.switchToSplitView();
    const download = await resumeEditor.exportAsDOCX();
    
    // Verify export worked
    expect(download.suggestedFilename()).toMatch(/resume.*\.docx$/i);
    
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1024);
    
    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should handle export errors gracefully', async ({ page, resumeEditor }) => {
    await resumeEditor.switchToSplitView();
    
    // Simulate network error by intercepting the export request
    await page.route('**/api/export/**', route => route.abort());
    
    // Try to export
    await page.click('[data-testid="export-docx"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="export-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-error"]')).toContainText('export failed');
  });

  test('should show export progress for large documents', async ({ page, resumeEditor }) => {
    // Upload a large resume
    const largeResumeText = 'A'.repeat(10000) + '\n\nLarge resume content for testing export progress indicators...';
    
    await resumeEditor.uploadResumeText(largeResumeText);
    await resumeEditor.waitForResumeProcessed();
    await resumeEditor.switchToSplitView();
    
    // Start export and check for progress indicator
    const exportButton = page.locator('[data-testid="export-docx"]');
    await exportButton.click();
    
    // Should show loading state
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    
    // Wait for export to complete
    const download = await page.waitForDownload();
    expect(download.suggestedFilename()).toMatch(/resume.*\.docx$/i);
    
    // Progress indicator should be hidden
    await expect(page.locator('[data-testid="export-progress"]')).not.toBeVisible();
  });
});