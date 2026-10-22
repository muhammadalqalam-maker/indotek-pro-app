-- T-4.3: manually recorded vendor/subcontractor bills and linked cash payments.

CREATE TABLE IF NOT EXISTS public.project_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  vendor_id UUID,
  subcontractor_id UUID,
  payable_number TEXT NOT NULL CHECK (length(trim(payable_number)) BETWEEN 1 AND 80),
  supplier_invoice_number TEXT NOT NULL CHECK (length(trim(supplier_invoice_number)) BETWEEN 1 AND 80),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL CHECK (due_date >= invoice_date),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'partially_paid', 'paid')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, vendor_id)
    REFERENCES public.vendors (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, subcontractor_id)
    REFERENCES public.subcontractors (organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, payable_number),
  UNIQUE (organization_id, vendor_id, supplier_invoice_number),
  UNIQUE (organization_id, subcontractor_id, supplier_invoice_number),
  CHECK (
    (vendor_id IS NOT NULL AND subcontractor_id IS NULL)
    OR (vendor_id IS NULL AND subcontractor_id IS NOT NULL)
  ),
  CHECK (paid_amount <= amount),
  CHECK (
    (status = 'sent' AND paid_amount = 0)
    OR (status = 'partially_paid' AND paid_amount > 0 AND paid_amount < amount)
    OR (status = 'paid' AND paid_amount = amount)
  )
);

CREATE INDEX IF NOT EXISTS project_payables_org_project_status_due_idx
  ON public.project_payables (organization_id, project_id, status, due_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS project_payables_org_vendor_idx
  ON public.project_payables (organization_id, vendor_id, due_date)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS project_payables_org_subcontractor_idx
  ON public.project_payables (organization_id, subcontractor_id, due_date)
  WHERE subcontractor_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.project_payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project payables readable by organization members" ON public.project_payables
  FOR SELECT USING (public.is_org_member(organization_id));
REVOKE ALL ON public.project_payables FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_payables TO authenticated;

CREATE TRIGGER trg_project_payables_updated_at BEFORE UPDATE ON public.project_payables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_project_payables_audit AFTER INSERT OR UPDATE OR DELETE ON public.project_payables
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

ALTER TABLE public.project_cash_transactions
  ADD COLUMN IF NOT EXISTS payable_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_cash_transactions_payable_fk'
      AND conrelid = 'public.project_cash_transactions'::regclass
  ) THEN
    ALTER TABLE public.project_cash_transactions
      ADD CONSTRAINT project_cash_transactions_payable_fk
      FOREIGN KEY (organization_id, payable_id)
      REFERENCES public.project_payables (organization_id, id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_cash_transactions_payable_check'
      AND conrelid = 'public.project_cash_transactions'::regclass
  ) THEN
    ALTER TABLE public.project_cash_transactions
      ADD CONSTRAINT project_cash_transactions_payable_check
      CHECK (
        payable_id IS NULL
        OR (
          invoice_id IS NULL
          AND cash_advance_request_id IS NULL
          AND type = 'outflow'
          AND category IN ('Material', 'Subkon')
          AND status = 'verified'
        )
      );
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS project_cash_transactions_org_payable_idx
  ON public.project_cash_transactions (organization_id, payable_id)
  WHERE payable_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_project_payable(
  p_organization_id UUID,
  p_project_id UUID,
  p_vendor_id UUID,
  p_subcontractor_id UUID,
  p_supplier_invoice_number TEXT,
  p_invoice_date DATE,
  p_due_date DATE,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT ''
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  result_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat tagihan hutang.' USING ERRCODE = '42501';
  END IF;
  IF p_organization_id IS NULL OR p_project_id IS NULL
    OR NOT (
      (p_vendor_id IS NOT NULL AND p_subcontractor_id IS NULL)
      OR (p_vendor_id IS NULL AND p_subcontractor_id IS NOT NULL)
    )
    OR length(trim(coalesce(p_supplier_invoice_number, ''))) NOT BETWEEN 1 AND 80
    OR p_invoice_date IS NULL OR p_due_date IS NULL OR p_due_date < p_invoice_date
    OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999999999.99 OR p_amount <> round(p_amount, 2)
    OR length(coalesce(p_notes, '')) > 2000
  THEN
    RAISE EXCEPTION 'Data tagihan hutang tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND organization_id = p_organization_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Proyek tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF p_vendor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = p_vendor_id AND organization_id = p_organization_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Vendor tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF p_subcontractor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subcontractors
    WHERE id = p_subcontractor_id AND organization_id = p_organization_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Subkontraktor tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  INSERT INTO public.project_payables (
    organization_id, project_id, vendor_id, subcontractor_id, payable_number,
    supplier_invoice_number, invoice_date, due_date, amount, notes
  ) VALUES (
    p_organization_id, p_project_id, p_vendor_id, p_subcontractor_id,
    public.generate_document_number('project_payable', p_organization_id, 'HUT'),
    trim(p_supplier_invoice_number), p_invoice_date, p_due_date, p_amount, trim(coalesce(p_notes, ''))
  ) RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_project_payable_payment(
  p_organization_id UUID,
  p_payable_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_reference TEXT DEFAULT ''
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  payable_row public.project_payables%ROWTYPE;
  counterparty_name TEXT;
  next_paid NUMERIC(18,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat pembayaran hutang.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO payable_row
  FROM public.project_payables
  WHERE id = p_payable_id AND organization_id = p_organization_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR payable_row.status = 'paid' THEN
    RAISE EXCEPTION 'Tagihan tidak tersedia untuk pembayaran.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999999999.99
    OR p_amount <> round(p_amount, 2) OR p_payment_date IS NULL
    OR p_payment_method IS NULL OR p_payment_method NOT IN ('Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya')
    OR length(coalesce(p_reference, '')) > 180
  THEN
    RAISE EXCEPTION 'Data pembayaran hutang tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  next_paid := payable_row.paid_amount + p_amount;
  IF next_paid > payable_row.amount THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa hutang.' USING ERRCODE = 'check_violation';
  END IF;
  IF payable_row.vendor_id IS NOT NULL THEN
    SELECT name INTO counterparty_name FROM public.vendors
    WHERE id = payable_row.vendor_id AND organization_id = p_organization_id;
  ELSE
    SELECT company_name INTO counterparty_name FROM public.subcontractors
    WHERE id = payable_row.subcontractor_id AND organization_id = p_organization_id;
  END IF;
  IF counterparty_name IS NULL THEN
    RAISE EXCEPTION 'Rekanan tagihan tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  INSERT INTO public.project_cash_transactions (
    organization_id, project_id, transaction_number, transaction_date, type, category,
    amount, recipient_or_payer, description, payment_method, reference, status,
    payable_id, created_by, verified_by, verified_at
  ) VALUES (
    p_organization_id, payable_row.project_id,
    public.generate_document_number('cash_outflow', p_organization_id, 'BKK'),
    p_payment_date, 'outflow',
    CASE WHEN payable_row.vendor_id IS NOT NULL THEN 'Material' ELSE 'Subkon' END,
    p_amount, counterparty_name,
    'Pembayaran hutang ' || payable_row.payable_number,
    p_payment_method, trim(coalesce(p_reference, '')), 'verified',
    payable_row.id, auth.uid(), auth.uid(), timezone('utc'::text, now())
  );
  UPDATE public.project_payables
  SET paid_amount = next_paid,
      status = CASE WHEN next_paid = amount THEN 'paid' ELSE 'partially_paid' END
  WHERE id = payable_row.id AND organization_id = p_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_payable(UUID,UUID,UUID,UUID,TEXT,DATE,DATE,NUMERIC,TEXT),
  public.record_project_payable_payment(UUID,UUID,NUMERIC,DATE,TEXT,TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_payable(UUID,UUID,UUID,UUID,TEXT,DATE,DATE,NUMERIC,TEXT),
  public.record_project_payable_payment(UUID,UUID,NUMERIC,DATE,TEXT,TEXT)
  TO authenticated;
