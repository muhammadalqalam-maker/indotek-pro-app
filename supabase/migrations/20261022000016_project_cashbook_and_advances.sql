CREATE TABLE IF NOT EXISTS public.cash_advance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  ticket_number TEXT NOT NULL CHECK (length(trim(ticket_number)) BETWEEN 1 AND 80),
  request_type TEXT NOT NULL CHECK (request_type IN ('kasbon', 'reimbursement')),
  employee_name TEXT NOT NULL CHECK (length(trim(employee_name)) BETWEEN 2 AND 180),
  employee_role TEXT NOT NULL DEFAULT '' CHECK (length(employee_role) <= 120),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL CHECK (length(trim(purpose)) BETWEEN 2 AND 500),
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved_ready_payout', 'active_unsettled', 'settled', 'rejected')),
  decision_comment TEXT NOT NULL DEFAULT '' CHECK (length(decision_comment) <= 2000),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES public.profiles(id),
  paid_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya')),
  paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  settled_by UUID REFERENCES public.profiles(id),
  settled_at TIMESTAMPTZ,
  settled_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (settled_amount >= 0),
  settlement_notes TEXT NOT NULL DEFAULT '' CHECK (length(settlement_notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, ticket_number),
  CHECK (paid_amount <= amount),
  CHECK (settled_amount <= paid_amount),
  CHECK (
    (status = 'pending_approval' AND approved_by IS NULL AND approved_at IS NULL AND paid_by IS NULL AND paid_at IS NULL AND settled_by IS NULL AND settled_at IS NULL)
    OR (status = 'rejected' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND length(trim(decision_comment)) > 0 AND paid_at IS NULL AND settled_at IS NULL)
    OR (status = 'approved_ready_payout' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND paid_by IS NULL AND paid_at IS NULL AND settled_by IS NULL AND settled_at IS NULL)
    OR (status = 'active_unsettled' AND request_type = 'kasbon' AND paid_by IS NOT NULL AND paid_at IS NOT NULL AND payment_method IS NOT NULL AND paid_amount = amount AND settled_by IS NULL AND settled_at IS NULL)
    OR (status = 'settled' AND paid_by IS NOT NULL AND paid_at IS NOT NULL AND payment_method IS NOT NULL AND settled_by IS NOT NULL AND settled_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.project_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  transaction_number TEXT NOT NULL CHECK (length(trim(transaction_number)) BETWEEN 1 AND 80),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
  category TEXT NOT NULL CHECK (category IN ('Termin Klien', 'Material', 'Upah Pekerja', 'Subkon', 'Sewa Alat', 'Operasional Site', 'Kasbon / Petty Cash', 'Lainnya')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  recipient_or_payer TEXT NOT NULL CHECK (length(trim(recipient_or_payer)) BETWEEN 2 AND 180),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 2 AND 500),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya')),
  reference TEXT NOT NULL DEFAULT '' CHECK (length(reference) <= 180),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  invoice_id UUID,
  cash_advance_request_id UUID,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, invoice_id)
    REFERENCES public.client_invoices (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, cash_advance_request_id)
    REFERENCES public.cash_advance_requests (organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, transaction_number),
  CHECK (
    (status = 'pending' AND verified_by IS NULL AND verified_at IS NULL)
    OR (status = 'verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
  ),
  CHECK (invoice_id IS NULL OR (cash_advance_request_id IS NULL AND type = 'inflow' AND category = 'Termin Klien' AND status = 'verified')),
  CHECK (cash_advance_request_id IS NULL OR invoice_id IS NULL)
);

CREATE INDEX IF NOT EXISTS cash_advance_requests_org_project_status_date_idx
  ON public.cash_advance_requests (organization_id, project_id, status, request_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS project_cash_transactions_org_project_date_idx
  ON public.project_cash_transactions (organization_id, project_id, transaction_date DESC, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS project_cash_transactions_org_invoice_idx
  ON public.project_cash_transactions (organization_id, invoice_id)
  WHERE invoice_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.cash_advance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cash advance requests readable by organization members"
  ON public.cash_advance_requests FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Project cash transactions readable by organization members"
  ON public.project_cash_transactions FOR SELECT
  USING (public.is_org_member(organization_id));

REVOKE ALL ON public.cash_advance_requests, public.project_cash_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cash_advance_requests, public.project_cash_transactions TO authenticated;

CREATE TRIGGER trg_cash_advance_requests_updated_at
  BEFORE UPDATE ON public.cash_advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_project_cash_transactions_updated_at
  BEFORE UPDATE ON public.project_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cash_advance_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
CREATE TRIGGER trg_project_cash_transactions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.create_project_cash_transaction(
  p_organization_id UUID,
  p_project_id UUID,
  p_transaction_date DATE,
  p_type TEXT,
  p_category TEXT,
  p_amount NUMERIC,
  p_recipient_or_payer TEXT,
  p_description TEXT,
  p_payment_method TEXT,
  p_reference TEXT DEFAULT ''
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  result_id UUID;
  number_entity TEXT;
  number_prefix TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat transaksi kas.' USING ERRCODE = '42501';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('inflow', 'outflow')
    OR p_category IS NULL OR p_category NOT IN ('Material', 'Upah Pekerja', 'Subkon', 'Sewa Alat', 'Operasional Site', 'Lainnya')
    OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999999999.99
    OR p_transaction_date IS NULL
    OR length(trim(coalesce(p_recipient_or_payer, ''))) NOT BETWEEN 2 AND 180
    OR length(trim(coalesce(p_description, ''))) NOT BETWEEN 2 AND 500
    OR p_payment_method IS NULL OR p_payment_method NOT IN ('Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya')
    OR length(coalesce(p_reference, '')) > 180
  THEN
    RAISE EXCEPTION 'Data transaksi kas tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND organization_id = p_organization_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Proyek tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  number_entity := CASE WHEN p_type = 'inflow' THEN 'cash_inflow' ELSE 'cash_outflow' END;
  number_prefix := CASE WHEN p_type = 'inflow' THEN 'BKM' ELSE 'BKK' END;
  INSERT INTO public.project_cash_transactions (
    organization_id, project_id, transaction_number, transaction_date, type, category,
    amount, recipient_or_payer, description, payment_method, reference, status, created_by
  ) VALUES (
    p_organization_id, p_project_id,
    public.generate_document_number(number_entity, p_organization_id, number_prefix),
    p_transaction_date, p_type, p_category, p_amount, trim(p_recipient_or_payer),
    trim(p_description), p_payment_method, trim(coalesce(p_reference, '')), 'pending', auth.uid()
  ) RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_project_cash_transaction(
  p_organization_id UUID,
  p_transaction_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang memverifikasi transaksi kas.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.project_cash_transactions
  SET status = 'verified', verified_by = auth.uid(), verified_at = timezone('utc'::TEXT, now())
  WHERE id = p_transaction_id AND organization_id = p_organization_id
    AND status = 'pending' AND invoice_id IS NULL AND cash_advance_request_id IS NULL
    AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi kas tertunda tidak tersedia.' USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_cash_advance_request(
  p_organization_id UUID,
  p_project_id UUID,
  p_request_type TEXT,
  p_employee_name TEXT,
  p_employee_role TEXT,
  p_request_date DATE,
  p_amount NUMERIC,
  p_purpose TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  result_id UUID;
  entity_type TEXT;
  number_prefix TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengajukan kasbon atau reimbursement.' USING ERRCODE = '42501';
  END IF;
  IF p_request_type IS NULL OR p_request_type NOT IN ('kasbon', 'reimbursement')
    OR length(trim(coalesce(p_employee_name, ''))) NOT BETWEEN 2 AND 180
    OR length(coalesce(p_employee_role, '')) > 120
    OR p_request_date IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999999999.99
    OR length(trim(coalesce(p_purpose, ''))) NOT BETWEEN 2 AND 500
  THEN
    RAISE EXCEPTION 'Data pengajuan kasbon atau reimbursement tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND organization_id = p_organization_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Proyek tidak tersedia.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  entity_type := CASE WHEN p_request_type = 'kasbon' THEN 'cash_advance' ELSE 'reimbursement' END;
  number_prefix := CASE WHEN p_request_type = 'kasbon' THEN 'KSB' ELSE 'RMB' END;
  INSERT INTO public.cash_advance_requests (
    organization_id, project_id, ticket_number, request_type, employee_name, employee_role,
    request_date, amount, purpose, created_by
  ) VALUES (
    p_organization_id, p_project_id,
    public.generate_document_number(entity_type, p_organization_id, number_prefix),
    p_request_type, trim(p_employee_name), trim(coalesce(p_employee_role, '')),
    p_request_date, p_amount, trim(p_purpose), auth.uid()
  ) RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_cash_advance_request(
  p_organization_id UUID,
  p_request_id UUID,
  p_decision TEXT,
  p_comment TEXT DEFAULT ''
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE request_row public.cash_advance_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang memutuskan pengajuan.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_row FROM public.cash_advance_requests
  WHERE id = p_request_id AND organization_id = p_organization_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'Pengajuan tidak tersedia untuk diproses.' USING ERRCODE = 'no_data_found';
  END IF;
  IF request_row.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Pemohon tidak dapat menyetujui pengajuannya sendiri.' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approve', 'reject') OR length(coalesce(p_comment, '')) > 2000
    OR (p_decision = 'reject' AND length(trim(coalesce(p_comment, ''))) = 0)
  THEN
    RAISE EXCEPTION 'Keputusan atau komentar tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.cash_advance_requests
  SET status = CASE WHEN p_decision = 'approve' THEN 'approved_ready_payout' ELSE 'rejected' END,
      decision_comment = trim(coalesce(p_comment, '')),
      approved_by = auth.uid(),
      approved_at = timezone('utc'::TEXT, now())
  WHERE id = p_request_id AND organization_id = p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_cash_advance_request(
  p_organization_id UUID,
  p_request_id UUID,
  p_payment_method TEXT,
  p_reference TEXT DEFAULT ''
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  request_row public.cash_advance_requests%ROWTYPE;
  number_entity TEXT;
  number_prefix TEXT;
  transaction_category TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat pembayaran pengajuan.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_row FROM public.cash_advance_requests
  WHERE id = p_request_id AND organization_id = p_organization_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'approved_ready_payout' THEN
    RAISE EXCEPTION 'Pengajuan belum siap dibayar.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya')
    OR length(coalesce(p_reference, '')) > 180
  THEN
    RAISE EXCEPTION 'Metode atau referensi pembayaran tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  number_entity := 'cash_outflow';
  number_prefix := 'BKK';
  transaction_category := CASE WHEN request_row.request_type = 'kasbon' THEN 'Kasbon / Petty Cash' ELSE 'Operasional Site' END;
  INSERT INTO public.project_cash_transactions (
    organization_id, project_id, transaction_number, transaction_date, type, category,
    amount, recipient_or_payer, description, payment_method, reference, status,
    cash_advance_request_id, created_by, verified_by, verified_at
  ) VALUES (
    p_organization_id, request_row.project_id,
    public.generate_document_number(number_entity, p_organization_id, number_prefix),
    CURRENT_DATE, 'outflow', transaction_category, request_row.amount,
    request_row.employee_name,
    CASE WHEN request_row.request_type = 'kasbon' THEN 'Pencairan kasbon ' ELSE 'Pembayaran reimbursement ' END || request_row.ticket_number,
    p_payment_method, trim(coalesce(p_reference, '')), 'verified',
    request_row.id, auth.uid(), auth.uid(), timezone('utc'::TEXT, now())
  );
  UPDATE public.cash_advance_requests
  SET status = CASE WHEN request_type = 'kasbon' THEN 'active_unsettled' ELSE 'settled' END,
      paid_by = auth.uid(),
      paid_at = timezone('utc'::TEXT, now()),
      payment_method = p_payment_method,
      paid_amount = amount,
      settled_by = CASE WHEN request_type = 'reimbursement' THEN auth.uid() ELSE NULL END,
      settled_at = CASE WHEN request_type = 'reimbursement' THEN timezone('utc'::TEXT, now()) ELSE NULL END,
      settled_amount = CASE WHEN request_type = 'reimbursement' THEN amount ELSE 0 END
  WHERE id = request_row.id AND organization_id = p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_cash_advance_request(
  p_organization_id UUID,
  p_request_id UUID,
  p_settled_amount NUMERIC,
  p_settlement_notes TEXT DEFAULT ''
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  request_row public.cash_advance_requests%ROWTYPE;
  refund_amount NUMERIC(18, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesi pengguna diperlukan.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_row FROM public.cash_advance_requests
  WHERE id = p_request_id AND organization_id = p_organization_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'active_unsettled' OR request_row.request_type <> 'kasbon' THEN
    RAISE EXCEPTION 'Kasbon belum dapat diselesaikan.' USING ERRCODE = 'check_violation';
  END IF;
  IF request_row.created_by <> auth.uid() AND NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang menyelesaikan kasbon ini.' USING ERRCODE = '42501';
  END IF;
  IF p_settled_amount IS NULL OR p_settled_amount < 0 OR p_settled_amount > request_row.paid_amount
    OR length(coalesce(p_settlement_notes, '')) > 2000
  THEN
    RAISE EXCEPTION 'Nilai penyelesaian tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  refund_amount := request_row.paid_amount - p_settled_amount;
  IF refund_amount > 0 THEN
    INSERT INTO public.project_cash_transactions (
      organization_id, project_id, transaction_number, transaction_date, type, category,
      amount, recipient_or_payer, description, payment_method, reference, status,
      cash_advance_request_id, created_by, verified_by, verified_at
    ) VALUES (
      p_organization_id, request_row.project_id,
      public.generate_document_number('cash_inflow', p_organization_id, 'BKM'),
      CURRENT_DATE, 'inflow', 'Kasbon / Petty Cash', refund_amount,
      request_row.employee_name, 'Pengembalian sisa kasbon ' || request_row.ticket_number,
      request_row.payment_method, request_row.ticket_number, 'verified',
      request_row.id, auth.uid(), auth.uid(), timezone('utc'::TEXT, now())
    );
  END IF;
  UPDATE public.cash_advance_requests
  SET status = 'settled',
      settled_by = auth.uid(),
      settled_at = timezone('utc'::TEXT, now()),
      settled_amount = p_settled_amount,
      settlement_notes = trim(coalesce(p_settlement_notes, ''))
  WHERE id = request_row.id AND organization_id = p_organization_id;
END;
$$;

DROP FUNCTION IF EXISTS public.record_client_invoice_payment(UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.record_client_invoice_payment(UUID, NUMERIC, TEXT, TEXT);

CREATE FUNCTION public.record_client_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT ''
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  invoice_row public.client_invoices%ROWTYPE;
  project_row RECORD;
  next_paid NUMERIC(18, 2);
BEGIN
  SELECT * INTO invoice_row
  FROM public.client_invoices
  WHERE id = p_invoice_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT public.has_role(invoice_row.organization_id, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'finance'::public.user_role_type]) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mencatat pembayaran invoice.' USING ERRCODE = '42501';
  END IF;
  IF invoice_row.status NOT IN ('sent', 'partially_paid', 'overdue') THEN
    RAISE EXCEPTION 'Invoice belum dapat menerima pembayaran.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0
    OR p_payment_method IS NULL OR p_payment_method NOT IN ('Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya')
    OR length(coalesce(p_payment_reference, '')) > 180
  THEN
    RAISE EXCEPTION 'Pembayaran invoice tidak valid.' USING ERRCODE = 'check_violation';
  END IF;
  next_paid := invoice_row.paid_amount + p_amount;
  IF next_paid > invoice_row.total_amount THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT name, client_name INTO project_row
  FROM public.projects
  WHERE id = invoice_row.project_id AND organization_id = invoice_row.organization_id;
  UPDATE public.client_invoices
  SET paid_amount = next_paid,
      status = CASE WHEN next_paid = total_amount THEN 'paid' ELSE 'partially_paid' END,
      paid_at = CASE WHEN next_paid = total_amount THEN now() ELSE NULL END,
      payment_reference = trim(coalesce(p_payment_reference, ''))
  WHERE id = p_invoice_id;
  INSERT INTO public.project_cash_transactions (
    organization_id, project_id, transaction_number, transaction_date, type, category,
    amount, recipient_or_payer, description, payment_method, reference, status,
    invoice_id, created_by, verified_by, verified_at
  ) VALUES (
    invoice_row.organization_id, invoice_row.project_id,
    public.generate_document_number('cash_inflow', invoice_row.organization_id, 'BKM'),
    CURRENT_DATE, 'inflow', 'Termin Klien', p_amount, coalesce(project_row.client_name, 'Klien'),
    'Penerimaan invoice ' || invoice_row.invoice_number, p_payment_method,
    trim(coalesce(p_payment_reference, '')), 'verified', invoice_row.id,
    auth.uid(), auth.uid(), timezone('utc'::TEXT, now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_cash_transaction(UUID, UUID, DATE, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT),
  public.verify_project_cash_transaction(UUID, UUID),
  public.create_cash_advance_request(UUID, UUID, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT),
  public.decide_cash_advance_request(UUID, UUID, TEXT, TEXT),
  public.pay_cash_advance_request(UUID, UUID, TEXT, TEXT),
  public.settle_cash_advance_request(UUID, UUID, NUMERIC, TEXT),
  public.record_client_invoice_payment(UUID, NUMERIC, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_cash_transaction(UUID, UUID, DATE, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT),
  public.verify_project_cash_transaction(UUID, UUID),
  public.create_cash_advance_request(UUID, UUID, TEXT, TEXT, TEXT, DATE, NUMERIC, TEXT),
  public.decide_cash_advance_request(UUID, UUID, TEXT, TEXT),
  public.pay_cash_advance_request(UUID, UUID, TEXT, TEXT),
  public.settle_cash_advance_request(UUID, UUID, NUMERIC, TEXT),
  public.record_client_invoice_payment(UUID, NUMERIC, TEXT, TEXT)
  TO authenticated;
