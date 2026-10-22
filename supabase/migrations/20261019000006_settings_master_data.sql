-- T-1.26: tenant-scoped estimating catalog and auditable settings.

CREATE TABLE IF NOT EXISTS public.measurement_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  CHECK (length(trim(code)) BETWEEN 1 AND 20),
  CHECK (length(trim(name)) BETWEEN 2 AND 80),
  CHECK (length(trim(symbol)) BETWEEN 1 AND 16)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_units_org_code_active
  ON public.measurement_units (organization_id, lower(code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_measurement_units_org_active
  ON public.measurement_units (organization_id, name)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  unit_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bahan', 'upah', 'alat')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_price NUMERIC(18, 2) NOT NULL CHECK (unit_price >= 0),
  region TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT price_items_org_unit_fkey
    FOREIGN KEY (organization_id, unit_id)
    REFERENCES public.measurement_units (organization_id, id),
  CHECK (length(trim(code)) BETWEEN 1 AND 40),
  CHECK (length(trim(name)) BETWEEN 2 AND 180),
  CHECK (region IS NULL OR length(trim(region)) <= 120),
  CHECK (source IS NULL OR length(trim(source)) <= 160),
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_items_org_code_active
  ON public.price_items (organization_id, lower(code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_price_items_org_category_validity
  ON public.price_items (organization_id, category, valid_from DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_price_items_org_unit
  ON public.price_items (organization_id, unit_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Measurement units viewable by org members" ON public.measurement_units;
CREATE POLICY "Measurement units viewable by org members"
ON public.measurement_units FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Measurement units managed by estimators and admins" ON public.measurement_units;
CREATE POLICY "Measurement units managed by estimators and admins"
ON public.measurement_units FOR ALL
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

DROP POLICY IF EXISTS "Price items viewable by org members" ON public.price_items;
CREATE POLICY "Price items viewable by org members"
ON public.price_items FOR SELECT
USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Price items managed by estimators and admins" ON public.price_items;
CREATE POLICY "Price items managed by estimators and admins"
ON public.price_items FOR ALL
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

DROP TRIGGER IF EXISTS trg_measurement_units_updated_at ON public.measurement_units;
CREATE TRIGGER trg_measurement_units_updated_at
BEFORE UPDATE ON public.measurement_units
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_price_items_updated_at ON public.price_items;
CREATE TRIGGER trg_price_items_updated_at
BEFORE UPDATE ON public.price_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_measurement_units_audit ON public.measurement_units;
CREATE TRIGGER trg_measurement_units_audit
AFTER INSERT OR UPDATE OF code, name, symbol, deleted_at OR DELETE
ON public.measurement_units
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_price_items_audit ON public.price_items;
CREATE TRIGGER trg_price_items_audit
AFTER INSERT OR UPDATE OF category, code, name, unit_id, unit_price, region, valid_from, valid_until, source, deleted_at OR DELETE
ON public.price_items
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_roles_permissions_audit ON public.roles_permissions;
CREATE TRIGGER trg_roles_permissions_audit
AFTER INSERT OR UPDATE OF allowed OR DELETE
ON public.roles_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_doc_number_sequences_updated_at ON public.doc_number_sequences;
CREATE TRIGGER trg_doc_number_sequences_updated_at
BEFORE UPDATE ON public.doc_number_sequences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_doc_number_sequences_prefix_audit ON public.doc_number_sequences;
CREATE TRIGGER trg_doc_number_sequences_prefix_audit
AFTER INSERT OR UPDATE OF prefix
ON public.doc_number_sequences
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.generate_document_number(
  p_entity_type TEXT,
  p_organization_id UUID,
  p_prefix TEXT DEFAULT ''
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM now())::INT;
  row_record RECORD;
  next_value INT;
BEGIN
  IF p_organization_id IS NULL OR auth.uid() IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required to generate document numbers'
      USING ERRCODE = '42501';
  END IF;

  IF p_entity_type IS NULL OR length(trim(p_entity_type)) = 0 THEN
    RAISE EXCEPTION 'Document entity type is required';
  END IF;

  IF length(trim(COALESCE(p_prefix, ''))) > 20
     OR COALESCE(trim(p_prefix), '') !~* '^[A-Z0-9/-]*$' THEN
    RAISE EXCEPTION 'Document prefix contains unsupported characters';
  END IF;

  INSERT INTO public.doc_number_sequences (organization_id, entity_type, year, prefix, last_value)
  VALUES (p_organization_id, lower(trim(p_entity_type)), current_year, upper(trim(COALESCE(p_prefix, ''))), 0)
  ON CONFLICT (organization_id, entity_type, year)
  DO NOTHING;

  SELECT * INTO row_record
  FROM public.doc_number_sequences
  WHERE organization_id = p_organization_id
    AND entity_type = lower(trim(p_entity_type))
    AND year = current_year
  FOR UPDATE;

  IF row_record IS NULL THEN
    RAISE EXCEPTION 'Unable to initialize document sequence for %', p_entity_type;
  END IF;

  next_value := row_record.last_value + 1;
  UPDATE public.doc_number_sequences
  SET last_value = next_value,
      updated_at = timezone('utc'::text, now())
  WHERE id = row_record.id;

  RETURN format(
    '%s%s-%s-%05s',
    CASE WHEN trim(row_record.prefix) = '' THEN '' ELSE upper(trim(row_record.prefix)) || '-' END,
    current_year,
    lower(trim(p_entity_type)),
    next_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_document_number(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_document_number(TEXT, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_document_number(TEXT, UUID, TEXT) TO authenticated;
