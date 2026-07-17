import { supabase } from './supabase';

export interface WorkflowStep {
  id: string;
  template_id: string;
  step_order: number;
  step_label: string;
  role_name: string;
  is_info_only: boolean;
  workflow_template_id?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  steps: WorkflowStep[];
}

export async function fetchWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null> {
  const { data: template } = await supabase.from('workflow_templates').select('*').eq('id', templateId).single();
  if (!template) return null;
  const { data: steps } = await supabase.from('workflow_steps').select('*').eq('template_id', templateId).order('step_order', { ascending: true });
  return { ...template, steps: steps || [] };
}

export async function getDefaultWorkflow(): Promise<WorkflowTemplate | null> {
  const { data: template } = await supabase.from('workflow_templates').select('*').eq('is_active', true).order('created_at', { ascending: true }).limit(1).single();
  if (!template) return null;
  return fetchWorkflowTemplate(template.id);
}

export function getCurrentStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | undefined {
  return steps.find(s => s.step_order === currentStep);
}

export function getNextActionableStep(steps: WorkflowStep[], currentStep: number): WorkflowStep | null {
  for (const s of steps) { if (s.step_order > currentStep && !s.is_info_only) return s; }
  return null;
}

export function isLastActionableStep(steps: WorkflowStep[], currentStep: number): boolean {
  return getNextActionableStep(steps, currentStep) === null;
}
