import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-3xl mb-2">Page not found</h1>
      <p className="text-ink/60 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Back home</Link>
    </div>
  );
}
