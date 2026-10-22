ALTER TABLE public.goods_receipts
  ADD COLUMN receiving_location TEXT
  CHECK (
    receiving_location IS NULL
    OR length(trim(receiving_location)) BETWEEN 1 AND 180
  );

CREATE OR REPLACE FUNCTION public.set_goods_receipt_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  location_name TEXT;
BEGIN
  location_name := NULLIF(
    trim(current_setting('indotek.receiving_location', true)),
    ''
  );
  IF location_name IS NULL OR length(location_name) > 180 THEN
    RAISE EXCEPTION 'Lokasi tujuan wajib diisi untuk penerimaan barang.'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.receiving_location := location_name;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goods_receipts_receiving_location
  BEFORE INSERT ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_goods_receipt_location();

CREATE OR REPLACE FUNCTION public.record_goods_receipt_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  receipt_record public.goods_receipts%ROWTYPE;
  order_item_code TEXT;
  inventory_item_id UUID;
  movement_number TEXT;
BEGIN
  IF NEW.accepted_quantity = 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO receipt_record
  FROM public.goods_receipts
  WHERE id = NEW.goods_receipt_id
    AND organization_id = NEW.organization_id
    AND deleted_at IS NULL;
  IF NOT FOUND OR receipt_record.receiving_location IS NULL THEN
    RAISE EXCEPTION 'Lokasi tujuan GRN tidak tersedia untuk pencatatan stok.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT NULLIF(trim(item_code), '')
  INTO order_item_code
  FROM public.purchase_order_items
  WHERE id = NEW.purchase_order_item_id
    AND organization_id = NEW.organization_id;
  order_item_code := coalesce(order_item_code, 'POI-' || left(NEW.purchase_order_item_id::TEXT, 8));

  INSERT INTO public.inventory_items (
    organization_id, project_id, item_code, item_name, category, unit,
    location_name, current_stock, last_movement_date
  ) VALUES (
    NEW.organization_id, receipt_record.project_id, order_item_code,
    NEW.item_name, 'Bahan', NEW.unit, receipt_record.receiving_location,
    NEW.accepted_quantity, receipt_record.received_date
  )
  ON CONFLICT (organization_id, project_id, item_code, location_name)
    WHERE deleted_at IS NULL
  DO UPDATE SET
    current_stock = public.inventory_items.current_stock + EXCLUDED.current_stock,
    last_movement_date = EXCLUDED.last_movement_date
  WHERE public.inventory_items.item_name = EXCLUDED.item_name
    AND public.inventory_items.unit = EXCLUDED.unit
  RETURNING id INTO inventory_item_id;

  IF inventory_item_id IS NULL THEN
    RAISE EXCEPTION 'Kode material sudah terdaftar dengan nama atau satuan berbeda.'
      USING ERRCODE = 'check_violation';
  END IF;

  movement_number := public.generate_document_number(
    'stock_movement', NEW.organization_id, 'MUT'
  );
  INSERT INTO public.stock_movements (
    organization_id, movement_number, movement_date, movement_type, quantity,
    destination_inventory_item_id, destination_project_id, goods_receipt_item_id,
    reference_doc, notes
  ) VALUES (
    NEW.organization_id, movement_number, receipt_record.received_date, 'in',
    NEW.accepted_quantity, inventory_item_id, receipt_record.project_id, NEW.id,
    receipt_record.grn_number, 'Penerimaan stok otomatis dari GRN.'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goods_receipt_items_inventory
  AFTER INSERT ON public.goods_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.record_goods_receipt_inventory();

CREATE OR REPLACE FUNCTION public.create_goods_receipt_at_location(
  p_organization_id UUID,
  p_purchase_order_id UUID,
  p_delivery_note_number TEXT,
  p_received_date DATE,
  p_receiver_name TEXT,
  p_driver_name TEXT,
  p_vehicle_number TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_receiving_location TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF length(trim(coalesce(p_receiving_location, ''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Lokasi tujuan wajib diisi (maksimal 180 karakter).'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config(
    'indotek.receiving_location',
    trim(p_receiving_location),
    true
  );

  RETURN public.create_goods_receipt(
    p_organization_id,
    p_purchase_order_id,
    p_delivery_note_number,
    p_received_date,
    p_receiver_name,
    p_driver_name,
    p_vehicle_number,
    p_notes,
    p_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_goods_receipt(
  UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_goods_receipt(
  UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB
) TO postgres;
REVOKE ALL ON FUNCTION public.create_goods_receipt_at_location(
  UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_goods_receipt_at_location(
  UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT
) TO authenticated;
