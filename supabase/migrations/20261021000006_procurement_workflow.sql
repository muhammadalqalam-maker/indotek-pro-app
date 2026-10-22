ALTER TABLE public.approval_flows
  DROP CONSTRAINT IF EXISTS approval_flows_resource_type_check;
ALTER TABLE public.approval_flows
  ADD CONSTRAINT approval_flows_resource_type_check
  CHECK (resource_type IN (
    'boq_revision', 'project_addendum', 'daily_report', 'purchase_request', 'purchase_order'
  ));

ALTER TABLE public.approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_resource_type_check;
ALTER TABLE public.approval_requests
  ADD CONSTRAINT approval_requests_resource_type_check
  CHECK (resource_type IN (
    'boq_revision', 'project_addendum', 'daily_report', 'purchase_request', 'purchase_order'
  ));

CREATE TABLE public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  pr_number TEXT NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE NOT NULL CHECK (required_date >= request_date),
  requester_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  department TEXT NOT NULL CHECK (length(trim(department)) BETWEEN 2 AND 120),
  urgency TEXT NOT NULL CHECK (urgency IN ('normal', 'urgent', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'converted_to_po')),
  total_estimated_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (total_estimated_amount >= 0),
  requester_comment TEXT NOT NULL DEFAULT '' CHECK (length(requester_comment) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, pr_number)
);

CREATE TABLE public.purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_request_id UUID NOT NULL,
  item_name TEXT NOT NULL CHECK (length(trim(item_name)) BETWEEN 2 AND 180),
  specification TEXT NOT NULL DEFAULT '' CHECK (length(specification) <= 1000),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 24),
  quantity NUMERIC(18, 3) NOT NULL CHECK (quantity > 0),
  estimated_price NUMERIC(18, 2) NOT NULL CHECK (estimated_price >= 0),
  subtotal NUMERIC(18, 2) GENERATED ALWAYS AS (round(quantity * estimated_price, 2)) STORED,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, purchase_request_id)
    REFERENCES public.purchase_requests (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE TABLE public.vendor_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  purchase_request_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  quote_number TEXT NOT NULL,
  quote_date DATE NOT NULL,
  valid_until DATE,
  ppn_percent NUMERIC(5, 2) NOT NULL DEFAULT 11 CHECK (ppn_percent BETWEEN 0 AND 100),
  subtotal NUMERIC(18, 2) NOT NULL CHECK (subtotal >= 0),
  ppn_amount NUMERIC(18, 2) NOT NULL CHECK (ppn_amount >= 0),
  grand_total NUMERIC(18, 2) NOT NULL CHECK (grand_total = subtotal + ppn_amount),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, purchase_request_id)
    REFERENCES public.purchase_requests (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, vendor_id)
    REFERENCES public.vendors (organization_id, id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, quote_number),
  UNIQUE (organization_id, purchase_request_id, vendor_id)
);

CREATE TABLE public.vendor_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_quote_id UUID NOT NULL,
  purchase_request_item_id UUID NOT NULL,
  quantity NUMERIC(18, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(18, 2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, vendor_quote_id)
    REFERENCES public.vendor_quotes (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, purchase_request_item_id)
    REFERENCES public.purchase_request_items (organization_id, id),
  UNIQUE (organization_id, vendor_quote_id, purchase_request_item_id)
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  purchase_request_id UUID NOT NULL,
  vendor_quote_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_deadline DATE NOT NULL,
  delivery_address TEXT NOT NULL CHECK (length(trim(delivery_address)) BETWEEN 3 AND 500),
  subtotal NUMERIC(18, 2) NOT NULL CHECK (subtotal >= 0),
  ppn_percent NUMERIC(5, 2) NOT NULL CHECK (ppn_percent BETWEEN 0 AND 100),
  ppn_amount NUMERIC(18, 2) NOT NULL CHECK (ppn_amount >= 0),
  grand_total NUMERIC(18, 2) NOT NULL CHECK (grand_total = subtotal + ppn_amount),
  status TEXT NOT NULL CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'received', 'closed'
  )),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT NOT NULL DEFAULT '' CHECK (length(approval_notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, purchase_request_id)
    REFERENCES public.purchase_requests (organization_id, id),
  FOREIGN KEY (organization_id, vendor_quote_id)
    REFERENCES public.vendor_quotes (organization_id, id),
  FOREIGN KEY (organization_id, vendor_id)
    REFERENCES public.vendors (organization_id, id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, po_number),
  UNIQUE (organization_id, vendor_quote_id)
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL CHECK (length(trim(item_name)) BETWEEN 2 AND 180),
  specification TEXT NOT NULL DEFAULT '' CHECK (length(specification) <= 1000),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 24),
  quantity NUMERIC(18, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(18, 2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  received_quantity NUMERIC(18, 3) NOT NULL DEFAULT 0
    CHECK (received_quantity >= 0 AND received_quantity <= quantity),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, purchase_order_id)
    REFERENCES public.purchase_orders (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE INDEX purchase_requests_project_status_idx
  ON public.purchase_requests (organization_id, project_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX purchase_request_items_request_idx
  ON public.purchase_request_items (organization_id, purchase_request_id)
  WHERE deleted_at IS NULL;
CREATE INDEX vendor_quotes_request_total_idx
  ON public.vendor_quotes (organization_id, purchase_request_id, grand_total)
  WHERE deleted_at IS NULL;
CREATE INDEX purchase_orders_project_status_idx
  ON public.purchase_orders (organization_id, project_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX purchase_order_items_order_idx
  ON public.purchase_order_items (organization_id, purchase_order_id)
  WHERE deleted_at IS NULL;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'purchase_requests', 'purchase_request_items', 'vendor_quotes',
    'vendor_quote_items', 'purchase_orders', 'purchase_order_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_org_member(organization_id))',
      target_table || ' read by organization members', target_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'trg_' || target_table || '_updated_at', target_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit()',
      'trg_' || target_table || '_audit', target_table
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', target_table);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', target_table);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_approval_flows(target_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.approval_flows (organization_id, resource_type, name, created_by)
  VALUES
    (target_organization_id, 'boq_revision', 'Persetujuan revisi BOQ', auth.uid()),
    (target_organization_id, 'project_addendum', 'Persetujuan addendum proyek', auth.uid()),
    (target_organization_id, 'daily_report', 'Persetujuan laporan harian', auth.uid()),
    (target_organization_id, 'purchase_request', 'Persetujuan purchase request', auth.uid()),
    (target_organization_id, 'purchase_order', 'Persetujuan purchase order', auth.uid())
  ON CONFLICT (organization_id, resource_type) DO NOTHING;

  INSERT INTO public.approval_flow_steps (organization_id, approval_flow_id, step_number, approver_roles, created_by)
  SELECT target_organization_id, flow.id, steps.step_number, steps.approver_roles, auth.uid()
  FROM public.approval_flows AS flow
  JOIN (VALUES
    ('boq_revision', 1, ARRAY['project_manager'::public.user_role_type]),
    ('boq_revision', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('project_addendum', 1, ARRAY['project_manager'::public.user_role_type]),
    ('project_addendum', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('daily_report', 1, ARRAY['project_manager'::public.user_role_type]),
    ('daily_report', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('purchase_request', 1, ARRAY['project_manager'::public.user_role_type]),
    ('purchase_order', 1, ARRAY['project_manager'::public.user_role_type]),
    ('purchase_order', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type])
  ) AS steps(resource_type, step_number, approver_roles) ON true
  WHERE flow.organization_id = target_organization_id
    AND flow.deleted_at IS NULL
    AND flow.resource_type = steps.resource_type
    AND NOT EXISTS (
      SELECT 1 FROM public.approval_flow_steps AS existing
      WHERE existing.organization_id = target_organization_id
        AND existing.approval_flow_id = flow.id
        AND existing.step_number = steps.step_number
        AND existing.deleted_at IS NULL
    );
END;
$$;

DO $$
DECLARE
  organization_record RECORD;
BEGIN
  FOR organization_record IN
    SELECT id FROM public.organizations WHERE deleted_at IS NULL
  LOOP
    PERFORM public.create_default_approval_flows(organization_record.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_procurement_approval_request(
  p_organization_id UUID,
  p_project_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_title TEXT,
  p_reference_number TEXT,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  flow_record public.approval_flows%ROWTYPE;
  request_id UUID;
  step_record RECORD;
BEGIN
  SELECT * INTO flow_record
  FROM public.approval_flows
  WHERE organization_id = p_organization_id
    AND resource_type = p_resource_type
    AND is_active AND deleted_at IS NULL
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ada alur persetujuan aktif untuk dokumen ini.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  INSERT INTO public.approval_requests (
    organization_id, project_id, approval_flow_id, resource_type, resource_id,
    requester_id, title, reference_number, amount
  ) VALUES (
    p_organization_id, p_project_id, flow_record.id, p_resource_type, p_resource_id,
    auth.uid(), p_title, p_reference_number, p_amount
  ) RETURNING id INTO request_id;

  FOR step_record IN
    SELECT step_number, approver_roles
    FROM public.approval_flow_steps
    WHERE organization_id = p_organization_id
      AND approval_flow_id = flow_record.id
      AND deleted_at IS NULL
    ORDER BY step_number
  LOOP
    INSERT INTO public.approval_steps (
      organization_id, project_id, approval_request_id, step_number, approver_roles, status
    ) VALUES (
      p_organization_id, p_project_id, request_id, step_record.step_number,
      step_record.approver_roles,
      CASE WHEN step_record.step_number = 1 THEN 'pending' ELSE 'waiting' END
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.approval_steps
    WHERE organization_id = p_organization_id AND approval_request_id = request_id
  ) THEN
    RAISE EXCEPTION 'Alur persetujuan belum memiliki langkah approver.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  PERFORM public.notify_approval_step(
    request_id, 1, 'Dokumen ' || p_reference_number || ' menunggu persetujuan Anda.'
  );
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_purchase_request(
  p_organization_id UUID,
  p_project_id UUID,
  p_required_date DATE,
  p_department TEXT,
  p_urgency TEXT,
  p_comment TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_id UUID;
  request_number TEXT;
  request_total NUMERIC(18, 2);
  item_record JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type,
      'procurement'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang membuat permintaan pengadaan.'
      USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100
    OR p_required_date < CURRENT_DATE
    OR p_urgency IS NULL OR p_urgency NOT IN ('normal', 'urgent', 'critical')
    OR length(trim(coalesce(p_department, ''))) NOT BETWEEN 2 AND 120
    OR length(coalesce(p_comment, '')) > 2000
    OR NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = p_project_id AND organization_id = p_organization_id AND deleted_at IS NULL
    )
  THEN
    RAISE EXCEPTION 'Data permintaan pengadaan tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF length(trim(coalesce(item_record->>'item_name', ''))) NOT BETWEEN 2 AND 180
      OR length(trim(coalesce(item_record->>'unit', ''))) NOT BETWEEN 1 AND 24
      OR coalesce(item_record->>'quantity', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
      OR coalesce(item_record->>'estimated_price', '') !~ '^[0-9]+([.][0-9]{1,2})?$'
      OR coalesce((item_record->>'quantity')::NUMERIC, 0) <= 0
      OR coalesce((item_record->>'estimated_price')::NUMERIC, -1) < 0
    THEN
      RAISE EXCEPTION 'Item permintaan pengadaan tidak valid.'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  SELECT sum(round((value->>'quantity')::NUMERIC * (value->>'estimated_price')::NUMERIC, 2))
  INTO request_total FROM jsonb_array_elements(p_items);
  request_number := public.generate_document_number('pr', p_organization_id, 'PR');

  INSERT INTO public.purchase_requests (
    organization_id, project_id, pr_number, required_date, department, urgency,
    status, total_estimated_amount, requester_comment
  ) VALUES (
    p_organization_id, p_project_id, request_number, p_required_date, trim(p_department),
    p_urgency, 'submitted', request_total, coalesce(p_comment, '')
  ) RETURNING id INTO request_id;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.purchase_request_items (
      organization_id, purchase_request_id, item_name, specification, unit, quantity, estimated_price
    ) VALUES (
      p_organization_id, request_id, trim(item_record->>'item_name'),
      coalesce(item_record->>'specification', ''), trim(item_record->>'unit'),
      (item_record->>'quantity')::NUMERIC, (item_record->>'estimated_price')::NUMERIC
    );
  END LOOP;

  PERFORM public.create_procurement_approval_request(
    p_organization_id, p_project_id, 'purchase_request', request_id,
    'Permintaan pengadaan ' || request_number, request_number, request_total
  );
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_vendor_quote(
  p_organization_id UUID,
  p_purchase_request_id UUID,
  p_vendor_id UUID,
  p_quote_date DATE,
  p_valid_until DATE,
  p_ppn_percent NUMERIC,
  p_items JSONB,
  p_notes TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_record public.purchase_requests%ROWTYPE;
  quote_id UUID;
  quote_number TEXT;
  item_record JSONB;
  expected_count INTEGER;
  subtotal_amount NUMERIC(18, 2);
  ppn_value NUMERIC(18, 2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'procurement'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Hanya procurement atau admin yang dapat mencatat penawaran.'
      USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_record FROM public.purchase_requests
  WHERE id = p_purchase_request_id AND organization_id = p_organization_id
    AND status = 'approved' AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PR harus disetujui sebelum penawaran dicatat.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = p_vendor_id AND organization_id = p_organization_id
      AND is_active AND deleted_at IS NULL
  ) OR p_quote_date IS NULL
    OR p_ppn_percent IS NULL
    OR p_ppn_percent::TEXT !~ '^[0-9]+([.][0-9]{1,2})?$'
    OR p_ppn_percent NOT BETWEEN 0 AND 100
    OR p_items IS NULL
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR length(coalesce(p_notes, '')) > 2000
    OR (p_valid_until IS NOT NULL AND p_valid_until < p_quote_date)
  THEN
    RAISE EXCEPTION 'Data penawaran tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO expected_count FROM public.purchase_request_items
  WHERE organization_id = p_organization_id
    AND purchase_request_id = p_purchase_request_id AND deleted_at IS NULL;
  IF expected_count = 0 OR jsonb_array_length(p_items) <> expected_count THEN
    RAISE EXCEPTION 'Penawaran harus mencakup seluruh item PR.'
      USING ERRCODE = 'check_violation';
  END IF;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF coalesce((item_record->>'quantity')::NUMERIC, 0) <= 0
      OR coalesce(item_record->>'quantity', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
      OR coalesce(item_record->>'unit_price', '') !~ '^[0-9]+([.][0-9]{1,2})?$'
      OR coalesce((item_record->>'unit_price')::NUMERIC, -1) < 0
      OR NOT EXISTS (
        SELECT 1 FROM public.purchase_request_items AS request_item
        WHERE request_item.id = (item_record->>'purchase_request_item_id')::UUID
          AND request_item.organization_id = p_organization_id
          AND request_item.purchase_request_id = p_purchase_request_id
          AND request_item.quantity = (item_record->>'quantity')::NUMERIC
          AND request_item.deleted_at IS NULL
      )
    THEN
      RAISE EXCEPTION 'Rincian harga penawaran tidak sesuai dengan item PR.'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  SELECT sum(round((value->>'quantity')::NUMERIC * (value->>'unit_price')::NUMERIC, 2))
  INTO subtotal_amount FROM jsonb_array_elements(p_items);
  ppn_value := round(subtotal_amount * p_ppn_percent / 100, 2);
  quote_number := public.generate_document_number('quote', p_organization_id, 'QT');

  INSERT INTO public.vendor_quotes (
    organization_id, project_id, purchase_request_id, vendor_id, quote_number, quote_date,
    valid_until, ppn_percent, subtotal, ppn_amount, grand_total, notes
  ) VALUES (
    p_organization_id, request_record.project_id, p_purchase_request_id, p_vendor_id,
    quote_number, p_quote_date, p_valid_until, p_ppn_percent, subtotal_amount, ppn_value,
    subtotal_amount + ppn_value, coalesce(p_notes, '')
  ) RETURNING id INTO quote_id;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.vendor_quote_items (
      organization_id, vendor_quote_id, purchase_request_item_id, quantity, unit_price
    ) VALUES (
      p_organization_id, quote_id, (item_record->>'purchase_request_item_id')::UUID,
      (item_record->>'quantity')::NUMERIC, (item_record->>'unit_price')::NUMERIC
    );
  END LOOP;
  RETURN quote_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_purchase_order_from_quote(
  p_organization_id UUID,
  p_purchase_request_id UUID,
  p_vendor_quote_id UUID,
  p_delivery_deadline DATE,
  p_delivery_address TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_record public.purchase_requests%ROWTYPE;
  quote_record public.vendor_quotes%ROWTYPE;
  order_id UUID;
  order_number TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'procurement'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Hanya procurement atau admin yang dapat menerbitkan PO.'
      USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_record FROM public.purchase_requests
  WHERE id = p_purchase_request_id AND organization_id = p_organization_id
    AND status = 'approved' AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PR tidak tersedia atau belum disetujui.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF (SELECT count(DISTINCT vendor_id) FROM public.vendor_quotes
      WHERE organization_id = p_organization_id
        AND purchase_request_id = p_purchase_request_id AND deleted_at IS NULL) < 2 THEN
    RAISE EXCEPTION 'Minimal dua penawaran dari vendor berbeda diperlukan.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO quote_record FROM public.vendor_quotes
  WHERE id = p_vendor_quote_id AND organization_id = p_organization_id
    AND purchase_request_id = p_purchase_request_id AND deleted_at IS NULL
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  FOR UPDATE;
  IF NOT FOUND OR p_delivery_deadline IS NULL
    OR p_delivery_deadline < CURRENT_DATE
    OR length(trim(coalesce(p_delivery_address, ''))) NOT BETWEEN 3 AND 500
  THEN
    RAISE EXCEPTION 'Penawaran atau data pengiriman tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  order_number := public.generate_document_number('po', p_organization_id, 'PO');
  INSERT INTO public.purchase_orders (
    organization_id, project_id, purchase_request_id, vendor_quote_id, vendor_id,
    po_number, delivery_deadline, delivery_address, subtotal, ppn_percent, ppn_amount,
    grand_total, status
  ) VALUES (
    p_organization_id, request_record.project_id, request_record.id, quote_record.id,
    quote_record.vendor_id, order_number, p_delivery_deadline, trim(p_delivery_address),
    quote_record.subtotal, quote_record.ppn_percent, quote_record.ppn_amount,
    quote_record.grand_total,
    CASE WHEN quote_record.grand_total > 100000000 THEN 'pending_approval' ELSE 'approved' END
  ) RETURNING id INTO order_id;

  INSERT INTO public.purchase_order_items (
    organization_id, purchase_order_id, item_code, item_name, specification,
    unit, quantity, unit_price
  )
  SELECT p_organization_id, order_id, '', request_item.item_name, request_item.specification,
    request_item.unit, quote_item.quantity, quote_item.unit_price
  FROM public.vendor_quote_items AS quote_item
  JOIN public.purchase_request_items AS request_item
    ON request_item.organization_id = quote_item.organization_id
    AND request_item.id = quote_item.purchase_request_item_id
  WHERE quote_item.organization_id = p_organization_id
    AND quote_item.vendor_quote_id = quote_record.id
    AND quote_item.deleted_at IS NULL
    AND request_item.deleted_at IS NULL;

  UPDATE public.purchase_requests SET status = 'converted_to_po'
  WHERE id = request_record.id AND organization_id = p_organization_id;

  IF quote_record.grand_total > 100000000 THEN
    PERFORM public.create_procurement_approval_request(
      p_organization_id, request_record.project_id, 'purchase_order', order_id,
      'Purchase order ' || order_number, order_number, quote_record.grand_total
    );
  END IF;
  RETURN order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_procurement_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.status = OLD.status OR NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  IF NEW.resource_type = 'purchase_request' THEN
    UPDATE public.purchase_requests
    SET status = NEW.status
    WHERE id = NEW.resource_id AND organization_id = NEW.organization_id
      AND status = 'submitted' AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase request tidak lagi menunggu persetujuan.'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  ELSIF NEW.resource_type = 'purchase_order' THEN
    UPDATE public.purchase_orders
    SET status = NEW.status,
        approved_by = CASE WHEN NEW.status = 'approved' THEN auth.uid() ELSE NULL END,
        approved_at = CASE WHEN NEW.status = 'approved' THEN now() ELSE NULL END
    WHERE id = NEW.resource_id AND organization_id = NEW.organization_id
      AND status = 'pending_approval' AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase order tidak lagi menunggu persetujuan.'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    IF NEW.status = 'rejected' THEN
      UPDATE public.purchase_requests SET status = 'approved'
      WHERE id = (
        SELECT purchase_request_id FROM public.purchase_orders
        WHERE id = NEW.resource_id AND organization_id = NEW.organization_id
      ) AND organization_id = NEW.organization_id AND status = 'converted_to_po';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_procurement_approval_status
  AFTER UPDATE OF status ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_procurement_approval_status();

REVOKE ALL ON FUNCTION public.create_procurement_approval_request(UUID, UUID, TEXT, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_procurement_approval_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_purchase_request(UUID, UUID, DATE, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_vendor_quote(UUID, UUID, UUID, DATE, DATE, NUMERIC, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_purchase_order_from_quote(UUID, UUID, UUID, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_request(UUID, UUID, DATE, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vendor_quote(UUID, UUID, UUID, DATE, DATE, NUMERIC, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase_order_from_quote(UUID, UUID, UUID, DATE, TEXT) TO authenticated;
