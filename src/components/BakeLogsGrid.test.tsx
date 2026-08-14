import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BakeLogsGrid from './BakeLogsGrid';
import type { BakeLog } from '../lib/api';

describe('BakeLogsGrid', () => {
  const mockLogs: BakeLog[] = [
    {
      _id: '1',
      recipeId: 'r1',
      notes: 'First bake was okay',
      date: new Date('2023-01-01').toISOString(),
      isPersonalBest: false,
      imageUrls: ['https://example.com/img1.jpg']
    },
    {
      _id: '2',
      recipeId: 'r1',
      notes: 'Second bake was amazing',
      date: new Date('2023-02-01').toISOString(),
      isPersonalBest: true,
      imageUrls: []
    }
  ];

  it('renders a grid of logs with correct numbering', () => {
    render(<BakeLogsGrid logs={mockLogs} onSelect={vi.fn()} />);
    
    // Reverse chronological order typically means first log in array is the most recent (Make #2)
    expect(screen.getByText('Make #2')).toBeInTheDocument();
    expect(screen.getByText('Make #1')).toBeInTheDocument();
    
    // No photo fallback
    expect(screen.getByText('No Photo')).toBeInTheDocument();
  });

  it('flips the card when clicked', () => {
    const handleSelect = vi.fn();
    render(<BakeLogsGrid logs={mockLogs} onSelect={handleSelect} />);
    
    // Click the first make
    const make2 = screen.getByText('Make #2');
    fireEvent.click(make2);
    
    // Notes should be visible (they are in the DOM even when backface is hidden, but we verify interaction)
    expect(screen.getByText('First bake was okay')).toBeInTheDocument();
    
    // Since it's flipped now, a second click should trigger onSelect
    fireEvent.click(make2);
    expect(handleSelect).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('calls onExportInstagram when Export to Instagram button is clicked', () => {
    const handleExportInstagram = vi.fn();
    render(<BakeLogsGrid logs={mockLogs} onSelect={vi.fn()} onExportInstagram={handleExportInstagram} />);
    
    const exportButtons = screen.getAllByRole('button', { name: /export to instagram/i });
    expect(exportButtons.length).toBe(2);
    
    fireEvent.click(exportButtons[0]);
    expect(handleExportInstagram).toHaveBeenCalledWith(mockLogs[0]);
  });
});
