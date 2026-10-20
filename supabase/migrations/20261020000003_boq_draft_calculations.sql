-- T-2.5: persist BOQ drafts atomically and calculate monetary totals in Postgres.

CREATE OR REPLACE FUNCTION public.calculate_boq_version_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  direct_cost NUMERIC(18, 2);
BEGIN
  SELECT COALESCE(SUM(line_total), 0)
  INTO direct_cost
  FROM public.boq_items
  WHERE organization_id = NEW.organization_id
    AND project_id = NEW.project_id
    AND boq_version_id = NEW.id
    AND item_type = 'work_item'
    AND deleted_at IS NULL;

  NEW.subtotal_direct_cost := direct_cost;
  NEW.overhead_amount := round(direct_cost * NEW.overhead_percent / 100, 2);
  NEW.profit_amount := round(direct_cost * NEW.profit_percent / 100, 2);
  NEW.ppn_amount := round(
    (direct_cost + NEW.overhead_amount + NEW.profit_amount) * NEW.ppn_percent / 100,
    2
  );
  NEW.grand_total := direct_cost + NEW.overhead_amount + NEW.profit_amount + NEW.ppn_amount;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_boq_version_totals(target_version_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_organization_id UUID;
  target_project_id UUID;
BEGIN
  SELECT organization_id, project_id
  INTO target_organization_id, target_project_id
  FROM public.boq_versions
  WHERE id = target_version_id;

  IF target_organization_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.boq_versions
  SET subtotal_direct_cost = boq_versions.subtotal_direct_cost
  WHERE id = target_version_id
    AND organization_id = target_organization_id
    AND project_id = target_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_boq_totals_from_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_boq_version_totals(OLD.boq_version_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_boq_version_totals(NEW.boq_version_id);
  IF TG_OP = 'UPDATE' AND OLD.boq_version_id <> NEW.boq_version_id THEN
    PERFORM public.refresh_boq_version_totals(OLD.boq_version_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_boq_draft(
  p_organization_id UUID,
  p_project_id UUID,
  p_boq_version_id UUID,
  p_title TEXT,
  p_overhead_percent NUMERIC,
  p_profit_percent NUMERIC,
  p_ppn_percent NUMERIC,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  saved_version_id UUID;
  next_revision_number INTEGER;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.is_org_member(p_organization_id)
    OR NOT public.has_role(
      p_organization_id,
      ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'estimator'::user_role_type]
    )
  THEN
    RAISE EXCEPTION 'You are not allowed to edit this organization BOQ'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND organization_id = p_organization_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The selected project is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 2 AND 180
    OR p_overhead_percent IS NULL OR p_overhead_percent NOT BETWEEN 0 AND 100
    OR p_profit_percent IS NULL OR p_profit_percent NOT BETWEEN 0 AND 100
    OR p_ppn_percent IS NULL OR p_ppn_percent NOT BETWEEN 0 AND 100
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_items) > 500
  THEN
    RAISE EXCEPTION 'The BOQ draft contains invalid values'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_boq_version_id IS NULL THEN
    SELECT COALESCE(MAX(revision_number), -1) + 1
    INTO next_revision_number
    FROM public.boq_versions
    WHERE organization_id = p_organization_id
      AND project_id = p_project_id;

    INSERT INTO public.boq_versions (
      organization_id,
      project_id,
      revision_number,
      title,
      overhead_percent,
      profit_percent,
      ppn_percent
    ) VALUES (
      p_organization_id,
      p_project_id,
      next_revision_number,
      trim(p_title),
      p_overhead_percent,
      p_profit_percent,
      p_ppn_percent
    )
    RETURNING id INTO saved_version_id;
  ELSE
    SELECT id
    INTO saved_version_id
    FROM public.boq_versions
    WHERE id = p_boq_version_id
      AND organization_id = p_organization_id
      AND project_id = p_project_id
      AND status = 'draft'
      AND deleted_at IS NULL
    FOR UPDATE;

    IF saved_version_id IS NULL THEN
      RAISE EXCEPTION 'Only an active draft BOQ can be edited'
        USING ERRCODE = 'check_violation';
    END IF;

    UPDATE public.boq_versions
    SET title = trim(p_title),
        overhead_percent = p_overhead_percent,
        profit_percent = p_profit_percent,
        ppn_percent = p_ppn_percent
    WHERE id = saved_version_id;

    DELETE FROM public.boq_items
    WHERE organization_id = p_organization_id
      AND project_id = p_project_id
      AND boq_version_id = saved_version_id;
  END IF;

  INSERT INTO public.boq_items (
    id, organization_id, project_id, boq_version_id, item_type,
    item_code, description, sort_order
  )
  SELECT
    item.id, p_organization_id, p_project_id, saved_version_id, item.item_type,
    trim(item.item_code), trim(item.description), item.sort_order
  FROM jsonb_to_recordset(p_items) AS item(
    id UUID,
    item_type TEXT,
    item_code TEXT,
    description TEXT,
    sort_order INTEGER
  )
  WHERE item.item_type = 'division'
  ORDER BY item.sort_order;

  INSERT INTO public.boq_items (
    id, organization_id, project_id, boq_version_id, parent_id, item_type,
    item_code, description, unit_id, ahsp_id, volume, unit_price, sort_order
  )
  SELECT
    item.id, p_organization_id, p_project_id, saved_version_id, item.parent_id,
    item.item_type, trim(item.item_code), trim(item.description), item.unit_id,
    item.ahsp_id, item.volume, item.unit_price, item.sort_order
  FROM jsonb_to_recordset(p_items) AS item(
    id UUID,
    parent_id UUID,
    item_type TEXT,
    item_code TEXT,
    description TEXT,
    unit_id UUID,
    ahsp_id UUID,
    volume NUMERIC(18, 4),
    unit_price NUMERIC(18, 2),
    sort_order INTEGER
  )
  WHERE item.item_type = 'work_item'
  ORDER BY item.sort_order;

  UPDATE public.boq_versions
  SET updated_at = timezone('utc'::text, now())
  WHERE id = saved_version_id;

  RETURN saved_version_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_boq_versions_calculate_totals ON public.boq_versions;
CREATE TRIGGER trg_boq_versions_calculate_totals
BEFORE INSERT OR UPDATE OF
  overhead_percent, profit_percent, ppn_percent,
  subtotal_direct_cost, overhead_amount, profit_amount, ppn_amount, grand_total
ON public.boq_versions
FOR EACH ROW EXECUTE FUNCTION public.calculate_boq_version_totals();

DROP TRIGGER IF EXISTS trg_boq_items_refresh_version_totals ON public.boq_items;
CREATE TRIGGER trg_boq_items_refresh_version_totals
AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
FOR EACH ROW EXECUTE FUNCTION public.refresh_boq_totals_from_item();

REVOKE ALL ON FUNCTION public.refresh_boq_version_totals(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_boq_draft(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_boq_draft(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, JSONB) TO authenticated;
