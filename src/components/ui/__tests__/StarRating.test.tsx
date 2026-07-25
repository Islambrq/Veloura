import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarRating } from '../StarRating';

describe('StarRating', () => {
  it('exposes the rating via an accessible label', () => {
    render(<StarRating rating={4} />);
    expect(screen.getByLabelText('Rated 4 out of 5')).toBeInTheDocument();
  });

  it('shows the review count when provided', () => {
    render(<StarRating rating={4.5} reviewCount={128} />);
    expect(screen.getByText('(128)')).toBeInTheDocument();
  });

  it('omits the review count when not provided', () => {
    render(<StarRating rating={4.5} />);
    expect(screen.queryByText(/^\(/)).not.toBeInTheDocument();
  });
});
