import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { fetchCurrentUserRoles } from '@entities/admin/api/admin-api';
import { AuthContext, type AuthContextValue } from '@features/auth/model/context';
import { getRoleCapabilities, type AdminRole } from '@features/auth/model/roles';
import { supabase } from '@shared/api/supabase';
import { isSupabaseConfigured } from '@shared/config/env';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const loadRoles = useCallback(async (userId: string) => {
    setRoleLoading(true);

    try {
      const nextRoles = await fetchCurrentUserRoles(userId);
      setRoles(nextRoles.map((entry) => entry.role as AdminRole));
    } catch {
      setRoles([]);
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      setSession(data.session);
      setLoading(false);

      if (data.session?.user.id) {
        await loadRoles(data.session.user.id);
      } else {
        setRoles([]);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);

      if (nextSession?.user.id) {
        await loadRoles(nextSession.user.id);
      } else {
        setRoles([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadRoles]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase environment variables are missing.' };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase environment variables are missing.' };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { error: error.message };
    }

    if (data.session) {
      return { message: 'Registration complete. You are signed in.' };
    }

    return {
      message: 'Registration complete. Check your email if confirmation is enabled, then sign in.',
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setRoles([]);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setRoles([]);
  }, []);

  const capabilities = getRoleCapabilities(roles);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      roleLoading,
      session,
      roles,
      ...capabilities,
      signIn,
      signUp,
      signOut,
    }),
    [capabilities, loading, roleLoading, roles, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
