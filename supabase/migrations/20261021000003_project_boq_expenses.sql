-- T-2.14: record project expenses against an approved BOQ work item.

CREATE TABLE IF NOT EXISTS public.project_boq_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  boq_version_id UUID NOT NULL,
  boq_item_id UUID NOT NULL,
  expense_date DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 2 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT project_boq_expenses_org_project_fkey
    FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT project_boq_expenses_boq_version_fkey
    FOREIGN KEY (organization_id, project_id, boq_version_id)
    REFERENCES public.boq_versions (organization_id, project_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT project_boq_expenses_boq_item_fkey
    FOREIGN KEY (organization_id, project_id, boq_version_id, boq_item_id)
    REFERENCES public.boq_items (organization_id, project_id, boq_version_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT project_boq_expenses_verified_metadata_check
    CHECK (
      (status = 'pending' AND verified_by IS NULL AND verified_at IS NULL)
      OR (status = 'verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    ),
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_project_boq_expenses_org_project_version_date
  ON public.project_boq_expenses (organization_id, project_id, boq_version_id, expense_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_boq_expenses_org_item_status
  ON public.project_boq_expenses (organization_id, project_id, boq_item_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.project_boq_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project BOQ expenses viewable by org members" ON public.project_boq_expenses;
CREATE POLICY "Project BOQ expenses viewable by org members"
ON public.project_boq_expenses FOR SELECT
USING (public.is_org_member(organization_id));

REVOKE ALL ON public.project_boq_expenses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.project_boq_expenses FROM authenticated;
GRANT SELECT ON public.project_boq_expenses TO authenticated;

DROP TRIGGER IF EXISTS trg_project_boq_expenses_updated_at ON public.project_boq_expenses;
CREATE TRIGGER trg_project_boq_expenses_updated_at
BEFORE UPDATE ON public.project_boq_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_boq_expenses_audit ON public.project_boq_expenses;
CREATE TRIGGER trg_project_boq_expenses_audit
AFTER INSERT OR UPDATE OR DELETE ON public.project_boq_expenses
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.record_project_boq_expense(
  p_organization_id UUID,
  p_project_id UUID,
  p_boq_version_id UUID,
  p_boq_item_id UUID,
  p_expense_date DATE,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  expense_uuid UUID := gen_random_uuid();
  description_value TEXT := trim(COALESCE(p_description, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY[
      'owner'::user_role_type,
      'admin'::user_role_type,
      'project_manager'::user_role_type,
      'finance'::user_role_type
    ]
  ) THEN
    RAISE EXCEPTION 'The user cannot record project expenses'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0
    OR p_expense_date IS NULL
    OR length(description_value) NOT BETWEEN 2 AND 500
  THEN
    RAISE EXCEPTION 'Project expense details are invalid'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM project.id
  FROM public.projects AS project
  WHERE project.id = p_project_id
    AND project.organization_id = p_organization_id
    AND project.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project is unavailable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.boq_versions AS version
    JOIN public.boq_items AS item
      ON item.organization_id = version.organization_id
      AND item.project_id = version.project_id
      AND item.boq_version_id = version.id
    WHERE version.id = p_boq_version_id
      AND version.organization_id = p_organization_id
      AND version.project_id = p_project_id
      AND version.status = 'approved'
      AND version.deleted_at IS NULL
      AND item.id = p_boq_item_id
      AND item.item_type = 'work_item'
      AND item.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Expense must reference an active work item in an approved BOQ'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  INSERT INTO public.project_boq_expenses (
    id, organization_id, project_id, boq_version_id, boq_item_id,
    expense_date, amount, description, created_by
  ) VALUES (
    expense_uuid, p_organization_id, p_project_id, p_boq_version_id, p_boq_item_id,
    p_expense_date, p_amount, description_value, auth.uid()
  );

  RETURN expense_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_project_boq_expense(
  p_organization_id UUID,
  p_project_id UUID,
  p_expense_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::user_role_type, 'admin'::user_role_type, 'finance'::user_role_type]
  ) THEN
    RAISE EXCEPTION 'The user cannot verify project expenses'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.project_boq_expenses
  SET status = 'verified',
      verified_by = auth.uid(),
      verified_at = timezone('utc'::TEXT, now())
  WHERE id = p_expense_id
    AND organization_id = p_organization_id
    AND project_id = p_project_id
    AND status = 'pending'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      JOIN public.boq_versions AS version
        ON version.organization_id = project.organization_id
        AND version.project_id = project.id
      JOIN public.boq_items AS item
        ON item.organization_id = version.organization_id
        AND item.project_id = version.project_id
        AND item.boq_version_id = version.id
      WHERE project.id = p_project_id
        AND project.organization_id = p_organization_id
        AND project.deleted_at IS NULL
        AND version.id = project_boq_expenses.boq_version_id
        AND version.status = 'approved'
        AND version.deleted_at IS NULL
        AND item.id = project_boq_expenses.boq_item_id
        AND item.item_type = 'work_item'
        AND item.deleted_at IS NULL
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending project expense is unavailable'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_project_boq_expense(UUID, UUID, UUID, UUID, DATE, NUMERIC, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_project_boq_expense(UUID, UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_project_boq_expense(UUID, UUID, UUID, UUID, DATE, NUMERIC, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_project_boq_expense(UUID, UUID, UUID)
  TO authenticated;
