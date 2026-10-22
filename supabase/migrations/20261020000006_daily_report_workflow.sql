-- T-2.9: persist report media metadata and enforce the simple report workflow.
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS site_manager_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS site_manager_signature_path TEXT,
  ADD COLUMN IF NOT EXISTS approver_signature_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_reports_photo_paths_array_check'
      AND conrelid = 'public.daily_reports'::regclass
  ) THEN
    ALTER TABLE public.daily_reports
      ADD CONSTRAINT daily_reports_photo_paths_array_check
      CHECK (jsonb_typeof(photo_paths) = 'array');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_daily_report_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  report_prefix TEXT;
  photo_record JSONB;
BEGIN
  report_prefix := NEW.organization_id::TEXT || '/' || NEW.project_id::TEXT
    || '/daily-reports/' || NEW.id::TEXT || '/';

  IF jsonb_typeof(NEW.photo_paths) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Report photos must be stored as an array'
      USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_array_length(NEW.photo_paths) > 10
    OR length(NEW.site_manager_name) > 120
    OR length(NEW.weather_conditions) > 300
    OR length(NEW.work_summary) > 5000
    OR length(NEW.obstacles) > 3000
    OR length(NEW.solutions) > 3000
  THEN
    RAISE EXCEPTION 'Daily report values exceed the allowed limits'
      USING ERRCODE = 'check_violation';
  END IF;

  FOR photo_record IN SELECT value FROM jsonb_array_elements(NEW.photo_paths)
  LOOP
    IF jsonb_typeof(photo_record) IS DISTINCT FROM 'object'
      OR left(coalesce(photo_record->>'path', ''), length(report_prefix || 'photos/'))
        <> report_prefix || 'photos/'
      OR length(coalesce(photo_record->>'caption', '')) > 160
    THEN
      RAISE EXCEPTION 'Report photo path does not belong to this report'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  IF NEW.site_manager_signature_path IS NOT NULL
    AND NEW.site_manager_signature_path <> report_prefix || 'signatures/site-manager.png'
  THEN
    RAISE EXCEPTION 'Site manager signature path does not belong to this report'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.approver_signature_path IS NOT NULL
    AND NEW.approver_signature_path <> report_prefix || 'signatures/approver.png'
  THEN
    RAISE EXCEPTION 'Approver signature path does not belong to this report'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft'
      OR NEW.submitted_at IS NOT NULL
      OR NEW.submitted_by IS NOT NULL
      OR NEW.approved_at IS NOT NULL
      OR NEW.approved_by IS NOT NULL
      OR NEW.approver_signature_path IS NOT NULL
      OR NEW.deleted_at IS NOT NULL
      OR NOT public.has_role(NEW.organization_id, ARRAY['site_manager'::public.user_role_type])
    THEN
      RAISE EXCEPTION 'Only a site manager can create a draft report'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    NEW.created_by := auth.uid();
    NEW.created_at := timezone('utc'::TEXT, now());
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Report identity cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
    IF OLD.created_by IS DISTINCT FROM auth.uid()
      OR NOT public.has_role(OLD.organization_id, ARRAY['site_manager'::public.user_role_type])
      OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
      OR NEW.approver_signature_path IS DISTINCT FROM OLD.approver_signature_path
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    THEN
      RAISE EXCEPTION 'Only the authoring site manager can edit a draft report'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    IF OLD.created_by IS DISTINCT FROM auth.uid()
      OR NOT public.has_role(OLD.organization_id, ARRAY['site_manager'::public.user_role_type])
      OR length(trim(NEW.site_manager_name)) < 2
      OR NEW.site_manager_signature_path IS NULL
      OR NEW.approver_signature_path IS NOT NULL
      OR NEW.approved_at IS NOT NULL
      OR NEW.approved_by IS NOT NULL
    THEN
      RAISE EXCEPTION 'A site manager name and signature are required to submit a report'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    NEW.submitted_at := now();
    NEW.submitted_by := auth.uid();
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' AND NEW.status = 'approved' THEN
    IF NOT public.has_role(
      OLD.organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type
      ]
    )
      OR NEW.approver_signature_path IS NULL
      OR ROW(
        NEW.report_date,
        NEW.site_manager_name,
        NEW.site_manager_signature_path,
        NEW.weather_conditions,
        NEW.work_summary,
        NEW.obstacles,
        NEW.solutions,
        NEW.photo_paths,
        NEW.submitted_at,
        NEW.submitted_by,
        NEW.created_at,
        NEW.deleted_at
      ) IS DISTINCT FROM ROW(
        OLD.report_date,
        OLD.site_manager_name,
        OLD.site_manager_signature_path,
        OLD.weather_conditions,
        OLD.work_summary,
        OLD.obstacles,
        OLD.solutions,
        OLD.photo_paths,
        OLD.submitted_at,
        OLD.submitted_by,
        OLD.created_at,
        OLD.deleted_at
      )
    THEN
      RAISE EXCEPTION 'Only an authorized approver can approve an unchanged submitted report'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid report status transition'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_reports_workflow ON public.daily_reports;
CREATE TRIGGER trg_daily_reports_workflow
BEFORE INSERT OR UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_report_workflow();

DROP POLICY IF EXISTS "Daily reports managed by field roles" ON public.daily_reports;
DROP POLICY IF EXISTS "Daily report drafts created by site managers" ON public.daily_reports;
CREATE POLICY "Daily report drafts created by site managers"
ON public.daily_reports FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND status = 'draft'
  AND public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
);

DROP POLICY IF EXISTS "Daily report updates by field roles" ON public.daily_reports;
CREATE POLICY "Daily report updates by field roles"
ON public.daily_reports FOR UPDATE
USING (
  public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type
    ]
  )
)
WITH CHECK (
  public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type
    ]
  )
);

DROP POLICY IF EXISTS "Daily report manpower entries managed by field roles" ON public.daily_report_manpower_entries;
DROP POLICY IF EXISTS "Daily report manpower drafts writable by author" ON public.daily_report_manpower_entries;
CREATE POLICY "Daily report manpower drafts writable by author"
ON public.daily_report_manpower_entries FOR INSERT
WITH CHECK (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_manpower_entries.organization_id
      AND report.project_id = daily_report_manpower_entries.project_id
      AND report.id = daily_report_manpower_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
);
DROP POLICY IF EXISTS "Daily report manpower drafts editable by author" ON public.daily_report_manpower_entries;
CREATE POLICY "Daily report manpower drafts editable by author"
ON public.daily_report_manpower_entries FOR UPDATE
USING (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_manpower_entries.organization_id
      AND report.project_id = daily_report_manpower_entries.project_id
      AND report.id = daily_report_manpower_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
)
WITH CHECK (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_manpower_entries.organization_id
      AND report.project_id = daily_report_manpower_entries.project_id
      AND report.id = daily_report_manpower_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Daily report equipment entries managed by field roles" ON public.daily_report_equipment_entries;
DROP POLICY IF EXISTS "Daily report equipment drafts writable by author" ON public.daily_report_equipment_entries;
CREATE POLICY "Daily report equipment drafts writable by author"
ON public.daily_report_equipment_entries FOR INSERT
WITH CHECK (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_equipment_entries.organization_id
      AND report.project_id = daily_report_equipment_entries.project_id
      AND report.id = daily_report_equipment_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
);
DROP POLICY IF EXISTS "Daily report equipment drafts editable by author" ON public.daily_report_equipment_entries;
CREATE POLICY "Daily report equipment drafts editable by author"
ON public.daily_report_equipment_entries FOR UPDATE
USING (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_equipment_entries.organization_id
      AND report.project_id = daily_report_equipment_entries.project_id
      AND report.id = daily_report_equipment_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
)
WITH CHECK (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_equipment_entries.organization_id
      AND report.project_id = daily_report_equipment_entries.project_id
      AND report.id = daily_report_equipment_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Daily report material entries managed by field roles" ON public.daily_report_material_entries;
DROP POLICY IF EXISTS "Daily report materials drafts writable by author" ON public.daily_report_material_entries;
CREATE POLICY "Daily report materials drafts writable by author"
ON public.daily_report_material_entries FOR INSERT
WITH CHECK (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_material_entries.organization_id
      AND report.project_id = daily_report_material_entries.project_id
      AND report.id = daily_report_material_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
);
DROP POLICY IF EXISTS "Daily report materials drafts editable by author" ON public.daily_report_material_entries;
CREATE POLICY "Daily report materials drafts editable by author"
ON public.daily_report_material_entries FOR UPDATE
USING (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_material_entries.organization_id
      AND report.project_id = daily_report_material_entries.project_id
      AND report.id = daily_report_material_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
)
WITH CHECK (
  public.has_role(organization_id, ARRAY['site_manager'::public.user_role_type])
  AND EXISTS (
    SELECT 1 FROM public.daily_reports report
    WHERE report.organization_id = daily_report_material_entries.organization_id
      AND report.project_id = daily_report_material_entries.project_id
      AND report.id = daily_report_material_entries.report_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL
  )
);

CREATE OR REPLACE FUNCTION public.save_daily_report_draft(
  p_organization_id UUID,
  p_project_id UUID,
  p_report_id UUID,
  p_values JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_saved_id UUID;
  v_manpower JSONB := coalesce(p_values->'manpower', '[]'::jsonb);
  v_equipment JSONB := coalesce(p_values->'equipment', '[]'::jsonb);
  v_materials JSONB := coalesce(p_values->'materials', '[]'::jsonb);
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(p_organization_id, ARRAY['site_manager'::public.user_role_type])
    OR NOT EXISTS (
      SELECT 1 FROM public.projects project
      WHERE project.organization_id = p_organization_id
        AND project.id = p_project_id
        AND project.deleted_at IS NULL
    )
    OR jsonb_typeof(p_values) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_manpower) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_equipment) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_materials) IS DISTINCT FROM 'array'
    OR jsonb_array_length(v_manpower) > 50
    OR jsonb_array_length(v_equipment) > 50
    OR jsonb_array_length(v_materials) > 50
  THEN
    RAISE EXCEPTION 'Invalid or unauthorized daily report draft'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.daily_reports (
    id, organization_id, project_id, created_by, report_date, site_manager_name,
    weather_conditions, work_summary, obstacles, solutions,
    site_manager_signature_path, photo_paths, status
  )
  VALUES (
    p_report_id, p_organization_id, p_project_id, auth.uid(),
    (p_values->>'report_date')::DATE,
    coalesce(p_values->>'site_manager_name', ''),
    coalesce(p_values->>'weather_conditions', ''),
    coalesce(p_values->>'work_summary', ''),
    coalesce(p_values->>'obstacles', ''),
    coalesce(p_values->>'solutions', ''),
    nullif(p_values->>'site_manager_signature_path', ''),
    coalesce(p_values->'photo_paths', '[]'::jsonb),
    'draft'
  )
  ON CONFLICT (id) DO UPDATE SET
    report_date = EXCLUDED.report_date,
    site_manager_name = EXCLUDED.site_manager_name,
    weather_conditions = EXCLUDED.weather_conditions,
    work_summary = EXCLUDED.work_summary,
    obstacles = EXCLUDED.obstacles,
    solutions = EXCLUDED.solutions,
    site_manager_signature_path = EXCLUDED.site_manager_signature_path,
    photo_paths = EXCLUDED.photo_paths
  WHERE public.daily_reports.organization_id = p_organization_id
    AND public.daily_reports.project_id = p_project_id
    AND public.daily_reports.created_by = auth.uid()
    AND public.daily_reports.status = 'draft'
    AND public.daily_reports.deleted_at IS NULL
    AND ROW(
      public.daily_reports.report_date,
      public.daily_reports.site_manager_name,
      public.daily_reports.weather_conditions,
      public.daily_reports.work_summary,
      public.daily_reports.obstacles,
      public.daily_reports.solutions,
      public.daily_reports.site_manager_signature_path,
      public.daily_reports.photo_paths
    ) IS DISTINCT FROM ROW(
      EXCLUDED.report_date,
      EXCLUDED.site_manager_name,
      EXCLUDED.weather_conditions,
      EXCLUDED.work_summary,
      EXCLUDED.obstacles,
      EXCLUDED.solutions,
      EXCLUDED.site_manager_signature_path,
      EXCLUDED.photo_paths
    )
  RETURNING id INTO v_saved_id;

  IF v_saved_id IS NULL THEN
    SELECT report.id INTO v_saved_id
    FROM public.daily_reports report
    WHERE report.id = p_report_id
      AND report.organization_id = p_organization_id
      AND report.project_id = p_project_id
      AND report.created_by = auth.uid()
      AND report.status = 'draft'
      AND report.deleted_at IS NULL;
    IF v_saved_id IS NULL THEN
      RAISE EXCEPTION 'Draft report does not exist or is no longer editable'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_manpower) AS item(id UUID)
    LEFT JOIN public.daily_report_manpower_entries existing
      ON existing.id = item.id
    WHERE existing.id IS NOT NULL AND (
      existing.organization_id <> p_organization_id
      OR existing.project_id <> p_project_id
      OR existing.report_id <> p_report_id
      OR existing.deleted_at IS NOT NULL
    )
  ) OR EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_equipment) AS item(id UUID)
    LEFT JOIN public.daily_report_equipment_entries existing
      ON existing.id = item.id
    WHERE existing.id IS NOT NULL AND (
      existing.organization_id <> p_organization_id
      OR existing.project_id <> p_project_id
      OR existing.report_id <> p_report_id
      OR existing.deleted_at IS NOT NULL
    )
  ) OR EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_materials) AS item(id UUID)
    LEFT JOIN public.daily_report_material_entries existing
      ON existing.id = item.id
    WHERE existing.id IS NOT NULL AND (
      existing.organization_id <> p_organization_id
      OR existing.project_id <> p_project_id
      OR existing.report_id <> p_report_id
      OR existing.deleted_at IS NOT NULL
    )
  ) THEN
    RAISE EXCEPTION 'A report detail identifier belongs to another report'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  UPDATE public.daily_report_manpower_entries entry
  SET deleted_at = now()
  WHERE entry.organization_id = p_organization_id
    AND entry.project_id = p_project_id
    AND entry.report_id = p_report_id
    AND entry.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_manpower) AS item(id UUID)
      WHERE item.id = entry.id
    );

  INSERT INTO public.daily_report_manpower_entries (
    id, organization_id, project_id, report_id, trade_type, headcount, work_hours, remarks
  )
  SELECT item.id, p_organization_id, p_project_id, p_report_id,
    item.trade_type, item.headcount, item.work_hours, coalesce(item.remarks, '')
  FROM jsonb_to_recordset(v_manpower) AS item(
    id UUID, trade_type TEXT, headcount INTEGER, work_hours NUMERIC, remarks TEXT
  )
  ON CONFLICT (id) DO UPDATE SET
    trade_type = EXCLUDED.trade_type,
    headcount = EXCLUDED.headcount,
    work_hours = EXCLUDED.work_hours,
    remarks = EXCLUDED.remarks
  WHERE public.daily_report_manpower_entries.organization_id = p_organization_id
    AND public.daily_report_manpower_entries.project_id = p_project_id
    AND public.daily_report_manpower_entries.report_id = p_report_id
    AND public.daily_report_manpower_entries.deleted_at IS NULL
    AND ROW(
      public.daily_report_manpower_entries.trade_type,
      public.daily_report_manpower_entries.headcount,
      public.daily_report_manpower_entries.work_hours,
      public.daily_report_manpower_entries.remarks
    ) IS DISTINCT FROM ROW(
      EXCLUDED.trade_type, EXCLUDED.headcount, EXCLUDED.work_hours, EXCLUDED.remarks
    );

  UPDATE public.daily_report_equipment_entries entry
  SET deleted_at = now()
  WHERE entry.organization_id = p_organization_id
    AND entry.project_id = p_project_id
    AND entry.report_id = p_report_id
    AND entry.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_equipment) AS item(id UUID)
      WHERE item.id = entry.id
    );

  INSERT INTO public.daily_report_equipment_entries (
    id, organization_id, project_id, report_id, equipment_name, quantity,
    active_hours, standby_hours, remarks
  )
  SELECT item.id, p_organization_id, p_project_id, p_report_id,
    item.equipment_name, item.quantity, item.active_hours, item.standby_hours,
    coalesce(item.remarks, '')
  FROM jsonb_to_recordset(v_equipment) AS item(
    id UUID, equipment_name TEXT, quantity NUMERIC, active_hours NUMERIC,
    standby_hours NUMERIC, remarks TEXT
  )
  ON CONFLICT (id) DO UPDATE SET
    equipment_name = EXCLUDED.equipment_name,
    quantity = EXCLUDED.quantity,
    active_hours = EXCLUDED.active_hours,
    standby_hours = EXCLUDED.standby_hours,
    remarks = EXCLUDED.remarks
  WHERE public.daily_report_equipment_entries.organization_id = p_organization_id
    AND public.daily_report_equipment_entries.project_id = p_project_id
    AND public.daily_report_equipment_entries.report_id = p_report_id
    AND public.daily_report_equipment_entries.deleted_at IS NULL
    AND ROW(
      public.daily_report_equipment_entries.equipment_name,
      public.daily_report_equipment_entries.quantity,
      public.daily_report_equipment_entries.active_hours,
      public.daily_report_equipment_entries.standby_hours,
      public.daily_report_equipment_entries.remarks
    ) IS DISTINCT FROM ROW(
      EXCLUDED.equipment_name, EXCLUDED.quantity, EXCLUDED.active_hours,
      EXCLUDED.standby_hours, EXCLUDED.remarks
    );

  UPDATE public.daily_report_material_entries entry
  SET deleted_at = now()
  WHERE entry.organization_id = p_organization_id
    AND entry.project_id = p_project_id
    AND entry.report_id = p_report_id
    AND entry.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_materials) AS item(id UUID)
      WHERE item.id = entry.id
    );

  INSERT INTO public.daily_report_material_entries (
    id, organization_id, project_id, report_id, material_name, quantity,
    unit, supplier_name, delivery_note_no
  )
  SELECT item.id, p_organization_id, p_project_id, p_report_id,
    item.material_name, item.quantity, item.unit,
    coalesce(item.supplier_name, ''), coalesce(item.delivery_note_no, '')
  FROM jsonb_to_recordset(v_materials) AS item(
    id UUID, material_name TEXT, quantity NUMERIC, unit TEXT,
    supplier_name TEXT, delivery_note_no TEXT
  )
  ON CONFLICT (id) DO UPDATE SET
    material_name = EXCLUDED.material_name,
    quantity = EXCLUDED.quantity,
    unit = EXCLUDED.unit,
    supplier_name = EXCLUDED.supplier_name,
    delivery_note_no = EXCLUDED.delivery_note_no
  WHERE public.daily_report_material_entries.organization_id = p_organization_id
    AND public.daily_report_material_entries.project_id = p_project_id
    AND public.daily_report_material_entries.report_id = p_report_id
    AND public.daily_report_material_entries.deleted_at IS NULL
    AND ROW(
      public.daily_report_material_entries.material_name,
      public.daily_report_material_entries.quantity,
      public.daily_report_material_entries.unit,
      public.daily_report_material_entries.supplier_name,
      public.daily_report_material_entries.delivery_note_no
    ) IS DISTINCT FROM ROW(
      EXCLUDED.material_name, EXCLUDED.quantity, EXCLUDED.unit,
      EXCLUDED.supplier_name, EXCLUDED.delivery_note_no
    );

  RETURN v_saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_daily_report(
  p_organization_id UUID,
  p_project_id UUID,
  p_report_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_submitted_id UUID;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(p_organization_id, ARRAY['site_manager'::public.user_role_type])
  THEN
    RAISE EXCEPTION 'Only a site manager can submit a daily report'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.daily_reports
  SET status = 'submitted'
  WHERE organization_id = p_organization_id
    AND project_id = p_project_id
    AND id = p_report_id
    AND created_by = auth.uid()
    AND status = 'draft'
    AND deleted_at IS NULL
  RETURNING id INTO v_submitted_id;

  IF v_submitted_id IS NULL THEN
    RAISE EXCEPTION 'Draft report not found or not editable'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN v_submitted_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_daily_report(
  p_organization_id UUID,
  p_project_id UUID,
  p_report_id UUID,
  p_approver_signature_path TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_approved_id UUID;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(
      p_organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type
      ]
    )
  THEN
    RAISE EXCEPTION 'Only an owner, admin, or project manager can approve a daily report'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.daily_reports
  SET status = 'approved',
      approver_signature_path = p_approver_signature_path
  WHERE organization_id = p_organization_id
    AND project_id = p_project_id
    AND id = p_report_id
    AND status = 'submitted'
    AND deleted_at IS NULL
  RETURNING id INTO v_approved_id;

  IF v_approved_id IS NULL THEN
    RAISE EXCEPTION 'Submitted report not found or not approvable'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN v_approved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_daily_report_draft(UUID, UUID, UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_daily_report(UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_daily_report(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_daily_report_draft(UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_daily_report(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_daily_report(UUID, UUID, UUID, TEXT) TO authenticated;
