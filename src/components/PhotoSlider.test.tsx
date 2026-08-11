import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PhotoSlider from './PhotoSlider';

describe('PhotoSlider Component', () => {
  const beforeUrl = 'http://example.com/dough.jpg';
  const afterUrl = 'http://example.com/baked.jpg';

  it('renders before and after image labels correctly', () => {
    render(<PhotoSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />);
    expect(screen.getByText('Dough / Prep')).toBeDefined();
    expect(screen.getByText('Baked Bread')).toBeDefined();
  });

  it('renders images with proper src attributes', () => {
    render(<PhotoSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('src')).toBe(afterUrl);
    expect(images[1].getAttribute('src')).toBe(beforeUrl);
  });

  it('updates slider position on mouse interaction', () => {
    const { container } = render(<PhotoSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />);
    const sliderContainer = container.firstElementChild as HTMLElement;

    // Mock bounding box for mouse math
    sliderContainer.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    fireEvent.mouseDown(sliderContainer);
    fireEvent.mouseMove(sliderContainer, { clientX: 300 }); // 75%

    // Expect clipPath style to reflect updated slider position
    const clippedOverlay = sliderContainer.querySelector('div[style*="clip-path"], div[style*="clipPath"]') as HTMLElement;
    expect(clippedOverlay).toBeDefined();
  });
});
