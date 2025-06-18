import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeWorkspace } from '../ResumeWorkspace';

// Mock the ResizablePanelGroup components
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resize-handle" />,
}));

// Mock child components
vi.mock('../ResumeEditor', () => ({
  ResumeEditor: ({ content, onChange }: any) => (
    <div data-testid="resume-editor">
      <div>{content}</div>
      <button onClick={() => onChange('updated content')}>Update</button>
    </div>
  ),
}));

vi.mock('../ResumePreview', () => ({
  ResumePreview: ({ content }: any) => (
    <div data-testid="resume-preview">{content}</div>
  ),
}));

vi.mock('../AISuggestions', () => ({
  AISuggestions: ({ suggestions, onApply }: any) => (
    <div data-testid="ai-suggestions">
      {suggestions.map((s: any) => (
        <div key={s.id}>
          <span>{s.suggested}</span>
          <button onClick={() => onApply(s.id)}>Apply</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../ChangeTracker', () => ({
  ChangeTracker: ({ originalContent, currentContent }: any) => (
    <div data-testid="change-tracker">
      <div>Original: {originalContent}</div>
      <div>Current: {currentContent}</div>
    </div>
  ),
}));

describe('ResumeWorkspace', () => {
  const mockOnContentChange = vi.fn();
  const mockOnExport = vi.fn();

  const defaultProps = {
    initialContent: '<p>Initial resume content</p>',
    onContentChange: mockOnContentChange,
    onExport: mockOnExport,
  };

  beforeEach(() => {
    mockOnContentChange.mockClear();
    mockOnExport.mockClear();
  });

  describe('Rendering', () => {
    it('should render all panels in split view mode', () => {
      render(<ResumeWorkspace {...defaultProps} />);

      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
      expect(screen.getByTestId('ai-suggestions')).toBeInTheDocument();
    });

    it('should render toolbar with view mode controls', () => {
      render(<ResumeWorkspace {...defaultProps} />);

      expect(screen.getByTitle('Editor Only')).toBeInTheDocument();
      expect(screen.getByTitle('Preview Only')).toBeInTheDocument();
      expect(screen.getByTitle('Split View')).toBeInTheDocument();
    });

    it('should render export menu', () => {
      render(<ResumeWorkspace {...defaultProps} />);

      const exportButton = screen.getByText('Export');
      expect(exportButton).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ResumeWorkspace {...defaultProps} className="custom-workspace" />
      );

      expect(container.firstChild).toHaveClass('custom-workspace');
    });
  });

  describe('View Modes', () => {
    it('should switch to editor-only mode', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      const editorOnlyButton = screen.getByTitle('Editor Only');
      await user.click(editorOnlyButton);

      // In editor-only mode, preview should not be visible
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('resume-preview')).not.toBeInTheDocument();
    });

    it('should switch to preview-only mode', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      const previewOnlyButton = screen.getByTitle('Preview Only');
      await user.click(previewOnlyButton);

      // In preview-only mode, editor should not be visible
      expect(screen.queryByTestId('resume-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });

    it('should return to split view mode', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      // First switch to editor only
      await user.click(screen.getByTitle('Editor Only'));
      
      // Then back to split view
      await user.click(screen.getByTitle('Split View'));

      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    });
  });

  describe('Content Management', () => {
    it('should update content when editor changes', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      const updateButton = screen.getByText('Update');
      await user.click(updateButton);

      expect(mockOnContentChange).toHaveBeenCalledWith('updated content');
    });

    it('should sync content between editor and preview', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ResumeWorkspace {...defaultProps} />);

      // Update content through editor
      const updateButton = screen.getByText('Update');
      await user.click(updateButton);

      // Rerender with new content
      rerender(
        <ResumeWorkspace
          {...defaultProps}
          initialContent="<p>Updated content</p>"
        />
      );

      // Check preview has updated content
      const preview = screen.getByTestId('resume-preview');
      expect(preview).toHaveTextContent('Updated content');
    });

    it('should display optimized content when provided', () => {
      render(
        <ResumeWorkspace
          {...defaultProps}
          optimizedContent="<p>Optimized resume content</p>"
        />
      );

      const preview = screen.getByTestId('resume-preview');
      expect(preview).toHaveTextContent('Optimized resume content');
    });
  });

  describe('AI Suggestions', () => {
    const mockSuggestions = [
      {
        id: '1',
        type: 'edit' as const,
        section: 'experience' as const,
        suggested: 'Improved bullet point',
        reason: 'Better keywords',
        impact: 'high' as const,
      },
    ];

    it('should display AI suggestions', () => {
      render(
        <ResumeWorkspace
          {...defaultProps}
          aiSuggestions={mockSuggestions}
        />
      );

      expect(screen.getByText('Improved bullet point')).toBeInTheDocument();
    });

    it('should apply AI suggestion when clicked', async () => {
      const user = userEvent.setup();
      render(
        <ResumeWorkspace
          {...defaultProps}
          aiSuggestions={mockSuggestions}
        />
      );

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      // Should trigger content update
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalled();
      });
    });

    it('should toggle suggestions panel visibility', async () => {
      const user = userEvent.setup();
      render(
        <ResumeWorkspace
          {...defaultProps}
          aiSuggestions={mockSuggestions}
        />
      );

      const toggleButton = screen.getByTitle('Toggle AI Suggestions');
      
      // Initially visible
      expect(screen.getByTestId('ai-suggestions')).toBeInTheDocument();

      // Hide panel
      await user.click(toggleButton);
      expect(screen.queryByTestId('ai-suggestions')).not.toBeInTheDocument();

      // Show again
      await user.click(toggleButton);
      expect(screen.getByTestId('ai-suggestions')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should show export options on dropdown click', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      expect(screen.getByText('Export as DOCX')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
      expect(screen.getByText('Export as TXT')).toBeInTheDocument();
    });

    it('should call onExport with correct format', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      const pdfOption = screen.getByText('Export as PDF');
      await user.click(pdfOption);

      expect(mockOnExport).toHaveBeenCalledWith('pdf');
    });
  });

  describe('Change Tracking', () => {
    it('should toggle change tracking visibility', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      const toggleButton = screen.getByTitle('Toggle Change Tracking');
      
      // Initially not visible
      expect(screen.queryByTestId('change-tracker')).not.toBeInTheDocument();

      // Show change tracker
      await user.click(toggleButton);
      expect(screen.getByTestId('change-tracker')).toBeInTheDocument();

      // Hide again
      await user.click(toggleButton);
      expect(screen.queryByTestId('change-tracker')).not.toBeInTheDocument();
    });

    it('should pass correct content to change tracker', async () => {
      const user = userEvent.setup();
      render(
        <ResumeWorkspace
          {...defaultProps}
          optimizedContent="<p>Optimized content</p>"
        />
      );

      const toggleButton = screen.getByTitle('Toggle Change Tracking');
      await user.click(toggleButton);

      const changeTracker = screen.getByTestId('change-tracker');
      expect(changeTracker).toHaveTextContent('Original: <p>Initial resume content</p>');
      expect(changeTracker).toHaveTextContent('Current: <p>Optimized content</p>');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ResumeWorkspace {...defaultProps} />);

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      expect(screen.getByLabelText('View mode')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ResumeWorkspace {...defaultProps} />);

      // Tab through toolbar buttons
      await user.tab();
      expect(screen.getByTitle('Editor Only')).toHaveFocus();

      await user.tab();
      expect(screen.getByTitle('Preview Only')).toHaveFocus();

      await user.tab();
      expect(screen.getByTitle('Split View')).toHaveFocus();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for small screens', () => {
      // Mock window.matchMedia for mobile
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<ResumeWorkspace {...defaultProps} />);

      // On mobile, should default to editor-only view
      expect(screen.getByTestId('resume-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('resume-preview')).not.toBeInTheDocument();
    });
  });
});