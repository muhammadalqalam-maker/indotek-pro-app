CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  item_code TEXT NOT NULL CHECK (length(trim(item_code)) BETWEEN 1 AND 64),
  item_name TEXT NOT NULL CHECK (length(trim(item_name)) BETWEEN 2 AND 180),
  category TEXT NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 24),
  location_name TEXT NOT NULL CHECK (length(trim(location_name)) BETWEEN 1 AND 180),
  current_stock NUMERIC(18, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock NUMERIC(18, 3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  last_movement_date DATE,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX inventory_items_active_identity_idx
  ON public.inventory_items (organization_id, project_id, item_code, location_name)
  WHERE deleted_at IS NULL;
CREATE INDEX inventory_items_project_name_idx
  ON public.inventory_items (organization_id, project_id, item_name)
  WHERE deleted_at IS NULL;

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  movement_number TEXT NOT NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('in', 'out', 'transfer', 'adjustment')
  ),
  quantity NUMERIC(18, 3) NOT NULL CHECK (quantity > 0),
  source_inventory_item_id UUID,
  destination_inventory_item_id UUID,
  source_project_id UUID,
  destination_project_id UUID,
  goods_receipt_item_id UUID,
  reference_doc TEXT NOT NULL DEFAULT '' CHECK (length(reference_doc) <= 120),
  recipient_or_supplier TEXT NOT NULL DEFAULT '' CHECK (length(recipient_or_supplier) <= 120),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, source_inventory_item_id)
    REFERENCES public.inventory_items (organization_id, id),
  FOREIGN KEY (organization_id, destination_inventory_item_id)
    REFERENCES public.inventory_items (organization_id, id),
  FOREIGN KEY (organization_id, source_project_id)
    REFERENCES public.projects (organization_id, id),
  FOREIGN KEY (organization_id, destination_project_id)
    REFERENCES public.projects (organization_id, id),
  FOREIGN KEY (organization_id, goods_receipt_item_id)
    REFERENCES public.goods_receipt_items (organization_id, id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, movement_number),
  UNIQUE (organization_id, goods_receipt_item_id),
  CHECK (
    (movement_type = 'in' AND source_inventory_item_id IS NULL
      AND destination_inventory_item_id IS NOT NULL)
    OR (movement_type = 'out' AND source_inventory_item_id IS NOT NULL
      AND destination_inventory_item_id IS NULL)
    OR (movement_type = 'transfer' AND source_inventory_item_id IS NOT NULL
      AND destination_inventory_item_id IS NOT NULL
      AND source_inventory_item_id <> destination_inventory_item_id)
    OR (movement_type = 'adjustment' AND (
      (source_inventory_item_id IS NULL AND destination_inventory_item_id IS NOT NULL)
      OR (source_inventory_item_id IS NOT NULL AND destination_inventory_item_id IS NULL)
    ))
  ),
  CHECK (goods_receipt_item_id IS NULL OR (
    movement_type = 'in'
    AND source_inventory_item_id IS NULL
    AND destination_inventory_item_id IS NOT NULL
  ))
);

CREATE INDEX stock_movements_org_date_idx
  ON public.stock_movements (organization_id, movement_date DESC, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX stock_movements_source_project_idx
  ON public.stock_movements (organization_id, source_project_id, movement_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX stock_movements_destination_project_idx
  ON public.stock_movements (organization_id, destination_project_id, movement_date DESC)
  WHERE deleted_at IS NULL;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['inventory_items', 'stock_movements']
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
