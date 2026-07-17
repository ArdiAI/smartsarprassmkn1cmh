import { supabase } from '../lib/supabase';

export interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string | null;
  step_label: string;
  is_info_only: boolean;
  role_name?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  steps: WorkflowStep[];
}

/**
 * Fetch a workflow template with its steps, ordered by step_order.
 */
export async function fetchWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null> {
  const { data: template } = await supabase
    .from('workflow_templates')
    .select('id, name, description, is_active')
    .eq('id', templateId)
    .single();
  if (!template) return null;

  const { data: steps } = await supabase
    .from('workflow_steps')
    .select('id, workflow_template_id, step_order, role_id, step_label, is_info_only')
    .eq('workflow_template_id', templateId)
    .order('step_order', { ascending: true });

  // Fetch role names
  const roleIds = (steps || []).map(s => s.role_id).filter(Boolean);
  let roleMap: Record<string, string> = {};
  if (roleIds.length > 0) {
    const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds);
    roleMap = (roles || []).reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {});
  }

  const stepsWithRoles: WorkflowStep[] = (steps || []).map(s => ({
    ...s,
    role_name: s.role_id ? roleMap[s.role_id] || '' : '',
  }));

  return { ...template, steps: stepsWithRoles };
}

/**
 * Get the workflow template assigned to a facility.
 * Falls back to the first active template if the facility has none.
 */
export async function getWorkflowForFacility(facilityId: string): Promise<WorkflowTemplate | null> {
  const { data: facility } = await supabase
    .from('facilities')
    .select('workflow_template_id')
    .eq('id', facilityId)
    .single();

  let templateId = facility?.workflow_template_id;
  if (!templateId) {
    const { data: defaultTemplate } = await supabase
      .from('workflow_templates')
      .select('id')
      .eq('is_active', true)
      .order('name')
      .limit(1)
      .single();
    templateId = defaultTemplate?.id;
  }

  if (!templateId) return null;
  return fetchWorkflowTemplate(templateId);
}

/**
 * Get the default workflow template (first active one).
 */
export async function getDefaultWorkflow(): Promise<WorkflowTemplate | null> {
  const { data } = await supabase
    .from('workflow_templates')
    .select('id')
    .eq('is_active', true)
    .order('name')
    .limit(1)
    .single();
  if (!data) return null;
  return fetchWorkflowTemplate(data.id);
}

/**
 * Find the next actionable (non-info-only) step after the given current step.
 * Returns null if there are no more steps.
 */
export function getNextActionableStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null {
  return steps.find(s => s.step_order > currentStep && !s.is_info_only) || null;
}

/**
 * Find the current actionable step (the step matching currentStep, or the first actionable if currentStep is 0).
 */
export function getCurrentStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null {
  if (currentStep === 0) {
    return steps.find(s => !s.is_info_only) || null;
  }
  return steps.find(s => s.step_order === currentStep) || null;
}

/**
 * Check if the current step is the last actionable step.
 */
export function isLastActionableStep(steps: WorkflowStep[], currentStep: number): boolean {
  const actionableSteps = steps.filter(s => !s.is_info_only);
  const lastStep = actionableSteps[actionableSteps.length - 1];
  return lastStep?.step_order === currentStep;
}

/**
 * Get the label for the current step status.
 */
export function getStepStatusLabel(steps: WorkflowStep[], currentStep: number, isApproved: boolean = false): string {
  if (isApproved) return 'Disetujui';
  const step = getCurrentStep(steps, currentStep);
  if (!step) return 'Menunggu Persetujuan';
  return `Menunggu ${step.step_label}`;
}
