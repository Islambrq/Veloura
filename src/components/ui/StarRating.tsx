interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}

export function StarRating({ rating, reviewCount, size = 'sm' }: StarRatingProps) {
  const rounded = Math.round(rating * 2) / 2;
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';

  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rated ${rating} out of 5`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => {
          const fillPct = Math.max(0, Math.min(1, rounded - (n - 1))) * 100;
          return (
            <span key={n} className={`relative ${dim}`}>
              <svg viewBox="0 0 20 20" className={`${dim} text-line`} fill="currentColor">
                <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8z" />
              </svg>
              <span
                className="absolute inset-0 overflow-hidden text-gold"
                style={{ width: `${fillPct}%` }}
              >
                <svg viewBox="0 0 20 20" className={dim} fill="currentColor">
                  <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8z" />
                </svg>
              </span>
            </span>
          );
        })}
      </div>
      {reviewCount !== undefined && (
        <span className="text-xs text-ink/50">({reviewCount})</span>
      )}
    </div>
  );
}
