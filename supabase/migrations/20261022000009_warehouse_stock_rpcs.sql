CREATE OR REPLACE FUNCTION public.register_inventory_item(
  p_organization_id UUID,
  p_project_id UUID,
  p_item_code TEXT,
  p_item_name TEXT,
  p_category TEXT,
  p_unit TEXT,
  p_location_name TEXT,
  p_minimum_stock NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  inventory_item_id UUID;
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
    RAISE EXCEPTION 'Anda tidak berhak mendaftarkan item gudang.'
      USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL OR p_project_id IS NULL
    OR length(trim(coalesce(p_item_code, ''))) NOT BETWEEN 1 AND 64
    OR length(trim(coalesce(p_item_name, ''))) NOT BETWEEN 2 AND 180
    OR length(trim(coalesce(p_category, ''))) NOT BETWEEN 1 AND 80
    OR length(trim(coalesce(p_unit, ''))) NOT BETWEEN 1 AND 24
    OR length(trim(coalesce(p_location_name, ''))) NOT BETWEEN 1 AND 180
    OR p_minimum_stock IS NULL OR p_minimum_stock < 0
    OR p_minimum_stock > 999999999999999.999
    OR p_minimum_stock <> round(p_minimum_stock, 3)
  THEN
    RAISE EXCEPTION 'Data item gudang tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND organization_id = p_organization_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Proyek tidak tersedia pada organisasi ini.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.inventory_items (
    organization_id, project_id, item_code, item_name, category, unit,
    location_name, minimum_stock
  ) VALUES (
    p_organization_id, p_project_id, trim(p_item_code), trim(p_item_name),
    trim(p_category), trim(p_unit), trim(p_location_name), p_minimum_stock
  )
  RETURNING id INTO inventory_item_id;

  RETURN inventory_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_minimum(
  p_organization_id UUID,
  p_inventory_item_id UUID,
  p_minimum_stock NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
    RAISE EXCEPTION 'Anda tidak berhak mengubah batas minimum stok.'
      USING ERRCODE = '42501';
  END IF;

  IF p_minimum_stock IS NULL OR p_minimum_stock < 0
    OR p_minimum_stock > 999999999999999.999
    OR p_minimum_stock <> round(p_minimum_stock, 3)
  THEN
    RAISE EXCEPTION 'Batas minimum stok tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.inventory_items
  SET minimum_stock = p_minimum_stock
  WHERE id = p_inventory_item_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item gudang tidak ditemukan.'
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN p_inventory_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_organization_id UUID,
  p_movement_type TEXT,
  p_quantity NUMERIC,
  p_movement_date DATE,
  p_source_inventory_item_id UUID,
  p_destination_inventory_item_id UUID,
  p_reference_doc TEXT,
  p_recipient_or_supplier TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  source_item public.inventory_items%ROWTYPE;
  destination_item public.inventory_items%ROWTYPE;
  movement_id UUID;
  movement_number TEXT;
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
    RAISE EXCEPTION 'Anda tidak berhak mencatat mutasi stok.'
      USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL
    OR p_movement_type IS NULL
    OR p_movement_type NOT IN ('in', 'out', 'transfer', 'adjustment')
    OR p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000000
    OR p_quantity <> round(p_quantity, 3)
    OR p_movement_date IS NULL OR p_movement_date > CURRENT_DATE
    OR length(coalesce(p_reference_doc, '')) > 120
    OR length(coalesce(p_recipient_or_supplier, '')) > 120
    OR length(coalesce(p_notes, '')) > 1000
    OR (p_movement_type = 'in' AND (
      p_source_inventory_item_id IS NOT NULL OR p_destination_inventory_item_id IS NULL
    ))
    OR (p_movement_type = 'out' AND (
      p_source_inventory_item_id IS NULL OR p_destination_inventory_item_id IS NOT NULL
    ))
    OR (p_movement_type = 'transfer' AND (
      p_source_inventory_item_id IS NULL OR p_destination_inventory_item_id IS NULL
      OR p_source_inventory_item_id = p_destination_inventory_item_id
    ))
    OR (p_movement_type = 'adjustment' AND (
      (p_source_inventory_item_id IS NULL) = (p_destination_inventory_item_id IS NULL)
      OR length(trim(coalesce(p_notes, ''))) = 0
    ))
  THEN
    RAISE EXCEPTION 'Data mutasi stok tidak valid.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM item.id
  FROM public.inventory_items AS item
  WHERE item.organization_id = p_organization_id
    AND item.id IN (p_source_inventory_item_id, p_destination_inventory_item_id)
    AND item.deleted_at IS NULL
  ORDER BY item.id
  FOR UPDATE;

  IF p_source_inventory_item_id IS NOT NULL THEN
    SELECT * INTO source_item
    FROM public.inventory_items
    WHERE id = p_source_inventory_item_id
      AND organization_id = p_organization_id
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item sumber tidak ditemukan.'
        USING ERRCODE = 'no_data_found';
    END IF;
    IF source_item.current_stock < p_quantity THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk mutasi ini.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF p_destination_inventory_item_id IS NOT NULL THEN
    SELECT * INTO destination_item
    FROM public.inventory_items
    WHERE id = p_destination_inventory_item_id
      AND organization_id = p_organization_id
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item tujuan tidak ditemukan.'
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  IF p_source_inventory_item_id IS NOT NULL THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock - p_quantity,
        last_movement_date = greatest(
          coalesce(last_movement_date, p_movement_date),
          p_movement_date
        )
    WHERE id = p_source_inventory_item_id
      AND organization_id = p_organization_id;
  END IF;

  IF p_destination_inventory_item_id IS NOT NULL THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock + p_quantity,
        last_movement_date = greatest(
          coalesce(last_movement_date, p_movement_date),
          p_movement_date
        )
    WHERE id = p_destination_inventory_item_id
      AND organization_id = p_organization_id;
  END IF;

  movement_number := public.generate_document_number(
    'stock_movement', p_organization_id, 'MUT'
  );
  INSERT INTO public.stock_movements (
    organization_id, movement_number, movement_date, movement_type, quantity,
    source_inventory_item_id, destination_inventory_item_id,
    source_project_id, destination_project_id, reference_doc,
    recipient_or_supplier, notes
  ) VALUES (
    p_organization_id, movement_number, p_movement_date, p_movement_type, p_quantity,
    p_source_inventory_item_id, p_destination_inventory_item_id,
    source_item.project_id, destination_item.project_id, trim(coalesce(p_reference_doc, '')),
    trim(coalesce(p_recipient_or_supplier, '')), trim(coalesce(p_notes, ''))
  )
  RETURNING id INTO movement_id;

  RETURN movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_inventory_item(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_inventory_item(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC
) TO authenticated;

REVOKE ALL ON FUNCTION public.update_inventory_minimum(UUID, UUID, NUMERIC)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_inventory_minimum(UUID, UUID, NUMERIC)
  TO authenticated;

REVOKE ALL ON FUNCTION public.record_stock_movement(
  UUID, TEXT, NUMERIC, DATE, UUID, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(
  UUID, TEXT, NUMERIC, DATE, UUID, UUID, TEXT, TEXT, TEXT
) TO authenticated;
