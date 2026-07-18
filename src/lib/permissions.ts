import { supabase } from './supabase';

export type PermissionKey = string;

export interface Permission {
  id: string;
  module: string;
  action: string;
  label: string;
  description: string;
}

export interface RoleInfo {
  id: string;
  name: string;
  level: number;
  is_system: boolean;
  is_active: boolean;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

export interface AdminRoleAssignment {
  role_id: string;
  role_name: string;
  role_level: number;
}

/**
 * Fetch the full set of permissions for a user by joining:
 *   admin_users -> admin_user_roles -> role_permissions -> permissions
 * Falls back to the legacy `admin_users.role` text column if no
 * admin_user_roles rows exist, so existing single-role users keep working
 * without needing to re-create accounts or fill user_id manually.
 *
 * Returns a Set of "<module>:<action>" strings for O(1) lookups.
 */
export async function fetchUserPermissions(
  userId: string,
): Promise<{ permissions: Set<PermissionKey>; roles: AdminRoleAssignment[]; primaryRole: string | null; adminProfile: AdminProfile | null }> {
  const permissions = new Set<PermissionKey>();
  const roles: AdminRoleAssignment[] = [];

  // 1. Find the active admin_users row for this auth user.
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id, user_id, email, name, role, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!adminRow) {
    // Fallback: try by email (covers accounts created before user_id was linked).
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (email) {
      const { data: byEmail } = await supabase
        .from('admin_users')
        .select('id, user_id, email, name, role, is_active')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();
      if (byEmail) {
        return resolvePermissions(byEmail as unknown as AdminProfile, permissions, roles);
      }
    }
    return { permissions, roles, primaryRole: null, adminProfile: null };
  }

  return resolvePermissions(adminRow as unknown as AdminProfile, permissions, roles);
}

async function resolvePermissions(
  adminRow: AdminProfile,
  permissions: Set<PermissionKey>,
  roles: AdminRoleAssignment[],
): Promise<{ permissions: Set<PermissionKey>; roles: AdminRoleAssignment[]; primaryRole: string | null; adminProfile: AdminProfile }> {
  // 2. Look up role assignments via admin_user_roles (the proper RBAC table).
  const { data: roleLinks } = await supabase
    .from('admin_user_roles')
    .select('role_id, roles!role_id(id, name, level, is_system, is_active)')
    .eq('admin_user_id', adminRow.id);

  const activeRoleIds: string[] = [];
  if (roleLinks && roleLinks.length > 0) {
    for (const link of roleLinks as any[]) {
      const r = link.roles;
      if (r && r.is_active) {
        roles.push({ role_id: r.id, role_name: r.name, role_level: r.level });
        activeRoleIds.push(r.id);
      }
    }
  }

  // 3. Fallback: if no admin_user_roles rows, use the legacy role text column.
  if (activeRoleIds.length === 0 && adminRow.role) {
    const { data: roleByName } = await supabase
      .from('roles')
      .select('id, name, level, is_system, is_active')
      .eq('name', adminRow.role)
      .eq('is_active', true)
      .maybeSingle();
    if (roleByName) {
      roles.push({ role_id: roleByName.id, role_name: roleByName.name, role_level: roleByName.level });
      activeRoleIds.push(roleByName.id);
    }
  }

  // 4. Fetch all permissions for the user's active role(s).
  if (activeRoleIds.length > 0) {
    const { data: rpRows } = await supabase
      .from('role_permissions')
      .select('permissions!permission_id(module, action)')
      .in('role_id', activeRoleIds);

    if (rpRows) {
      for (const rp of rpRows as any[]) {
        const p = rp.permissions;
        if (p && p.module && p.action) {
          permissions.add(`${p.module}:${p.action}`);
        }
      }
    }
  }

  const primaryRole = roles.length > 0 ? roles[0].role_name : adminRow.role ?? null;
  return { permissions, roles, primaryRole, adminProfile: adminRow };
}

export function hasPermission(
  permissions: Set<PermissionKey> | null,
  module: string,
  action: string,
): boolean {
  if (!permissions) return false;
  return permissions.has(`${module}:${action}`);
}

export function hasAnyPermission(
  permissions: Set<PermissionKey> | null,
  checks: Array<{ module: string; action: string }>,
): boolean {
  if (!permissions) return false;
  return checks.some(c => permissions.has(`${c.module}:${c.action}`));
}
