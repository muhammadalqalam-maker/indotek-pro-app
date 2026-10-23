import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database.types';
import {
  safetyIncidentCategorySchema,
  safetyIncidentSeveritySchema,
  safetyIncidentStatusSchema,
  safetyInspectionItemsSchema,
} from '../schemas/safety.schema';
import type {
  SafetyIncident,
  SafetyInspection,
  SafetyWorkspaceData,
  ToolboxMeeting,
} from '../types';
import type {
  SafetyIncidentFormValues,
  SafetyInspectionFormValues,
  ToolboxMeetingFormValues,
} from '../schemas/safety.schema';

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Data K3 memerlukan koneksi Supabase.');
  return client;
}

function toInspection(row: Database['public']['Tables']['safety_inspections']['Row']): SafetyInspection {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    inspection_date: row.inspection_date,
    title: row.title,
    inspector_name: row.inspector_name,
    location: row.location,
    items: safetyInspectionItemsSchema.parse(row.items),
    overall_notes: row.overall_notes,
    created_at: row.created_at,
  };
}

function toIncident(row: Database['public']['Tables']['safety_incidents']['Row']): SafetyIncident {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    incident_number: row.incident_number,
    incident_date: row.incident_date,
    category: safetyIncidentCategorySchema.parse(row.category),
    severity: safetyIncidentSeveritySchema.parse(row.severity),
    location: row.location,
    description: row.description,
    immediate_action: row.immediate_action,
    corrective_action: row.corrective_action,
    reporter_name: row.reporter_name,
    status: safetyIncidentStatusSchema.parse(row.status),
    created_at: row.created_at,
  };
}

function toToolboxMeeting(row: Database['public']['Tables']['toolbox_meetings']['Row']): ToolboxMeeting {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    meeting_date: row.meeting_date,
    topic: row.topic,
    presenter_name: row.presenter_name,
    attendees_count: row.attendees_count,
    key_points: row.key_points,
    created_at: row.created_at,
  };
}

export async function fetchSafetyWorkspace(
  organizationId: string,
  projectId: string,
): Promise<SafetyWorkspaceData> {
  const client = getClient();
  let inspectionsQuery = client.from('safety_inspections')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('inspection_date', { ascending: false });
  let incidentsQuery = client.from('safety_incidents')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('incident_date', { ascending: false });
  let toolboxQuery = client.from('toolbox_meetings')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('meeting_date', { ascending: false });

  if (projectId !== 'all') {
    inspectionsQuery = inspectionsQuery.eq('project_id', projectId);
    incidentsQuery = incidentsQuery.eq('project_id', projectId);
    toolboxQuery = toolboxQuery.eq('project_id', projectId);
  }

  const [inspectionsResult, incidentsResult, toolboxResult] = await Promise.all([
    inspectionsQuery,
    incidentsQuery,
    toolboxQuery,
  ]);
  if (inspectionsResult.error) throw inspectionsResult.error;
  if (incidentsResult.error) throw incidentsResult.error;
  if (toolboxResult.error) throw toolboxResult.error;

  return {
    inspections: inspectionsResult.data.map(toInspection),
    incidents: incidentsResult.data.map(toIncident),
    toolboxMeetings: toolboxResult.data.map(toToolboxMeeting),
  };
}

export async function createSafetyInspection(
  organizationId: string,
  values: SafetyInspectionFormValues,
): Promise<SafetyInspection> {
  const { data, error } = await getClient()
    .from('safety_inspections')
    .insert({ organization_id: organizationId, ...values })
    .select('*')
    .single();
  if (error) throw error;
  return toInspection(data);
}

function createIncidentNumber(date: string): string {
  const compactDate = date.replace(/-/g, '');
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `K3-${compactDate}-${suffix}`;
}

export async function createSafetyIncident(
  organizationId: string,
  values: SafetyIncidentFormValues,
): Promise<SafetyIncident> {
  const { data, error } = await getClient()
    .from('safety_incidents')
    .insert({
      organization_id: organizationId,
      ...values,
      incident_number: createIncidentNumber(values.incident_date),
      status: 'investigating',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toIncident(data);
}

export async function updateSafetyIncidentStatus(
  organizationId: string,
  incidentId: string,
  update:
    | { status: 'action_taken'; corrective_action: string }
    | { status: 'closed' },
): Promise<SafetyIncident> {
  const { data, error } = await getClient()
    .from('safety_incidents')
    .update(update)
    .eq('organization_id', organizationId)
    .eq('id', incidentId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return toIncident(data);
}

export async function createToolboxMeeting(
  organizationId: string,
  values: ToolboxMeetingFormValues,
): Promise<ToolboxMeeting> {
  const { data, error } = await getClient()
    .from('toolbox_meetings')
    .insert({ organization_id: organizationId, ...values })
    .select('*')
    .single();
  if (error) throw error;
  return toToolboxMeeting(data);
}
