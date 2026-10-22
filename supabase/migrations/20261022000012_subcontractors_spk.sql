-- T-3.8: tenant-secure subcontractor master data and SPK contracts.

CREATE TABLE IF NOT EXISTS public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 40),
  company_name TEXT NOT NULL CHECK (length(trim(company_name)) BETWEEN 2 AND 180),
  trade_specialty TEXT NOT NULL CHECK (length(trim(trade_specialty)) BETWEEN 2 AND 120),
  pic_name TEXT NOT NULL CHECK (length(trim(pic_name)) BETWEEN 2 AND 120),
  phone TEXT NOT NULL CHECK (length(trim(phone)) BETWEEN 5 AND 32),
  email TEXT NOT NULL DEFAULT '' CHECK (length(trim(email)) <= 254),
  address TEXT NOT NULL DEFAULT '' CHECK (length(trim(address)) <= 500),
  npwp TEXT NOT NULL DEFAULT '' CHECK (length(trim(npwp)) <= 32),
  bank_name TEXT NOT NULL DEFAULT '' CHECK (length(trim(bank_name)) <= 120),
  bank_account_no TEXT NOT NULL DEFAULT '' CHECK (length(trim(bank_account_no)) <= 64),
  bank_account_name TEXT NOT NULL DEFAULT '' CHECK (length(trim(bank_account_name)) <= 180),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  subcontractor_id UUID NOT NULL,
  spk_number TEXT NOT NULL CHECK (length(trim(spk_number)) BETWEEN 1 AND 80),
  work_description TEXT NOT NULL CHECK (length(trim(work_description)) BETWEEN 2 AND 1000),
  contract_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  contract_amount NUMERIC(18,2) NOT NULL CHECK (contract_amount > 0),
  retention_percent NUMERIC(5,2) NOT NULL DEFAULT 5 CHECK (retention_percent BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id) REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, subcontractor_id) REFERENCES public.subcontractors (organization_id, id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, spk_number)
);

CREATE INDEX IF NOT EXISTS subcontractors_org_active_name_idx ON public.subcontractors (organization_id, is_active, company_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subcontracts_org_project_status_idx ON public.subcontracts (organization_id, project_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subcontracts_org_subcontractor_idx ON public.subcontracts (organization_id, subcontractor_id) WHERE deleted_at IS NULL;

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subcontractors readable by organization members" ON public.subcontractors FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Subcontracts readable by organization members" ON public.subcontracts FOR SELECT USING (public.is_org_member(organization_id));
REVOKE ALL ON public.subcontractors, public.subcontracts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subcontractors, public.subcontracts TO authenticated;

CREATE TRIGGER trg_subcontractors_updated_at BEFORE UPDATE ON public.subcontractors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subcontracts_updated_at BEFORE UPDATE ON public.subcontracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subcontractors_audit AFTER INSERT OR UPDATE OR DELETE ON public.subcontractors FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
CREATE TRIGGER trg_subcontracts_audit AFTER INSERT OR UPDATE OR DELETE ON public.subcontracts FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.save_subcontractor(
  p_organization_id UUID, p_subcontractor_id UUID, p_code TEXT, p_company_name TEXT,
  p_trade_specialty TEXT, p_pic_name TEXT, p_phone TEXT, p_email TEXT, p_address TEXT,
  p_npwp TEXT, p_bank_name TEXT, p_bank_account_no TEXT, p_bank_account_name TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(p_organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'procurement'::public.user_role_type]) THEN RAISE EXCEPTION 'Anda tidak berwenang mengelola data subkontraktor.' USING ERRCODE = '42501'; END IF;
  IF p_organization_id IS NULL OR length(trim(coalesce(p_code,''))) NOT BETWEEN 1 AND 40 OR length(trim(coalesce(p_company_name,''))) NOT BETWEEN 2 AND 180 OR length(trim(coalesce(p_trade_specialty,''))) NOT BETWEEN 2 AND 120 OR length(trim(coalesce(p_pic_name,''))) NOT BETWEEN 2 AND 120 OR length(trim(coalesce(p_phone,''))) NOT BETWEEN 5 AND 32 OR length(trim(coalesce(p_email,''))) > 254 OR length(trim(coalesce(p_address,''))) > 500 OR length(trim(coalesce(p_npwp,''))) > 32 OR length(trim(coalesce(p_bank_name,''))) > 120 OR length(trim(coalesce(p_bank_account_no,''))) > 64 OR length(trim(coalesce(p_bank_account_name,''))) > 180 THEN RAISE EXCEPTION 'Data subkontraktor tidak valid.' USING ERRCODE = 'check_violation'; END IF;
  IF p_subcontractor_id IS NULL THEN
    INSERT INTO public.subcontractors (organization_id, code, company_name, trade_specialty, pic_name, phone, email, address, npwp, bank_name, bank_account_no, bank_account_name) VALUES (p_organization_id, trim(p_code), trim(p_company_name), trim(p_trade_specialty), trim(p_pic_name), trim(p_phone), trim(p_email), trim(p_address), trim(p_npwp), trim(p_bank_name), trim(p_bank_account_no), trim(p_bank_account_name)) RETURNING id INTO result_id;
  ELSE
    UPDATE public.subcontractors SET code=trim(p_code), company_name=trim(p_company_name), trade_specialty=trim(p_trade_specialty), pic_name=trim(p_pic_name), phone=trim(p_phone), email=trim(p_email), address=trim(p_address), npwp=trim(p_npwp), bank_name=trim(p_bank_name), bank_account_no=trim(p_bank_account_no), bank_account_name=trim(p_bank_account_name) WHERE id=p_subcontractor_id AND organization_id=p_organization_id AND deleted_at IS NULL RETURNING id INTO result_id;
    IF result_id IS NULL THEN RAISE EXCEPTION 'Subkontraktor tidak ditemukan.' USING ERRCODE = 'no_data_found'; END IF;
  END IF;
  RETURN result_id;
END; $$;

CREATE OR REPLACE FUNCTION public.save_subcontract(
  p_organization_id UUID, p_subcontract_id UUID, p_project_id UUID, p_subcontractor_id UUID,
  p_spk_number TEXT, p_work_description TEXT, p_contract_date DATE, p_start_date DATE,
  p_end_date DATE, p_contract_amount NUMERIC, p_retention_percent NUMERIC, p_status TEXT, p_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(p_organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'procurement'::public.user_role_type]) THEN RAISE EXCEPTION 'Anda tidak berwenang mengelola SPK subkontraktor.' USING ERRCODE = '42501'; END IF;
  IF p_organization_id IS NULL OR p_project_id IS NULL OR p_subcontractor_id IS NULL OR length(trim(coalesce(p_spk_number,''))) NOT BETWEEN 1 AND 80 OR length(trim(coalesce(p_work_description,''))) NOT BETWEEN 2 AND 1000 OR p_contract_date IS NULL OR p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_contract_amount IS NULL OR p_contract_amount <= 0 OR p_contract_amount > 9999999999999999.99 OR p_contract_amount <> round(p_contract_amount,2) OR p_retention_percent IS NULL OR p_retention_percent < 0 OR p_retention_percent > 100 OR p_retention_percent <> round(p_retention_percent,2) OR p_status NOT IN ('draft','active','completed','cancelled') OR length(trim(coalesce(p_notes,''))) > 2000 THEN RAISE EXCEPTION 'Data SPK tidak valid.' USING ERRCODE = 'check_violation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id AND organization_id=p_organization_id AND deleted_at IS NULL) OR NOT EXISTS (SELECT 1 FROM public.subcontractors WHERE id=p_subcontractor_id AND organization_id=p_organization_id AND is_active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Proyek atau subkontraktor tidak tersedia.' USING ERRCODE = '42501'; END IF;
  IF p_subcontract_id IS NULL THEN INSERT INTO public.subcontracts (organization_id,project_id,subcontractor_id,spk_number,work_description,contract_date,start_date,end_date,contract_amount,retention_percent,status,notes) VALUES (p_organization_id,p_project_id,p_subcontractor_id,trim(p_spk_number),trim(p_work_description),p_contract_date,p_start_date,p_end_date,p_contract_amount,p_retention_percent,p_status,trim(p_notes)) RETURNING id INTO result_id;
  ELSE UPDATE public.subcontracts SET project_id=p_project_id,subcontractor_id=p_subcontractor_id,spk_number=trim(p_spk_number),work_description=trim(p_work_description),contract_date=p_contract_date,start_date=p_start_date,end_date=p_end_date,contract_amount=p_contract_amount,retention_percent=p_retention_percent,status=p_status,notes=trim(p_notes) WHERE id=p_subcontract_id AND organization_id=p_organization_id AND deleted_at IS NULL RETURNING id INTO result_id; IF result_id IS NULL THEN RAISE EXCEPTION 'SPK tidak ditemukan.' USING ERRCODE = 'no_data_found'; END IF; END IF;
  RETURN result_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_subcontractor(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_subcontract(UUID,UUID,UUID,UUID,TEXT,TEXT,DATE,DATE,DATE,NUMERIC,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_subcontractor(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_subcontract(UUID,UUID,UUID,UUID,TEXT,TEXT,DATE,DATE,DATE,NUMERIC,NUMERIC,TEXT,TEXT) TO authenticated;
