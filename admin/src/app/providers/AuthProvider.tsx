import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { AuthChangeEvent } from '@supabase/supabase-js';

import { fetchCurrentUserRoles } from '@entities/admin/api/admin-api';
import { AuthContext, type AuthContextValue } from '@features/auth/model/context';
import { getRoleCapabilities, type AdminRole } from '@features/auth/model/roles';
import { supabase } from '@shared/api/supabase';
import { isSupabaseConfigured } from '@shared/config/env';

const ROLE_LOAD_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Role lookup timed out.'));
      }, timeoutMs);
    }),
  ]);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const lastRoleUserIdRef = useRef<string | null>(null);
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const clearRoleState = useCallback(() => {
    lastRoleUserIdRef.current = null;
    setRoles([]);
    setRoleError('');
    setRoleLoading(false);
  }, []);

  const loadRoles = useCallback(async (userId: string, force = false) => {
    if (!force && lastRoleUserIdRef.current === userId && roles.length > 0) {
      return;
    }

    setRoleLoading(true);
    setRoleError('');

    try {
      const nextRoles = await withTimeout(fetchCurrentUserRoles(userId), ROLE_LOAD_TIMEOUT_MS);
      lastRoleUserIdRef.current = userId;
      setRoles(nextRoles.map((entry) => entry.role as AdminRole));
    } catch (error) {
      lastRoleUserIdRef.current = null;
      setRoles([]);
      setRoleError(error instanceof Error ? error.message : 'Failed to load user roles.');
    } finally {
      setRoleLoading(false);
    }
  }, [roles.length]);

  const syncSession = useCallback(async (event: AuthChangeEvent | 'INITIAL_SESSION', nextSession: AuthContextValue['session']) => {
    setSession(nextSession);
    setLoading(false);

    if (!nextSession?.user.id) {
      clearRoleState();
      return;
    }

    const currentUserId = nextSession.user.id;
    const shouldForceReload = event === 'SIGNED_IN' || event === 'USER_UPDATED' || lastRoleUserIdRef.current !== currentUserId;

    if (shouldForceReload) {
      await loadRoles(currentUserId, true);
    }
  }, [clearRoleState, loadRoles]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await syncSession('INITIAL_SESSION', data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      void syncSession(event, nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

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
      clearRoleState();
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    clearRoleState();
  }, [clearRoleState]);

  const capabilities = getRoleCapabilities(roles);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      roleLoading,
      roleError,
      session,
      roles,
      ...capabilities,
      signIn,
      signUp,
      signOut,
    }),
    [capabilities, loading, roleError, roleLoading, roles, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
