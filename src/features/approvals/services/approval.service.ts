import { getSupabase } from '../../../lib/supabase';
import type { Json, Tables } from '../../../types/database';
import type {
  ApprovalDecision,
  ApprovalFlow,
  ApprovalRequest,
  ApprovalResourceType,
} from '../types';

function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

export async function fetchApprovals(organizationId: string): Promise<{
  requests: ApprovalRequest[];
  currentUserId: string;
}> {
  const client = getClient();
  const [{ data: userData, error: userError }, { data: requests, error: requestError }] = await Promise.all([
    client.auth.getUser(),
    client.from('approval_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);
  if (userError) throw userError;
  if (requestError) throw requestError;
  if (!userData.user) throw new Error('Sesi pengguna tidak tersedia.');
  if (requests.length === 0) return { requests: [], currentUserId: userData.user.id };

  const requestIds = requests.map(({ id }) => id);
  const userIds = [...new Set(requests.map(({ requester_id }) => requester_id))];
  const projectIds = [...new Set(requests.map(({ project_id }) => project_id))];
  const [stepsResult, namesResult, projectsResult] = await Promise.all([
    client.from('approval_steps')
      .select('*')
      .eq('organization_id', organizationId)
      .in('approval_request_id', requestIds)
      .is('deleted_at', null)
      .order('step_number'),
    client.from('profiles').select('id, full_name').in('id', userIds),
    client.from('projects').select('id, name').in('id', projectIds),
  ]);
  if (stepsResult.error) throw stepsResult.error;
  if (namesResult.error) throw namesResult.error;
  if (projectsResult.error) throw projectsResult.error;

  const stepIds = stepsResult.data.map(({ id }) => id);
  const delegationsResult = stepIds.length > 0
    ? await client.from('approval_delegations')
      .select('*')
      .eq('organization_id', organizationId)
      .in('approval_step_id', stepIds)
      .is('revoked_at', null)
      .is('deleted_at', null)
      .gt('expires_at', new Date().toISOString())
    : { data: [], error: null };
  if (delegationsResult.error) throw delegationsResult.error;

  const names = new Map(namesResult.data.map((profile) => [profile.id, profile.full_name]));
  const projectNames = new Map(projectsResult.data.map((project) => [project.id, project.name]));
  const stepsByRequest = new Map<string, Tables<'approval_steps'>[]>();
  stepsResult.data.forEach((step) => {
    const steps = stepsByRequest.get(step.approval_request_id) ?? [];
    steps.push(step);
    stepsByRequest.set(step.approval_request_id, steps);
  });
  const delegationsByStep = new Map<string, Tables<'approval_delegations'>[]>();
  delegationsResult.data.forEach((delegation) => {
    const delegations = delegationsByStep.get(delegation.approval_step_id) ?? [];
    delegations.push(delegation);
    delegationsByStep.set(delegation.approval_step_id, delegations);
  });

  return {
    currentUserId: userData.user.id,
    requests: requests.map((request) => {
      const steps = stepsByRequest.get(request.id) ?? [];
      return {
        ...request,
        requester_name: names.get(request.requester_id) ?? request.requester_id,
        project_name: projectNames.get(request.project_id) ?? request.project_id,
        steps,
        delegations: steps.flatMap((step) => delegationsByStep.get(step.id) ?? []),
      };
    }),
  };
}

export async function fetchApprovalFlows(organizationId: string): Promise<ApprovalFlow[]> {
  const client = getClient();
  const { data: flows, error } = await client.from('approval_flows')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('resource_type');
  if (error) throw error;
  if (flows.length === 0) return [];

  const { data: steps, error: stepsError } = await client.from('approval_flow_steps')
    .select('*')
    .eq('organization_id', organizationId)
    .in('approval_flow_id', flows.map(({ id }) => id))
    .is('deleted_at', null)
    .order('step_number');
  if (stepsError) throw stepsError;

  return flows.map((flow) => ({
    ...flow,
    steps: steps.filter((step) => step.approval_flow_id === flow.id),
  }));
}

export async function saveApprovalFlow(
  organizationId: string,
  flow: {
    resourceType: ApprovalResourceType;
    name: string;
    isActive: boolean;
    steps: Array<{ roles: string[] }>;
  },
): Promise<void> {
  const { error } = await getClient().rpc('save_approval_flow', {
    p_organization_id: organizationId,
    p_resource_type: flow.resourceType,
    p_name: flow.name,
    p_is_active: flow.isActive,
    p_steps: flow.steps as Json,
  });
  if (error) throw error;
}

export async function processApprovalStep(
  requestId: string,
  decision: ApprovalDecision,
  comment: string,
  approverSignaturePath: string | null,
): Promise<void> {
  const { error } = await getClient().rpc('process_approval_step', {
    p_approval_request_id: requestId,
    p_decision: decision,
    p_comment: comment,
    p_approver_signature_path: approverSignaturePath,
  });
  if (error) throw error;
}

export async function delegateApprovalStep(
  stepId: string,
  delegateUserId: string,
  expiresAt: string,
): Promise<void> {
  const { error } = await getClient().rpc('delegate_approval_step', {
    p_approval_step_id: stepId,
    p_delegate_user_id: delegateUserId,
    p_expires_at: expiresAt,
  });
  if (error) throw error;
}

export async function uploadDailyReportApproverSignature(
  organizationId: string,
  projectId: string,
  reportId: string,
  file: File,
): Promise<string> {
  if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024) {
    throw new Error('Tanda tangan harus berupa PNG dengan ukuran maksimal 2 MiB.');
  }
  const path = `${organizationId}/${projectId}/daily-reports/${reportId}/signatures/approver.png`;
  const { data, error } = await getClient().storage.from('org-project-files').upload(path, file, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) throw error;
  return data.path;
}
