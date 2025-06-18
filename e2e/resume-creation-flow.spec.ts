import { test, expect } from './fixtures/test-fixtures';

test.describe('Complete Resume Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a fresh session
    await page.goto('/');
  });

  test('should complete full resume creation flow', async ({ 
    page, 
    homePage, 
    apiKeyPage, 
    resumeEditor 
  }) => {
    // Step 1: Navigate to editor
    await homePage.goto();
    await homePage.isLoaded();
    await homePage.navigateToEditor();

    // Step 2: Handle API key (skip for testing)
    await apiKeyPage.skipAPIKey();

    // Step 3: Upload resume content
    await resumeEditor.uploadResumeText();
    await resumeEditor.waitForResumeProcessed();

    // Step 4: Verify content is loaded in editor
    const editorContent = await resumeEditor.getEditorContent();
    expect(editorContent).toContain('John Doe');
    expect(editorContent).toContain('Software Engineer');

    // Step 5: Test view switching
    await resumeEditor.switchToSplitView();
    await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();

    await resumeEditor.switchToPreviewView();
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="editor-panel"]')).not.toBeVisible();

    // Step 6: Verify preview content matches editor
    const previewContent = await resumeEditor.getPreviewContent();
    expect(previewContent).toContain('John Doe');
    expect(previewContent).toContain('Software Engineer');

    // Step 7: Test export functionality
    const download = await resumeEditor.exportAsDOCX();
    expect(download.suggestedFilename()).toMatch(/resume.*\.docx/);
  });

  test('should handle large resume files', async ({ 
    page, 
    homePage, 
    apiKeyPage, 
    resumeEditor 
  }) => {
    // Create a large resume text (simulate complex resume)
    const largeResumeText = `
John Smith
Senior Software Architect
john.smith@email.com | (555) 987-6543

PROFESSIONAL SUMMARY
Highly experienced software architect with 15+ years of experience in designing and implementing scalable enterprise applications. Expert in microservices architecture, cloud computing, and team leadership.

EXPERIENCE

Senior Software Architect | MegaTech Corporation | 2018-Present
• Designed and implemented microservices architecture serving 10M+ users
• Led team of 25 engineers across 5 different product teams
• Reduced system latency by 60% through architectural improvements
• Established engineering best practices and coding standards
• Migrated legacy monolith to cloud-native architecture on AWS
• Implemented DevOps practices reducing deployment time by 80%

Technical Lead | InnovateNext Solutions | 2015-2018
• Built scalable e-commerce platform handling $50M+ annual revenue
• Implemented real-time analytics system processing 1B+ events daily
• Led adoption of React and Node.js across organization
• Mentored 15+ junior and mid-level developers
• Designed and implemented API gateway and service mesh

Senior Software Engineer | TechStartup Inc | 2012-2015
• Developed core platform features using Java Spring and React
• Implemented automated testing framework improving code quality
• Built CI/CD pipelines reducing release cycles from weeks to hours
• Optimized database queries improving application performance by 40%

Software Engineer | DevCorp | 2009-2012
• Built web applications using PHP, JavaScript, and MySQL
• Implemented responsive design for mobile optimization
• Collaborated with UX team on user interface improvements
• Contributed to open source projects and technical documentation

EDUCATION

Master of Science in Computer Science
Stanford University | 2007-2009
Specialization: Distributed Systems and Machine Learning

Bachelor of Science in Computer Engineering
MIT | 2003-2007
Magna Cum Laude, Phi Beta Kappa

TECHNICAL SKILLS

Programming Languages:
• Expert: Java, JavaScript, TypeScript, Python, Go
• Proficient: C++, Rust, Scala, Kotlin
• Familiar: C#, PHP, Ruby

Frameworks & Libraries:
• Frontend: React, Angular, Vue.js, Next.js, Svelte
• Backend: Spring Boot, Express.js, FastAPI, Django
• Mobile: React Native, Flutter

Cloud & Infrastructure:
• AWS (EC2, S3, Lambda, RDS, CloudFormation)
• Google Cloud Platform (GKE, BigQuery, Cloud Functions)
• Azure (AKS, Cosmos DB, Functions)
• Kubernetes, Docker, Terraform, Helm

Databases:
• SQL: PostgreSQL, MySQL, Oracle, SQL Server
• NoSQL: MongoDB, DynamoDB, Cassandra, Redis
• Search: Elasticsearch, Solr
• Graph: Neo4j, Amazon Neptune

DevOps & Tools:
• CI/CD: Jenkins, GitLab CI, GitHub Actions, Azure DevOps
• Monitoring: Prometheus, Grafana, DataDog, New Relic
• Version Control: Git, SVN
• Project Management: Jira, Confluence, Slack

CERTIFICATIONS
• AWS Certified Solutions Architect - Professional (2023)
• Google Cloud Professional Cloud Architect (2022)
• Certified Kubernetes Administrator (2021)
• PMP - Project Management Professional (2020)

ACHIEVEMENTS
• Patent holder for "Distributed Cache Invalidation System" (US Patent #11,234,567)
• Speaker at AWS re:Invent 2023, 2022, and 2021
• Technical reviewer for O'Reilly Media publications
• Open source contributor with 10,000+ GitHub stars across projects
• Winner of TechCrunch Disrupt Hackathon 2019

PUBLICATIONS
• "Microservices Architecture Patterns" - IEEE Software (2023)
• "Scaling Web Applications" - Communications of ACM (2022)
• "Modern DevOps Practices" - Journal of Software Engineering (2021)

LANGUAGES
• English (Native)
• Spanish (Professional)
• Mandarin (Conversational)
    `.trim();

    await homePage.goto();
    await homePage.navigateToEditor();
    await apiKeyPage.skipAPIKey();

    // Upload large resume
    await resumeEditor.uploadResumeText(largeResumeText);
    await resumeEditor.waitForResumeProcessed();

    // Verify content loads properly
    const editorContent = await resumeEditor.getEditorContent();
    expect(editorContent).toContain('John Smith');
    expect(editorContent).toContain('Senior Software Architect');
    expect(editorContent).toContain('MegaTech Corporation');

    // Test that view switching still works with large content
    await resumeEditor.switchToSplitView();
    await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();
  });

  test('should handle resume editing and real-time preview', async ({ 
    page, 
    homePage, 
    apiKeyPage, 
    resumeEditor 
  }) => {
    await homePage.goto();
    await homePage.navigateToEditor();
    await apiKeyPage.skipAPIKey();
    await resumeEditor.uploadResumeText();
    await resumeEditor.waitForResumeProcessed();

    // Switch to split view for editing
    await resumeEditor.switchToSplitView();

    // Edit content in the editor
    await page.locator('[data-testid="editor-content"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Updated content for testing real-time preview');

    // Verify preview updates in real-time
    await page.waitForTimeout(1000); // Allow for debounced updates
    const previewContent = await resumeEditor.getPreviewContent();
    expect(previewContent).toContain('Updated content for testing');
  });
});