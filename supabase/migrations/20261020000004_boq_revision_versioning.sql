-- T-2.6: create revision snapshots and protect non-draft BOQ versions.

CREATE OR REPLACE FUNCTION public.guard_boq_version_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft'
      OR NEW.approved_by IS NOT NULL
      OR NEW.approved_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'BOQ revisions must be created as drafts'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' THEN
      RAISE EXCEPTION 'Approved BOQ revisions cannot be deleted'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN OLD;
  END IF;

  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'Approved BOQ revisions are immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.revision_number IS DISTINCT FROM OLD.revision_number
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  THEN
    RAISE EXCEPTION 'BOQ revision identity and approval state are managed by the workflow'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_boq_item_version_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_version_id UUID;
  target_organization_id UUID;
  target_project_id UUID;
  target_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_version_id := OLD.boq_version_id;
    target_organization_id := OLD.organization_id;
    target_project_id := OLD.project_id;
  ELSE
    target_version_id := NEW.boq_version_id;
    target_organization_id := NEW.organization_id;
    target_project_id := NEW.project_id;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.project_id IS DISTINCT FROM OLD.project_id
      OR NEW.boq_version_id IS DISTINCT FROM OLD.boq_version_id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    )
  THEN
    RAISE EXCEPTION 'BOQ item identity cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT status
  INTO target_status
  FROM public.boq_versions
  WHERE id = target_version_id
    AND organization_id = target_organization_id
    AND project_id = target_project_id
  FOR UPDATE;

  IF target_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Only draft BOQ revisions can be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boq_versions_guard_state ON public.boq_versions;
CREATE TRIGGER trg_boq_versions_guard_state
BEFORE INSERT OR UPDATE OR DELETE ON public.boq_versions
FOR EACH ROW EXECUTE FUNCTION public.guard_boq_version_state();

DROP TRIGGER IF EXISTS trg_boq_items_guard_version_state ON public.boq_items;
CREATE TRIGGER trg_boq_items_guard_version_state
BEFORE INSERT OR UPDATE OR DELETE ON public.boq_items
FOR EACH ROW EXECUTE FUNCTION public.guard_boq_item_version_state();

CREATE OR REPLACE FUNCTION public.create_boq_revision(
  p_organization_id UUID,
  p_project_id UUID,
  p_source_version_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  source_version public.boq_versions%ROWTYPE;
  new_version_id UUID;
  next_revision_number INTEGER;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.is_org_member(p_organization_id)
    OR NOT public.has_role(
      p_organization_id,
      ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'estimator'::user_role_type]
    )
  THEN
    RAISE EXCEPTION 'You are not allowed to create a BOQ revision'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM id
  FROM public.projects
  WHERE id = p_project_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected project is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT *
  INTO source_version
  FROM public.boq_versions
  WHERE id = p_source_version_id
    AND organization_id = p_organization_id
    AND project_id = p_project_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The source BOQ revision is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

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
    status,
    overhead_percent,
    profit_percent,
    ppn_percent
  ) VALUES (
    p_organization_id,
    p_project_id,
    next_revision_number,
    source_version.title,
    'draft',
    source_version.overhead_percent,
    source_version.profit_percent,
    source_version.ppn_percent
  )
  RETURNING id INTO new_version_id;

  INSERT INTO public.boq_items (
    organization_id,
    project_id,
    boq_version_id,
    item_type,
    item_code,
    description,
    sort_order
  )
  SELECT
    p_organization_id,
    p_project_id,
    new_version_id,
    'division',
    item.item_code,
    item.description,
    item.sort_order
  FROM public.boq_items AS item
  WHERE item.organization_id = p_organization_id
    AND item.project_id = p_project_id
    AND item.boq_version_id = p_source_version_id
    AND item.item_type = 'division'
    AND item.deleted_at IS NULL
  ORDER BY item.sort_order;

  INSERT INTO public.boq_items (
    organization_id,
    project_id,
    boq_version_id,
    parent_id,
    item_type,
    item_code,
    description,
    unit_id,
    ahsp_id,
    volume,
    unit_price,
    sort_order
  )
  SELECT
    p_organization_id,
    p_project_id,
    new_version_id,
    new_division.id,
    'work_item',
    item.item_code,
    item.description,
    item.unit_id,
    item.ahsp_id,
    item.volume,
    item.unit_price,
    item.sort_order
  FROM public.boq_items AS item
  JOIN public.boq_items AS source_division
    ON source_division.id = item.parent_id
    AND source_division.organization_id = item.organization_id
    AND source_division.project_id = item.project_id
    AND source_division.boq_version_id = item.boq_version_id
    AND source_division.item_type = 'division'
    AND source_division.deleted_at IS NULL
  JOIN public.boq_items AS new_division
    ON new_division.organization_id = p_organization_id
    AND new_division.project_id = p_project_id
    AND new_division.boq_version_id = new_version_id
    AND new_division.item_type = 'division'
    AND lower(new_division.item_code) = lower(source_division.item_code)
    AND new_division.deleted_at IS NULL
  WHERE item.organization_id = p_organization_id
    AND item.project_id = p_project_id
    AND item.boq_version_id = p_source_version_id
    AND item.item_type = 'work_item'
    AND item.deleted_at IS NULL
  ORDER BY source_division.sort_order, item.sort_order;

  RETURN new_version_id;
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

  PERFORM id
  FROM public.projects
  WHERE id = p_project_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
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

REVOKE ALL ON FUNCTION public.guard_boq_version_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_boq_item_version_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_boq_revision(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_boq_revision(UUID, UUID, UUID) TO authenticated;
