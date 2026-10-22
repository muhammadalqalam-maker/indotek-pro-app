-- T-2.4: add tenant-scoped, versioned BOQ tables without changing legacy tables.

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_org_id
  ON public.projects (organization_id, id);

CREATE TABLE IF NOT EXISTS public.boq_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  revision_number INTEGER NOT NULL DEFAULT 0 CHECK (revision_number >= 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 180),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  overhead_percent NUMERIC(5, 2) NOT NULL DEFAULT 10
    CHECK (overhead_percent BETWEEN 0 AND 100),
  profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (profit_percent BETWEEN 0 AND 100),
  ppn_percent NUMERIC(5, 2) NOT NULL DEFAULT 11
    CHECK (ppn_percent BETWEEN 0 AND 100),
  subtotal_direct_cost NUMERIC(18, 2) NOT NULL DEFAULT 0
    CHECK (subtotal_direct_cost >= 0),
  overhead_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (overhead_amount >= 0),
  profit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (profit_amount >= 0),
  ppn_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (ppn_amount >= 0),
  grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT boq_versions_org_project_fkey
    FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, project_id, id),
  UNIQUE (organization_id, project_id, revision_number)
);

CREATE TABLE IF NOT EXISTS public.boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  boq_version_id UUID NOT NULL,
  parent_id UUID,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('division', 'work_item')),
  item_code TEXT NOT NULL CHECK (length(trim(item_code)) BETWEEN 1 AND 40),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 2 AND 500),
  unit_id UUID,
  ahsp_id UUID,
  volume NUMERIC(18, 4),
  unit_price NUMERIC(18, 2),
  line_total NUMERIC(18, 2)
    GENERATED ALWAYS AS (
      CASE
        WHEN item_type = 'work_item' THEN round(volume * unit_price, 2)
        ELSE 0::NUMERIC
      END
    ) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT boq_items_org_version_fkey
    FOREIGN KEY (organization_id, project_id, boq_version_id)
    REFERENCES public.boq_versions (organization_id, project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT boq_items_parent_fkey
    FOREIGN KEY (organization_id, project_id, boq_version_id, parent_id)
    REFERENCES public.boq_items (organization_id, project_id, boq_version_id, id)
    ON DELETE CASCADE,
  CONSTRAINT boq_items_org_unit_fkey
    FOREIGN KEY (organization_id, unit_id)
    REFERENCES public.measurement_units (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT boq_items_org_ahsp_fkey
    FOREIGN KEY (organization_id, ahsp_id)
    REFERENCES public.ahsp (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT boq_items_hierarchy_fields_check
    CHECK (
      (
        item_type = 'division'
        AND parent_id IS NULL
        AND unit_id IS NULL
        AND ahsp_id IS NULL
        AND volume IS NULL
        AND unit_price IS NULL
      )
      OR (
        item_type = 'work_item'
        AND parent_id IS NOT NULL
        AND unit_id IS NOT NULL
        AND volume IS NOT NULL
        AND volume >= 0
        AND unit_price IS NOT NULL
        AND unit_price >= 0
      )
    ),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, project_id, boq_version_id, id)
);

CREATE OR REPLACE FUNCTION public.validate_boq_item_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  parent_type TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT item_type
    INTO parent_type
    FROM public.boq_items
    WHERE organization_id = NEW.organization_id
      AND project_id = NEW.project_id
      AND boq_version_id = NEW.boq_version_id
      AND id = NEW.parent_id;

    IF parent_type IS DISTINCT FROM 'division' THEN
      RAISE EXCEPTION 'BOQ work items must belong directly to a division'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.item_type <> 'division' AND EXISTS (
    SELECT 1
    FROM public.boq_items child
    WHERE child.organization_id = NEW.organization_id
      AND child.project_id = NEW.project_id
      AND child.boq_version_id = NEW.boq_version_id
      AND child.parent_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'A BOQ division with child items cannot be changed to a work item'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_boq_versions_org_project_revision
  ON public.boq_versions (organization_id, project_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_boq_versions_org_status
  ON public.boq_versions (organization_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boq_items_org_version_parent_order
  ON public.boq_items (organization_id, boq_version_id, parent_id, sort_order)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boq_items_org_project
  ON public.boq_items (organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_org_ahsp
  ON public.boq_items (organization_id, ahsp_id)
  WHERE ahsp_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_boq_items_division_code_active
  ON public.boq_items (organization_id, boq_version_id, lower(item_code))
  WHERE item_type = 'division' AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_boq_items_work_code_active
  ON public.boq_items (organization_id, boq_version_id, parent_id, lower(item_code))
  WHERE item_type = 'work_item' AND deleted_at IS NULL;

ALTER TABLE public.boq_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BOQ versions viewable by org members" ON public.boq_versions;
CREATE POLICY "BOQ versions viewable by org members"
ON public.boq_versions FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "BOQ versions managed by project roles" ON public.boq_versions;
CREATE POLICY "BOQ versions managed by project roles"
ON public.boq_versions FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'estimator'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'estimator'::user_role_type]
  )
);

DROP POLICY IF EXISTS "BOQ items viewable by org members" ON public.boq_items;
CREATE POLICY "BOQ items viewable by org members"
ON public.boq_items FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "BOQ items managed by project roles" ON public.boq_items;
CREATE POLICY "BOQ items managed by project roles"
ON public.boq_items FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'estimator'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'estimator'::user_role_type]
  )
);

DROP TRIGGER IF EXISTS trg_boq_items_validate_hierarchy ON public.boq_items;
CREATE CONSTRAINT TRIGGER trg_boq_items_validate_hierarchy
AFTER INSERT OR UPDATE ON public.boq_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_boq_item_hierarchy();

DROP TRIGGER IF EXISTS trg_boq_versions_updated_at ON public.boq_versions;
CREATE TRIGGER trg_boq_versions_updated_at
BEFORE UPDATE ON public.boq_versions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_boq_items_updated_at ON public.boq_items;
CREATE TRIGGER trg_boq_items_updated_at
BEFORE UPDATE ON public.boq_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_boq_versions_audit ON public.boq_versions;
CREATE TRIGGER trg_boq_versions_audit
AFTER INSERT OR UPDATE OR DELETE ON public.boq_versions
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_boq_items_audit ON public.boq_items;
CREATE TRIGGER trg_boq_items_audit
AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
