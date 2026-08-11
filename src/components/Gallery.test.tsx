import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Gallery from './Gallery';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getBakeLogs: vi.fn(),
    getRecipes: vi.fn()
  }
}));

const mockBakeLogs = [
  { _id: '1', recipeId: { _id: 'r1', title: 'Sourdough' }, date: '2023-01-01', notes: 'Good', imageUrls: ['img1.jpg'] },
  { _id: '2', recipeId: { _id: 'r2', title: 'Cookies' }, date: '2023-01-02', notes: 'Great', imageUrls: ['img2.jpg', 'img3.jpg'] },
  { _id: '3', recipeId: { _id: 'r1', title: 'Sourdough' }, date: '2023-01-03', notes: 'Best', imageUrls: [] } // No photos
];

const mockRecipes = [
  { _id: 'r1', title: 'Sourdough' },
  { _id: 'r2', title: 'Cookies' }
];

describe('Gallery Component', () => {
  beforeEach(() => {
    vi.mocked(api.getBakeLogs).mockResolvedValue(mockBakeLogs as any);
    vi.mocked(api.getRecipes).mockResolvedValue(mockRecipes as any);
  });

  it('renders loading state initially', () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    expect(screen.getByText(/Loading History/i)).toBeDefined();
  });

  it('renders empty state if no logs have photos', async () => {
    vi.mocked(api.getBakeLogs).mockResolvedValue([mockBakeLogs[2]] as any);
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/No baked items logged yet/i)).toBeDefined();
    });
  });

  it('renders photos from bake logs', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(3); // img1, img2, img3
    });
  });

  it('sorts photos by date by default', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getAllByText(/2023/i).length).toBeGreaterThan(0);
    });
  });

  it('sorts photos by recipe when toggled', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText(/2023/i).length).toBeGreaterThan(0));
    
    const recipeSortBtn = screen.getByText('By Recipe');
    fireEvent.click(recipeSortBtn);
    
    await waitFor(() => {
      expect(screen.getAllByText('Sourdough').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Cookies').length).toBeGreaterThan(0);
    });
  });
});
