ALTER TABLE public.project_cash_transactions
  ADD COLUMN IF NOT EXISTS reversal_of_id UUID,
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT;

ALTER TABLE public.project_cash_transactions
  DROP CONSTRAINT IF EXISTS project_cash_transactions_status_check;

ALTER TABLE public.project_cash_transactions
  DROP CONSTRAINT IF EXISTS project_cash_transactions_check;

ALTER TABLE public.project_cash_transactions
  ADD CONSTRAINT project_cash_transactions_status_check
  CHECK (status IN ('pending', 'verified', 'reversed'));

ALTER TABLE public.project_cash_transactions
  DROP CONSTRAINT IF EXISTS project_cash_transactions_reversal_fk;

ALTER TABLE public.project_cash_transactions
  ADD CONSTRAINT project_cash_transactions_reversal_fk
  FOREIGN KEY (organization_id, reversal_of_id)
  REFERENCES public.project_cash_transactions (organization_id, id)
  ON DELETE RESTRICT;

ALTER TABLE public.project_cash_transactions
  DROP CONSTRAINT IF EXISTS project_cash_transactions_reversal_check;

ALTER TABLE public.project_cash_transactions
  ADD CONSTRAINT project_cash_transactions_reversal_check
  CHECK (
    reversal_of_id IS NULL OR (
      reversal_of_id <> id
      AND status = 'verified'
      AND verified_by IS NOT NULL
      AND verified_at IS NOT NULL
      AND reversed_by IS NULL
      AND reversed_at IS NULL
      AND length(trim(coalesce(correction_reason, ''))) BETWEEN 5 AND 350
    )
  );

ALTER TABLE public.project_cash_transactions
  DROP CONSTRAINT IF EXISTS project_cash_transactions_reversed_state_check;

ALTER TABLE public.project_cash_transactions
  ADD CONSTRAINT project_cash_transactions_reversed_state_check
  CHECK (
    (status = 'pending'
      AND verified_by IS NULL
      AND verified_at IS NULL
      AND reversed_by IS NULL
      AND reversed_at IS NULL
      AND reversal_of_id IS NULL
      AND correction_reason IS NULL)
    OR (status = 'verified'
      AND verified_by IS NOT NULL
      AND verified_at IS NOT NULL
      AND reversed_by IS NULL
      AND reversed_at IS NULL
      AND (reversal_of_id IS NOT NULL OR correction_reason IS NULL))
    OR (status = 'reversed'
      AND verified_by IS NOT NULL
      AND verified_at IS NOT NULL
      AND reversed_by IS NOT NULL
      AND reversed_at IS NOT NULL
      AND reversal_of_id IS NULL
      AND length(trim(coalesce(correction_reason, ''))) BETWEEN 5 AND 350)
  );

CREATE UNIQUE INDEX IF NOT EXISTS project_cash_transactions_one_reversal_idx
  ON public.project_cash_transactions (organization_id, reversal_of_id)
  WHERE reversal_of_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'ordered',
    'received', 'closed', 'cancelled'
  ));

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_cancellation_check;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_cancellation_check
  CHECK (
    (status = 'cancelled'
      AND cancelled_by IS NOT NULL
      AND cancelled_at IS NOT NULL
      AND length(trim(coalesce(cancellation_reason, ''))) BETWEEN 5 AND 2000)
    OR (status <> 'cancelled'
      AND cancelled_by IS NULL
      AND cancelled_at IS NULL
      AND cancellation_reason IS NULL)
  );

CREATE OR REPLACE FUNCTION public.has_org_module_permission(
  p_organization_id UUID,
  p_module TEXT,
  p_action TEXT,
  p_default_roles public.user_role_type[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  member_role public.user_role_type;
  override_allowed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  member_role := public.current_user_role(p_organization_id);
  IF member_role IS NULL THEN
    RETURN false;
  END IF;

  SELECT allowed INTO override_allowed
  FROM public.roles_permissions
  WHERE organization_id = p_organization_id
    AND role = member_role
    AND module = p_module
    AND action = p_action;

  IF FOUND THEN
    RETURN override_allowed;
  END IF;

  RETURN member_role = ANY(p_default_roles);
END;
$$;

REVOKE ALL ON FUNCTION public.has_org_module_permission(
  UUID, TEXT, TEXT, public.user_role_type[]
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_archived_daily_attendance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Absensi yang sudah diarsipkan tidak dapat diubah atau dipulihkan.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_archived_daily_attendance_update()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_archived_daily_attendance_update
  ON public.daily_attendance;
CREATE TRIGGER trg_prevent_archived_daily_attendance_update
BEFORE UPDATE ON public.daily_attendance
FOR EACH ROW EXECUTE FUNCTION public.prevent_archived_daily_attendance_update();

CREATE OR REPLACE FUNCTION public.archive_daily_attendance(
  p_organization_id UUID,
  p_project_id UUID,
  p_attendance_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'users',
    'delete',
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan absensi.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.daily_attendance
  SET deleted_at = now()
  WHERE id = p_attendance_id
    AND organization_id = p_organization_id
    AND project_id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Absensi tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_project_cash_transaction(
  p_organization_id UUID,
  p_transaction_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target public.project_cash_transactions%ROWTYPE;
  original_id UUID;
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'finance',
    'approve',
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan transaksi kas.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target
  FROM public.project_cash_transactions
  WHERE id = p_transaction_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi kas tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;

  IF target.invoice_id IS NOT NULL
    OR target.cash_advance_request_id IS NOT NULL
    OR target.payable_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Transaksi terkait invoice, kasbon, atau hutang harus dikoreksi melalui alur sumbernya.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF target.status = 'pending' AND target.reversal_of_id IS NULL THEN
    UPDATE public.project_cash_transactions
    SET deleted_at = now()
    WHERE id = target.id AND organization_id = p_organization_id;
    RETURN;
  END IF;

  IF target.reversal_of_id IS NOT NULL THEN
    original_id := target.reversal_of_id;
    PERFORM 1
    FROM public.project_cash_transactions
    WHERE id = original_id
      AND organization_id = p_organization_id
      AND status = 'reversed'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Koreksi transaksi tidak dapat diarsipkan tanpa transaksi asal yang sudah dibalik.'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF target.status = 'reversed' THEN
    original_id := target.id;
  ELSE
    RAISE EXCEPTION 'Transaksi terverifikasi harus dikoreksi terlebih dahulu sebelum dapat diarsipkan.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_cash_transactions
    WHERE organization_id = p_organization_id
      AND reversal_of_id = original_id
  ) THEN
    RAISE EXCEPTION 'Catatan koreksi transaksi tidak ditemukan.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.project_cash_transactions
  SET deleted_at = now()
  WHERE organization_id = p_organization_id
    AND (id = original_id OR reversal_of_id = original_id)
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_project_cash_transaction(
  p_organization_id UUID,
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  original public.project_cash_transactions%ROWTYPE;
  correction_id UUID;
  correction_type TEXT;
  number_entity TEXT;
  number_prefix TEXT;
  reason TEXT := trim(coalesce(p_reason, ''));
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'finance',
    'approve',
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengoreksi transaksi kas.'
      USING ERRCODE = '42501';
  END IF;

  IF length(reason) NOT BETWEEN 5 AND 350 THEN
    RAISE EXCEPTION 'Alasan koreksi wajib diisi (5–350 karakter).'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO original
  FROM public.project_cash_transactions
  WHERE id = p_transaction_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR original.status <> 'verified' OR original.reversal_of_id IS NOT NULL THEN
    RAISE EXCEPTION 'Hanya transaksi kas terverifikasi yang belum dikoreksi dapat dibalik.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF original.invoice_id IS NOT NULL
    OR original.cash_advance_request_id IS NOT NULL
    OR original.payable_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Transaksi terkait invoice, kasbon, atau hutang harus dikoreksi melalui alur sumbernya.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.project_cash_transactions
    WHERE organization_id = p_organization_id
      AND reversal_of_id = original.id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Transaksi sudah memiliki catatan koreksi.'
      USING ERRCODE = 'unique_violation';
  END IF;

  correction_type := CASE original.type
    WHEN 'inflow' THEN 'outflow'
    WHEN 'outflow' THEN 'inflow'
    ELSE NULL
  END;
  IF correction_type IS NULL THEN
    RAISE EXCEPTION 'Jenis transaksi kas tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  number_entity := CASE correction_type WHEN 'inflow' THEN 'cash_inflow' ELSE 'cash_outflow' END;
  number_prefix := CASE correction_type WHEN 'inflow' THEN 'BKM' ELSE 'BKK' END;

  INSERT INTO public.project_cash_transactions (
    organization_id, project_id, transaction_number, transaction_date, type, category,
    amount, recipient_or_payer, description, payment_method, reference, status,
    created_by, verified_by, verified_at, reversal_of_id, correction_reason
  ) VALUES (
    p_organization_id, original.project_id,
    public.generate_document_number(number_entity, p_organization_id, number_prefix),
    CURRENT_DATE, correction_type, original.category, original.amount,
    original.recipient_or_payer,
    'Koreksi transaksi ' || original.transaction_number || ': ' || reason,
    original.payment_method, 'Koreksi ' || original.transaction_number,
    'verified', auth.uid(), auth.uid(), now(), original.id, reason
  )
  RETURNING id INTO correction_id;

  UPDATE public.project_cash_transactions
  SET status = 'reversed',
      reversed_by = auth.uid(),
      reversed_at = now(),
      correction_reason = reason
  WHERE id = original.id
    AND organization_id = p_organization_id
    AND status = 'verified'
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi berubah saat koreksi diproses.'
      USING ERRCODE = 'serialization_failure';
  END IF;

  RETURN correction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_cash_advance_request(
  p_organization_id UUID,
  p_request_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  request_row public.cash_advance_requests%ROWTYPE;
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'finance',
    'approve',
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'finance'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan pengajuan kasbon.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO request_row
  FROM public.cash_advance_requests
  WHERE id = p_request_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan kasbon tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.status NOT IN ('pending_approval', 'rejected')
    OR request_row.paid_amount <> 0
    OR request_row.settled_amount <> 0
    OR EXISTS (
      SELECT 1 FROM public.project_cash_transactions
      WHERE organization_id = p_organization_id
        AND cash_advance_request_id = request_row.id
    )
  THEN
    RAISE EXCEPTION 'Kasbon yang sudah disetujui atau memiliki transaksi kas harus diselesaikan melalui alur koreksi.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.cash_advance_requests
  SET deleted_at = now()
  WHERE id = request_row.id AND organization_id = p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_purchase_request(
  p_organization_id UUID,
  p_request_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  request_row public.purchase_requests%ROWTYPE;
  archived_at TIMESTAMPTZ := now();
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'procurement',
    'delete',
    ARRAY['admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan permintaan pengadaan.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO request_row
  FROM public.purchase_requests
  WHERE id = p_request_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permintaan pengadaan tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.status = 'converted_to_po'
    OR EXISTS (
      SELECT 1 FROM public.approval_requests
      WHERE organization_id = p_organization_id
        AND resource_type = 'purchase_request'
        AND resource_id = request_row.id
        AND status = 'pending'
        AND deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders
      WHERE organization_id = p_organization_id
        AND purchase_request_id = request_row.id
        AND deleted_at IS NULL
        AND status <> 'cancelled'
    )
  THEN
    RAISE EXCEPTION 'PR dengan approval aktif atau PO yang belum dibatalkan tidak dapat diarsipkan.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.vendor_quote_items
  SET deleted_at = archived_at
  WHERE organization_id = p_organization_id
    AND vendor_quote_id IN (
      SELECT id FROM public.vendor_quotes
      WHERE organization_id = p_organization_id
        AND purchase_request_id = request_row.id
        AND deleted_at IS NULL
    )
    AND deleted_at IS NULL;

  UPDATE public.vendor_quotes
  SET deleted_at = archived_at
  WHERE organization_id = p_organization_id
    AND purchase_request_id = request_row.id
    AND deleted_at IS NULL;

  UPDATE public.purchase_request_items
  SET deleted_at = archived_at
  WHERE organization_id = p_organization_id
    AND purchase_request_id = request_row.id
    AND deleted_at IS NULL;

  UPDATE public.purchase_requests
  SET deleted_at = archived_at
  WHERE id = request_row.id AND organization_id = p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_vendor_quote(
  p_organization_id UUID,
  p_quote_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  quote_row public.vendor_quotes%ROWTYPE;
  archived_at TIMESTAMPTZ := now();
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'procurement',
    'delete',
    ARRAY['admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan penawaran vendor.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO quote_row
  FROM public.vendor_quotes
  WHERE id = p_quote_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penawaran vendor tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE organization_id = p_organization_id
      AND vendor_quote_id = quote_row.id
      AND deleted_at IS NULL
      AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Penawaran yang masih dipakai PO aktif tidak dapat diarsipkan.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.vendor_quote_items
  SET deleted_at = archived_at
  WHERE organization_id = p_organization_id
    AND vendor_quote_id = quote_row.id
    AND deleted_at IS NULL;

  UPDATE public.vendor_quotes
  SET deleted_at = archived_at
  WHERE id = quote_row.id AND organization_id = p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_purchase_order(
  p_organization_id UUID,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  order_row public.purchase_orders%ROWTYPE;
  archived_at TIMESTAMPTZ := now();
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'procurement',
    'delete',
    ARRAY['admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan PO.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO order_row
  FROM public.purchase_orders
  WHERE id = p_order_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;

  IF order_row.status NOT IN ('draft', 'rejected', 'cancelled')
    OR EXISTS (
      SELECT 1 FROM public.approval_requests
      WHERE organization_id = p_organization_id
        AND resource_type = 'purchase_order'
        AND resource_id = order_row.id
        AND status = 'pending'
        AND deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.goods_receipts
      WHERE organization_id = p_organization_id
        AND purchase_order_id = order_row.id
        AND deleted_at IS NULL
    )
  THEN
    RAISE EXCEPTION 'PO aktif, menunggu approval, atau sudah memiliki penerimaan barang tidak dapat diarsipkan.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.purchase_order_items
  SET deleted_at = archived_at
  WHERE organization_id = p_organization_id
    AND purchase_order_id = order_row.id
    AND deleted_at IS NULL;

  UPDATE public.purchase_orders
  SET deleted_at = archived_at
  WHERE id = order_row.id AND organization_id = p_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_purchase_order(
  p_organization_id UUID,
  p_order_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  order_row public.purchase_orders%ROWTYPE;
  reason TEXT := trim(coalesce(p_reason, ''));
BEGIN
  IF NOT public.has_org_module_permission(
    p_organization_id,
    'procurement',
    'approve',
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang membatalkan PO.'
      USING ERRCODE = '42501';
  END IF;

  IF length(reason) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'Alasan pembatalan wajib diisi (5–2000 karakter).'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO order_row
  FROM public.purchase_orders
  WHERE id = p_order_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR order_row.status <> 'approved' THEN
    RAISE EXCEPTION 'Hanya PO yang disetujui tetapi belum dipesan dapat dibatalkan.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.goods_receipts
    WHERE organization_id = p_organization_id
      AND purchase_order_id = order_row.id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'PO dengan penerimaan barang harus diselesaikan melalui rekonsiliasi penerimaan.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.purchase_orders
  SET status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      cancellation_reason = reason
  WHERE id = order_row.id
    AND organization_id = p_organization_id
    AND status = 'approved'
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO berubah saat pembatalan diproses.'
      USING ERRCODE = 'serialization_failure';
  END IF;

  UPDATE public.purchase_requests
  SET status = 'approved'
  WHERE id = order_row.purchase_request_id
    AND organization_id = p_organization_id
    AND status = 'converted_to_po'
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.purchase_orders
      WHERE organization_id = p_organization_id
        AND purchase_request_id = order_row.purchase_request_id
        AND id <> order_row.id
        AND deleted_at IS NULL
        AND status <> 'cancelled'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_daily_attendance(UUID, UUID, UUID),
  public.archive_project_cash_transaction(UUID, UUID),
  public.reverse_project_cash_transaction(UUID, UUID, TEXT),
  public.archive_cash_advance_request(UUID, UUID),
  public.archive_purchase_request(UUID, UUID),
  public.archive_vendor_quote(UUID, UUID),
  public.archive_purchase_order(UUID, UUID),
  public.cancel_purchase_order(UUID, UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.archive_daily_attendance(UUID, UUID, UUID),
  public.archive_project_cash_transaction(UUID, UUID),
  public.reverse_project_cash_transaction(UUID, UUID, TEXT),
  public.archive_cash_advance_request(UUID, UUID),
  public.archive_purchase_request(UUID, UUID),
  public.archive_vendor_quote(UUID, UUID),
  public.archive_purchase_order(UUID, UUID),
  public.cancel_purchase_order(UUID, UUID, TEXT)
TO authenticated;

NOTIFY pgrst, 'reload schema';
