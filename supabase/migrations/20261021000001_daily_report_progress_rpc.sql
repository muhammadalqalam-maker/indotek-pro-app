-- T-2.11: save a report's progress rows atomically under the existing RLS policies.

CREATE OR REPLACE FUNCTION public.save_daily_report_progress(
  p_organization_id UUID,
  p_project_id UUID,
  p_report_id UUID,
  p_boq_version_id UUID,
  p_entries JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  report_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'project_manager'::user_role_type, 'site_manager'::user_role_type]
  ) THEN
    RAISE EXCEPTION 'The user cannot manage progress entries for this organization'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
    RAISE EXCEPTION 'Progress entries must be a JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF jsonb_array_length(p_entries) > 500 THEN
    RAISE EXCEPTION 'A report cannot contain more than 500 progress entries'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_organization_id::TEXT || ':' || p_project_id::TEXT || ':' || p_report_id::TEXT,
    0
  ));

  SELECT report.status
  INTO report_status
  FROM public.daily_reports AS report
  WHERE report.organization_id = p_organization_id
    AND report.project_id = p_project_id
    AND report.id = p_report_id
    AND report.deleted_at IS NULL
  FOR UPDATE;

  IF report_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Daily report is not editable'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1
  FROM public.boq_versions AS version
  WHERE version.organization_id = p_organization_id
    AND version.project_id = p_project_id
    AND version.id = p_boq_version_id
    AND version.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The BOQ version is not available for this project'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_entries) AS entry(
      boq_item_id UUID,
      installed_volume NUMERIC,
      remarks TEXT
    )
    WHERE entry.boq_item_id IS NULL
      OR entry.installed_volume IS NULL
      OR entry.installed_volume <= 0
      OR entry.installed_volume <> round(entry.installed_volume, 4)
      OR length(COALESCE(entry.remarks, '')) > 1000
  ) THEN
    RAISE EXCEPTION 'Each progress entry must contain a positive volume with at most four decimals'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT entry.boq_item_id
    FROM jsonb_to_recordset(p_entries) AS entry(
      boq_item_id UUID,
      installed_volume NUMERIC,
      remarks TEXT
    )
    GROUP BY entry.boq_item_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'A BOQ item can only appear once in a report'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_entries) AS entry(
      boq_item_id UUID,
      installed_volume NUMERIC,
      remarks TEXT
    )
    LEFT JOIN public.boq_items AS item
      ON item.organization_id = p_organization_id
     AND item.project_id = p_project_id
     AND item.boq_version_id = p_boq_version_id
     AND item.id = entry.boq_item_id
     AND item.item_type = 'work_item'
     AND item.deleted_at IS NULL
    WHERE item.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Progress entries must reference active work items in the selected BOQ version'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  UPDATE public.progress_entries AS current_entry
  SET deleted_at = now()
  WHERE current_entry.organization_id = p_organization_id
    AND current_entry.project_id = p_project_id
    AND current_entry.report_id = p_report_id
    AND current_entry.deleted_at IS NULL
    AND (
      current_entry.boq_version_id <> p_boq_version_id
      OR NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_entries) AS entry(
          boq_item_id UUID,
          installed_volume NUMERIC,
          remarks TEXT
        )
        WHERE entry.boq_item_id = current_entry.boq_item_id
      )
    );

  INSERT INTO public.progress_entries (
    organization_id,
    project_id,
    report_id,
    boq_version_id,
    boq_item_id,
    created_by,
    installed_volume,
    remarks
  )
  SELECT
    p_organization_id,
    p_project_id,
    p_report_id,
    p_boq_version_id,
    entry.boq_item_id,
    auth.uid(),
    entry.installed_volume,
    COALESCE(entry.remarks, '')
  FROM jsonb_to_recordset(p_entries) AS entry(
    boq_item_id UUID,
    installed_volume NUMERIC,
    remarks TEXT
  )
  ORDER BY entry.boq_item_id
  ON CONFLICT (organization_id, project_id, report_id, boq_item_id)
  DO UPDATE SET
    boq_version_id = EXCLUDED.boq_version_id,
    installed_volume = EXCLUDED.installed_volume,
    remarks = EXCLUDED.remarks,
    deleted_at = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.save_daily_report_progress(UUID, UUID, UUID, UUID, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_daily_report_progress(UUID, UUID, UUID, UUID, JSONB)
  TO authenticated;
