CREATE TABLE IF NOT EXISTS public.field_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  nik TEXT NOT NULL CHECK (length(trim(nik)) BETWEEN 1 AND 32),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  role_trade TEXT NOT NULL CHECK (role_trade IN (
    'Mandor', 'Kepala Tukang', 'Tukang Besi', 'Tukang Kayu',
    'Tukang Batu', 'Pekerja / Kenek', 'Operator'
  )),
  daily_wage_rate NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (daily_wage_rate >= 0),
  overtime_hourly_rate NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (overtime_hourly_rate >= 0),
  phone TEXT CHECK (phone IS NULL OR length(phone) <= 32),
  origin_city TEXT CHECK (origin_city IS NULL OR length(origin_city) <= 120),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT field_workers_project_fkey
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, project_id, id),
  UNIQUE (organization_id, nik)
);

CREATE INDEX IF NOT EXISTS field_workers_org_project_status_idx
  ON public.field_workers (organization_id, project_id, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('hadir', 'lembur', 'izin', 'sakit', 'alpa')),
  work_hours NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (work_hours BETWEEN 0 AND 24),
  overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (overtime_hours BETWEEN 0 AND 24),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT daily_attendance_org_project_fkey
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT daily_attendance_worker_fkey
  FOREIGN KEY (organization_id, project_id, worker_id)
    REFERENCES public.field_workers (organization_id, project_id, id) ON DELETE RESTRICT,
  CHECK (
    status IN ('hadir', 'lembur')
    OR (work_hours = 0 AND overtime_hours = 0)
  ),
  UNIQUE (organization_id, project_id, worker_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS daily_attendance_org_project_date_idx
  ON public.daily_attendance (organization_id, project_id, attendance_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_attendance_org_worker_date_idx
  ON public.daily_attendance (organization_id, worker_id, attendance_date)
  WHERE deleted_at IS NULL;

ALTER TABLE public.field_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Field workers readable by organization members" ON public.field_workers;
CREATE POLICY "Field workers readable by organization members" ON public.field_workers
  FOR SELECT USING (
    public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type]
    )
  );
DROP POLICY IF EXISTS "Field workers managed by project team" ON public.field_workers;
CREATE POLICY "Field workers managed by project team" ON public.field_workers
  FOR ALL USING (
    public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type]
    )
  ) WITH CHECK (
    public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type]
    )
  );

DROP POLICY IF EXISTS "Daily attendance readable by organization members" ON public.daily_attendance;
CREATE POLICY "Daily attendance readable by organization members" ON public.daily_attendance
  FOR SELECT USING (
    public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type]
    )
  );
DROP POLICY IF EXISTS "Daily attendance managed by site team" ON public.daily_attendance;
CREATE POLICY "Daily attendance managed by site team" ON public.daily_attendance
  FOR ALL USING (
    public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type]
    )
  ) WITH CHECK (
    public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type]
    )
  );

REVOKE ALL ON public.field_workers, public.daily_attendance FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.field_workers, public.daily_attendance TO authenticated;

DROP TRIGGER IF EXISTS trg_field_workers_updated_at ON public.field_workers;
CREATE TRIGGER trg_field_workers_updated_at BEFORE UPDATE ON public.field_workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_daily_attendance_updated_at ON public.daily_attendance;
CREATE TRIGGER trg_daily_attendance_updated_at BEFORE UPDATE ON public.daily_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_field_workers_audit ON public.field_workers;
CREATE TRIGGER trg_field_workers_audit AFTER INSERT OR UPDATE OR DELETE ON public.field_workers
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS trg_daily_attendance_audit ON public.daily_attendance;
CREATE TRIGGER trg_daily_attendance_audit AFTER INSERT OR UPDATE OR DELETE ON public.daily_attendance
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
