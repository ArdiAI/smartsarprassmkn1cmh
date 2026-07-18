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

    console.group('%c[DEBUG] AuthContext.loadProfile() RESULT', 'color:#10b981;font-weight:bold;font-size:13px');
    console.log('[DEBUG] AuthContext — permissions.size:', perms.size);
    console.log('[DEBUG] AuthContext — permissions content:', Array.from(perms));
    console.log('[DEBUG] AuthContext — roles:', roleList);
    console.log('[DEBUG] AuthContext — adminProfile:', profile ? { ...profile, role: primaryRole ?? profile.role } : null);
    console.log('[DEBUG] AuthContext — isAdmin (permissions.size > 0):', perms.size > 0);
    console.groupEnd();
  }, []);

  const refreshAdminProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      console.log('[DEBUG] AuthContext — getSession event:', { hasSession: !!data.session, userId: data.session?.user?.id ?? null });
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      console.log('[DEBUG] AuthContext — onAuthStateChange event:', { event: _event, hasSession: !!session, userId: session?.user?.id ?? null });
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
    console.log('[DEBUG] AuthContext.signIn() called for email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[DEBUG] AuthContext.signIn() result:', { hasUser: !!data.user, error: error?.message ?? null });
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

  console.log('%c[DEBUG] AuthContext RENDER', 'color:#8b5cf6;font-weight:bold', {
    loading,
    hasUser: !!user,
    permissionsSize: permissions.size,
    rolesCount: roles.length,
    adminProfile,
    isAdmin,
  });

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
