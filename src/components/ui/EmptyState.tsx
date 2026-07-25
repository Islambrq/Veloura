import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <h3 className="font-display text-2xl mb-2">{title}</h3>
      {description && <p className="text-ink/60 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
