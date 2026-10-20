-- T-2.11: keep daily progress within the volume of its BOQ work item.

CREATE OR REPLACE FUNCTION public.enforce_progress_entry_volume_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_volume NUMERIC(18, 4);
  existing_volume NUMERIC(18, 4);
  report_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Progress entries must be archived instead of deleted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Progress entries must be created as active records'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.report_id IS DISTINCT FROM OLD.report_id
    OR NEW.boq_item_id IS DISTINCT FROM OLD.boq_item_id
    OR (
      NEW.boq_version_id IS DISTINCT FROM OLD.boq_version_id
      AND OLD.deleted_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Progress entry identity cannot be changed while active'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.organization_id::TEXT || ':' || NEW.project_id::TEXT || ':' || NEW.report_id::TEXT,
    0
  ));

  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.organization_id::TEXT || ':' || NEW.project_id::TEXT || ':' ||
    NEW.boq_version_id::TEXT || ':' || NEW.boq_item_id::TEXT,
    0
  ));

  SELECT report.status
  INTO report_status
  FROM public.daily_reports AS report
  WHERE report.organization_id = NEW.organization_id
    AND report.project_id = NEW.project_id
    AND report.id = NEW.report_id
    AND report.deleted_at IS NULL
  FOR UPDATE;

  IF report_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Daily report is not editable'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT item.volume
  INTO target_volume
  FROM public.boq_items AS item
  WHERE item.organization_id = NEW.organization_id
    AND item.project_id = NEW.project_id
    AND item.boq_version_id = NEW.boq_version_id
    AND item.id = NEW.boq_item_id
    AND item.item_type = 'work_item'
    AND item.deleted_at IS NULL;

  IF target_volume IS NULL THEN
    RAISE EXCEPTION 'Progress entries must reference an active BOQ work item'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.progress_entries AS other_entry
    WHERE other_entry.organization_id = NEW.organization_id
      AND other_entry.project_id = NEW.project_id
      AND other_entry.report_id = NEW.report_id
      AND other_entry.deleted_at IS NULL
      AND other_entry.id IS DISTINCT FROM NEW.id
      AND other_entry.boq_version_id IS DISTINCT FROM NEW.boq_version_id
  ) THEN
    RAISE EXCEPTION 'All progress entries in a report must use the same BOQ version'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(SUM(entry.installed_volume), 0)
  INTO existing_volume
  FROM public.progress_entries AS entry
  JOIN public.daily_reports AS report
    ON report.organization_id = entry.organization_id
   AND report.project_id = entry.project_id
   AND report.id = entry.report_id
  WHERE entry.organization_id = NEW.organization_id
    AND entry.project_id = NEW.project_id
    AND entry.boq_version_id = NEW.boq_version_id
    AND entry.boq_item_id = NEW.boq_item_id
    AND entry.deleted_at IS NULL
    AND entry.id IS DISTINCT FROM NEW.id
    AND report.deleted_at IS NULL
    AND report.status <> 'rejected';

  IF existing_volume + NEW.installed_volume > target_volume THEN
    RAISE EXCEPTION 'Progress volume exceeds BOQ item volume'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_boq_item_volume_against_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  installed_volume NUMERIC(18, 4);
BEGIN
  IF OLD.item_type <> 'work_item' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.organization_id::TEXT || ':' || NEW.project_id::TEXT || ':' ||
    NEW.boq_version_id::TEXT || ':' || NEW.id::TEXT,
    0
  ));

  SELECT COALESCE(SUM(entry.installed_volume), 0)
  INTO installed_volume
  FROM public.progress_entries AS entry
  JOIN public.daily_reports AS report
    ON report.organization_id = entry.organization_id
   AND report.project_id = entry.project_id
   AND report.id = entry.report_id
  WHERE entry.organization_id = NEW.organization_id
    AND entry.project_id = NEW.project_id
    AND entry.boq_version_id = NEW.boq_version_id
    AND entry.boq_item_id = NEW.id
    AND entry.deleted_at IS NULL
    AND report.deleted_at IS NULL
    AND report.status <> 'rejected';

  IF NEW.deleted_at IS NOT NULL AND installed_volume > 0 THEN
    RAISE EXCEPTION 'BOQ items with recorded progress cannot be archived'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.deleted_at IS NULL
    AND (NEW.volume IS NULL OR installed_volume > NEW.volume) THEN
    RAISE EXCEPTION 'BOQ volume cannot be lower than recorded progress'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_progress_entries_validate_volume_limit
  ON public.progress_entries;
CREATE TRIGGER trg_progress_entries_validate_volume_limit
BEFORE INSERT OR DELETE OR UPDATE OF
  organization_id, project_id, report_id, boq_version_id, boq_item_id,
  installed_volume, deleted_at
ON public.progress_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_progress_entry_volume_limit();

DROP TRIGGER IF EXISTS trg_boq_items_guard_progress_volume
  ON public.boq_items;
CREATE TRIGGER trg_boq_items_guard_progress_volume
BEFORE UPDATE OF volume, deleted_at ON public.boq_items
FOR EACH ROW EXECUTE FUNCTION public.guard_boq_item_volume_against_progress();
