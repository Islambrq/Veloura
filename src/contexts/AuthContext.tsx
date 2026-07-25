import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAnonymous: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  continueAsGuest: () => Promise<{ error: string | null }>;
  linkGuestAccount: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  // Guest checkout: creates a real (anonymous) Supabase auth user, so the
  // guest gets a real auth.uid() and every existing RLS policy, cart, and
  // order flow works completely unchanged — no separate "guest order" path.
  // Requires "Allow anonymous sign-ins" enabled in the Supabase Auth
  // dashboard settings (disabled by default).
  const continueAsGuest = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error: error?.message ?? null };
  };

  // Converts the current anonymous session into a permanent account (same
  // user id, so their cart/orders/wishlist carry over automatically).
  const linkGuestAccount = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.updateUser({
      email,
      password,
      data: { full_name: fullName },
    });
    if (!error) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user?.id ?? '');
    }
    return { error: error?.message ?? null };
  };

  const isAnonymous = user?.is_anonymous ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAnonymous,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        continueAsGuest,
        linkGuestAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
