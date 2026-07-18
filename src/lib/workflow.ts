import { supabase } from './supabase';

export interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  step_label: string;
  role_id: string;
  is_info_only: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  steps: WorkflowStep[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  is_system: boolean;
  is_active: boolean;
}

export interface RoleApproverEmail {
  id: string;
  role_id: string;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

export async function fetchWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null> {
  const { data: template } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  if (!template) return null;
  const { data: steps } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_template_id', templateId)
    .order('step_order', { ascending: true });
  return { ...template, steps: (steps as unknown as WorkflowStep[]) || [] };
}

export async function getDefaultWorkflow(): Promise<WorkflowTemplate | null> {
  const { data: template } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (!template) return null;
  return fetchWorkflowTemplate(template.id);
}

export function getCurrentStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | undefined {
  return steps.find(s => s.step_order === currentStep);
}

export function getNextActionableStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null {
  for (const s of steps) {
    if (s.step_order > currentStep && !s.is_info_only) return s;
  }
  return null;
}

export function isLastActionableStep(steps: WorkflowStep[], currentStep: number): boolean {
  return getNextActionableStep(steps, currentStep) === null;
}

// Fetch the role record for a given step's role_id
export async function fetchRoleById(roleId: string): Promise<Role | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();
  if (error || !data) return null;
  return data as unknown as Role;
}

// Auto-determine the next approver's email from the database based on the next workflow step's role.
// Looks up role_approver_emails by role_id, filtered to active records.
export async function fetchNextApprover(
  steps: WorkflowStep[],
  currentStep: number,
): Promise<{ step: WorkflowStep | null; role: Role | null; approver: RoleApproverEmail | null }> {
  const nextStep = getNextActionableStep(steps, currentStep);
  if (!nextStep) return { step: null, role: null, approver: null };

  const role = await fetchRoleById(nextStep.role_id);
  let approver: RoleApproverEmail | null = null;

  if (role) {
    const { data } = await supabase
      .from('role_approver_emails')
      .select('*')
      .eq('role_id', role.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (data) approver = data as unknown as RoleApproverEmail;
  }

  return { step: nextStep, role, approver };
}

// Send notification email to the next approver via the edge function.
export async function notifyNextApprover(payload: {
  type: string;
  borrowing_id: string;
  borrower_name: string;
  borrower_email: string;
  next_approver_email: string;
  next_approver_name: string;
  next_step_label: string;
  next_role_name: string;
}): Promise<void> {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Non-blocking: notification failure should not block approval flow
    console.error('Failed to notify next approver:', e);
  }
}

// Determine which borrowings an admin user is responsible for based on their role.
// Each role only sees requests whose current workflow step matches their role.
export async function filterBorrowingsForAdmin(
  borrowings: any[],
  adminUser: AdminUser | null,
): Promise<any[]> {
  if (!adminUser) return [];
  // Super Admin sees everything
  if (adminUser.role === 'superadmin') return borrowings;

  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', adminUser.user_id)
    .eq('is_active', true)
    .single();
  const adminRole = adminRecord?.role;
  if (adminRole === 'superadmin') return borrowings;

  // For each borrowing, load its workflow template and check if the current step's role matches the admin's role.
  const result: any[] = [];
  for (const b of borrowings) {
    const templateId = b.workflow_template_id;
    if (!templateId) continue;
    const template = await fetchWorkflowTemplate(templateId);
    if (!template) continue;
    const currentStep = getCurrentStep(template.steps, b.current_step ?? 1);
    if (!currentStep) continue;
    const stepRole = await fetchRoleById(currentStep.role_id);
    if (!stepRole) continue;
    // Match by role id (admin_users.role stores role id) or role name
    if (adminRole === currentStep.role_id || adminRole === stepRole.name) {
      result.push(b);
    }
  }
  return result;
}
