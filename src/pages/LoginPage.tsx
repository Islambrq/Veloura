import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { isValidEmail } from '@/utils/validators';

export function LoginPage() {
  const { signIn, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContinuingAsGuest, setIsContinuingAsGuest] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) setError(signInError);
    else navigate(nextPath);
  }

  async function handleGuestCheckout() {
    setIsContinuingAsGuest(true);
    setError(null);
    const { error: guestError } = await continueAsGuest();
    setIsContinuingAsGuest(false);
    if (guestError) {
      setError(
        guestError.includes('Anonymous')
          ? 'Guest checkout is not enabled on this store yet.'
          : guestError
      );
    } else {
      navigate(nextPath);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="font-display text-3xl mb-6">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <FormField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-ink/60 mt-5">
        New here?{' '}
        <Link to="/register" className="text-cobalt hover:underline">
          Create an account
        </Link>
      </p>

      {nextPath === '/checkout' && (
        <>
          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-line flex-1" />
            <span className="text-xs text-ink/40 uppercase tracking-wide">or</span>
            <div className="h-px bg-line flex-1" />
          </div>
          <button
            onClick={handleGuestCheckout}
            disabled={isContinuingAsGuest}
            className="btn-secondary w-full"
          >
            {isContinuingAsGuest ? <Spinner className="w-4 h-4" /> : 'Continue as guest'}
          </button>
          <p className="text-xs text-ink/40 mt-2">
            You can still track your order — creating an account afterward lets you save it to your history.
          </p>
        </>
      )}
    </div>
  );
}
