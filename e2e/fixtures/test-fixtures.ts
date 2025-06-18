import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

// Test data
export const TEST_RESUME_TEXT = `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer | TechCorp | 2020-Present
• Led development of microservices architecture
• Improved system performance by 40%
• Mentored junior developers

Software Engineer | StartupInc | 2018-2020
• Built React applications with TypeScript
• Implemented CI/CD pipelines
• Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2014-2018

SKILLS
• JavaScript, TypeScript, React, Node.js
• AWS, Docker, Kubernetes
• Git, CI/CD, Agile methodologies`;

export const TEST_JOB_DESCRIPTION = `Senior Full Stack Developer

We are seeking an experienced Full Stack Developer to join our growing team. 

Required Skills:
- 5+ years of experience with React and Node.js
- Experience with cloud platforms (AWS, Azure)
- Strong knowledge of TypeScript
- Experience with microservices architecture
- Knowledge of CI/CD pipelines

Responsibilities:
- Design and develop scalable web applications
- Collaborate with product and design teams
- Mentor junior developers
- Participate in code reviews and architecture decisions`;

// Page Object Models
export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async isLoaded() {
    await expect(this.page.locator('h1')).toBeVisible();
  }

  async navigateToEditor() {
    await this.page.click('[data-testid="start-editing"]');
  }
}

export class APIKeyPage {
  constructor(private page: Page) {}

  async enterAPIKey(key: string = 'test-api-key-for-e2e') {
    await this.page.fill('[data-testid="api-key-input"]', key);
    await this.page.click('[data-testid="save-api-key"]');
  }

  async skipAPIKey() {
    await this.page.click('[data-testid="skip-api-key"]');
  }
}

export class ResumeEditor {
  constructor(private page: Page) {}

  async uploadResumeText(text: string = TEST_RESUME_TEXT) {
    // Create a virtual file with the text content
    const dataTransfer = await this.page.evaluateHandle((text) => {
      const dt = new DataTransfer();
      const file = new File([text], 'resume.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    }, text);

    // Trigger the file upload
    await this.page.locator('[data-testid="file-upload-zone"]').dispatchEvent('drop', { dataTransfer });
  }

  async waitForResumeProcessed() {
    await expect(this.page.locator('[data-testid="editor-content"]')).toBeVisible();
    await this.page.waitForTimeout(2000); // Allow processing time
  }

  async enterJobDescription(description: string = TEST_JOB_DESCRIPTION) {
    await this.page.fill('[data-testid="job-description-input"]', description);
  }

  async generateAISuggestions() {
    await this.page.click('[data-testid="generate-suggestions"]');
    await expect(this.page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
  }

  async acceptFirstSuggestion() {
    await this.page.click('[data-testid="suggestion-accept"]:first-child');
  }

  async rejectFirstSuggestion() {
    await this.page.click('[data-testid="suggestion-reject"]:first-child');
  }

  async getEditorContent() {
    return await this.page.locator('[data-testid="editor-content"]').textContent();
  }

  async getPreviewContent() {
    return await this.page.locator('[data-testid="preview-content"]').textContent();
  }

  async switchToSplitView() {
    await this.page.click('[data-testid="view-split"]');
  }

  async switchToPreviewView() {
    await this.page.click('[data-testid="view-preview"]');
  }

  async exportAsDOCX() {
    const downloadPromise = this.page.waitForDownload();
    await this.page.click('[data-testid="export-docx"]');
    return await downloadPromise;
  }

  async exportAsPDF() {
    const downloadPromise = this.page.waitForDownload();
    await this.page.click('[data-testid="export-pdf"]');
    return await downloadPromise;
  }
}

// Extended test with fixtures
export const test = base.extend<{
  homePage: HomePage;
  apiKeyPage: APIKeyPage;
  resumeEditor: ResumeEditor;
}>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  apiKeyPage: async ({ page }, use) => {
    const apiKeyPage = new APIKeyPage(page);
    await use(apiKeyPage);
  },

  resumeEditor: async ({ page }, use) => {
    const resumeEditor = new ResumeEditor(page);
    await use(resumeEditor);
  },
});

export { expect } from '@playwright/test';