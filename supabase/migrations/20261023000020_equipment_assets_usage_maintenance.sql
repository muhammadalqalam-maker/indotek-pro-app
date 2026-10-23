CREATE TABLE IF NOT EXISTS public.equipment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 180),
  brand_model TEXT NOT NULL DEFAULT '' CHECK (length(brand_model) <= 180),
  category TEXT NOT NULL CHECK (category IN (
    'Alat Berat',
    'Alat Angkat',
    'Alat Cor',
    'Genset & Daya',
    'Peralatan Survei',
    'Scaffolding'
  )),
  ownership TEXT NOT NULL CHECK (ownership IN ('internal_asset', 'rental')),
  assigned_project_id UUID,
  daily_rental_rate NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (daily_rental_rate >= 0),
  condition TEXT NOT NULL DEFAULT 'Baik'
    CHECK (condition IN ('Sangat Baik', 'Baik', 'Perlu Perawatan', 'Rusak / Perbaikan')),
  fuel_consumption_rate TEXT NOT NULL DEFAULT '' CHECK (length(fuel_consumption_rate) <= 120),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, assigned_project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  CHECK (next_maintenance_date IS NULL OR last_maintenance_date IS NULL
    OR next_maintenance_date >= last_maintenance_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS equipment_assets_org_code_active_idx
  ON public.equipment_assets (organization_id, lower(code))
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_assets_org_project_idx
  ON public.equipment_assets (organization_id, assigned_project_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.equipment_usage_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  usage_date DATE NOT NULL,
  operating_hours NUMERIC(8,2) NOT NULL CHECK (operating_hours > 0 AND operating_hours <= 24),
  fuel_liters NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fuel_liters >= 0),
  fuel_cost_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (fuel_cost_amount >= 0),
  rental_cost_snapshot NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (rental_cost_snapshot >= 0),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, equipment_id)
    REFERENCES public.equipment_assets (organization_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS equipment_usage_daily_active_idx
  ON public.equipment_usage_entries (organization_id, project_id, equipment_id, usage_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_usage_org_project_date_idx
  ON public.equipment_usage_entries (organization_id, project_id, usage_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_usage_org_asset_date_idx
  ON public.equipment_usage_entries (organization_id, equipment_id, usage_date DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID,
  equipment_id UUID NOT NULL,
  maintenance_date DATE NOT NULL,
  next_maintenance_date DATE,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 2 AND 500),
  cost_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (cost_amount >= 0),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, equipment_id)
    REFERENCES public.equipment_assets (organization_id, id) ON DELETE RESTRICT,
  CHECK (next_maintenance_date IS NULL OR next_maintenance_date >= maintenance_date)
);

CREATE INDEX IF NOT EXISTS equipment_maintenance_org_project_date_idx
  ON public.equipment_maintenance_logs (organization_id, project_id, maintenance_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_maintenance_org_asset_date_idx
  ON public.equipment_maintenance_logs (organization_id, equipment_id, maintenance_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.equipment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_usage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipment assets readable by organization members" ON public.equipment_assets;
CREATE POLICY "Equipment assets readable by organization members"
  ON public.equipment_assets FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS "Equipment assets managed by warehouse roles" ON public.equipment_assets;
CREATE POLICY "Equipment assets managed by warehouse roles"
  ON public.equipment_assets FOR ALL
  USING (public.has_role(
    organization_id,
    ARRAY['admin'::public.user_role_type, 'warehouse'::public.user_role_type]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY['admin'::public.user_role_type, 'warehouse'::public.user_role_type]
  ));

DROP POLICY IF EXISTS "Equipment usage readable by organization members" ON public.equipment_usage_entries;
CREATE POLICY "Equipment usage readable by organization members"
  ON public.equipment_usage_entries FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS "Equipment usage created by project team" ON public.equipment_usage_entries;
CREATE POLICY "Equipment usage created by project team"
  ON public.equipment_usage_entries FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'warehouse'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS "Equipment usage archived by warehouse roles" ON public.equipment_usage_entries;
CREATE POLICY "Equipment usage archived by warehouse roles"
  ON public.equipment_usage_entries FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY['admin'::public.user_role_type, 'warehouse'::public.user_role_type]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY['admin'::public.user_role_type, 'warehouse'::public.user_role_type]
  ));

DROP POLICY IF EXISTS "Equipment maintenance readable by organization members" ON public.equipment_maintenance_logs;
CREATE POLICY "Equipment maintenance readable by organization members"
  ON public.equipment_maintenance_logs FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS "Equipment maintenance recorded by project team" ON public.equipment_maintenance_logs;
CREATE POLICY "Equipment maintenance recorded by project team"
  ON public.equipment_maintenance_logs FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'warehouse'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS "Equipment maintenance archived by warehouse roles" ON public.equipment_maintenance_logs;
CREATE POLICY "Equipment maintenance archived by warehouse roles"
  ON public.equipment_maintenance_logs FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY['admin'::public.user_role_type, 'warehouse'::public.user_role_type]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY['admin'::public.user_role_type, 'warehouse'::public.user_role_type]
  ));

REVOKE ALL ON public.equipment_assets, public.equipment_usage_entries, public.equipment_maintenance_logs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.equipment_assets, public.equipment_usage_entries,
  public.equipment_maintenance_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.snapshot_equipment_usage_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  asset_ownership TEXT;
  asset_project_id UUID;
  asset_daily_rate NUMERIC(18,2);
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.organization_id = OLD.organization_id
    AND NEW.project_id = OLD.project_id
    AND NEW.equipment_id = OLD.equipment_id THEN
    NEW.rental_cost_snapshot := OLD.rental_cost_snapshot;
    RETURN NEW;
  END IF;

  SELECT ownership, assigned_project_id, daily_rental_rate
  INTO asset_ownership, asset_project_id, asset_daily_rate
  FROM public.equipment_assets
  WHERE organization_id = NEW.organization_id
    AND id = NEW.equipment_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peralatan tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF asset_project_id IS NOT NULL AND asset_project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Peralatan tidak ditugaskan ke proyek ini.' USING ERRCODE = 'check_violation';
  END IF;

  NEW.rental_cost_snapshot := CASE
    WHEN asset_ownership = 'rental' THEN asset_daily_rate
    ELSE 0
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipment_usage_cost_snapshot ON public.equipment_usage_entries;
CREATE TRIGGER trg_equipment_usage_cost_snapshot
  BEFORE INSERT OR UPDATE ON public.equipment_usage_entries
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_equipment_usage_cost();

CREATE OR REPLACE FUNCTION public.record_equipment_maintenance(
  p_organization_id UUID,
  p_equipment_id UUID,
  p_maintenance_date DATE,
  p_description TEXT,
  p_cost_amount NUMERIC,
  p_next_maintenance_date DATE DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result_id UUID;
  equipment_project_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY[
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'warehouse'::public.user_role_type
    ]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat servis peralatan.' USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL OR p_equipment_id IS NULL OR p_maintenance_date IS NULL
    OR length(trim(coalesce(p_description, ''))) NOT BETWEEN 2 AND 500
    OR p_cost_amount IS NULL OR p_cost_amount < 0
    OR p_cost_amount > 9999999999999999.99 OR p_cost_amount <> round(p_cost_amount, 2)
    OR (p_next_maintenance_date IS NOT NULL AND p_next_maintenance_date < p_maintenance_date)
  THEN
    RAISE EXCEPTION 'Data servis peralatan tidak valid.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT assigned_project_id
  INTO equipment_project_id
  FROM public.equipment_assets
  WHERE organization_id = p_organization_id
    AND id = p_equipment_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peralatan tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;

  INSERT INTO public.equipment_maintenance_logs (
    organization_id, project_id, equipment_id, maintenance_date,
    next_maintenance_date, description, cost_amount
  ) VALUES (
    p_organization_id, equipment_project_id, p_equipment_id, p_maintenance_date,
    p_next_maintenance_date, trim(p_description), p_cost_amount
  ) RETURNING id INTO result_id;

  UPDATE public.equipment_assets
  SET
    last_maintenance_date = p_maintenance_date,
    next_maintenance_date = p_next_maintenance_date
  WHERE organization_id = p_organization_id
    AND id = p_equipment_id;

  RETURN result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_equipment_maintenance(UUID, UUID, DATE, TEXT, NUMERIC, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_equipment_maintenance(UUID, UUID, DATE, TEXT, NUMERIC, DATE)
  TO authenticated;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'equipment_assets',
    'equipment_usage_entries',
    'equipment_maintenance_logs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name, table_name
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit()',
      table_name, table_name
    );
  END LOOP;
END;
$$;
