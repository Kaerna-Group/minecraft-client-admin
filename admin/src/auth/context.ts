import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
