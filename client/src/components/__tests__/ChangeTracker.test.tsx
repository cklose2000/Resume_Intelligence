import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeTracker } from '../ChangeTracker';

// Mock the diff library
vi.mock('diff', () => ({
  diffLines: vi.fn((oldStr: string, newStr: string) => {
    // Simple mock implementation
    const changes: Array<{ removed?: boolean; added?: boolean; value: string }> = [];
    if (oldStr !== newStr) {
      changes.push({ removed: true, value: oldStr });
      changes.push({ added: true, value: newStr });
    } else {
      changes.push({ value: oldStr });
    }
    return changes;
  }),
  diffWords: vi.fn((oldStr: string, newStr: string) => {
    // Simple mock for word diff
    const changes: Array<{ removed?: boolean; added?: boolean; value: string }> = [];
    const oldWords = oldStr.split(' ');
    const newWords = newStr.split(' ');
    
    // Simple diff logic for testing
    if (oldStr === newStr) {
      changes.push({ value: oldStr });
    } else {
      changes.push({ removed: true, value: oldStr });
      changes.push({ added: true, value: newStr });
    }
    return changes;
  }),
}));

describe('ChangeTracker', () => {
  const mockOnAcceptChange = vi.fn();
  const mockOnRejectChange = vi.fn();
  const mockOnRevertAll = vi.fn();

  const defaultProps = {
    originalContent: 'Original resume content here',
    currentContent: 'Modified resume content here',
    onAcceptChange: mockOnAcceptChange,
    onRejectChange: mockOnRejectChange,
    onRevertAll: mockOnRevertAll,
  };

  beforeEach(() => {
    mockOnAcceptChange.mockClear();
    mockOnRejectChange.mockClear();
    mockOnRevertAll.mockClear();
  });

  describe('Rendering', () => {
    it('should render change tracking interface', () => {
      render(<ChangeTracker {...defaultProps} />);
      
      expect(screen.getByText('Change Tracking')).toBeInTheDocument();
      expect(screen.getByTitle('Hide')).toBeInTheDocument();
      expect(screen.getByTitle('Revert All')).toBeInTheDocument();
    });

    it('should display change statistics', () => {
      render(<ChangeTracker {...defaultProps} />);
      
      // Based on our mock, we have 1 addition and 1 deletion
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ChangeTracker {...defaultProps} className="custom-tracker" />
      );
      
      expect(container.firstChild).toHaveClass('custom-tracker');
    });

    it('should render without optional callbacks', () => {
      render(
        <ChangeTracker
          originalContent={defaultProps.originalContent}
          currentContent={defaultProps.currentContent}
        />
      );
      
      expect(screen.getByText('Change Tracking')).toBeInTheDocument();
      expect(screen.queryByTitle('Revert All')).not.toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('should toggle between inline and side-by-side view', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      // Initially in inline view
      expect(screen.getByText('Inline')).toHaveClass('secondary');
      
      // Switch to side-by-side
      const sideBySideButton = screen.getByText('Side by Side');
      await user.click(sideBySideButton);
      
      expect(sideBySideButton).toHaveClass('secondary');
      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('should display inline diff view correctly', () => {
      render(<ChangeTracker {...defaultProps} />);
      
      // Should show additions and deletions inline
      const additions = screen.getAllByTitle('Added');
      const deletions = screen.getAllByTitle('Removed');
      
      expect(additions.length).toBeGreaterThan(0);
      expect(deletions.length).toBeGreaterThan(0);
    });

    it('should display side-by-side view correctly', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      await user.click(screen.getByText('Side by Side'));
      
      // Should have two columns
      const columns = screen.getAllByRole('region');
      expect(columns.length).toBeGreaterThanOrEqual(2);
      
      // Original content on left
      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText(defaultProps.originalContent)).toBeInTheDocument();
      
      // Current content on right (with diff highlighting)
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  describe('Visibility Toggle', () => {
    it('should hide/show change details', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      // Initially visible
      expect(screen.getByText('View:')).toBeInTheDocument();
      
      // Click hide button
      const hideButton = screen.getByTitle('Hide');
      await user.click(hideButton);
      
      // Content should be hidden
      expect(screen.queryByText('View:')).not.toBeInTheDocument();
      
      // Button should change to show
      expect(screen.getByTitle('Show')).toBeInTheDocument();
      
      // Click show button
      await user.click(screen.getByTitle('Show'));
      
      // Content should be visible again
      expect(screen.getByText('View:')).toBeInTheDocument();
    });

    it('should maintain view mode when toggling visibility', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      // Switch to side-by-side
      await user.click(screen.getByText('Side by Side'));
      
      // Hide and show
      await user.click(screen.getByTitle('Hide'));
      await user.click(screen.getByTitle('Show'));
      
      // Should still be in side-by-side mode
      expect(screen.getByText('Side by Side')).toHaveClass('secondary');
    });
  });

  describe('Filtering', () => {
    it('should filter changes by type', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      // Open filter dropdown
      const filterSelect = screen.getByRole('combobox');
      await user.selectOptions(filterSelect, 'additions');
      
      // Should only show additions
      expect(screen.queryAllByTitle('Added').length).toBeGreaterThan(0);
      expect(screen.queryAllByTitle('Removed').length).toBe(0);
    });

    it('should show all changes when filter is reset', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      const filterSelect = screen.getByRole('combobox');
      
      // Filter to additions
      await user.selectOptions(filterSelect, 'additions');
      
      // Reset to all
      await user.selectOptions(filterSelect, 'all');
      
      // Should show both additions and deletions
      expect(screen.queryAllByTitle('Added').length).toBeGreaterThan(0);
      expect(screen.queryAllByTitle('Removed').length).toBeGreaterThan(0);
    });

    it('should update statistics when filtering', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      const filterSelect = screen.getByRole('combobox');
      
      // Initial stats
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
      
      // Filter to additions only
      await user.selectOptions(filterSelect, 'additions');
      
      // Stats should remain visible to show total counts
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('Revert Functionality', () => {
    it('should call onRevertAll when revert button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      const revertButton = screen.getByTitle('Revert All');
      await user.click(revertButton);
      
      expect(mockOnRevertAll).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog before reverting', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      const revertButton = screen.getByTitle('Revert All');
      await user.click(revertButton);
      
      // Should show confirmation dialog
      expect(screen.getByText(/Are you sure you want to revert all changes?/)).toBeInTheDocument();
      
      // Confirm revert
      const confirmButton = screen.getByText('Revert');
      await user.click(confirmButton);
      
      expect(mockOnRevertAll).toHaveBeenCalledTimes(1);
    });

    it('should cancel revert operation', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      await user.click(screen.getByTitle('Revert All'));
      
      // Cancel revert
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnRevertAll).not.toHaveBeenCalled();
    });
  });

  describe('No Changes', () => {
    it('should show no changes message when content is identical', () => {
      render(
        <ChangeTracker
          originalContent="Same content"
          currentContent="Same content"
        />
      );
      
      expect(screen.getByText('No changes detected')).toBeInTheDocument();
      expect(screen.getByText('+0')).toBeInTheDocument();
      expect(screen.getByText('-0')).toBeInTheDocument();
    });

    it('should disable revert button when no changes', () => {
      render(
        <ChangeTracker
          originalContent="Same content"
          currentContent="Same content"
          onRevertAll={mockOnRevertAll}
        />
      );
      
      const revertButton = screen.getByTitle('Revert All');
      expect(revertButton).toBeDisabled();
    });
  });

  describe('Complex Changes', () => {
    it('should handle multi-line changes', () => {
      const originalMultiline = `Line 1
Line 2
Line 3`;
      const currentMultiline = `Line 1
Modified Line 2
Line 3
New Line 4`;
      
      render(
        <ChangeTracker
          originalContent={originalMultiline}
          currentContent={currentMultiline}
        />
      );
      
      // Should detect additions and modifications
      expect(screen.getByText(/\+/)).toBeInTheDocument();
    });

    it('should handle special characters in diff', () => {
      render(
        <ChangeTracker
          originalContent="Code: function() { return 'hello'; }"
          currentContent="Code: function() { return 'world'; }"
        />
      );
      
      // Should not break with special characters
      expect(screen.getByText('Change Tracking')).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longOriginal = 'Lorem ipsum '.repeat(1000);
      const longCurrent = 'Lorem ipsum dolor '.repeat(1000);
      
      const startTime = performance.now();
      render(
        <ChangeTracker
          originalContent={longOriginal}
          currentContent={longCurrent}
        />
      );
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByText('Change Tracking')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ChangeTracker {...defaultProps} />);
      
      expect(screen.getByLabelText('View mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter changes')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChangeTracker {...defaultProps} />);
      
      // Tab through controls
      await user.tab();
      expect(screen.getByTitle('Hide')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTitle('Revert All')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Inline')).toHaveFocus();
    });

    it('should announce changes to screen readers', () => {
      render(<ChangeTracker {...defaultProps} />);
      
      // Statistics should be in a live region
      const statsContainer = screen.getByText('+1').closest('div');
      expect(statsContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive titles for changes', () => {
      render(<ChangeTracker {...defaultProps} />);
      
      const additions = screen.getAllByTitle('Added');
      const deletions = screen.getAllByTitle('Removed');
      
      expect(additions.length).toBeGreaterThan(0);
      expect(deletions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should efficiently handle large diffs', () => {
      const largeOriginal = Array(500).fill('Original line').join('\n');
      const largeCurrent = Array(500).fill('Modified line').join('\n');
      
      const startTime = performance.now();
      render(
        <ChangeTracker
          originalContent={largeOriginal}
          currentContent={largeCurrent}
        />
      );
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(2000);
      expect(screen.getByText('Change Tracking')).toBeInTheDocument();
    });

    it('should debounce rapid filter changes', async () => {
      const user = userEvent.setup();
      let renderCount = 0;
      
      const TestWrapper = () => {
        renderCount++;
        return <ChangeTracker {...defaultProps} />;
      };
      
      render(<TestWrapper />);
      const initialRenderCount = renderCount;
      
      const filterSelect = screen.getByRole('combobox');
      
      // Rapid filter changes
      await user.selectOptions(filterSelect, 'additions');
      await user.selectOptions(filterSelect, 'deletions');
      await user.selectOptions(filterSelect, 'modifications');
      await user.selectOptions(filterSelect, 'all');
      
      // Should batch updates efficiently
      expect(renderCount - initialRenderCount).toBeLessThan(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle diff library errors gracefully', () => {
      // Mock diff to throw error
      const diffModule = vi.mocked(await import('diff'));
      diffModule.diffLines.mockImplementation(() => {
        throw new Error('Diff failed');
      });
      
      // Should not crash
      expect(() => {
        render(<ChangeTracker {...defaultProps} />);
      }).not.toThrow();
      
      // Should show fallback UI
      expect(screen.getByText('Change Tracking')).toBeInTheDocument();
    });

    it('should handle undefined content gracefully', () => {
      render(
        <ChangeTracker
          originalContent={undefined as any}
          currentContent={null as any}
        />
      );
      
      expect(screen.getByText('No changes detected')).toBeInTheDocument();
    });
  });
});