import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceTag } from '../PriceTag';

describe('PriceTag', () => {
  it('renders the price', () => {
    render(<PriceTag price={42} />);
    expect(screen.getByText('$42.00')).toBeInTheDocument();
  });

  it('shows a struck-through compare-at price when on sale', () => {
    render(<PriceTag price={30} compareAtPrice={45} />);
    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('does not show a compare-at price when it is lower than the price', () => {
    render(<PriceTag price={30} compareAtPrice={20} />);
    expect(screen.queryByText('$20.00')).not.toBeInTheDocument();
  });

  it('does not show a compare-at price when none is given', () => {
    render(<PriceTag price={30} />);
    expect(screen.queryByText(/line-through/)).not.toBeInTheDocument();
  });
});
