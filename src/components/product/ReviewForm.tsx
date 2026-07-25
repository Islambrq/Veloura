import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import type { Review } from '@/types';

interface ReviewFormProps {
  productId: string;
  userId: string;
  existingReview: Review | null;
  onSaved: () => void;
}

export function ReviewForm({ productId, userId, existingReview, onSaved }: ReviewFormProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [title, setTitle] = useState(existingReview?.title ?? '');
  const [body, setBody] = useState(existingReview?.body ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(!existingReview);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from('reviews').upsert(
      {
        product_id: productId,
        user_id: userId,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
      },
      { onConflict: 'product_id,user_id' }
    );

    setIsSubmitting(false);

    if (error) {
      showToast('Could not save your review.', 'error');
    } else {
      showToast('Review saved.', 'success');
      setIsEditing(false);
      onSaved();
    }
  }

  async function handleDelete() {
    if (!existingReview) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('reviews').delete().eq('id', existingReview.id);
    setIsSubmitting(false);
    if (error) showToast('Could not delete review.', 'error');
    else {
      showToast('Review deleted.', 'success');
      onSaved();
    }
  }

  if (existingReview && !isEditing) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink/60">You've reviewed this product.</p>
        <button onClick={() => setIsEditing(true)} className="text-sm text-cobalt hover:underline">
          Edit
        </button>
        <button onClick={handleDelete} className="text-sm text-danger hover:underline">
          Delete
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 max-w-lg">
      <h3 className="font-medium mb-3">{existingReview ? 'Edit your review' : 'Write a review'}</h3>

      <div className="mb-3">
        <label className="label">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              className="p-0.5"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 20 20"
                fill={n <= rating ? '#B8935B' : 'none'}
                stroke={n <= rating ? '#B8935B' : 'currentColor'}
                strokeWidth="1"
              >
                <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="label" htmlFor="review-title">Title (optional)</label>
        <input
          id="review-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="mb-4">
        <label className="label" htmlFor="review-body">Review (optional)</label>
        <textarea
          id="review-body"
          className="input min-h-24"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Save review'}
        </button>
        {existingReview && (
          <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
