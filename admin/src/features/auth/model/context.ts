import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

import type { AdminRole, RoleCapabilities } from './roles';

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  roleLoading: boolean;
  roleError: string;
  session: Session | null;
  roles: AdminRole[];
} & RoleCapabilities & {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
