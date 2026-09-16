import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BakeLogsGrid from './BakeLogsGrid';
import type { BakeLog } from '../lib/api';

describe('BakeLogsGrid', () => {
  const mockLogs: BakeLog[] = [
    {
      _id: '2',
      recipeId: 'r1',
      notes: 'Second bake was amazing',
      date: new Date('2023-02-01').toISOString(),
      isPersonalBest: true,
      imageUrls: []
    },
    {
      _id: '1',
      recipeId: 'r1',
      notes: 'First bake was okay',
      date: new Date('2023-01-01').toISOString(),
      isPersonalBest: false,
      imageUrls: ['https://example.com/img1.jpg']
    }
  ];

  it('numbers attempts from the oldest, so a number keeps meaning the same bake', () => {
    render(<BakeLogsGrid logs={mockLogs} onSelect={vi.fn()} />);

    // Logs arrive newest first; the newest is still the second attempt.
    expect(screen.getByText('Make 2')).toBeInTheDocument();
    expect(screen.getByText('Make 1')).toBeInTheDocument();
  });

  it('opens a make on the first click, with no flip in the way', () => {
    const handleSelect = vi.fn();
    render(<BakeLogsGrid logs={mockLogs} onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /^Make 2,/i }));
    expect(handleSelect).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('keeps the notes reachable without hovering', () => {
    render(<BakeLogsGrid logs={mockLogs} onSelect={vi.fn()} />);
    expect(screen.getByText('First bake was okay')).toBeInTheDocument();
    expect(screen.getByText('Second bake was amazing')).toBeInTheDocument();
  });

  it('marks a personal best in text as well as an icon', () => {
    render(<BakeLogsGrid logs={mockLogs} onSelect={vi.fn()} />);
    expect(screen.getByText('Personal best')).toBeInTheDocument();
  });

  it('offers a shareable card per bake', () => {
    const handleExport = vi.fn();
    render(<BakeLogsGrid logs={mockLogs} onSelect={vi.fn()} onExportInstagram={handleExport} />);

    const controls = screen.getAllByRole('button', { name: /Export a card for make/i });
    expect(controls).toHaveLength(2);

    fireEvent.click(controls[0]);
    expect(handleExport).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('draws an unlit invitation when nothing has been logged', () => {
    render(<BakeLogsGrid logs={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/No bakes logged/i)).toBeInTheDocument();
  });
});
