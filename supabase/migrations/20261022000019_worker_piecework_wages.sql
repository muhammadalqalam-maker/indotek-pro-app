ALTER TABLE public.daily_attendance
  ADD COLUMN IF NOT EXISTS daily_wage_rate_snapshot NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate_snapshot NUMERIC(18,2);

UPDATE public.daily_attendance AS attendance
SET
  daily_wage_rate_snapshot = worker.daily_wage_rate,
  overtime_hourly_rate_snapshot = worker.overtime_hourly_rate
FROM public.field_workers AS worker
WHERE worker.organization_id = attendance.organization_id
  AND worker.project_id = attendance.project_id
  AND worker.id = attendance.worker_id
  AND (
    attendance.daily_wage_rate_snapshot IS NULL
    OR attendance.overtime_hourly_rate_snapshot IS NULL
  );

ALTER TABLE public.daily_attendance
  ALTER COLUMN daily_wage_rate_snapshot SET DEFAULT 0,
  ALTER COLUMN daily_wage_rate_snapshot SET NOT NULL,
  ALTER COLUMN overtime_hourly_rate_snapshot SET DEFAULT 0,
  ALTER COLUMN overtime_hourly_rate_snapshot SET NOT NULL;

CREATE OR REPLACE FUNCTION public.snapshot_attendance_wage_rates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id = OLD.organization_id
      AND NEW.project_id = OLD.project_id
      AND NEW.worker_id = OLD.worker_id THEN
      NEW.daily_wage_rate_snapshot := OLD.daily_wage_rate_snapshot;
      NEW.overtime_hourly_rate_snapshot := OLD.overtime_hourly_rate_snapshot;
      RETURN NEW;
    END IF;
  END IF;

  SELECT worker.daily_wage_rate, worker.overtime_hourly_rate
  INTO NEW.daily_wage_rate_snapshot, NEW.overtime_hourly_rate_snapshot
  FROM public.field_workers AS worker
  WHERE worker.organization_id = NEW.organization_id
    AND worker.project_id = NEW.project_id
    AND worker.id = NEW.worker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker for attendance wage snapshot was not found';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_attendance_wage_snapshot ON public.daily_attendance;
CREATE TRIGGER trg_daily_attendance_wage_snapshot
  BEFORE INSERT OR UPDATE ON public.daily_attendance
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_attendance_wage_rates();

CREATE TABLE IF NOT EXISTS public.worker_piecework_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  work_date DATE NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 2 AND 240),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 20),
  unit_rate NUMERIC(18,2) NOT NULL CHECK (unit_rate >= 0),
  total_amount NUMERIC(18,2) GENERATED ALWAYS AS (round(quantity * unit_rate, 2)) STORED,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT worker_piecework_project_fkey
    FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT worker_piecework_worker_fkey
    FOREIGN KEY (organization_id, project_id, worker_id)
    REFERENCES public.field_workers (organization_id, project_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS worker_piecework_org_project_date_idx
  ON public.worker_piecework_entries (organization_id, project_id, work_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS worker_piecework_org_worker_date_idx
  ON public.worker_piecework_entries (organization_id, worker_id, work_date)
  WHERE deleted_at IS NULL;

ALTER TABLE public.worker_piecework_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Worker piecework readable by workforce roles"
  ON public.worker_piecework_entries;
CREATE POLICY "Worker piecework readable by workforce roles"
  ON public.worker_piecework_entries
  FOR SELECT USING (
    public.has_role(
      organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type,
        'site_manager'::public.user_role_type
      ]
    )
  );

DROP POLICY IF EXISTS "Worker piecework managed by project team"
  ON public.worker_piecework_entries;
CREATE POLICY "Worker piecework managed by project team"
  ON public.worker_piecework_entries
  FOR ALL USING (
    public.has_role(
      organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type,
        'site_manager'::public.user_role_type
      ]
    )
  ) WITH CHECK (
    public.has_role(
      organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type,
        'site_manager'::public.user_role_type
      ]
    )
  );

REVOKE ALL ON public.worker_piecework_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.worker_piecework_entries TO authenticated;

DROP TRIGGER IF EXISTS trg_worker_piecework_updated_at ON public.worker_piecework_entries;
CREATE TRIGGER trg_worker_piecework_updated_at
  BEFORE UPDATE ON public.worker_piecework_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_worker_piecework_audit ON public.worker_piecework_entries;
CREATE TRIGGER trg_worker_piecework_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_piecework_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
