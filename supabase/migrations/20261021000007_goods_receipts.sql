CREATE TABLE public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  grn_number TEXT NOT NULL,
  delivery_note_number TEXT NOT NULL CHECK (length(trim(delivery_note_number)) BETWEEN 1 AND 100),
  received_date DATE NOT NULL,
  receiver_name TEXT NOT NULL CHECK (length(trim(receiver_name)) BETWEEN 2 AND 120),
  driver_name TEXT NOT NULL DEFAULT '' CHECK (length(driver_name) <= 120),
  vehicle_number TEXT NOT NULL DEFAULT '' CHECK (length(vehicle_number) <= 80),
  status TEXT NOT NULL DEFAULT 'partial' CHECK (status IN ('full', 'partial', 'rejected')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, purchase_order_id)
    REFERENCES public.purchase_orders (organization_id, id),
  FOREIGN KEY (organization_id, vendor_id)
    REFERENCES public.vendors (organization_id, id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, grn_number),
  UNIQUE (organization_id, purchase_order_id, delivery_note_number)
);

CREATE TABLE public.goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  goods_receipt_id UUID NOT NULL,
  purchase_order_item_id UUID NOT NULL,
  item_name TEXT NOT NULL CHECK (length(trim(item_name)) BETWEEN 2 AND 180),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 24),
  po_quantity NUMERIC(18, 3) NOT NULL CHECK (po_quantity > 0),
  received_quantity NUMERIC(18, 3) NOT NULL CHECK (received_quantity > 0),
  accepted_quantity NUMERIC(18, 3) NOT NULL
    CHECK (accepted_quantity >= 0 AND accepted_quantity <= received_quantity),
  rejected_quantity NUMERIC(18, 3)
    GENERATED ALWAYS AS (received_quantity - accepted_quantity) STORED,
  condition_notes TEXT NOT NULL DEFAULT '' CHECK (length(condition_notes) <= 500),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, goods_receipt_id)
    REFERENCES public.goods_receipts (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, purchase_order_item_id)
    REFERENCES public.purchase_order_items (organization_id, id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, goods_receipt_id, purchase_order_item_id)
);

CREATE INDEX goods_receipts_project_date_idx
  ON public.goods_receipts (organization_id, project_id, received_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX goods_receipts_po_idx
  ON public.goods_receipts (organization_id, purchase_order_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX goods_receipt_items_receipt_idx
  ON public.goods_receipt_items (organization_id, goods_receipt_id)
  WHERE deleted_at IS NULL;
CREATE INDEX goods_receipt_items_po_item_idx
  ON public.goods_receipt_items (organization_id, purchase_order_item_id)
  WHERE deleted_at IS NULL;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['goods_receipts', 'goods_receipt_items']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_org_member(organization_id))',
      target_table || ' read by organization members',
      target_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'trg_' || target_table || '_updated_at',
      target_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit()',
      'trg_' || target_table || '_audit',
      target_table
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', target_table);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', target_table);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_goods_receipt(
  p_organization_id UUID,
  p_purchase_order_id UUID,
  p_delivery_note_number TEXT,
  p_received_date DATE,
  p_receiver_name TEXT,
  p_driver_name TEXT,
  p_vehicle_number TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  order_record public.purchase_orders%ROWTYPE;
  order_item public.purchase_order_items%ROWTYPE;
  item_record JSONB;
  v_goods_receipt_id UUID;
  document_number TEXT;
  total_delivered NUMERIC(18, 3);
  total_accepted NUMERIC(18, 3);
  completed_order BOOLEAN;
  expected_item_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'procurement'::public.user_role_type,
      'warehouse'::public.user_role_type,
      'site_manager'::public.user_role_type
    ]
  ) THEN
    RAISE EXCEPTION 'Hanya procurement, gudang, pelaksana, atau admin yang dapat mencatat penerimaan.'
      USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Daftar item penerimaan tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_organization_id IS NULL
    OR p_purchase_order_id IS NULL
    OR length(trim(coalesce(p_delivery_note_number, ''))) NOT BETWEEN 1 AND 100
    OR p_received_date IS NULL
    OR p_received_date > CURRENT_DATE
    OR length(trim(coalesce(p_receiver_name, ''))) NOT BETWEEN 2 AND 120
    OR length(coalesce(p_driver_name, '')) > 120
    OR length(coalesce(p_vehicle_number, '')) > 80
    OR length(coalesce(p_notes, '')) > 2000
    OR jsonb_array_length(p_items) = 0
    OR jsonb_array_length(p_items) > 100
  THEN
    RAISE EXCEPTION 'Data penerimaan barang tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO order_record
  FROM public.purchase_orders
  WHERE id = p_purchase_order_id
    AND organization_id = p_organization_id
    AND status IN ('approved', 'ordered')
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO tidak tersedia, belum disetujui, atau sudah diterima penuh.'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF p_received_date < order_record.order_date THEN
    RAISE EXCEPTION 'Tanggal penerimaan tidak boleh sebelum tanggal PO.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS entry(value)
    GROUP BY entry.value->>'purchase_order_item_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Item PO yang sama tidak boleh dikirim lebih dari sekali dalam satu GRN.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO expected_item_count
  FROM public.purchase_order_items
  WHERE organization_id = p_organization_id
    AND purchase_order_id = p_purchase_order_id
    AND deleted_at IS NULL;
  IF expected_item_count = 0 OR jsonb_array_length(p_items) > expected_item_count THEN
    RAISE EXCEPTION 'Daftar item penerimaan tidak sesuai dengan PO.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1
  FROM public.purchase_order_items
  WHERE organization_id = p_organization_id
    AND purchase_order_id = p_purchase_order_id
    AND deleted_at IS NULL
  ORDER BY id
  FOR UPDATE;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF coalesce(item_record->>'received_quantity', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
      OR coalesce(item_record->>'accepted_quantity', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
      OR coalesce((item_record->>'received_quantity')::NUMERIC, 0) <= 0
      OR coalesce((item_record->>'accepted_quantity')::NUMERIC, -1) < 0
      OR (item_record->>'accepted_quantity')::NUMERIC
        > (item_record->>'received_quantity')::NUMERIC
      OR length(coalesce(item_record->>'condition_notes', '')) > 500
    THEN
      RAISE EXCEPTION 'Kuantitas diterima atau kondisi item tidak valid.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO order_item
    FROM public.purchase_order_items
    WHERE id = (item_record->>'purchase_order_item_id')::UUID
      AND organization_id = p_organization_id
      AND purchase_order_id = p_purchase_order_id
      AND deleted_at IS NULL;
    IF NOT FOUND OR (item_record->>'accepted_quantity')::NUMERIC
      > order_item.quantity - order_item.received_quantity
    THEN
      RAISE EXCEPTION 'Kuantitas diterima tidak boleh melampaui sisa item pada PO.'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  document_number := public.generate_document_number('grn', p_organization_id, 'GRN');
  INSERT INTO public.goods_receipts (
    organization_id, project_id, purchase_order_id, vendor_id, grn_number,
    delivery_note_number, received_date, receiver_name, driver_name, vehicle_number, notes
  ) VALUES (
    p_organization_id, order_record.project_id, order_record.id, order_record.vendor_id,
    document_number, trim(p_delivery_note_number), p_received_date, trim(p_receiver_name),
    trim(coalesce(p_driver_name, '')), trim(coalesce(p_vehicle_number, '')), coalesce(p_notes, '')
  ) RETURNING id INTO v_goods_receipt_id;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO order_item
    FROM public.purchase_order_items
    WHERE id = (item_record->>'purchase_order_item_id')::UUID
      AND organization_id = p_organization_id
      AND purchase_order_id = p_purchase_order_id
      AND deleted_at IS NULL;

    INSERT INTO public.goods_receipt_items (
      organization_id, goods_receipt_id, purchase_order_item_id, item_name, unit,
      po_quantity, received_quantity, accepted_quantity, condition_notes
    ) VALUES (
      p_organization_id, v_goods_receipt_id, order_item.id, order_item.item_name, order_item.unit,
      order_item.quantity, (item_record->>'received_quantity')::NUMERIC,
      (item_record->>'accepted_quantity')::NUMERIC,
      coalesce(item_record->>'condition_notes', '')
    );

    UPDATE public.purchase_order_items
    SET received_quantity = received_quantity + (item_record->>'accepted_quantity')::NUMERIC
    WHERE id = order_item.id AND organization_id = p_organization_id;
  END LOOP;

  SELECT coalesce(sum(received_quantity), 0), coalesce(sum(accepted_quantity), 0)
  INTO total_delivered, total_accepted
  FROM public.goods_receipt_items
  WHERE organization_id = p_organization_id
    AND goods_receipt_items.goods_receipt_id = v_goods_receipt_id
    AND deleted_at IS NULL;

  UPDATE public.goods_receipts
  SET status = CASE
    WHEN total_accepted = 0 THEN 'rejected'
    WHEN total_accepted < total_delivered THEN 'partial'
    ELSE 'full'
  END
  WHERE id = v_goods_receipt_id AND organization_id = p_organization_id;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE organization_id = p_organization_id
      AND purchase_order_id = p_purchase_order_id
      AND deleted_at IS NULL
      AND received_quantity < quantity
  ) INTO completed_order;

  UPDATE public.purchase_orders
  SET status = CASE WHEN completed_order THEN 'received' ELSE 'ordered' END
  WHERE id = p_purchase_order_id AND organization_id = p_organization_id;

  RETURN v_goods_receipt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_goods_receipt(
  UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_goods_receipt(
  UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
