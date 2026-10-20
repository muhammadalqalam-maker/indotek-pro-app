-- T-2.1: normalized AHSP definitions backed by the existing price catalog.

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_items_org_id_id
  ON public.price_items (organization_id, id);

CREATE TABLE IF NOT EXISTS public.ahsp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  division TEXT NOT NULL,
  unit_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  CONSTRAINT ahsp_org_unit_fkey
    FOREIGN KEY (organization_id, unit_id)
    REFERENCES public.measurement_units (organization_id, id)
    ON DELETE RESTRICT,
  CHECK (length(trim(code)) BETWEEN 1 AND 40),
  CHECK (length(trim(title)) BETWEEN 2 AND 180),
  CHECK (length(trim(division)) BETWEEN 2 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ahsp_org_code_active
  ON public.ahsp (organization_id, lower(code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ahsp_org_division_active
  ON public.ahsp (organization_id, division, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ahsp_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  ahsp_id UUID NOT NULL,
  price_item_id UUID NOT NULL,
  coefficient NUMERIC(18, 6) NOT NULL CHECK (coefficient >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ahsp_components_org_ahsp_fkey
    FOREIGN KEY (organization_id, ahsp_id)
    REFERENCES public.ahsp (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT ahsp_components_org_price_item_fkey
    FOREIGN KEY (organization_id, price_item_id)
    REFERENCES public.price_items (organization_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ahsp_components_org_ahsp_active
  ON public.ahsp_components (organization_id, ahsp_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ahsp_components_org_price_item
  ON public.ahsp_components (organization_id, price_item_id);

ALTER TABLE public.ahsp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahsp_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AHSP viewable by org members" ON public.ahsp;
CREATE POLICY "AHSP viewable by org members"
ON public.ahsp FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "AHSP managed by estimators and admins" ON public.ahsp;
CREATE POLICY "AHSP managed by estimators and admins"
ON public.ahsp FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'estimator'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'estimator'::user_role_type]
  )
);

DROP POLICY IF EXISTS "AHSP components viewable by org members" ON public.ahsp_components;
CREATE POLICY "AHSP components viewable by org members"
ON public.ahsp_components FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "AHSP components managed by estimators and admins" ON public.ahsp_components;
CREATE POLICY "AHSP components managed by estimators and admins"
ON public.ahsp_components FOR ALL
USING (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'estimator'::user_role_type]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'estimator'::user_role_type]
  )
);

DROP TRIGGER IF EXISTS trg_ahsp_updated_at ON public.ahsp;
CREATE TRIGGER trg_ahsp_updated_at
BEFORE UPDATE ON public.ahsp
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ahsp_components_updated_at ON public.ahsp_components;
CREATE TRIGGER trg_ahsp_components_updated_at
BEFORE UPDATE ON public.ahsp_components
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ahsp_audit ON public.ahsp;
CREATE TRIGGER trg_ahsp_audit
AFTER INSERT OR UPDATE OF code, title, division, unit_id, deleted_at OR DELETE
ON public.ahsp
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_ahsp_components_audit ON public.ahsp_components;
CREATE TRIGGER trg_ahsp_components_audit
AFTER INSERT OR UPDATE OF ahsp_id, price_item_id, coefficient, sort_order, deleted_at OR DELETE
ON public.ahsp_components
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
