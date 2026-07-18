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

const RBAC_DEBUG = true;

function rbacLog(...args: any[]) {
  if (RBAC_DEBUG) {
    console.log('%c[RBAC]', 'color:#2563eb;font-weight:bold', ...args);
  }
}

/**
 * Fetch the full set of permissions for a user by joining:
 *   auth.users.id  ->  admin_users.user_id  (find the admin row)
 *   admin_users.id ->  admin_user_roles.admin_user_id  (role assignments)
 *   admin_user_roles.role_id -> role_permissions.role_id  (permission links)
 *   role_permissions.permission_id -> permissions.id  (the actual permission)
 *
 * Fallback: if no admin_user_roles rows exist, use the legacy
 * admin_users.role text column to resolve a single role.
 */
export async function fetchUserPermissions(
  userId: string,
): Promise<{
  permissions: Set<PermissionKey>;
  roles: AdminRoleAssignment[];
  primaryRole: string | null;
  adminProfile: AdminProfile | null;
}> {
  console.group('%c[DEBUG] fetchUserPermissions() START', 'color:#f59e0b;font-weight:bold;font-size:13px');
  console.log('[DEBUG] User ID:', userId);

  const permissions = new Set<PermissionKey>();
  const roles: AdminRoleAssignment[] = [];

  // STEP 1: Find the active admin_users row for this auth user.
  const { data: adminByUserId, error: errByUserId } = await supabase
    .from('admin_users')
    .select('id, user_id, email, name, role, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  console.log('[DEBUG] Step 1 — admin_users lookup by user_id:', {
    userId,
    found: !!adminByUserId,
    data: adminByUserId,
    error: errByUserId?.message ?? null,
  });

  let adminRow: AdminProfile | null = (adminByUserId as unknown as AdminProfile) || null;

  // Fallback: try by email (covers accounts created before user_id was linked).
  if (!adminRow) {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    console.log('[DEBUG] Step 1 fallback — email from auth.getUser():', email);
    if (email) {
      const { data: adminByEmail, error: errByEmail } = await supabase
        .from('admin_users')
        .select('id, user_id, email, name, role, is_active')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();
      console.log('[DEBUG] Step 1 fallback — admin_users lookup by email:', {
        email,
        found: !!adminByEmail,
        data: adminByEmail,
        error: errByEmail?.message ?? null,
      });
      if (adminByEmail) {
        adminRow = adminByEmail as unknown as AdminProfile;
        if (!adminRow.user_id) {
          console.log('[DEBUG] Step 1 fallback — backfilling user_id on admin_users row:', adminRow.id);
          await supabase.from('admin_users').update({ user_id: userId }).eq('id', adminRow.id);
          adminRow.user_id = userId;
        }
      }
    }
  }

  if (!adminRow) {
    console.log('[DEBUG] Step 1 FAILED — no admin_users row found. permissions will be empty.');
    console.groupEnd();
    return { permissions, roles, primaryRole: null, adminProfile: null };
  }

  console.log('[DEBUG] Step 1 OK — admin_users row found:', {
    id: adminRow.id,
    user_id: adminRow.user_id,
    email: adminRow.email,
    name: adminRow.name,
    role: adminRow.role,
    is_active: adminRow.is_active,
  });

  // STEP 2: Look up role assignments via admin_user_roles (the proper RBAC table).
  const { data: roleLinks, error: errRoleLinks } = await supabase
    .from('admin_user_roles')
    .select('role_id, roles!role_id(id, name, level, is_system, is_active)')
    .eq('admin_user_id', adminRow.id);

  console.log('[DEBUG] Step 2 — admin_user_roles lookup:', {
    admin_user_id: adminRow.id,
    rowCount: roleLinks?.length ?? 0,
    rows: roleLinks,
    error: errRoleLinks?.message ?? null,
  });

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

  console.log('[DEBUG] Step 2 — resolved active roles:', roles);

  // STEP 3: Fallback — if no admin_user_roles rows, use the legacy role text column.
  if (activeRoleIds.length === 0 && adminRow.role) {
    console.log('[DEBUG] Step 3 fallback — no admin_user_roles rows; resolving role by name:', adminRow.role);
    const { data: roleByName, error: errRoleByName } = await supabase
      .from('roles')
      .select('id, name, level, is_system, is_active')
      .eq('name', adminRow.role)
      .eq('is_active', true)
      .maybeSingle();
    console.log('[DEBUG] Step 3 fallback — roles lookup by name:', {
      name: adminRow.role,
      found: !!roleByName,
      data: roleByName,
      error: errRoleByName?.message ?? null,
    });
    if (roleByName) {
      roles.push({ role_id: roleByName.id, role_name: roleByName.name, role_level: roleByName.level });
      activeRoleIds.push(roleByName.id);
      console.log('[DEBUG] Step 3 fallback — seeding admin_user_roles:', { admin_user_id: adminRow.id, role_id: roleByName.id });
      await supabase
        .from('admin_user_roles')
        .upsert({ admin_user_id: adminRow.id, role_id: roleByName.id }, { onConflict: 'admin_user_id,role_id' });
    }
  }

  // STEP 4: Fetch all permissions for the user's active role(s).
  if (activeRoleIds.length > 0) {
    console.log('[DEBUG] Step 4 — fetching role_permissions for role_ids:', activeRoleIds);
    const { data: rpRows, error: errRp } = await supabase
      .from('role_permissions')
      .select('permissions!permission_id(module, action)')
      .in('role_id', activeRoleIds);

    console.log('[DEBUG] Step 4 — role_permissions lookup:', {
      rowCount: rpRows?.length ?? 0,
      rows: rpRows,
      error: errRp?.message ?? null,
    });

    if (rpRows) {
      for (const rp of rpRows as any[]) {
        const p = rp.permissions;
        if (p && p.module && p.action) {
          permissions.add(`${p.module}:${p.action}`);
        }
      }
    }
  } else {
    console.log('[DEBUG] Step 4 SKIPPED — no active role ids to query permissions for.');
  }

  const primaryRole = roles.length > 0 ? roles[0].role_name : adminRow.role ?? null;

  console.log('[DEBUG] fetchUserPermissions() DONE:', {
    userId,
    email: adminRow.email,
    adminId: adminRow.id,
    rolesFound: roles,
    permissionsCount: permissions.size,
    permissionsSize: permissions.size,
    permissionsContent: Array.from(permissions),
    primaryRole,
  });
  console.groupEnd();

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
