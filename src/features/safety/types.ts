export const INSPECTION_RESULTS = ['compliant', 'non_compliant', 'not_applicable'] as const;
export const SAFETY_INCIDENT_CATEGORIES = [
  'Near Miss (Hampir Celaka)',
  'First Aid (P3K)',
  'Medical Treatment',
  'Lost Time Injury (LTI)',
  'Kerusakan Alat',
] as const;
export const SAFETY_INCIDENT_SEVERITIES = ['Rendah', 'Sedang', 'Tinggi', 'Kritis'] as const;
export const SAFETY_INCIDENT_STATUSES = ['investigating', 'action_taken', 'closed'] as const;
export const QC_CHECK_RESULTS = ['pass', 'fail', 'not_applicable'] as const;
export const PUNCH_LIST_CATEGORIES = ['Arsitektur', 'Struktur', 'MEP', 'Finishing'] as const;
export const PUNCH_LIST_SEVERITIES = ['minor', 'major', 'critical'] as const;
export const PUNCH_LIST_STATUSES = ['open', 'in_progress', 'ready_for_inspection', 'closed'] as const;
export const PUNCH_LIST_TRANSITIONS = ['in_progress', 'ready_for_inspection'] as const;

export type InspectionResult = (typeof INSPECTION_RESULTS)[number];
export type SafetyIncidentCategory = (typeof SAFETY_INCIDENT_CATEGORIES)[number];
export type SafetyIncidentSeverity = (typeof SAFETY_INCIDENT_SEVERITIES)[number];
export type SafetyIncidentStatus = (typeof SAFETY_INCIDENT_STATUSES)[number];
export type QcCheckResult = (typeof QC_CHECK_RESULTS)[number];
export type PunchListCategory = (typeof PUNCH_LIST_CATEGORIES)[number];
export type PunchListSeverity = (typeof PUNCH_LIST_SEVERITIES)[number];
export type PunchListStatus = (typeof PUNCH_LIST_STATUSES)[number];

export interface QcChecklistItem {
  label: string;
  result: QcCheckResult;
  notes: string;
}

export interface QcInspection {
  id: string;
  organization_id: string;
  project_id: string;
  inspection_date: string;
  title: string;
  inspector_name: string;
  location: string;
  items: QcChecklistItem[];
  overall_notes: string;
  created_at: string;
}

export interface QualityPunchListItem {
  id: string;
  organization_id: string;
  project_id: string;
  code: string;
  location_zone: string;
  category: PunchListCategory;
  defect_description: string;
  assigned_to_subcon: string;
  due_date: string;
  severity: PunchListSeverity;
  status: PunchListStatus;
  before_photo_path: string;
  before_photo_url: string;
  after_photo_path: string | null;
  after_photo_url: string | null;
  reported_by: string;
  created_at: string;
  closed_at: string | null;
}

export interface SafetyInspectionItem {
  label: string;
  result: InspectionResult;
  notes: string;
  follow_up: string;
}

export interface SafetyInspection {
  id: string;
  organization_id: string;
  project_id: string;
  inspection_date: string;
  title: string;
  inspector_name: string;
  location: string;
  items: SafetyInspectionItem[];
  overall_notes: string;
  created_at: string;
}

export interface SafetyIncident {
  id: string;
  organization_id: string;
  project_id: string;
  incident_number: string;
  incident_date: string;
  category: SafetyIncidentCategory;
  severity: SafetyIncidentSeverity;
  location: string;
  description: string;
  immediate_action: string;
  corrective_action: string;
  reporter_name: string;
  status: SafetyIncidentStatus;
  created_at: string;
}

export interface ToolboxMeeting {
  id: string;
  organization_id: string;
  project_id: string;
  meeting_date: string;
  topic: string;
  presenter_name: string;
  attendees_count: number;
  key_points: string[];
  created_at: string;
}

export interface SafetyWorkspaceData {
  inspections: SafetyInspection[];
  incidents: SafetyIncident[];
  toolboxMeetings: ToolboxMeeting[];
}

export interface QualityWorkspaceData {
  inspections: QcInspection[];
  punchList: QualityPunchListItem[];
}
