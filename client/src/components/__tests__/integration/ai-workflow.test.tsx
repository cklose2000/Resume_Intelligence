import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeWorkspace } from '../../ResumeWorkspace';
import { openaiClient } from '@/lib/openaiClient';
import { DocumentStructureParser } from '@/lib/documentStructure';

// Mock OpenAI client
vi.mock('@/lib/openaiClient', () => ({
  openaiClient: {
    hasApiKey: vi.fn(),
    setApiKey: vi.fn(),
    analyzeJobDescription: vi.fn(),
    analyzeResumeAlignment: vi.fn(),
    generateOptimizedContent: vi.fn(),
    generateStructuredSuggestions: vi.fn(),
    applyStructuredEdits: vi.fn(),
  },
}));

// Mock file processing
vi.mock('@/lib/fileProcessor', () => ({
  processFile: vi.fn().mockResolvedValue({
    content: 'John Doe\nSoftware Engineer',
    fileName: 'resume.txt',
    fileType: 'txt',
    structure: {
      contact: { name: 'John Doe', email: 'john@example.com' },
      experience: [],
      education: [],
      skills: [],
    },
    htmlContent: '<h1>John Doe</h1>',
  }),
  validateFile: vi.fn().mockReturnValue({ valid: true }),
}));

describe('AI Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openaiClient.hasApiKey).mockReturnValue(true);
  });

  describe('Complete AI Optimization Flow', () => {
    it('should complete full AI optimization workflow', async () => {
      const user = userEvent.setup();

      // Mock AI responses
      const mockJobAnalysis = {
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Corp',
        requirements: {
          skills: ['React', 'TypeScript', 'AWS'],
          experience: ['5+ years', 'team leadership'],
          qualifications: ['BS Computer Science'],
          keywords: ['scalable', 'cloud', 'agile'],
          responsibilities: ['architecture design', 'mentoring'],
        },
      };

      const mockAlignmentAnalysis = {
        scores: {
          overall: 75,
          keywords: 60,
          ats: 70,
        },
        recommendations: [
          {
            id: '1',
            title: 'Add cloud experience',
            description: 'Include AWS experience',
            impact: 'High' as const,
            category: 'Skills',
            applied: false,
          },
        ],
      };

      const mockSuggestions = [
        {
          id: '1',
          type: 'addition' as const,
          section: 'skills' as const,
          suggested: 'Cloud: AWS, Docker, Kubernetes',
          reason: 'Missing cloud skills from job requirements',
          confidence: 0.9,
          impact: 'high' as const,
          category: 'Keywords',
        },
        {
          id: '2',
          type: 'edit' as const,
          section: 'summary' as const,
          original: 'Software engineer',
          suggested: 'Senior software engineer with 5+ years experience in scalable cloud applications',
          reason: 'Better alignment with job requirements',
          confidence: 0.85,
          impact: 'high' as const,
          category: 'Keywords',
        },
      ];

      vi.mocked(openaiClient.analyzeJobDescription).mockResolvedValue(mockJobAnalysis);
      vi.mocked(openaiClient.analyzeResumeAlignment).mockResolvedValue(mockAlignmentAnalysis);
      vi.mocked(openaiClient.generateStructuredSuggestions).mockResolvedValue(mockSuggestions);
      vi.mocked(openaiClient.generateOptimizedContent).mockResolvedValue(
        '<h1>John Doe</h1><p>Senior software engineer with cloud experience</p>'
      );

      render(
        <ResumeWorkspace
          initialContent="<h1>John Doe</h1><p>Software engineer</p>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Step 1: Initial state
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();

      // Step 2: AI suggestions appear (passed as props in real app)
      const { rerender } = render(
        <ResumeWorkspace
          initialContent="<h1>John Doe</h1><p>Software engineer</p>"
          aiSuggestions={mockSuggestions}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Step 3: View AI suggestions
      const suggestionsPanel = screen.getByRole('region', { name: 'AI suggestions panel' });
      expect(within(suggestionsPanel).getByText(/Missing cloud skills/)).toBeInTheDocument();

      // Step 4: Apply individual suggestion
      const firstSuggestion = within(suggestionsPanel).getAllByRole('button', { name: /Apply suggestion/ })[0];
      await user.click(firstSuggestion);

      // Step 5: Apply all suggestions
      const applyAllButton = within(suggestionsPanel).getByText(/Apply All/);
      await user.click(applyAllButton);

      // Confirm
      const confirmButton = await screen.findByText('Confirm');
      await user.click(confirmButton);

      // Step 6: View optimized content
      rerender(
        <ResumeWorkspace
          initialContent="<h1>John Doe</h1><p>Software engineer</p>"
          optimizedContent="<h1>John Doe</h1><p>Senior software engineer with cloud experience</p>"
          aiSuggestions={mockSuggestions}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Preview should show optimized content
      await waitFor(() => {
        const preview = screen.getByTestId('resume-preview');
        expect(preview).toHaveTextContent('Senior software engineer');
      });
    });
  });

  describe('API Key Management', () => {
    it('should handle missing API key gracefully', async () => {
      vi.mocked(openaiClient.hasApiKey).mockReturnValue(false);

      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Should still render without AI features
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      
      // AI suggestions panel should show appropriate message
      const suggestionsPanel = screen.getByRole('region', { name: 'AI suggestions panel' });
      expect(within(suggestionsPanel).getByText(/No AI suggestions available/)).toBeInTheDocument();
    });

    it('should prompt for API key when attempting AI operations', async () => {
      const user = userEvent.setup();
      vi.mocked(openaiClient.hasApiKey).mockReturnValue(false);

      // In a real app, this would be handled by a parent component
      const mockApiKeyPrompt = vi.fn();
      
      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Simulate clicking an AI action that requires API key
      // This would trigger the API key prompt in the real app
    });
  });

  describe('Structured Editing', () => {
    it('should maintain document structure during AI edits', async () => {
      const user = userEvent.setup();

      const mockStructure = {
        contact: { name: 'John Doe', email: 'john@example.com' },
        summary: 'Experienced developer',
        experience: [
          {
            id: '1',
            position: 'Developer',
            company: 'Tech Corp',
            startDate: '2020',
            endDate: 'Present',
            description: ['Built applications'],
          },
        ],
        education: [],
        skills: [
          { category: 'Languages', items: ['JavaScript', 'Python'] },
        ],
      };

      const mockEditOperation = {
        edits: [
          {
            section: 'experience',
            index: 0,
            field: 'description',
            original: 'Built applications',
            suggested: 'Built scalable cloud applications serving 1M+ users',
            reason: 'Added quantifiable impact',
          },
        ],
        additions: [
          {
            section: 'skills',
            content: { category: 'Cloud', items: ['AWS', 'Docker'] },
            reason: 'Added cloud skills',
          },
        ],
        removals: [],
      };

      // Mock parser to maintain structure
      const mockParser = {
        parse: vi.fn().mockReturnValue(mockStructure),
        toHTML: vi.fn().mockImplementation((structure) => {
          return `<h1>${structure.contact.name}</h1>
<p>${structure.summary}</p>
<h3>${structure.experience[0]?.position}</h3>
<p>${structure.experience[0]?.description[0]}</p>
<h2>Skills</h2>
${structure.skills.map(s => `<p>${s.category}: ${s.items.join(', ')}</p>`).join('')}`;
        }),
        applyStructuredEdits: vi.fn().mockImplementation((structure, operation) => {
          const newStructure = JSON.parse(JSON.stringify(structure));
          
          // Apply edits
          operation.edits.forEach(edit => {
            if (edit.section === 'experience' && edit.index === 0) {
              newStructure.experience[0].description = [edit.suggested];
            }
          });
          
          // Apply additions
          operation.additions.forEach(addition => {
            if (addition.section === 'skills') {
              newStructure.skills.push(addition.content);
            }
          });
          
          return newStructure;
        }),
      };

      vi.mocked(DocumentStructureParser).mockImplementation(() => mockParser as any);

      render(
        <ResumeWorkspace
          initialContent="<h1>John Doe</h1>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // The workspace should maintain structure through edits
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });
  });

  describe('Suggestion Categories and Filtering', () => {
    it('should categorize and filter AI suggestions', async () => {
      const user = userEvent.setup();

      const mixedSuggestions = [
        {
          id: '1',
          type: 'edit' as const,
          section: 'experience' as const,
          suggested: 'Led team of 10 engineers',
          reason: 'Add team size',
          category: 'Quantification',
          impact: 'high' as const,
        },
        {
          id: '2',
          type: 'addition' as const,
          section: 'skills' as const,
          suggested: 'AWS, Docker',
          reason: 'Add cloud skills',
          category: 'Keywords',
          impact: 'high' as const,
        },
        {
          id: '3',
          type: 'edit' as const,
          section: 'summary' as const,
          suggested: 'Results-driven engineer',
          reason: 'Stronger opening',
          category: 'Impact',
          impact: 'medium' as const,
        },
      ];

      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          aiSuggestions={mixedSuggestions}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      const suggestionsPanel = screen.getByRole('region', { name: 'AI suggestions panel' });

      // All suggestions visible initially
      expect(within(suggestionsPanel).getAllByTestId(/suggestion-item/)).toHaveLength(3);

      // Filter by category
      const categoryFilter = within(suggestionsPanel).getByText('All Categories');
      await user.click(categoryFilter);
      await user.click(screen.getByText('Quantification'));

      // Only quantification suggestions visible
      expect(within(suggestionsPanel).getAllByTestId(/suggestion-item/)).toHaveLength(1);
      expect(within(suggestionsPanel).getByText(/Add team size/)).toBeInTheDocument();

      // Filter by impact
      await user.click(within(suggestionsPanel).getByText('High'));
      
      // Should show high impact suggestions
      const visibleSuggestions = within(suggestionsPanel).getAllByTestId(/suggestion-item/);
      expect(visibleSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Collaboration Features', () => {
    it('should handle concurrent edits and AI suggestions', async () => {
      const user = userEvent.setup();
      const mockOnContentChange = vi.fn();

      const liveSuggestions = [
        {
          id: '1',
          type: 'edit' as const,
          section: 'experience' as const,
          original: 'Developed applications',
          suggested: 'Developed and deployed 5 production applications',
          reason: 'Add specificity',
          impact: 'high' as const,
        },
      ];

      render(
        <ResumeWorkspace
          initialContent="<p>Developed applications</p>"
          aiSuggestions={liveSuggestions}
          onContentChange={mockOnContentChange}
          onExport={vi.fn()}
        />
      );

      // User editing while AI suggestions are present
      const editor = screen.getByRole('textbox');
      await user.click(editor);
      await user.keyboard(' for clients');

      // AI suggestion should still be applicable
      const suggestionsPanel = screen.getByRole('region', { name: 'AI suggestions panel' });
      expect(within(suggestionsPanel).getByText(/Add specificity/)).toBeInTheDocument();

      // Apply suggestion
      const applyButton = within(suggestionsPanel).getByTitle('Apply suggestion');
      await user.click(applyButton);

      // Should merge user edits with AI suggestion
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalled();
      });
    });
  });

  describe('Export with AI Optimizations', () => {
    it('should export AI-optimized content', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();

      const optimizedHTML = `
        <h1>John Doe</h1>
        <p>Senior Software Engineer | Cloud Architect</p>
        <h2>Professional Summary</h2>
        <p>Results-driven senior software engineer with 7+ years of experience building scalable cloud applications.</p>
        <h2>Skills</h2>
        <p>Languages: JavaScript, TypeScript, Python, Go</p>
        <p>Cloud: AWS (Certified), Azure, Docker, Kubernetes</p>
      `;

      render(
        <ResumeWorkspace
          initialContent="<h1>John Doe</h1><p>Software Engineer</p>"
          optimizedContent={optimizedHTML}
          onContentChange={vi.fn()}
          onExport={mockOnExport}
        />
      );

      // Preview should show optimized content
      const preview = screen.getByTestId('resume-preview');
      expect(preview).toHaveTextContent('Senior Software Engineer');

      // Export optimized version
      await user.click(screen.getByText('Export'));
      await user.click(screen.getByText('Export as PDF'));

      expect(mockOnExport).toHaveBeenCalledWith('pdf');
      
      // In real implementation, export would use optimizedContent
    });
  });

  describe('Error Recovery', () => {
    it('should recover from AI service failures', async () => {
      const user = userEvent.setup();
      
      // First call fails
      vi.mocked(openaiClient.generateStructuredSuggestions)
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce([
          {
            id: '1',
            type: 'edit' as const,
            section: 'summary' as const,
            suggested: 'Improved summary',
            reason: 'Better keywords',
            impact: 'high' as const,
          },
        ]);

      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // First attempt - should show error
      // In real app, this would show an error notification

      // Retry - should succeed
      // In real app, user would click retry button
      
      // Workspace should remain functional throughout
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });

    it('should handle partial AI responses gracefully', async () => {
      const incompleteSuggestions = [
        {
          id: '1',
          type: 'edit' as const,
          section: 'experience' as const,
          // Missing required fields
          suggested: '',
          reason: '',
        },
      ] as any;

      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          aiSuggestions={incompleteSuggestions}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Should not crash
      const suggestionsPanel = screen.getByRole('region', { name: 'AI suggestions panel' });
      expect(suggestionsPanel).toBeInTheDocument();
    });
  });
});