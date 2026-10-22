-- T-2.8: add tenant-scoped daily reports and BOQ progress entries.
-- Legacy daily_site_reports and its child tables remain unchanged.

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  report_date DATE NOT NULL,
  weather_conditions TEXT NOT NULL DEFAULT '',
  work_summary TEXT NOT NULL DEFAULT '',
  obstacles TEXT NOT NULL DEFAULT '',
  solutions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT daily_reports_org_project_fkey
    FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, project_id, id)
);

CREATE TABLE IF NOT EXISTS public.daily_report_manpower_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  report_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  trade_type TEXT NOT NULL CHECK (length(trim(trade_type)) BETWEEN 1 AND 120),
  headcount INTEGER NOT NULL DEFAULT 1 CHECK (headcount > 0),
  work_hours NUMERIC(5, 2) NOT NULL DEFAULT 8 CHECK (work_hours BETWEEN 0 AND 24),
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT daily_report_manpower_entries_report_fkey
    FOREIGN KEY (organization_id, project_id, report_id)
    REFERENCES public.daily_reports (organization_id, project_id, id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS public.daily_report_equipment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  report_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  equipment_name TEXT NOT NULL CHECK (length(trim(equipment_name)) BETWEEN 1 AND 180),
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  active_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (active_hours BETWEEN 0 AND 24),
  standby_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (standby_hours BETWEEN 0 AND 24),
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT daily_report_equipment_entries_report_fkey
    FOREIGN KEY (organization_id, project_id, report_id)
    REFERENCES public.daily_reports (organization_id, project_id, id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS public.daily_report_material_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  report_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  material_name TEXT NOT NULL CHECK (length(trim(material_name)) BETWEEN 1 AND 180),
  quantity NUMERIC(18, 4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 40),
  supplier_name TEXT NOT NULL DEFAULT '',
  delivery_note_no TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT daily_report_material_entries_report_fkey
    FOREIGN KEY (organization_id, project_id, report_id)
    REFERENCES public.daily_reports (organization_id, project_id, id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS public.progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  report_id UUID NOT NULL,
  boq_version_id UUID NOT NULL,
  boq_item_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  installed_volume NUMERIC(18, 4) NOT NULL CHECK (installed_volume > 0),
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT progress_entries_report_fkey
    FOREIGN KEY (organization_id, project_id, report_id)
    REFERENCES public.daily_reports (organization_id, project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT progress_entries_boq_item_fkey
    FOREIGN KEY (organization_id, project_id, boq_version_id, boq_item_id)
    REFERENCES public.boq_items (organization_id, project_id, boq_version_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, project_id, report_id, boq_item_id),
  UNIQUE (organization_id, id)
);

CREATE OR REPLACE FUNCTION public.validate_progress_entry_boq_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_item_type TEXT;
  target_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT item.item_type, item.deleted_at
  INTO target_item_type, target_deleted_at
  FROM public.boq_items AS item
  WHERE item.organization_id = NEW.organization_id
    AND item.project_id = NEW.project_id
    AND item.boq_version_id = NEW.boq_version_id
    AND item.id = NEW.boq_item_id;

  IF target_item_type IS DISTINCT FROM 'work_item' OR target_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Progress entries must reference an active BOQ work item'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_daily_reports_org_project_date
  ON public.daily_reports (organization_id, project_id, report_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_reports_org_status_date
  ON public.daily_reports (organization_id, status, report_date DESC)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_active_project_date
  ON public.daily_reports (organization_id, project_id, report_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_report_manpower_entries_report
  ON public.daily_report_manpower_entries (organization_id, report_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_report_equipment_entries_report
  ON public.daily_report_equipment_entries (organization_id, report_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_report_material_entries_report
  ON public.daily_report_material_entries (organization_id, report_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_progress_entries_org_project_item
  ON public.progress_entries (organization_id, project_id, boq_version_id, boq_item_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_progress_entries_org_report
  ON public.progress_entries (organization_id, report_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_manpower_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_equipment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_material_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Daily reports viewable by org members" ON public.daily_reports;
CREATE POLICY "Daily reports viewable by org members"
ON public.daily_reports FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Daily reports managed by field roles" ON public.daily_reports;
CREATE POLICY "Daily reports managed by field roles"
ON public.daily_reports FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
);

DROP POLICY IF EXISTS "Daily report manpower entries viewable by org members" ON public.daily_report_manpower_entries;
CREATE POLICY "Daily report manpower entries viewable by org members"
ON public.daily_report_manpower_entries FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Daily report manpower entries managed by field roles" ON public.daily_report_manpower_entries;
CREATE POLICY "Daily report manpower entries managed by field roles"
ON public.daily_report_manpower_entries FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
);

DROP POLICY IF EXISTS "Daily report equipment entries viewable by org members" ON public.daily_report_equipment_entries;
CREATE POLICY "Daily report equipment entries viewable by org members"
ON public.daily_report_equipment_entries FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Daily report equipment entries managed by field roles" ON public.daily_report_equipment_entries;
CREATE POLICY "Daily report equipment entries managed by field roles"
ON public.daily_report_equipment_entries FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
);

DROP POLICY IF EXISTS "Daily report material entries viewable by org members" ON public.daily_report_material_entries;
CREATE POLICY "Daily report material entries viewable by org members"
ON public.daily_report_material_entries FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Daily report material entries managed by field roles" ON public.daily_report_material_entries;
CREATE POLICY "Daily report material entries managed by field roles"
ON public.daily_report_material_entries FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
);

DROP POLICY IF EXISTS "Progress entries viewable by org members" ON public.progress_entries;
CREATE POLICY "Progress entries viewable by org members"
ON public.progress_entries FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Progress entries managed by field roles" ON public.progress_entries;
CREATE POLICY "Progress entries managed by field roles"
ON public.progress_entries FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  )
);

DROP TRIGGER IF EXISTS trg_daily_reports_updated_at ON public.daily_reports;
CREATE TRIGGER trg_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_report_manpower_entries_updated_at ON public.daily_report_manpower_entries;
CREATE TRIGGER trg_daily_report_manpower_entries_updated_at
BEFORE UPDATE ON public.daily_report_manpower_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_report_equipment_entries_updated_at ON public.daily_report_equipment_entries;
CREATE TRIGGER trg_daily_report_equipment_entries_updated_at
BEFORE UPDATE ON public.daily_report_equipment_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_report_material_entries_updated_at ON public.daily_report_material_entries;
CREATE TRIGGER trg_daily_report_material_entries_updated_at
BEFORE UPDATE ON public.daily_report_material_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_progress_entries_updated_at ON public.progress_entries;
CREATE TRIGGER trg_progress_entries_updated_at
BEFORE UPDATE ON public.progress_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_progress_entries_validate_boq_item ON public.progress_entries;
CREATE TRIGGER trg_progress_entries_validate_boq_item
BEFORE INSERT OR UPDATE OF organization_id, project_id, boq_version_id, boq_item_id
ON public.progress_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_progress_entry_boq_item();

DROP TRIGGER IF EXISTS trg_daily_reports_audit ON public.daily_reports;
CREATE TRIGGER trg_daily_reports_audit
AFTER INSERT OR UPDATE OR DELETE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_daily_report_manpower_entries_audit ON public.daily_report_manpower_entries;
CREATE TRIGGER trg_daily_report_manpower_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON public.daily_report_manpower_entries
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_daily_report_equipment_entries_audit ON public.daily_report_equipment_entries;
CREATE TRIGGER trg_daily_report_equipment_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON public.daily_report_equipment_entries
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_daily_report_material_entries_audit ON public.daily_report_material_entries;
CREATE TRIGGER trg_daily_report_material_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON public.daily_report_material_entries
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_progress_entries_audit ON public.progress_entries;
CREATE TRIGGER trg_progress_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON public.progress_entries
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
