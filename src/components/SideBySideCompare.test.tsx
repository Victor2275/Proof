import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SideBySideCompare from './SideBySideCompare';

describe('SideBySideCompare Component', () => {
  const doughUrl = 'http://example.com/dough.jpg';
  const bakedUrl = 'http://example.com/baked.jpg';

  it('renders dough and baked labels correctly', () => {
    render(<SideBySideCompare doughUrl={doughUrl} bakedUrl={bakedUrl} />);
    expect(screen.getByText(/Dough \/ Prep/i)).toBeDefined();
    expect(screen.getByText(/Finished Bake/i)).toBeDefined();
  });

  it('renders both side-by-side images with accurate src attributes', () => {
    render(<SideBySideCompare doughUrl={doughUrl} bakedUrl={bakedUrl} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('src')).toBe(doughUrl);
    expect(images[1].getAttribute('src')).toBe(bakedUrl);
  });
});
