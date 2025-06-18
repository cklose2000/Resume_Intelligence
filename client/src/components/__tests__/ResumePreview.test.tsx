import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResumePreview } from '../ResumePreview';

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div data-testid="markdown-content">{children}</div>,
}));

describe('ResumePreview', () => {
  const defaultProps = {
    content: '<h1>John Doe</h1><p>Software Engineer</p>',
  };

  beforeEach(() => {
    // Reset any mocked values
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any global styles that might have been added
    document.head.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render preview content', () => {
      render(<ResumePreview {...defaultProps} />);
      
      const preview = screen.getByTestId('resume-preview');
      expect(preview).toBeInTheDocument();
      expect(preview.innerHTML).toContain('John Doe');
      expect(preview.innerHTML).toContain('Software Engineer');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ResumePreview {...defaultProps} className="custom-preview" />
      );
      
      expect(container.firstChild).toHaveClass('custom-preview');
    });

    it('should render zoom controls', () => {
      render(<ResumePreview {...defaultProps} />);
      
      expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
      expect(screen.getByTitle('Print')).toBeInTheDocument();
    });

    it('should render empty state when no content', () => {
      render(<ResumePreview content="" />);
      
      const preview = screen.getByTestId('resume-preview');
      expect(preview.innerHTML).toBe('');
    });

    it('should sanitize HTML content', () => {
      const maliciousContent = '<h1>Title</h1><script>alert("XSS")</script><p>Safe content</p>';
      render(<ResumePreview content={maliciousContent} />);
      
      const preview = screen.getByTestId('resume-preview');
      expect(preview.innerHTML).toContain('Title');
      expect(preview.innerHTML).toContain('Safe content');
      expect(preview.innerHTML).not.toContain('<script>');
      expect(preview.innerHTML).not.toContain('alert');
    });
  });

  describe('Zoom Functionality', () => {
    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      const zoomInButton = screen.getByTitle('Zoom in');
      const zoomDisplay = screen.getByText('100%');
      
      await user.click(zoomInButton);
      
      expect(screen.getByText('125%')).toBeInTheDocument();
      
      // Check transform style is applied
      const previewContent = screen.getByTestId('resume-preview');
      expect(previewContent.parentElement).toHaveStyle({
        transform: 'scale(1.25)',
      });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      const zoomOutButton = screen.getByTitle('Zoom out');
      
      await user.click(zoomOutButton);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
      
      const previewContent = screen.getByTestId('resume-preview');
      expect(previewContent.parentElement).toHaveStyle({
        transform: 'scale(0.75)',
      });
    });

    it('should not zoom beyond maximum (200%)', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      const zoomInButton = screen.getByTitle('Zoom in');
      
      // Click zoom in multiple times
      for (let i = 0; i < 10; i++) {
        await user.click(zoomInButton);
      }
      
      expect(screen.getByText('200%')).toBeInTheDocument();
      expect(screen.queryByText('225%')).not.toBeInTheDocument();
    });

    it('should not zoom below minimum (25%)', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      const zoomOutButton = screen.getByTitle('Zoom out');
      
      // Click zoom out multiple times
      for (let i = 0; i < 10; i++) {
        await user.click(zoomOutButton);
      }
      
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });

    it('should handle keyboard shortcuts for zoom', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      // Focus on the preview area
      const preview = screen.getByTestId('resume-preview');
      preview.focus();
      
      // Ctrl + Plus for zoom in
      await user.keyboard('{Control>}+{/Control}');
      expect(screen.getByText('125%')).toBeInTheDocument();
      
      // Ctrl + Minus for zoom out
      await user.keyboard('{Control>}-{/Control}');
      expect(screen.getByText('100%')).toBeInTheDocument();
      
      // Ctrl + 0 for reset zoom
      await user.keyboard('{Control>}0{/Control}');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Print Functionality', () => {
    it('should trigger print when print button is clicked', async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(<ResumePreview {...defaultProps} />);
      
      const printButton = screen.getByTitle('Print');
      await user.click(printButton);
      
      expect(printSpy).toHaveBeenCalledTimes(1);
      
      printSpy.mockRestore();
    });

    it('should apply print styles before printing', async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(<ResumePreview {...defaultProps} />);
      
      const printButton = screen.getByTitle('Print');
      await user.click(printButton);
      
      // Check if print styles are applied
      const styleElements = document.head.querySelectorAll('style');
      const hasPrintStyles = Array.from(styleElements).some(style => 
        style.textContent?.includes('@media print')
      );
      
      expect(hasPrintStyles).toBe(true);
      
      printSpy.mockRestore();
    });

    it('should handle Ctrl+P keyboard shortcut', async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(<ResumePreview {...defaultProps} />);
      
      await user.keyboard('{Control>}p{/Control}');
      
      expect(printSpy).toHaveBeenCalledTimes(1);
      
      printSpy.mockRestore();
    });
  });

  describe('Content Updates', () => {
    it('should update preview when content changes', () => {
      const { rerender } = render(<ResumePreview {...defaultProps} />);
      
      expect(screen.getByTestId('resume-preview')).toHaveTextContent('John Doe');
      
      rerender(<ResumePreview content="<h1>Jane Smith</h1><p>Product Manager</p>" />);
      
      expect(screen.getByTestId('resume-preview')).toHaveTextContent('Jane Smith');
      expect(screen.getByTestId('resume-preview')).toHaveTextContent('Product Manager');
    });

    it('should maintain zoom level when content updates', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ResumePreview {...defaultProps} />);
      
      // Zoom in first
      const zoomInButton = screen.getByTitle('Zoom in');
      await user.click(zoomInButton);
      expect(screen.getByText('125%')).toBeInTheDocument();
      
      // Update content
      rerender(<ResumePreview content="<h1>Updated Content</h1>" />);
      
      // Zoom level should be maintained
      expect(screen.getByText('125%')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile screens', () => {
      // Mock mobile viewport
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

      render(<ResumePreview {...defaultProps} />);
      
      // On mobile, zoom controls should be more compact
      const zoomControls = screen.getByLabelText('Zoom controls');
      expect(zoomControls).toHaveClass('gap-1'); // Smaller gap on mobile
    });

    it('should show scroll indicators for long content', () => {
      const longContent = '<div>' + 
        Array(100).fill('<p>Lorem ipsum dolor sit amet</p>').join('') + 
        '</div>';
      
      render(<ResumePreview content={longContent} />);
      
      const scrollContainer = screen.getByTestId('resume-preview').parentElement;
      expect(scrollContainer).toHaveClass('overflow-auto');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ResumePreview {...defaultProps} />);
      
      expect(screen.getByLabelText('Resume preview')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom controls')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    });

    it('should announce zoom level changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      const zoomInButton = screen.getByTitle('Zoom in');
      await user.click(zoomInButton);
      
      // Check for live region announcement
      const zoomDisplay = screen.getByText('125%');
      expect(zoomDisplay).toHaveAttribute('aria-live', 'polite');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ResumePreview {...defaultProps} />);
      
      // Tab through controls
      await user.tab();
      expect(screen.getByTitle('Zoom out')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('100%')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTitle('Zoom in')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTitle('Print')).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should handle large documents without performance issues', () => {
      const largeContent = '<div>' + 
        Array(1000).fill('<p>Section content with various formatting</p>').join('') + 
        '</div>';
      
      const startTime = performance.now();
      render(<ResumePreview content={largeContent} />);
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render in less than 500ms
      
      const preview = screen.getByTestId('resume-preview');
      expect(preview).toBeInTheDocument();
    });

    it('should debounce zoom operations', async () => {
      const user = userEvent.setup();
      let transformCount = 0;
      
      const { container } = render(<ResumePreview {...defaultProps} />);
      
      // Monitor transform changes
      const observer = new MutationObserver(() => {
        transformCount++;
      });
      
      const previewContent = screen.getByTestId('resume-preview').parentElement!;
      observer.observe(previewContent, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
      
      const zoomInButton = screen.getByTitle('Zoom in');
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await user.click(zoomInButton);
      }
      
      // Should batch updates
      await waitFor(() => {
        expect(transformCount).toBeLessThan(5);
      });
      
      observer.disconnect();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid HTML gracefully', () => {
      const invalidHTML = '<h1>Unclosed tag<p>Some content';
      
      expect(() => {
        render(<ResumePreview content={invalidHTML} />);
      }).not.toThrow();
      
      const preview = screen.getByTestId('resume-preview');
      expect(preview).toBeInTheDocument();
    });

    it('should recover from print errors', async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
        throw new Error('Print failed');
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<ResumePreview {...defaultProps} />);
      
      const printButton = screen.getByTitle('Print');
      await user.click(printButton);
      
      // Should handle error gracefully
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Print failed:',
        expect.any(Error)
      );
      
      // UI should still be functional
      expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
      
      printSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});