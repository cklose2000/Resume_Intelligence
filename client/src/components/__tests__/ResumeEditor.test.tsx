import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeEditor } from '../ResumeEditor';

describe('ResumeEditor', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    content: '<p>Initial content</p>',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render the editor with initial content', () => {
      render(<ResumeEditor {...defaultProps} />);
      
      // TipTap renders content in a contenteditable div
      const editor = screen.getByRole('textbox');
      expect(editor).toBeInTheDocument();
      expect(editor.innerHTML).toContain('Initial content');
    });

    it('should render formatting toolbar', () => {
      render(<ResumeEditor {...defaultProps} />);
      
      // Check for formatting buttons
      expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Underline')).toBeInTheDocument();
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
      expect(screen.getByTitle('Ordered List')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ResumeEditor {...defaultProps} className="custom-class" />
      );
      
      const editorWrapper = container.firstChild;
      expect(editorWrapper).toHaveClass('custom-class');
    });

    it('should render in read-only mode', () => {
      render(<ResumeEditor {...defaultProps} editable={false} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('contenteditable', 'false');
      
      // Toolbar should be hidden in read-only mode
      expect(screen.queryByTitle('Bold')).not.toBeInTheDocument();
    });
  });

  describe('Formatting Operations', () => {
    it('should toggle bold formatting', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const boldButton = screen.getByTitle('Bold');
      const editor = screen.getByRole('textbox');
      
      // Select some text (simulate selection)
      editor.focus();
      
      // Click bold button
      await user.click(boldButton);
      
      // Verify onChange was called
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should toggle italic formatting', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const italicButton = screen.getByTitle('Italic');
      await user.click(italicButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should toggle underline formatting', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const underlineButton = screen.getByTitle('Underline');
      await user.click(underlineButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should apply heading levels', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const h1Button = screen.getByTitle('Heading 1');
      await user.click(h1Button);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should create bullet lists', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const bulletButton = screen.getByTitle('Bullet List');
      await user.click(bulletButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should create ordered lists', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const orderedButton = screen.getByTitle('Ordered List');
      await user.click(orderedButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should handle text alignment', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const alignCenterButton = screen.getByTitle('Center');
      await user.click(alignCenterButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Content Changes', () => {
    it('should call onChange when content is typed', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      
      // Type some content
      await user.click(editor);
      await user.keyboard('New text');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should handle paste events', async () => {
      render(<ResumeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      
      // Simulate paste event
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => 'Pasted content',
      });
      
      fireEvent(editor, pasteEvent);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Undo/Redo', () => {
    it('should handle undo operation', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const undoButton = screen.getByTitle('Undo');
      
      // Type something first
      const editor = screen.getByRole('textbox');
      await user.click(editor);
      await user.keyboard('Test');
      
      // Then undo
      await user.click(undoButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(2); // Once for typing, once for undo
      });
    });

    it('should handle redo operation', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const redoButton = screen.getByTitle('Redo');
      const undoButton = screen.getByTitle('Undo');
      
      // Type, undo, then redo
      const editor = screen.getByRole('textbox');
      await user.click(editor);
      await user.keyboard('Test');
      await user.click(undoButton);
      await user.click(redoButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('AI Suggestions', () => {
    it('should highlight AI suggestions', () => {
      const suggestions = [
        {
          id: '1',
          type: 'edit' as const,
          section: 'experience' as const,
          index: 0,
          field: 'description',
          original: 'Initial content',
          suggested: 'Improved content',
          reason: 'Better keywords',
          impact: 'high' as const,
        },
      ];
      
      render(
        <ResumeEditor
          {...defaultProps}
          aiSuggestions={suggestions}
        />
      );
      
      const editor = screen.getByRole('textbox');
      expect(editor.innerHTML).toContain('mark');
    });

    it('should apply AI suggestion on click', async () => {
      const user = userEvent.setup();
      const suggestions = [
        {
          id: '1',
          type: 'edit' as const,
          section: 'experience' as const,
          index: 0,
          field: 'description',
          original: 'Initial content',
          suggested: 'Improved content',
          reason: 'Better keywords',
          impact: 'high' as const,
        },
      ];
      
      render(
        <ResumeEditor
          {...defaultProps}
          aiSuggestions={suggestions}
        />
      );
      
      // Find and click the highlighted suggestion
      const highlight = screen.getByText('Initial content');
      await user.click(highlight);
      
      // Should show tooltip with apply button
      const applyButton = await screen.findByText('Apply');
      await user.click(applyButton);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
        expect(lastCall[0]).toContain('Improved content');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ResumeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
    });

    it('should support keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      await user.click(editor);
      
      // Test Ctrl+B for bold
      await user.keyboard('{Control>}b{/Control}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should maintain focus after formatting', async () => {
      const user = userEvent.setup();
      render(<ResumeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      const boldButton = screen.getByTitle('Bold');
      
      await user.click(editor);
      await user.click(boldButton);
      
      expect(document.activeElement).toBe(editor);
    });
  });

  describe('Performance', () => {
    it('should handle large documents without lag', async () => {
      const largeContent = '<p>'.concat(
        Array(1000).fill('Large paragraph content. ').join(''),
        '</p>'
      );
      
      const startTime = performance.now();
      render(
        <ResumeEditor
          content={largeContent}
          onChange={mockOnChange}
        />
      );
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
      
      const editor = screen.getByRole('textbox');
      expect(editor).toBeInTheDocument();
    });
  });
});