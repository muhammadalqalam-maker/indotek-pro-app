import { getSupabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/database';

export type WbsTask = Pick<
  Tables<'wbs_tasks'>,
  'id' | 'parent_task_id' | 'title' | 'description' | 'start_date' | 'end_date' | 'is_milestone' | 'sort_order'
>;

export type TaskDependency = Pick<
  Tables<'task_dependencies'>,
  'id' | 'predecessor_task_id' | 'successor_task_id' | 'dependency_type'
>;

export type ProjectSchedule = {
  tasks: WbsTask[];
  dependencies: TaskDependency[];
};

export type SaveWbsTaskValues = {
  title: string;
  description: string;
  parent_task_id: string | null;
  start_date: string;
  end_date: string;
  is_milestone: boolean;
  sort_order: number;
};

function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

export async function fetchProjectSchedule(
  organizationId: string,
  projectId: string,
): Promise<ProjectSchedule> {
  const client = getClient();
  const [tasksResult, dependenciesResult] = await Promise.all([
    client
      .from('wbs_tasks')
      .select('id, parent_task_id, title, description, start_date, end_date, is_milestone, sort_order')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order')
      .order('start_date')
      .order('id'),
    client
      .from('task_dependencies')
      .select('id, predecessor_task_id, successor_task_id, dependency_type')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at')
      .order('id'),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (dependenciesResult.error) throw dependenciesResult.error;
  return {
    tasks: tasksResult.data,
    dependencies: dependenciesResult.data,
  };
}

export async function saveWbsTask(
  organizationId: string,
  projectId: string,
  taskId: string | null,
  values: SaveWbsTaskValues,
  predecessorIds: string[],
): Promise<string> {
  const taskValues = {
    title: values.title,
    description: values.description,
    parent_task_id: values.parent_task_id,
    start_date: values.start_date,
    end_date: values.end_date,
    is_milestone: values.is_milestone,
    sort_order: values.sort_order,
  };
  const { data, error } = await getClient().rpc('save_wbs_task', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_task_id: taskId,
    p_values: taskValues,
    p_predecessor_ids: predecessorIds,
  });
  if (error) throw error;
  return data;
}

export async function archiveWbsTask(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  const { error } = await getClient().rpc('archive_wbs_task', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_task_id: taskId,
  });
  if (error) throw error;
}
