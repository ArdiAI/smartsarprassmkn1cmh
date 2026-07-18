import { createContext, useCallback, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  fetchUserPermissions,
  hasPermission as hasPerm,
  hasAnyPermission,
  type AdminProfile,
  type AdminRoleAssignment,
  type PermissionKey,
} from '../lib/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminProfile: AdminProfile | null;
  adminRole: string | null;
  roles: AdminRoleAssignment[];
  permissions: Set<PermissionKey>;
  /** Derived purely from permissions: any user with at least one permission is an admin. */
  isAdmin: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (checks: Array<{ module: string; action: string }>) => boolean;
  refreshAdminProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [roles, setRoles] = useState<AdminRoleAssignment[]>([]);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());

  const loadProfile = useCallback(async (uid: string) => {
    const {
      permissions: perms,
      roles: roleList,
      primaryRole,
      adminProfile: profile,
    } = await fetchUserPermissions(uid);
    setPermissions(perms);
    setRoles(roleList);
    if (profile) {
      setAdminProfile({ ...profile, role: primaryRole ?? profile.role });
    } else {
      setAdminProfile(null);
    }
  }, []);

  const refreshAdminProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setAdminProfile(null);
        setRoles([]);
        setPermissions(new Set());
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { error: error.message, needsConfirmation: false };
    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdminProfile(null);
    setRoles([]);
    setPermissions(new Set());
  };

  // isAdmin is derived from permissions, not from a boolean column or a role string.
  const isAdmin = permissions.size > 0;

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    adminProfile,
    adminRole: adminProfile?.role ?? null,
    roles,
    permissions,
    isAdmin,
    hasPermission: (module: string, action: string) => hasPerm(permissions, module, action),
    hasAnyPermission: (checks: Array<{ module: string; action: string }>) => hasAnyPermission(permissions, checks),
    refreshAdminProfile,
    signIn,
    signUp,
    signOut,
  }), [user, session, loading, adminProfile, roles, permissions, isAdmin, refreshAdminProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
