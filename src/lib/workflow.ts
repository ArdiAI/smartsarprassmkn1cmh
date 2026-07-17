import { supabase } from '../lib/supabase';

export interface WorkflowStep { id: string; workflow_template_id: string; step_order: number; role_id: string | null; step_label: string; is_info_only: boolean; role_name?: string; }
export interface WorkflowTemplate { id: string; name: string; description: string; is_active: boolean; steps: WorkflowStep[]; }

export async function fetchWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null> {
  const { data: template } = await supabase.from('workflow_templates').select('id, name, description, is_active').eq('id', templateId).single();
  if (!template) return null;
  const { data: steps } = await supabase.from('workflow_steps').select('id, workflow_template_id, step_order, role_id, step_label, is_info_only').eq('workflow_template_id', templateId).order('step_order', { ascending: true });
  const roleIds = (steps || []).map(s => s.role_id).filter(Boolean);
  let roleMap: Record<string, string> = {};
  if (roleIds.length > 0) { const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds); roleMap = (roles || []).reduce((a, r) => ({ ...a, [r.id]: r.name }), {}); }
  return { ...template, steps: (steps || []).map(s => ({ ...s, role_name: s.role_id ? roleMap[s.role_id] || '' : '' })) };
}

export async function getDefaultWorkflow(): Promise<WorkflowTemplate | null> {
  const { data } = await supabase.from('workflow_templates').select('id').eq('is_active', true).order('name').limit(1).single();
  if (!data) return null;
  return fetchWorkflowTemplate(data.id);
}

export function getNextActionableStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null { return steps.find(s => s.step_order > currentStep && !s.is_info_only) || null; }
export function getCurrentStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null { if (currentStep === 0) return steps.find(s => !s.is_info_only) || null; return steps.find(s => s.step_order === currentStep) || null; }
export function isLastActionableStep(steps: WorkflowStep[], currentStep: number): boolean { const a = steps.filter(s => !s.is_info_only); return a[a.length - 1]?.step_order === currentStep; }
