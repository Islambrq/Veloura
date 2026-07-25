import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductFilters } from '../ProductFilters';
import type { Category } from '@/types';

const categories: Category[] = [
  {
    id: '1',
    parent_id: null,
    name: 'Outdoors',
    slug: 'outdoors',
    description: null,
    image_url: null,
    display_order: 0,
    is_active: true,
  },
];

function renderFilters(overrides: Partial<React.ComponentProps<typeof ProductFilters>> = {}) {
  const props = {
    categories,
    activeCategory: null,
    onCategoryChange: vi.fn(),
    sort: 'newest',
    onSortChange: vi.fn(),
    minPrice: null,
    maxPrice: null,
    onPriceChange: vi.fn(),
    minRating: null,
    onMinRatingChange: vi.fn(),
    inStockOnly: false,
    onInStockOnlyChange: vi.fn(),
    ...overrides,
  };
  render(<ProductFilters {...props} />);
  return props;
}

describe('ProductFilters', () => {
  it('renders a button for each category plus "All"', () => {
    renderFilters();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outdoors' })).toBeInTheDocument();
  });

  it('calls onCategoryChange with the clicked category slug', async () => {
    const user = userEvent.setup();
    const props = renderFilters();
    await user.click(screen.getByRole('button', { name: 'Outdoors' }));
    expect(props.onCategoryChange).toHaveBeenCalledWith('outdoors');
  });

  it('calls onCategoryChange with null when "All" is clicked', async () => {
    const user = userEvent.setup();
    const props = renderFilters({ activeCategory: 'outdoors' });
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(props.onCategoryChange).toHaveBeenCalledWith(null);
  });

  it('toggles in-stock-only and reports the new value', async () => {
    const user = userEvent.setup();
    const props = renderFilters();
    await user.click(screen.getByLabelText(/in stock only/i));
    expect(props.onInStockOnlyChange).toHaveBeenCalledWith(true);
  });

  it('reports a minimum rating selection', async () => {
    const user = userEvent.setup();
    const props = renderFilters();
    await user.selectOptions(screen.getByLabelText('Minimum rating'), '4');
    expect(props.onMinRatingChange).toHaveBeenCalledWith(4);
  });
});
