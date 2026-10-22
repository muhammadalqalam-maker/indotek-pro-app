-- T-4.1: client milestones/invoices with advance, progress, retention, and tenant-safe workflow.

CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  invoice_number TEXT NOT NULL CHECK (length(trim(invoice_number)) BETWEEN 1 AND 80),
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('advance', 'progress', 'retention')),
  term_label TEXT NOT NULL CHECK (length(trim(term_label)) BETWEEN 2 AND 180),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL CHECK (due_date >= invoice_date),
  progress_basis_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_basis_percent BETWEEN 0 AND 100),
  gross_amount NUMERIC(18,2) NOT NULL CHECK (gross_amount >= 0),
  advance_deduction NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (advance_deduction >= 0),
  retention_deduction NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (retention_deduction >= 0),
  taxable_amount NUMERIC(18,2) NOT NULL CHECK (taxable_amount >= 0),
  vat_percent NUMERIC(5,2) NOT NULL DEFAULT 11 CHECK (vat_percent BETWEEN 0 AND 100),
  vat_amount NUMERIC(18,2) NOT NULL CHECK (vat_amount >= 0),
  pph_percent NUMERIC(5,2) NOT NULL DEFAULT 2.65 CHECK (pph_percent BETWEEN 0 AND 100),
  pph_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (pph_amount >= 0),
  total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT NOT NULL DEFAULT '' CHECK (length(payment_reference) <= 180),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id) REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, invoice_number),
  CHECK (advance_deduction + retention_deduction <= gross_amount),
  CHECK (taxable_amount = round(gross_amount - advance_deduction - retention_deduction, 2)),
  CHECK (vat_amount = round(taxable_amount * vat_percent / 100, 2)),
  CHECK (pph_amount = round(taxable_amount * pph_percent / 100, 2)),
  CHECK (total_amount = taxable_amount + vat_amount - pph_amount),
  CHECK (paid_amount <= total_amount)
);

CREATE INDEX IF NOT EXISTS client_invoices_org_project_status_due_idx
  ON public.client_invoices (organization_id, project_id, status, due_date) WHERE deleted_at IS NULL;

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client invoices readable by organization members" ON public.client_invoices
  FOR SELECT USING (public.is_org_member(organization_id));
REVOKE ALL ON public.client_invoices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.client_invoices TO authenticated;

CREATE TRIGGER trg_client_invoices_updated_at BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_client_invoices_audit AFTER INSERT OR UPDATE OR DELETE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.get_project_invoice_basis(p_organization_id UUID, p_project_id UUID)
RETURNS TABLE(contract_value NUMERIC, retention_percent NUMERIC, approved_progress_percent NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT p.contract_value, p.retention_percent,
    COALESCE((
      SELECT round(sum(entry.installed_volume * item.unit_price) / NULLIF(sum(item.volume * item.unit_price), 0) * 100, 2)
      FROM public.progress_entries entry
      JOIN public.daily_reports report ON report.id = entry.report_id AND report.organization_id = entry.organization_id AND report.project_id = entry.project_id
      JOIN public.boq_items item ON item.id = entry.boq_item_id AND item.organization_id = entry.organization_id AND item.project_id = entry.project_id AND item.boq_version_id = entry.boq_version_id
      WHERE entry.organization_id = p_organization_id AND entry.project_id = p_project_id
        AND entry.deleted_at IS NULL AND report.deleted_at IS NULL AND report.status = 'approved' AND item.deleted_at IS NULL
    ), p.actual_progress, 0)
  FROM public.projects p
  WHERE p.organization_id = p_organization_id
    AND p.id = p_project_id
    AND p.deleted_at IS NULL
    AND auth.uid() IS NOT NULL
    AND public.is_org_member(p_organization_id);
$$;

CREATE OR REPLACE FUNCTION public.save_client_invoice(
  p_organization_id UUID, p_invoice_id UUID, p_project_id UUID, p_invoice_number TEXT, p_invoice_type TEXT,
  p_term_label TEXT, p_invoice_date DATE, p_due_date DATE, p_progress_basis_percent NUMERIC,
  p_gross_amount NUMERIC, p_advance_deduction NUMERIC, p_retention_deduction NUMERIC,
  p_vat_percent NUMERIC, p_pph_percent NUMERIC, p_status TEXT, p_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result_id UUID; basis RECORD; taxable NUMERIC(18,2); vat NUMERIC(18,2); pph NUMERIC(18,2); total NUMERIC(18,2); v_invoice_number TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(p_organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'finance'::public.user_role_type]) THEN RAISE EXCEPTION 'Anda tidak berwenang mengelola invoice klien.' USING ERRCODE = '42501'; END IF;
  IF p_organization_id IS NULL OR p_project_id IS NULL OR length(trim(coalesce(p_invoice_number,''))) > 80 OR p_invoice_type IS NULL OR p_invoice_type NOT IN ('advance','progress','retention') OR length(trim(coalesce(p_term_label,''))) NOT BETWEEN 2 AND 180 OR p_invoice_date IS NULL OR p_due_date IS NULL OR p_due_date < p_invoice_date OR p_progress_basis_percent IS NULL OR p_progress_basis_percent < 0 OR p_progress_basis_percent > 100 OR p_gross_amount IS NULL OR p_gross_amount < 0 OR p_advance_deduction IS NULL OR p_advance_deduction < 0 OR p_retention_deduction IS NULL OR p_retention_deduction < 0 OR p_advance_deduction + p_retention_deduction > p_gross_amount OR p_vat_percent IS NULL OR p_vat_percent < 0 OR p_vat_percent > 100 OR p_pph_percent IS NULL OR p_pph_percent < 0 OR p_pph_percent > 100 OR p_status IS NULL OR p_status NOT IN ('draft','sent') OR length(coalesce(p_notes,'')) > 2000 THEN RAISE EXCEPTION 'Data invoice tidak valid.' USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO basis FROM public.get_project_invoice_basis(p_organization_id, p_project_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Proyek tidak tersedia.' USING ERRCODE = 'foreign_key_violation'; END IF;
  IF p_invoice_type = 'progress' AND p_progress_basis_percent > basis.approved_progress_percent THEN RAISE EXCEPTION 'Progress termin melebihi progress proyek yang telah disetujui.' USING ERRCODE = 'check_violation'; END IF;
  IF p_retention_deduction > round(p_gross_amount * basis.retention_percent / 100, 2) THEN RAISE EXCEPTION 'Nilai retensi melebihi persentase retensi proyek.' USING ERRCODE = 'check_violation'; END IF;
  v_invoice_number := coalesce(nullif(trim(p_invoice_number), ''), public.generate_document_number('client_invoice', p_organization_id, 'INV'));
  taxable := round(p_gross_amount - p_advance_deduction - p_retention_deduction, 2);
  vat := round(taxable * p_vat_percent / 100, 2);
  pph := round(taxable * p_pph_percent / 100, 2);
  total := taxable + vat - pph;
  IF p_invoice_id IS NULL THEN
    INSERT INTO public.client_invoices (organization_id,project_id,invoice_number,invoice_type,term_label,invoice_date,due_date,progress_basis_percent,gross_amount,advance_deduction,retention_deduction,taxable_amount,vat_percent,vat_amount,pph_percent,pph_amount,total_amount,status,notes) VALUES (p_organization_id,p_project_id,v_invoice_number,p_invoice_type,trim(p_term_label),p_invoice_date,p_due_date,p_progress_basis_percent,p_gross_amount,p_advance_deduction,p_retention_deduction,taxable,p_vat_percent,vat,p_pph_percent,pph,total,p_status,trim(p_notes)) RETURNING id INTO result_id;
  ELSE
    UPDATE public.client_invoices SET project_id=p_project_id,invoice_number=v_invoice_number,invoice_type=p_invoice_type,term_label=trim(p_term_label),invoice_date=p_invoice_date,due_date=p_due_date,progress_basis_percent=p_progress_basis_percent,gross_amount=p_gross_amount,advance_deduction=p_advance_deduction,retention_deduction=p_retention_deduction,taxable_amount=taxable,vat_percent=p_vat_percent,vat_amount=vat,pph_percent=p_pph_percent,pph_amount=pph,total_amount=total,status=p_status,notes=trim(p_notes) WHERE id=p_invoice_id AND organization_id=p_organization_id AND status='draft' AND deleted_at IS NULL RETURNING id INTO result_id;
    IF result_id IS NULL THEN RAISE EXCEPTION 'Hanya invoice draf yang dapat diubah.' USING ERRCODE = 'check_violation'; END IF;
  END IF; RETURN result_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_client_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_reference TEXT DEFAULT ''
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE invoice_row public.client_invoices%ROWTYPE; next_paid NUMERIC(18,2);
BEGIN
  SELECT * INTO invoice_row
  FROM public.client_invoices
  WHERE id = p_invoice_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT public.has_role(invoice_row.organization_id, ARRAY['owner'::public.user_role_type,'admin'::public.user_role_type,'finance'::public.user_role_type]) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat pembayaran invoice.' USING ERRCODE = '42501';
  END IF;
  IF invoice_row.status NOT IN ('sent','partially_paid') THEN
    RAISE EXCEPTION 'Invoice belum dapat menerima pembayaran.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR length(coalesce(p_payment_reference,'')) > 180 THEN
    RAISE EXCEPTION 'Pembayaran invoice tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  next_paid := invoice_row.paid_amount + p_amount;
  IF next_paid > invoice_row.total_amount THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.client_invoices
  SET paid_amount = next_paid,
      status = CASE WHEN next_paid = total_amount THEN 'paid' ELSE 'partially_paid' END,
      paid_at = CASE WHEN next_paid = total_amount THEN now() ELSE NULL END,
      payment_reference = trim(coalesce(p_payment_reference,''))
  WHERE id = p_invoice_id;
END; $$;

REVOKE ALL ON FUNCTION public.get_project_invoice_basis(UUID,UUID),
  public.save_client_invoice(UUID,UUID,UUID,TEXT,TEXT,TEXT,DATE,DATE,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT),
  public.record_client_invoice_payment(UUID,NUMERIC,TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_invoice_basis(UUID,UUID),
  public.save_client_invoice(UUID,UUID,UUID,TEXT,TEXT,TEXT,DATE,DATE,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT),
  public.record_client_invoice_payment(UUID,NUMERIC,TEXT)
  TO authenticated;
