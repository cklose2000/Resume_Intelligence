import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeWorkspace } from '../../ResumeWorkspace';
import { openaiClient } from '@/lib/openaiClient';

// Mock OpenAI client
vi.mock('@/lib/openaiClient', () => ({
  openaiClient: {
    hasApiKey: vi.fn().mockReturnValue(true),
    generateStructuredSuggestions: vi.fn(),
    applyStructuredEdits: vi.fn(),
  },
}));

// Mock DocumentStructureParser for predictable behavior
vi.mock('@/lib/documentStructure', () => ({
  DocumentStructureParser: vi.fn().mockImplementation((content) => ({
    parse: () => ({
      contact: { name: 'John Doe', email: 'john@example.com' },
      summary: 'Experienced developer',
      experience: [{
        id: '1',
        position: 'Senior Developer',
        company: 'Tech Corp',
        startDate: '2020',
        endDate: 'Present',
        description: ['Led team of 5 developers'],
      }],
      education: [],
      skills: [],
    }),
    toHTML: (structure) => {
      return `<h1>${structure.contact.name}</h1>
<p>${structure.contact.email}</p>
<h2>Summary</h2>
<p>${structure.summary}</p>
<h2>Experience</h2>
<h3>${structure.experience[0]?.position} - ${structure.experience[0]?.company}</h3>
<p>${structure.experience[0]?.description.join('\n')}</p>`;
    },
    applyStructuredEdits: (structure, operation) => {
      // Simple mock implementation
      const newStructure = { ...structure };
      operation.edits.forEach(edit => {
        if (edit.section === 'experience' && edit.index === 0) {
          newStructure.experience[0].description = [edit.suggested];
        }
      });
      return newStructure;
    },
  })),
}));

describe('Editor-Preview Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Synchronization', () => {
    it('should update preview when editor content changes', async () => {
      const user = userEvent.setup();
      const mockOnContentChange = vi.fn();
      
      render(
        <ResumeWorkspace
          initialContent="<h1>Initial Name</h1>"
          onContentChange={mockOnContentChange}
          onExport={vi.fn()}
        />
      );

      // Find editor
      const editor = screen.getByRole('textbox');
      
      // Type new content
      await user.click(editor);
      await user.clear(editor);
      await user.type(editor, 'Updated Name');

      // Content change handler should be called
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalled();
      });

      // Preview should update (through the component's internal state)
      const preview = screen.getByTestId('resume-preview');
      await waitFor(() => {
        expect(preview).toHaveTextContent('John Doe'); // From our mock parser
      });
    });

    it('should maintain formatting between editor and preview', async () => {
      render(
        <ResumeWorkspace
          initialContent={`<h1>John Doe</h1>
<h2>Experience</h2>
<ul>
<li>Item 1</li>
<li>Item 2</li>
</ul>`}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Check editor has content
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveTextContent('John Doe');

      // Check preview maintains structure
      const preview = screen.getByTestId('resume-preview');
      expect(preview.querySelector('h1')).toHaveTextContent('John Doe');
      expect(preview.querySelector('h2')).toHaveTextContent('Summary');
    });
  });

  describe('AI Suggestions Flow', () => {
    it('should generate and apply AI suggestions', async () => {
      const user = userEvent.setup();
      
      const mockSuggestions = [{
        id: '1',
        type: 'edit' as const,
        section: 'experience' as const,
        index: 0,
        field: 'description',
        original: 'Led team of 5 developers',
        suggested: 'Led cross-functional team of 5 developers, delivering 3 major features',
        reason: 'Adds specificity and quantifiable achievements',
        impact: 'high' as const,
        category: 'Quantification',
      }];

      vi.mocked(openaiClient.generateStructuredSuggestions).mockResolvedValue(mockSuggestions);

      render(
        <ResumeWorkspace
          initialContent="<h1>John Doe</h1>"
          aiSuggestions={mockSuggestions}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Find AI suggestions panel
      const suggestionsPanel = screen.getByRole('region', { name: 'AI suggestions panel' });
      expect(suggestionsPanel).toBeInTheDocument();

      // Find and click apply button for the suggestion
      const applyButton = within(suggestionsPanel).getByTitle('Apply suggestion');
      await user.click(applyButton);

      // Content should be updated
      await waitFor(() => {
        const preview = screen.getByTestId('resume-preview');
        expect(preview).toHaveTextContent('Led cross-functional team of 5 developers');
      });
    });

    it('should highlight AI suggestions in editor', async () => {
      const mockSuggestions = [{
        id: '1',
        type: 'edit' as const,
        section: 'experience' as const,
        index: 0,
        field: 'description',
        original: 'Led team',
        suggested: 'Led cross-functional team',
        reason: 'Better description',
        impact: 'high' as const,
      }];

      render(
        <ResumeWorkspace
          initialContent="<p>Led team of developers</p>"
          aiSuggestions={mockSuggestions}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Editor should show highlighted suggestions
      const editor = screen.getByRole('textbox');
      const marks = editor.querySelectorAll('mark');
      expect(marks.length).toBeGreaterThan(0);
    });
  });

  describe('View Mode Transitions', () => {
    it('should maintain content state when switching view modes', async () => {
      const user = userEvent.setup();
      
      render(
        <ResumeWorkspace
          initialContent="<h1>Test Content</h1>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Initially in split view
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();

      // Switch to editor only
      await user.click(screen.getByTitle('Editor Only'));
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('resume-preview')).not.toBeInTheDocument();

      // Switch to preview only
      await user.click(screen.getByTitle('Preview Only'));
      expect(screen.queryByTestId('resume-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();

      // Content should be preserved
      expect(screen.getByTestId('resume-preview')).toHaveTextContent('John Doe');

      // Switch back to split view
      await user.click(screen.getByTitle('Split View'));
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });
  });

  describe('Export Workflow', () => {
    it('should export current content in selected format', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();
      
      render(
        <ResumeWorkspace
          initialContent="<h1>Export Test</h1>"
          optimizedContent="<h1>Optimized Export Test</h1>"
          onContentChange={vi.fn()}
          onExport={mockOnExport}
        />
      );

      // Open export menu
      await user.click(screen.getByText('Export'));

      // Select PDF export
      await user.click(screen.getByText('Export as PDF'));

      expect(mockOnExport).toHaveBeenCalledWith('pdf');
    });

    it('should export optimized content when available', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();
      
      render(
        <ResumeWorkspace
          initialContent="<h1>Original</h1>"
          optimizedContent="<h1>Optimized Content</h1>"
          onContentChange={vi.fn()}
          onExport={mockOnExport}
        />
      );

      // Preview should show optimized content
      const preview = screen.getByTestId('resume-preview');
      expect(preview).toHaveTextContent('John Doe'); // From our mock

      // Export should use optimized content
      await user.click(screen.getByText('Export'));
      await user.click(screen.getByText('Export as DOCX'));

      expect(mockOnExport).toHaveBeenCalledWith('docx');
    });
  });

  describe('Change Tracking Integration', () => {
    it('should track changes between original and optimized content', async () => {
      const user = userEvent.setup();
      
      render(
        <ResumeWorkspace
          initialContent="<p>Original content</p>"
          optimizedContent="<p>Optimized content with changes</p>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Toggle change tracking
      await user.click(screen.getByTitle('Toggle Change Tracking'));

      // Change tracker should be visible
      const changeTracker = screen.getByText('Change Tracking');
      expect(changeTracker).toBeInTheDocument();

      // Should show statistics
      expect(screen.getByText(/\+/)).toBeInTheDocument();
      expect(screen.getByText(/-/)).toBeInTheDocument();
    });

    it('should revert all changes when requested', async () => {
      const user = userEvent.setup();
      const mockOnContentChange = vi.fn();
      
      render(
        <ResumeWorkspace
          initialContent="<p>Original</p>"
          optimizedContent="<p>Modified</p>"
          onContentChange={mockOnContentChange}
          onExport={vi.fn()}
        />
      );

      // Open change tracking
      await user.click(screen.getByTitle('Toggle Change Tracking'));

      // Click revert all
      const revertButton = screen.getByTitle('Revert All');
      await user.click(revertButton);

      // Confirm revert
      const confirmButton = screen.getByText('Revert');
      await user.click(confirmButton);

      // Should trigger content change back to original
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle AI suggestion errors gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(openaiClient.generateStructuredSuggestions).mockRejectedValue(
        new Error('API Error')
      );

      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Workspace should still be functional
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn().mockRejectedValue(new Error('Export failed'));
      
      render(
        <ResumeWorkspace
          initialContent="<h1>Test</h1>"
          onContentChange={vi.fn()}
          onExport={mockOnExport}
        />
      );

      await user.click(screen.getByText('Export'));
      await user.click(screen.getByText('Export as PDF'));

      // Should not crash the application
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle rapid content changes efficiently', async () => {
      const user = userEvent.setup();
      const mockOnContentChange = vi.fn();
      
      render(
        <ResumeWorkspace
          initialContent="<p>Initial</p>"
          onContentChange={mockOnContentChange}
          onExport={vi.fn()}
        />
      );

      const editor = screen.getByRole('textbox');

      // Rapid typing
      await user.click(editor);
      for (let i = 0; i < 10; i++) {
        await user.keyboard('a');
      }

      // Should debounce updates
      await waitFor(() => {
        expect(mockOnContentChange.mock.calls.length).toBeLessThan(10);
      });
    });

    it('should handle large documents without performance degradation', () => {
      const largeContent = '<div>' + 
        Array(100).fill('<p>Lorem ipsum dolor sit amet</p>').join('') + 
        '</div>';

      const startTime = performance.now();
      render(
        <ResumeWorkspace
          initialContent={largeContent}
          onContentChange={vi.fn()}
          onExport={vi.fn()}
        />
      );
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });
  });
});