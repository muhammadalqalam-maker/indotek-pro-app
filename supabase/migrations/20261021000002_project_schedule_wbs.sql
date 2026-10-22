-- T-2.12: project-scoped WBS tasks and finish-to-start dependencies.

CREATE TABLE IF NOT EXISTS public.wbs_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_milestone BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT wbs_tasks_date_range_check CHECK (end_date >= start_date),
  CONSTRAINT wbs_tasks_milestone_date_check CHECK (NOT is_milestone OR end_date = start_date),
  UNIQUE (organization_id, project_id, id),
  CONSTRAINT wbs_tasks_parent_fkey
    FOREIGN KEY (organization_id, project_id, parent_task_id)
    REFERENCES public.wbs_tasks (organization_id, project_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  predecessor_task_id UUID NOT NULL,
  successor_task_id UUID NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start'
    CHECK (dependency_type = 'finish_to_start'),
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT task_dependencies_not_self_check
    CHECK (predecessor_task_id <> successor_task_id),
  UNIQUE (organization_id, project_id, predecessor_task_id, successor_task_id),
  CONSTRAINT task_dependencies_predecessor_fkey
    FOREIGN KEY (organization_id, project_id, predecessor_task_id)
    REFERENCES public.wbs_tasks (organization_id, project_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT task_dependencies_successor_fkey
    FOREIGN KEY (organization_id, project_id, successor_task_id)
    REFERENCES public.wbs_tasks (organization_id, project_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_org_project_schedule
  ON public.wbs_tasks (organization_id, project_id, start_date, sort_order)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_parent
  ON public.wbs_tasks (organization_id, project_id, parent_task_id, sort_order)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor
  ON public.task_dependencies (organization_id, project_id, successor_task_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor
  ON public.task_dependencies (organization_id, project_id, predecessor_task_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wbs_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WBS tasks viewable by org members" ON public.wbs_tasks;
CREATE POLICY "WBS tasks viewable by org members"
ON public.wbs_tasks FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Task dependencies viewable by org members" ON public.task_dependencies;
CREATE POLICY "Task dependencies viewable by org members"
ON public.task_dependencies FOR SELECT
USING (public.is_org_member(organization_id));

REVOKE ALL ON public.wbs_tasks, public.task_dependencies FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.wbs_tasks FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.task_dependencies FROM authenticated;
GRANT SELECT ON public.wbs_tasks, public.task_dependencies TO authenticated;

DROP TRIGGER IF EXISTS trg_wbs_tasks_updated_at ON public.wbs_tasks;
CREATE TRIGGER trg_wbs_tasks_updated_at
BEFORE UPDATE ON public.wbs_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_task_dependencies_updated_at ON public.task_dependencies;
CREATE TRIGGER trg_task_dependencies_updated_at
BEFORE UPDATE ON public.task_dependencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_wbs_tasks_audit ON public.wbs_tasks;
CREATE TRIGGER trg_wbs_tasks_audit
AFTER INSERT OR UPDATE OR DELETE ON public.wbs_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_task_dependencies_audit ON public.task_dependencies;
CREATE TRIGGER trg_task_dependencies_audit
AFTER INSERT OR UPDATE OR DELETE ON public.task_dependencies
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.save_wbs_task(
  p_organization_id UUID,
  p_project_id UUID,
  p_task_id UUID,
  p_values JSONB,
  p_predecessor_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  task_uuid UUID := COALESCE(p_task_id, gen_random_uuid());
  parent_uuid UUID;
  task_title TEXT;
  task_description TEXT;
  start_date_value DATE;
  end_date_value DATE;
  milestone_value BOOLEAN;
  has_hierarchy_cycle BOOLEAN;
  sort_order_value INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type]
  ) THEN
    RAISE EXCEPTION 'The user cannot manage this project schedule'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object'
    OR p_predecessor_ids IS NULL
    OR cardinality(p_predecessor_ids) > 500
  THEN
    RAISE EXCEPTION 'Invalid schedule task values'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM project.id
  FROM public.projects AS project
  WHERE project.id = p_project_id
    AND project.organization_id = p_organization_id
    AND project.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF p_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.wbs_tasks AS task
    WHERE task.id = p_task_id
      AND task.organization_id = p_organization_id
      AND task.project_id = p_project_id
      AND task.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Schedule task is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  task_title := trim(COALESCE(p_values->>'title', ''));
  task_description := COALESCE(p_values->>'description', '');
  start_date_value := (p_values->>'start_date')::DATE;
  end_date_value := (p_values->>'end_date')::DATE;
  parent_uuid := NULLIF(p_values->>'parent_task_id', '')::UUID;
  milestone_value := COALESCE((p_values->>'is_milestone')::BOOLEAN, false);
  sort_order_value := COALESCE((p_values->>'sort_order')::INTEGER, 0);

  IF length(task_title) NOT BETWEEN 1 AND 160
    OR length(task_description) > 2000
    OR end_date_value < start_date_value
    OR (milestone_value AND end_date_value <> start_date_value)
    OR sort_order_value < 0
    OR parent_uuid = task_uuid
  THEN
    RAISE EXCEPTION 'Schedule task details are invalid'
      USING ERRCODE = 'check_violation';
  END IF;

  IF parent_uuid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.wbs_tasks AS parent
    WHERE parent.id = parent_uuid
      AND parent.organization_id = p_organization_id
      AND parent.project_id = p_project_id
      AND parent.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Parent task must be active in the same project'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF parent_uuid IS NOT NULL THEN
    WITH RECURSIVE ancestors(id, parent_task_id) AS (
      SELECT task.id, task.parent_task_id
      FROM public.wbs_tasks AS task
      WHERE task.id = parent_uuid
        AND task.organization_id = p_organization_id
        AND task.project_id = p_project_id
        AND task.deleted_at IS NULL
      UNION
      SELECT parent.id, parent.parent_task_id
      FROM public.wbs_tasks AS parent
      JOIN ancestors ON parent.id = ancestors.parent_task_id
      WHERE parent.organization_id = p_organization_id
        AND parent.project_id = p_project_id
        AND parent.deleted_at IS NULL
    )
    SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = task_uuid)
    INTO has_hierarchy_cycle;

    IF has_hierarchy_cycle THEN
      RAISE EXCEPTION 'WBS hierarchy cannot contain a cycle'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF cardinality(p_predecessor_ids) <> (
    SELECT count(DISTINCT predecessor_id)
    FROM unnest(p_predecessor_ids) AS ids(predecessor_id)
  ) THEN
    RAISE EXCEPTION 'A predecessor task can only be selected once'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_predecessor_ids) AS ids(predecessor_id)
    LEFT JOIN public.wbs_tasks AS predecessor
      ON predecessor.id = predecessor_id
     AND predecessor.organization_id = p_organization_id
     AND predecessor.project_id = p_project_id
     AND predecessor.deleted_at IS NULL
    WHERE predecessor.id IS NULL
      OR predecessor.id = task_uuid
      OR predecessor.end_date >= start_date_value
  ) THEN
    RAISE EXCEPTION 'Finish-to-start dependencies require an earlier predecessor finish date'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.task_dependencies AS dependency
    JOIN public.wbs_tasks AS successor
      ON successor.id = dependency.successor_task_id
     AND successor.organization_id = dependency.organization_id
     AND successor.project_id = dependency.project_id
     AND successor.deleted_at IS NULL
    WHERE dependency.organization_id = p_organization_id
      AND dependency.project_id = p_project_id
      AND dependency.predecessor_task_id = task_uuid
      AND dependency.successor_task_id <> task_uuid
      AND dependency.deleted_at IS NULL
      AND successor.start_date <= end_date_value
  ) THEN
    RAISE EXCEPTION 'Task finish date conflicts with a dependent task'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    WITH RECURSIVE descendants(id) AS (
      SELECT dependency.successor_task_id
      FROM public.task_dependencies AS dependency
      WHERE dependency.organization_id = p_organization_id
        AND dependency.project_id = p_project_id
        AND dependency.predecessor_task_id = task_uuid
        AND dependency.successor_task_id <> task_uuid
        AND dependency.deleted_at IS NULL
      UNION
      SELECT dependency.successor_task_id
      FROM public.task_dependencies AS dependency
      JOIN descendants ON dependency.predecessor_task_id = descendants.id
      WHERE dependency.organization_id = p_organization_id
        AND dependency.project_id = p_project_id
        AND dependency.deleted_at IS NULL
        AND dependency.successor_task_id <> task_uuid
    )
    SELECT 1 FROM descendants WHERE id = ANY(p_predecessor_ids)
  ) THEN
    RAISE EXCEPTION 'Task dependencies cannot contain a cycle'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.wbs_tasks (
    id, organization_id, project_id, parent_task_id, title, description,
    start_date, end_date, is_milestone, sort_order, created_by
  ) VALUES (
    task_uuid, p_organization_id, p_project_id, parent_uuid, task_title,
    task_description, start_date_value, end_date_value,
    COALESCE((p_values->>'is_milestone')::BOOLEAN, false), sort_order_value, auth.uid()
  )
  ON CONFLICT (id) DO UPDATE SET
    parent_task_id = EXCLUDED.parent_task_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    is_milestone = EXCLUDED.is_milestone,
    sort_order = EXCLUDED.sort_order;

  UPDATE public.task_dependencies AS dependency
  SET deleted_at = timezone('utc'::TEXT, now())
  WHERE dependency.organization_id = p_organization_id
    AND dependency.project_id = p_project_id
    AND dependency.successor_task_id = task_uuid
    AND dependency.deleted_at IS NULL
    AND NOT (dependency.predecessor_task_id = ANY(p_predecessor_ids));

  INSERT INTO public.task_dependencies (
    organization_id, project_id, predecessor_task_id, successor_task_id, created_by
  )
  SELECT p_organization_id, p_project_id, predecessor_id, task_uuid, auth.uid()
  FROM unnest(p_predecessor_ids) AS ids(predecessor_id)
  ON CONFLICT (organization_id, project_id, predecessor_task_id, successor_task_id)
  DO UPDATE SET deleted_at = NULL;

  RETURN task_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_wbs_task(
  p_organization_id UUID,
  p_project_id UUID,
  p_task_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type]
  ) THEN
    RAISE EXCEPTION 'The user cannot manage this project schedule'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM project.id
  FROM public.projects AS project
  WHERE project.id = p_project_id
    AND project.organization_id = p_organization_id
    AND project.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wbs_tasks AS child
    WHERE child.organization_id = p_organization_id
      AND child.project_id = p_project_id
      AND child.parent_task_id = p_task_id
      AND child.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Archive child tasks before their parent'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.wbs_tasks
  SET deleted_at = timezone('utc'::TEXT, now())
  WHERE id = p_task_id
    AND organization_id = p_organization_id
    AND project_id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule task is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  UPDATE public.task_dependencies
  SET deleted_at = timezone('utc'::TEXT, now())
  WHERE organization_id = p_organization_id
    AND project_id = p_project_id
    AND deleted_at IS NULL
    AND (predecessor_task_id = p_task_id OR successor_task_id = p_task_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_wbs_task(UUID, UUID, UUID, JSONB, UUID[])
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_wbs_task(UUID, UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_wbs_task(UUID, UUID, UUID, JSONB, UUID[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_wbs_task(UUID, UUID, UUID)
  TO authenticated;
