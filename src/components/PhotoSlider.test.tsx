import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PhotoSlider from './PhotoSlider';
import SideBySideCompare from './SideBySideCompare';

const beforeUrl = 'http://example.com/first.jpg';
const afterUrl = 'http://example.com/latest.jpg';

describe('the before-and-after slider', () => {
  it('captions both photographs in words', () => {
    render(<PhotoSlider beforeUrl={beforeUrl} afterUrl={afterUrl} beforeLabel="First · Aug 30" afterLabel="Latest · Oct 17" />);
    expect(screen.getByText('First · Aug 30')).toBeInTheDocument();
    expect(screen.getByText('Latest · Oct 17')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Latest · Oct 17' })).toHaveAttribute('src', afterUrl);
  });

  it('is a slider a keyboard can move, wiping between the two', () => {
    const { container } = render(<PhotoSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />);
    const slider = screen.getByRole('slider', { name: 'Compare Before and After' });
    fireEvent.change(slider, { target: { value: '75' } });
    expect((container.querySelector('[style*="clip-path"]') as HTMLElement).style.clipPath).toBe('inset(0 25% 0 0)');
  });
});

describe('two photographs side by side', () => {
  it('captions each under the picture', () => {
    render(<SideBySideCompare doughUrl={beforeUrl} bakedUrl={afterUrl} doughLabel="Dough" bakedLabel="Crumb" />);
    expect(screen.getByRole('img', { name: 'Dough' })).toHaveAttribute('src', beforeUrl);
    expect(screen.getByText('Crumb').tagName).toBe('FIGCAPTION');
  });
});
