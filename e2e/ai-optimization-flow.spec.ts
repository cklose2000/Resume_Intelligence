import { test, expect, TEST_JOB_DESCRIPTION } from './fixtures/test-fixtures';

test.describe('AI Optimization Workflow', () => {
  test.beforeEach(async ({ page, homePage, apiKeyPage, resumeEditor }) => {
    // Setup: Get to editor with resume loaded
    await homePage.goto();
    await homePage.navigateToEditor();
    await apiKeyPage.enterAPIKey(); // Need API key for AI features
    await resumeEditor.uploadResumeText();
    await resumeEditor.waitForResumeProcessed();
  });

  test('should complete AI optimization workflow', async ({ 
    page, 
    resumeEditor 
  }) => {
    // Step 1: Enter job description
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);

    // Step 2: Generate AI suggestions
    await resumeEditor.generateAISuggestions();

    // Step 3: Verify suggestions are displayed
    await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggestion-item"]')).toHaveCount({ min: 1 });

    // Step 4: Check suggestion categories
    const suggestionCategories = [
      'Impact & Metrics',
      'Action Verbs', 
      'Keyword Optimization',
      'Skill Alignment'
    ];

    for (const category of suggestionCategories) {
      const categoryExists = await page.locator(`[data-testid="category-${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}"]`).count();
      if (categoryExists > 0) {
        await expect(page.locator(`[data-testid="category-${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}"]`)).toBeVisible();
      }
    }

    // Step 5: Accept first suggestion
    const originalContent = await resumeEditor.getEditorContent();
    await resumeEditor.acceptFirstSuggestion();

    // Step 6: Verify content was updated
    await page.waitForTimeout(2000); // Allow for content update
    const updatedContent = await resumeEditor.getEditorContent();
    expect(updatedContent).not.toBe(originalContent);

    // Step 7: Verify preview reflects changes
    await resumeEditor.switchToSplitView();
    const previewContent = await resumeEditor.getPreviewContent();
    expect(previewContent).toContain('John Doe'); // Basic content check
  });

  test('should handle suggestion rejection', async ({ 
    page, 
    resumeEditor 
  }) => {
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);
    await resumeEditor.generateAISuggestions();

    // Get original content
    const originalContent = await resumeEditor.getEditorContent();

    // Reject first suggestion
    await resumeEditor.rejectFirstSuggestion();

    // Verify content remains unchanged
    await page.waitForTimeout(1000);
    const contentAfterRejection = await resumeEditor.getEditorContent();
    expect(contentAfterRejection).toBe(originalContent);

    // Verify suggestion is marked as rejected or removed
    const rejectedSuggestion = page.locator('[data-testid="suggestion-item"]:first-child');
    const isRejected = await rejectedSuggestion.getAttribute('data-status');
    expect(isRejected).toBe('rejected');
  });

  test('should filter suggestions by category', async ({ 
    page, 
    resumeEditor 
  }) => {
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);
    await resumeEditor.generateAISuggestions();

    // Test category filtering
    const impactFilter = page.locator('[data-testid="filter-impact-metrics"]');
    if (await impactFilter.count() > 0) {
      await impactFilter.click();
      
      // Verify only impact & metrics suggestions are visible
      const visibleSuggestions = page.locator('[data-testid="suggestion-item"]:visible');
      const count = await visibleSuggestions.count();
      expect(count).toBeGreaterThan(0);

      // Check that filtered suggestions are the right type
      const firstSuggestion = visibleSuggestions.first();
      const category = await firstSuggestion.getAttribute('data-category');
      expect(category).toBe('impact-metrics');
    }
  });

  test('should handle bulk suggestion operations', async ({ 
    page, 
    resumeEditor 
  }) => {
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);
    await resumeEditor.generateAISuggestions();

    const originalContent = await resumeEditor.getEditorContent();

    // Test "Accept All" if available
    const acceptAllButton = page.locator('[data-testid="accept-all-suggestions"]');
    if (await acceptAllButton.count() > 0) {
      await acceptAllButton.click();
      
      // Verify content was updated
      await page.waitForTimeout(3000); // Allow for all updates
      const updatedContent = await resumeEditor.getEditorContent();
      expect(updatedContent).not.toBe(originalContent);
      expect(updatedContent.length).toBeGreaterThan(originalContent.length);
    }
  });

  test('should preserve formatting during AI optimization', async ({ 
    page, 
    resumeEditor 
  }) => {
    // Switch to split view to monitor both editor and preview
    await resumeEditor.switchToSplitView();
    
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);
    await resumeEditor.generateAISuggestions();

    // Check that preview maintains proper formatting
    const previewContent = await resumeEditor.getPreviewContent();
    expect(previewContent).toContain('EXPERIENCE'); // Section header
    expect(previewContent).toContain('EDUCATION');   // Section header
    expect(previewContent).toContain('SKILLS');      // Section header

    // Accept a suggestion and verify formatting is preserved
    await resumeEditor.acceptFirstSuggestion();
    await page.waitForTimeout(2000);

    const updatedPreview = await resumeEditor.getPreviewContent();
    expect(updatedPreview).toContain('EXPERIENCE');
    expect(updatedPreview).toContain('EDUCATION');
    expect(updatedPreview).toContain('SKILLS');
  });

  test('should show suggestion impact indicators', async ({ 
    page, 
    resumeEditor 
  }) => {
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);
    await resumeEditor.generateAISuggestions();

    // Check for impact indicators (high, medium, low)
    const suggestions = page.locator('[data-testid="suggestion-item"]');
    const count = await suggestions.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const suggestion = suggestions.nth(i);
        const impact = await suggestion.locator('[data-testid="impact-indicator"]').textContent();
        expect(['High', 'Medium', 'Low']).toContain(impact);
      }
    }
  });

  test('should handle API errors gracefully', async ({ 
    page, 
    resumeEditor 
  }) => {
    // Simulate API error by using invalid API key
    await page.goto('/');
    await page.locator('[data-testid="start-editing"]').click();
    
    // Enter invalid API key
    await page.fill('[data-testid="api-key-input"]', 'invalid-key');
    await page.click('[data-testid="save-api-key"]');

    await resumeEditor.uploadResumeText();
    await resumeEditor.waitForResumeProcessed();
    await resumeEditor.enterJobDescription(TEST_JOB_DESCRIPTION);

    // Try to generate suggestions with invalid key
    await page.click('[data-testid="generate-suggestions"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('API');
  });
});