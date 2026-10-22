CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 40),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 180),
  category TEXT NOT NULL CHECK (category IN (
    'Beton', 'Besi', 'Finishing', 'Mekanikal-Elektrikal', 'Alat Berat', 'Umum'
  )),
  contact_person TEXT NOT NULL CHECK (length(trim(contact_person)) BETWEEN 2 AND 120),
  phone TEXT NOT NULL CHECK (length(trim(phone)) BETWEEN 5 AND 32),
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  npwp TEXT NOT NULL DEFAULT '',
  payment_terms_days INTEGER NOT NULL DEFAULT 0 CHECK (payment_terms_days BETWEEN 0 AND 365),
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  evaluation_count INTEGER NOT NULL DEFAULT 0 CHECK (evaluation_count >= 0),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.vendor_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  transaction_reference TEXT NOT NULL CHECK (length(trim(transaction_reference)) BETWEEN 1 AND 120),
  quality_score SMALLINT NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  price_score SMALLINT NOT NULL CHECK (price_score BETWEEN 1 AND 5),
  delivery_score SMALLINT NOT NULL CHECK (delivery_score BETWEEN 1 AND 5),
  service_score SMALLINT NOT NULL CHECK (service_score BETWEEN 1 AND 5),
  overall_score NUMERIC(3, 2) GENERATED ALWAYS AS (
    round((quality_score + price_score + delivery_score + service_score)::NUMERIC / 4, 2)
  ) STORED,
  comment TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 2000),
  evaluated_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, vendor_id)
    REFERENCES public.vendors (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS vendors_active_org_name_idx
  ON public.vendors (organization_id, name)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS vendor_evaluations_vendor_date_idx
  ON public.vendor_evaluations (organization_id, vendor_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors readable by organization members" ON public.vendors;
CREATE POLICY "Vendors readable by organization members"
  ON public.vendors FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Vendors manageable by procurement roles" ON public.vendors;
DROP POLICY IF EXISTS "Vendors insertable by procurement roles" ON public.vendors;
CREATE POLICY "Vendors insertable by procurement roles"
  ON public.vendors FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_role(
      organization_id,
      ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
        'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type,
        'procurement'::public.user_role_type]
    )
  );

CREATE POLICY "Vendors manageable by procurement roles"
  ON public.vendors FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type,
      'procurement'::public.user_role_type]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type,
      'procurement'::public.user_role_type]
  ));

DROP POLICY IF EXISTS "Vendor evaluations readable by organization members" ON public.vendor_evaluations;
CREATE POLICY "Vendor evaluations readable by organization members"
  ON public.vendor_evaluations FOR SELECT
  USING (public.is_org_member(organization_id));

REVOKE ALL ON public.vendors, public.vendor_evaluations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vendors, public.vendor_evaluations TO authenticated;
GRANT INSERT (
  organization_id, code, name, category, contact_person, phone, email, address, npwp,
  payment_terms_days, is_active
) ON public.vendors TO authenticated;
GRANT UPDATE (
  code, name, category, contact_person, phone, email, address, npwp,
  payment_terms_days, is_active, deleted_at
) ON public.vendors TO authenticated;
GRANT SELECT ON public.vendor_evaluations TO authenticated;

CREATE OR REPLACE FUNCTION public.record_vendor_evaluation(
  p_organization_id UUID,
  p_vendor_id UUID,
  p_transaction_reference TEXT,
  p_quality_score SMALLINT,
  p_price_score SMALLINT,
  p_delivery_score SMALLINT,
  p_service_score SMALLINT,
  p_comment TEXT
)
RETURNS TABLE (evaluation_id UUID, rating NUMERIC, evaluation_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_vendor_id UUID;
  inserted_evaluation_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type,
      'procurement'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Akses evaluasi vendor ditolak.' USING ERRCODE = '42501';
  END IF;

  SELECT v.id INTO current_vendor_id
  FROM public.vendors AS v
  WHERE v.id = p_vendor_id
    AND v.organization_id = p_organization_id
    AND v.deleted_at IS NULL
    AND v.is_active
  FOR UPDATE;

  IF current_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor tidak ditemukan atau tidak aktif.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.vendor_evaluations (
    organization_id, vendor_id, transaction_reference, quality_score,
    price_score, delivery_score, service_score, comment, evaluated_by, created_by
  ) VALUES (
    p_organization_id, p_vendor_id, p_transaction_reference, p_quality_score,
    p_price_score, p_delivery_score, p_service_score, coalesce(p_comment, ''),
    auth.uid(), auth.uid()
  )
  RETURNING id INTO inserted_evaluation_id;

  UPDATE public.vendors AS v
  SET rating = (
        SELECT round(avg(e.overall_score), 2)
        FROM public.vendor_evaluations AS e
        WHERE e.organization_id = p_organization_id
          AND e.vendor_id = p_vendor_id
          AND e.deleted_at IS NULL
      ),
      evaluation_count = (
        SELECT count(*)::INTEGER
        FROM public.vendor_evaluations AS e
        WHERE e.organization_id = p_organization_id
          AND e.vendor_id = p_vendor_id
          AND e.deleted_at IS NULL
      )
  WHERE v.id = p_vendor_id
    AND v.organization_id = p_organization_id
  RETURNING v.rating, v.evaluation_count
  INTO rating, evaluation_count;

  evaluation_id := inserted_evaluation_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.record_vendor_evaluation(
  UUID, UUID, TEXT, SMALLINT, SMALLINT, SMALLINT, SMALLINT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_vendor_evaluation(
  UUID, UUID, TEXT, SMALLINT, SMALLINT, SMALLINT, SMALLINT, TEXT
) TO authenticated;

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON public.vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vendor_evaluations_updated_at ON public.vendor_evaluations;
CREATE TRIGGER trg_vendor_evaluations_updated_at
  BEFORE UPDATE ON public.vendor_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vendors_audit ON public.vendors;
CREATE TRIGGER trg_vendors_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

DROP TRIGGER IF EXISTS trg_vendor_evaluations_audit ON public.vendor_evaluations;
CREATE TRIGGER trg_vendor_evaluations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
