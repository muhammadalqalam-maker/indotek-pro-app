-- T-3.9: periodic subcontractor measurements, retention, deductions, and approval.

CREATE TABLE IF NOT EXISTS public.subcontract_opnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  subcontract_id UUID NOT NULL,
  opname_number TEXT NOT NULL CHECK (length(trim(opname_number)) BETWEEN 1 AND 80),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL CHECK (period_end >= period_start),
  gross_amount NUMERIC(18,2) NOT NULL CHECK (gross_amount > 0),
  retention_percent NUMERIC(5,2) NOT NULL CHECK (retention_percent BETWEEN 0 AND 100),
  retention_amount NUMERIC(18,2) NOT NULL CHECK (retention_amount >= 0),
  deduction_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (deduction_amount >= 0),
  net_amount NUMERIC(18,2) NOT NULL CHECK (net_amount >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_comment TEXT NOT NULL DEFAULT '' CHECK (length(rejection_comment) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id) REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, subcontract_id) REFERENCES public.subcontracts (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, opname_number),
  CHECK (retention_amount = round(gross_amount * retention_percent / 100, 2)),
  CHECK (net_amount = gross_amount - retention_amount - deduction_amount)
);

CREATE TABLE IF NOT EXISTS public.subcontract_opname_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subcontract_opname_id UUID NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 2 AND 500),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, subcontract_opname_id) REFERENCES public.subcontract_opnames (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS subcontract_opnames_org_project_status_idx ON public.subcontract_opnames (organization_id, project_id, status, period_end DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subcontract_opnames_org_subcontract_idx ON public.subcontract_opnames (organization_id, subcontract_id, period_end DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subcontract_opname_deductions_org_opname_idx ON public.subcontract_opname_deductions (organization_id, subcontract_opname_id) WHERE deleted_at IS NULL;

ALTER TABLE public.subcontract_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontract_opname_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subcontract opnames readable by organization members" ON public.subcontract_opnames FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Subcontract opname deductions readable by organization members" ON public.subcontract_opname_deductions FOR SELECT USING (public.is_org_member(organization_id));
REVOKE ALL ON public.subcontract_opnames, public.subcontract_opname_deductions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subcontract_opnames, public.subcontract_opname_deductions TO authenticated;

CREATE TRIGGER trg_subcontract_opnames_updated_at BEFORE UPDATE ON public.subcontract_opnames FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subcontract_opname_deductions_updated_at BEFORE UPDATE ON public.subcontract_opname_deductions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subcontract_opnames_audit AFTER INSERT OR UPDATE OR DELETE ON public.subcontract_opnames FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
CREATE TRIGGER trg_subcontract_opname_deductions_audit AFTER INSERT OR UPDATE OR DELETE ON public.subcontract_opname_deductions FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.save_subcontract_opname(
  p_organization_id UUID, p_opname_id UUID, p_subcontract_id UUID, p_opname_number TEXT,
  p_period_start DATE, p_period_end DATE, p_gross_amount NUMERIC, p_notes TEXT, p_deductions JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  result_id UUID; contract_row public.subcontracts%ROWTYPE; deduction_total NUMERIC(18,2); retention NUMERIC(18,2); deduction JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(p_organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'procurement'::public.user_role_type]) THEN RAISE EXCEPTION 'Anda tidak berwenang mengelola opname subkon.' USING ERRCODE = '42501'; END IF;
  IF p_organization_id IS NULL OR p_subcontract_id IS NULL OR length(trim(coalesce(p_opname_number,''))) NOT BETWEEN 1 AND 80 OR p_period_start IS NULL OR p_period_end IS NULL OR p_period_end < p_period_start OR p_gross_amount IS NULL OR p_gross_amount <= 0 OR p_gross_amount > 9999999999999999.99 OR p_gross_amount <> round(p_gross_amount, 2) OR length(trim(coalesce(p_notes,''))) > 2000 OR jsonb_typeof(coalesce(p_deductions, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Data opname tidak valid.' USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO contract_row FROM public.subcontracts WHERE id = p_subcontract_id AND organization_id = p_organization_id AND status = 'active' AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'SPK aktif tidak tersedia.' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(sum((value->>'amount')::numeric), 0) INTO deduction_total FROM jsonb_array_elements(p_deductions) AS value;
  IF deduction_total < 0 OR deduction_total > p_gross_amount OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_deductions) AS value WHERE length(trim(coalesce(value->>'description',''))) NOT BETWEEN 2 AND 500 OR coalesce((value->>'amount')::numeric, 0) <= 0 OR (value->>'amount')::numeric <> round((value->>'amount')::numeric, 2)) THEN RAISE EXCEPTION 'Potongan opname tidak valid.' USING ERRCODE = 'check_violation'; END IF;
  retention := round(p_gross_amount * contract_row.retention_percent / 100, 2);
  IF p_gross_amount - retention - deduction_total < 0 THEN RAISE EXCEPTION 'Nilai bersih opname tidak boleh negatif.' USING ERRCODE = 'check_violation'; END IF;
  IF p_opname_id IS NULL THEN
    INSERT INTO public.subcontract_opnames (organization_id, project_id, subcontract_id, opname_number, period_start, period_end, gross_amount, retention_percent, retention_amount, deduction_amount, net_amount, notes) VALUES (p_organization_id, contract_row.project_id, p_subcontract_id, trim(p_opname_number), p_period_start, p_period_end, p_gross_amount, contract_row.retention_percent, retention, deduction_total, p_gross_amount - retention - deduction_total, trim(p_notes)) RETURNING id INTO result_id;
  ELSE
    UPDATE public.subcontract_opnames SET subcontract_id=p_subcontract_id, project_id=contract_row.project_id, opname_number=trim(p_opname_number), period_start=p_period_start, period_end=p_period_end, gross_amount=p_gross_amount, retention_percent=contract_row.retention_percent, retention_amount=retention, deduction_amount=deduction_total, net_amount=p_gross_amount-retention-deduction_total, notes=trim(p_notes) WHERE id=p_opname_id AND organization_id=p_organization_id AND status='draft' AND deleted_at IS NULL RETURNING id INTO result_id;
    IF result_id IS NULL THEN RAISE EXCEPTION 'Hanya opname draf yang dapat diubah.' USING ERRCODE = '42501'; END IF;
    DELETE FROM public.subcontract_opname_deductions WHERE subcontract_opname_id=result_id AND organization_id=p_organization_id;
  END IF;
  FOR deduction IN SELECT value FROM jsonb_array_elements(p_deductions) AS value LOOP INSERT INTO public.subcontract_opname_deductions (organization_id, subcontract_opname_id, description, amount) VALUES (p_organization_id, result_id, trim(deduction->>'description'), (deduction->>'amount')::numeric); END LOOP;
  RETURN result_id;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_subcontract_opname(p_opname_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE opname_row public.subcontract_opnames%ROWTYPE;
BEGIN SELECT * INTO opname_row FROM public.subcontract_opnames WHERE id=p_opname_id AND deleted_at IS NULL FOR UPDATE; IF NOT FOUND OR auth.uid() IS NULL OR NOT public.has_role(opname_row.organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'procurement'::public.user_role_type]) THEN RAISE EXCEPTION 'Anda tidak berwenang mengajukan opname.' USING ERRCODE='42501'; END IF; IF opname_row.status <> 'draft' THEN RAISE EXCEPTION 'Hanya opname draf yang dapat diajukan.' USING ERRCODE='check_violation'; END IF; UPDATE public.subcontract_opnames SET status='submitted', rejection_comment='' WHERE id=p_opname_id; END; $$;

CREATE OR REPLACE FUNCTION public.decide_subcontract_opname(p_opname_id UUID, p_decision TEXT, p_comment TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE opname_row public.subcontract_opnames%ROWTYPE;
BEGIN SELECT * INTO opname_row FROM public.subcontract_opnames WHERE id=p_opname_id AND deleted_at IS NULL FOR UPDATE; IF NOT FOUND OR auth.uid() IS NULL OR NOT public.has_role(opname_row.organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type]) OR auth.uid()=opname_row.created_by THEN RAISE EXCEPTION 'Anda tidak berwenang memutus opname ini.' USING ERRCODE='42501'; END IF; IF opname_row.status <> 'submitted' OR p_decision NOT IN ('approved','rejected') OR length(trim(coalesce(p_comment,''))) NOT BETWEEN 2 AND 2000 THEN RAISE EXCEPTION 'Keputusan opname tidak valid.' USING ERRCODE='check_violation'; END IF; UPDATE public.subcontract_opnames SET status=p_decision, approved_by=CASE WHEN p_decision='approved' THEN auth.uid() ELSE NULL END, approved_at=CASE WHEN p_decision='approved' THEN timezone('utc'::text, now()) ELSE NULL END, rejection_comment=CASE WHEN p_decision='rejected' THEN trim(p_comment) ELSE '' END WHERE id=p_opname_id; END; $$;

REVOKE ALL ON FUNCTION public.save_subcontract_opname(UUID,UUID,UUID,TEXT,DATE,DATE,NUMERIC,TEXT,JSONB), public.submit_subcontract_opname(UUID), public.decide_subcontract_opname(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_subcontract_opname(UUID,UUID,UUID,TEXT,DATE,DATE,NUMERIC,TEXT,JSONB), public.submit_subcontract_opname(UUID), public.decide_subcontract_opname(UUID,TEXT,TEXT) TO authenticated;
