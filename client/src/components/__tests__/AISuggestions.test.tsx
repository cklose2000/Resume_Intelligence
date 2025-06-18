import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AISuggestions } from '../AISuggestions';

describe('AISuggestions', () => {
  const mockOnApply = vi.fn();
  const mockOnReject = vi.fn();

  const mockSuggestions = [
    {
      id: '1',
      type: 'edit' as const,
      section: 'experience',
      index: 0,
      field: 'description',
      original: 'Led development team',
      suggested: 'Led cross-functional development team of 8 engineers',
      reason: 'Adds specificity and team size for better impact',
      confidence: 0.9,
      impact: 'high' as const,
      category: 'Quantification'
    },
    {
      id: '2',
      type: 'addition' as const,
      section: 'skills',
      suggested: 'Cloud: AWS, Azure, Docker',
      reason: 'Missing cloud skills that match job requirements',
      confidence: 0.85,
      impact: 'medium' as const,
      category: 'Keywords'
    },
    {
      id: '3',
      type: 'edit' as const,
      section: 'summary',
      original: 'Software engineer with experience',
      suggested: 'Results-driven software engineer with 5+ years experience',
      reason: 'Stronger opening with quantified experience',
      confidence: 0.8,
      impact: 'high' as const,
      category: 'Impact'
    },
    {
      id: '4',
      type: 'removal' as const,
      section: 'experience',
      index: 2,
      suggested: '',
      reason: 'Outdated technology stack not relevant to target role',
      confidence: 0.7,
      impact: 'low' as const,
      category: 'Relevance'
    }
  ];

  const defaultProps = {
    suggestions: mockSuggestions,
    onApplySuggestion: mockOnApply,
    onRejectSuggestion: mockOnReject,
  };

  beforeEach(() => {
    mockOnApply.mockClear();
    mockOnReject.mockClear();
  });

  describe('Rendering', () => {
    it('should render all suggestions', () => {
      render(<AISuggestions {...defaultProps} />);
      
      expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      expect(screen.getAllByTestId(/suggestion-item/)).toHaveLength(4);
    });

    it('should display suggestion details correctly', () => {
      render(<AISuggestions {...defaultProps} />);
      
      // Check first suggestion
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      expect(within(firstSuggestion).getByText('Quantification')).toBeInTheDocument();
      expect(within(firstSuggestion).getByText('High Impact')).toBeInTheDocument();
      expect(within(firstSuggestion).getByText(/Led cross-functional development team/)).toBeInTheDocument();
      expect(within(firstSuggestion).getByText(/Adds specificity and team size/)).toBeInTheDocument();
    });

    it('should show different icons for different suggestion types', () => {
      render(<AISuggestions {...defaultProps} />);
      
      // Edit suggestion should have Edit icon
      const editSuggestion = screen.getByTestId('suggestion-item-1');
      expect(within(editSuggestion).getByTestId('edit-icon')).toBeInTheDocument();
      
      // Addition suggestion should have Plus icon
      const addSuggestion = screen.getByTestId('suggestion-item-2');
      expect(within(addSuggestion).getByTestId('plus-icon')).toBeInTheDocument();
      
      // Removal suggestion should have Minus icon
      const removalSuggestion = screen.getByTestId('suggestion-item-4');
      expect(within(removalSuggestion).getByTestId('minus-icon')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AISuggestions {...defaultProps} className="custom-suggestions" />
      );
      
      expect(container.firstChild).toHaveClass('custom-suggestions');
    });

    it('should show empty state when no suggestions', () => {
      render(<AISuggestions {...defaultProps} suggestions={[]} />);
      
      expect(screen.getByText('No AI suggestions available')).toBeInTheDocument();
      expect(screen.getByText(/Generate suggestions by analyzing/)).toBeInTheDocument();
    });


    it('should display confidence scores', () => {
      render(<AISuggestions {...defaultProps} />);
      
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      expect(within(firstSuggestion).getByText('90%')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter suggestions by category', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Open filter dropdown
      const filterButton = screen.getByText('All Categories');
      await user.click(filterButton);
      
      // Select Quantification category
      const quantificationOption = screen.getByText('Quantification');
      await user.click(quantificationOption);
      
      // Should only show suggestions with Quantification category
      expect(screen.getAllByTestId(/suggestion-item/)).toHaveLength(1);
      expect(screen.getByTestId('suggestion-item-1')).toBeInTheDocument();
    });

    it('should filter suggestions by impact level', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Click on High impact filter
      const highImpactFilter = screen.getByText('High');
      await user.click(highImpactFilter);
      
      // Should only show high impact suggestions
      const suggestions = screen.getAllByTestId(/suggestion-item/);
      expect(suggestions).toHaveLength(2); // Two high impact suggestions
    });

    it('should filter suggestions by type', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Click on Edit type filter
      const editTypeFilter = screen.getByTitle('Edit suggestions');
      await user.click(editTypeFilter);
      
      // Should only show edit type suggestions
      const suggestions = screen.getAllByTestId(/suggestion-item/);
      expect(suggestions).toHaveLength(2); // Two edit suggestions
    });

    it('should support multiple filters simultaneously', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Apply impact filter
      await user.click(screen.getByText('High'));
      
      // Apply type filter
      await user.click(screen.getByTitle('Edit suggestions'));
      
      // Should show only high impact edit suggestions
      const suggestions = screen.getAllByTestId(/suggestion-item/);
      expect(suggestions).toHaveLength(2);
    });

    it('should clear filters', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Apply a filter
      await user.click(screen.getByText('High'));
      expect(screen.getAllByTestId(/suggestion-item/)).toHaveLength(2);
      
      // Clear filter
      await user.click(screen.getByTitle('Clear filters'));
      expect(screen.getAllByTestId(/suggestion-item/)).toHaveLength(4);
    });
  });

  describe('Interactions', () => {
    it('should apply individual suggestion', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      const applyButton = within(firstSuggestion).getByTitle('Apply suggestion');
      
      await user.click(applyButton);
      
      expect(mockOnApply).toHaveBeenCalledWith('1');
      expect(mockOnApply).toHaveBeenCalledTimes(1);
    });

    it('should reject individual suggestion', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      const rejectButton = within(firstSuggestion).getByTitle('Reject suggestion');
      
      await user.click(rejectButton);
      
      expect(mockOnReject).toHaveBeenCalledWith('1');
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('should expand/collapse suggestion details', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      
      // Initially collapsed - full text not visible
      expect(within(firstSuggestion).queryByText(/Led development team/)).not.toBeInTheDocument();
      
      // Click to expand
      await user.click(firstSuggestion);
      
      // Now should show original vs suggested comparison
      expect(within(firstSuggestion).getByText('Original:')).toBeInTheDocument();
      expect(within(firstSuggestion).getByText(/Led development team/)).toBeInTheDocument();
    });

    it('should apply all suggestions when Apply All is clicked', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      const applyAllButton = screen.getByText('Apply All');
      await user.click(applyAllButton);
      
      // Should call onApplySuggestion for each suggestion
      expect(mockOnApply).toHaveBeenCalledTimes(4);
    });

    it('should handle sequential applies correctly', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Apply first suggestion
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      await user.click(within(firstSuggestion).getByText('Apply'));
      
      // Should have called onApplySuggestion once
      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnApply).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('should update UI after applying suggestions', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Apply a suggestion
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      await user.click(within(firstSuggestion).getByText('Apply'));
      
      // The apply button should be replaced with applied indicator
      expect(within(firstSuggestion).getByText('Applied')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort suggestions by impact', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      const sortButton = screen.getByText('Sort by: Impact');
      await user.click(sortButton);
      
      await user.click(screen.getByText('Confidence'));
      
      // Check order changed
      const suggestions = screen.getAllByTestId(/suggestion-item/);
      expect(suggestions[0]).toHaveAttribute('data-testid', 'suggestion-item-1'); // 90% confidence
    });

    it('should sort suggestions by confidence', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      const sortButton = screen.getByText('Sort by: Impact');
      await user.click(sortButton);
      await user.click(screen.getByText('Confidence'));
      
      const suggestions = screen.getAllByTestId(/suggestion-item/);
      const firstSuggestion = suggestions[0];
      expect(within(firstSuggestion).getByText('90%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AISuggestions {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: 'AI suggestions panel' })).toBeInTheDocument();
      expect(screen.getByLabelText('Filter suggestions')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Apply suggestion/ })).toHaveLength(4);
      expect(screen.getAllByRole('button', { name: /Reject suggestion/ })).toHaveLength(4);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      // Tab to first suggestion
      await user.tab();
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      expect(firstSuggestion).toHaveFocus();
      
      // Enter to expand
      await user.keyboard('{Enter}');
      expect(within(firstSuggestion).getByText('Original:')).toBeInTheDocument();
      
      // Tab to apply button
      await user.tab();
      const applyButton = within(firstSuggestion).getByTitle('Apply suggestion');
      expect(applyButton).toHaveFocus();
      
      // Space to click
      await user.keyboard(' ');
      expect(mockOnApply).toHaveBeenCalledWith('1');
    });

    it('should announce filter changes', async () => {
      const user = userEvent.setup();
      render(<AISuggestions {...defaultProps} />);
      
      await user.click(screen.getByText('High'));
      
      // Should have live region announcement
      expect(screen.getByText('Showing 2 suggestions')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('should handle large number of suggestions', () => {
      const manySuggestions = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        type: 'edit' as const,
        section: 'experience' as const,
        suggested: `Suggestion ${i}`,
        reason: `Reason ${i}`,
        confidence: Math.random(),
        impact: ['high', 'medium', 'low'][i % 3] as any,
        category: `Category ${i % 5}`
      }));
      
      const startTime = performance.now();
      render(<AISuggestions {...defaultProps} suggestions={manySuggestions} />);
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(500);
      expect(screen.getAllByTestId(/suggestion-item/)).toHaveLength(100);
    });

    it('should virtualize long lists', () => {
      const manySuggestions = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        type: 'edit' as const,
        section: 'experience' as const,
        suggested: `Suggestion ${i}`,
        reason: `Reason ${i}`,
        confidence: 0.8,
        impact: 'medium' as const,
        category: 'Test'
      }));
      
      render(<AISuggestions {...defaultProps} suggestions={manySuggestions} />);
      
      // Should not render all 1000 items at once
      const renderedItems = screen.getAllByTestId(/suggestion-item/);
      expect(renderedItems.length).toBeLessThan(100); // Virtualized
    });
  });

  describe('Error Handling', () => {
    it('should handle apply errors gracefully', async () => {
      const user = userEvent.setup();
      const errorOnApply = vi.fn().mockRejectedValue(new Error('Apply failed'));
      
      render(<AISuggestions {...defaultProps} onApplySuggestion={errorOnApply} />);
      
      const firstSuggestion = screen.getByTestId('suggestion-item-1');
      const applyButton = within(firstSuggestion).getByTitle('Apply suggestion');
      
      await user.click(applyButton);
      
      // Should show error state
      await screen.findByText('Failed to apply suggestion');
    });

    it('should handle missing suggestion data', () => {
      const incompleteSuggestions = [
        {
          id: '1',
          type: 'edit' as const,
          section: 'experience' as const,
          suggested: '', // Empty suggestion
          reason: '',
        } as any
      ];
      
      render(<AISuggestions {...defaultProps} suggestions={incompleteSuggestions} />);
      
      // Should still render without crashing
      expect(screen.getByTestId('suggestion-item-1')).toBeInTheDocument();
    });
  });
});