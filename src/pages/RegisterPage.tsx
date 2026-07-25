import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { isValidEmail, isValidPassword } from '@/utils/validators';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return setError('Enter your name.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (!isValidPassword(password)) return setError('Password must be at least 8 characters.');

    setIsSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(email, password, fullName.trim());
    setIsSubmitting(false);

    if (signUpError) setError(signUpError);
    else setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl mb-3">Check your email</h1>
        <p className="text-ink/60 text-sm mb-6">
          We sent a confirmation link to {email}. Confirm your address, then sign in.
        </p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="font-display text-3xl mb-6">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <FormField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-ink/60 mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-cobalt hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
