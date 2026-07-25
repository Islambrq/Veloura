import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { isValidEmail, isValidPassword } from '@/utils/validators';

export function AccountPage() {
  const { user, profile, isAnonymous, refreshProfile, linkGuestAccount } = useAuth();
  const { showToast } = useToast();

  if (isAnonymous) {
    return <GuestUpgradeForm onLinked={refreshProfile} linkGuestAccount={linkGuestAccount} />;
  }

  return (
    <ProfileEditor
      userEmail={user?.email ?? ''}
      initialFullName={profile?.full_name ?? ''}
      initialPhone={profile?.phone ?? ''}
      userId={user?.id}
      onSaved={refreshProfile}
      showToast={showToast}
    />
  );
}

function GuestUpgradeForm({
  onLinked,
  linkGuestAccount,
}: {
  onLinked: () => void;
  linkGuestAccount: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (!isValidPassword(password)) return setError('Password must be at least 8 characters.');

    setIsSaving(true);
    setError(null);
    const { error: linkError } = await linkGuestAccount(email, password, fullName.trim());
    setIsSaving(false);

    if (linkError) setError(linkError);
    else {
      setDone(true);
      onLinked();
    }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-14 text-center">
        <h1 className="font-display text-2xl mb-3">Check your email</h1>
        <p className="text-ink/60 text-sm">
          Confirm your address at {email} to finish saving your account. Your
          cart and order history are already attached — nothing else to do.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <h1 className="font-display text-3xl mb-2">Save your account</h1>
      <p className="text-sm text-ink/60 mb-6">
        You're currently checked out as a guest. Add an email and password to
        keep your order history and wishlist for next time.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <FormField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={isSaving} className="btn-primary w-full">
          {isSaving ? <Spinner className="w-4 h-4" /> : 'Save account'}
        </button>
      </form>
    </div>
  );
}

function ProfileEditor({
  userEmail,
  initialFullName,
  initialPhone,
  userId,
  onSaved,
  showToast,
}: {
  userEmail: string;
  initialFullName: string;
  initialPhone: string;
  userId: string | undefined;
  onSaved: () => void;
  showToast: (message: string, tone?: 'default' | 'success' | 'error') => void;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', userId);
    setIsSaving(false);
    if (error) showToast('Could not save changes.', 'error');
    else {
      showToast('Account updated.', 'success');
      onSaved();
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <h1 className="font-display text-3xl mb-6">Your account</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="Email" value={userEmail} disabled />
        <FormField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <FormField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button type="submit" disabled={isSaving} className="btn-primary w-full">
          {isSaving ? <Spinner className="w-4 h-4" /> : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
