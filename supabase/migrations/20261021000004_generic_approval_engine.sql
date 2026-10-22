-- T-3.1: tenant-scoped approval flows, requests, ordered steps, and delegation.

ALTER TABLE public.project_addendums
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS trg_project_addendums_updated_at ON public.project_addendums;
CREATE TRIGGER trg_project_addendums_updated_at
  BEFORE UPDATE ON public.project_addendums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.approval_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('boq_revision', 'project_addendum', 'daily_report')),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, resource_type),
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS public.approval_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  approval_flow_id UUID NOT NULL,
  step_number INTEGER NOT NULL CHECK (step_number > 0),
  approver_roles public.user_role_type[] NOT NULL CHECK (cardinality(approver_roles) > 0),
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, approval_flow_id)
    REFERENCES public.approval_flows (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, approval_flow_id, step_number)
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approval_flow_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('boq_revision', 'project_addendum', 'daily_report')),
  resource_id UUID NOT NULL,
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 200),
  reference_number TEXT NOT NULL CHECK (length(trim(reference_number)) BETWEEN 1 AND 120),
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  requester_comment TEXT NOT NULL DEFAULT '' CHECK (length(requester_comment) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step > 0),
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, approval_flow_id)
    REFERENCES public.approval_flows (organization_id, id),
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approval_request_id UUID NOT NULL,
  step_number INTEGER NOT NULL CHECK (step_number > 0),
  approver_roles public.user_role_type[] NOT NULL CHECK (cardinality(approver_roles) > 0),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped')),
  comment TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 2000),
  acted_by UUID REFERENCES public.profiles(id),
  acted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, approval_request_id)
    REFERENCES public.approval_requests (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, approval_request_id, step_number),
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS public.approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approval_step_id UUID NOT NULL,
  delegate_user_id UUID NOT NULL REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, approval_step_id)
    REFERENCES public.approval_steps (organization_id, id) ON DELETE CASCADE,
  CHECK (expires_at > created_at),
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_approval_flows_org_resource
  ON public.approval_flows (organization_id, resource_type)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_flow_steps_flow_order
  ON public.approval_flow_steps (organization_id, approval_flow_id, step_number)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_requests_org_project_status
  ON public.approval_requests (organization_id, project_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_requests_active_resource
  ON public.approval_requests (organization_id, resource_type, resource_id)
  WHERE status = 'pending' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_steps_org_request_status
  ON public.approval_steps (organization_id, approval_request_id, status, step_number)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_delegations_active_user
  ON public.approval_delegations (organization_id, delegate_user_id, expires_at)
  WHERE revoked_at IS NULL AND deleted_at IS NULL;

ALTER TABLE public.approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approval flows readable by organization members"
  ON public.approval_flows FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Approval flow steps readable by organization members"
  ON public.approval_flow_steps FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Approval requests readable by organization members"
  ON public.approval_requests FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Approval steps readable by organization members"
  ON public.approval_steps FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Approval delegations readable by organization members"
  ON public.approval_delegations FOR SELECT
  USING (public.is_org_member(organization_id));

REVOKE ALL ON public.approval_flows,
  public.approval_flow_steps,
  public.approval_requests,
  public.approval_steps,
  public.approval_delegations
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.approval_flows,
  public.approval_flow_steps,
  public.approval_requests,
  public.approval_steps,
  public.approval_delegations
TO authenticated;

DROP TRIGGER IF EXISTS trg_approval_flows_updated_at ON public.approval_flows;
CREATE TRIGGER trg_approval_flows_updated_at
  BEFORE UPDATE ON public.approval_flows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_approval_flow_steps_updated_at ON public.approval_flow_steps;
CREATE TRIGGER trg_approval_flow_steps_updated_at
  BEFORE UPDATE ON public.approval_flow_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_approval_steps_updated_at ON public.approval_steps;
CREATE TRIGGER trg_approval_steps_updated_at
  BEFORE UPDATE ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_approval_delegations_updated_at ON public.approval_delegations;
CREATE TRIGGER trg_approval_delegations_updated_at
  BEFORE UPDATE ON public.approval_delegations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_approval_flows_audit ON public.approval_flows;
CREATE TRIGGER trg_approval_flows_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_flows
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS trg_approval_flow_steps_audit ON public.approval_flow_steps;
CREATE TRIGGER trg_approval_flow_steps_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_flow_steps
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS trg_approval_requests_audit ON public.approval_requests;
CREATE TRIGGER trg_approval_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS trg_approval_steps_audit ON public.approval_steps;
CREATE TRIGGER trg_approval_steps_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS trg_approval_delegations_audit ON public.approval_delegations;
CREATE TRIGGER trg_approval_delegations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_delegations
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.create_default_approval_flows(target_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.approval_flows (organization_id, resource_type, name, created_by)
  VALUES
    (target_organization_id, 'boq_revision', 'Persetujuan revisi BOQ', auth.uid()),
    (target_organization_id, 'project_addendum', 'Persetujuan addendum proyek', auth.uid()),
    (target_organization_id, 'daily_report', 'Persetujuan laporan harian', auth.uid())
  ON CONFLICT (organization_id, resource_type) DO NOTHING;

  INSERT INTO public.approval_flow_steps (organization_id, approval_flow_id, step_number, approver_roles, created_by)
  SELECT target_organization_id, flow.id, steps.step_number, steps.approver_roles, auth.uid()
  FROM public.approval_flows AS flow
  JOIN (VALUES
    (1, ARRAY['project_manager'::public.user_role_type]),
    (2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type])
  ) AS steps(step_number, approver_roles) ON true
  WHERE flow.organization_id = target_organization_id
    AND flow.deleted_at IS NULL
    AND flow.resource_type IN ('boq_revision', 'project_addendum', 'daily_report')
    AND NOT EXISTS (
      SELECT 1
      FROM public.approval_flow_steps AS existing
      WHERE existing.organization_id = target_organization_id
        AND existing.approval_flow_id = flow.id
        AND existing.step_number = steps.step_number
        AND existing.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_approval_flows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.create_default_approval_flows(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_default_approval_flows ON public.organizations;
CREATE TRIGGER trg_organizations_default_approval_flows
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_organization_approval_flows();

DO $$
DECLARE
  organization_record RECORD;
BEGIN
  FOR organization_record IN
    SELECT id FROM public.organizations WHERE deleted_at IS NULL
  LOOP
    PERFORM public.create_default_approval_flows(organization_record.id);
  END LOOP;
END;
$$;

WITH documents AS (
  SELECT addendum.organization_id, addendum.project_id, 'project_addendum'::TEXT AS resource_type,
    addendum.id AS resource_id,
    coalesce(addendum.created_by, (
      SELECT member.user_id
      FROM public.organization_members AS member
      WHERE member.organization_id = addendum.organization_id
        AND member.is_active
        AND member.role IN ('owner'::public.user_role_type, 'admin'::public.user_role_type)
      ORDER BY CASE member.role WHEN 'owner'::public.user_role_type THEN 0 ELSE 1 END
      LIMIT 1
    )) AS requester_id,
    addendum.title,
    addendum.addendum_number AS reference_number,
    addendum.amount,
    addendum.created_at
  FROM public.project_addendums AS addendum
  WHERE addendum.approved_at IS NULL AND addendum.deleted_at IS NULL

  UNION ALL

  SELECT report.organization_id, report.project_id, 'daily_report'::TEXT,
    report.id, coalesce(report.submitted_by, report.created_by),
    'Laporan harian ' || to_char(report.report_date, 'DD Mon YYYY'),
    to_char(report.report_date, 'YYYY-MM-DD'),
    0::NUMERIC(18, 2), coalesce(report.submitted_at, report.created_at)
  FROM public.daily_reports AS report
  WHERE report.status = 'submitted' AND report.deleted_at IS NULL

  UNION ALL

  SELECT version.organization_id, version.project_id, 'boq_revision'::TEXT,
    version.id, version.created_by,
    version.title, 'Rev ' || version.revision_number::TEXT,
    version.grand_total, version.created_at
  FROM public.boq_versions AS version
  WHERE version.status = 'pending_approval' AND version.deleted_at IS NULL
),
inserted_requests AS (
  INSERT INTO public.approval_requests (
    organization_id, project_id, approval_flow_id, resource_type, resource_id,
    requester_id, title, reference_number, amount, status, current_step, created_by, created_at
  )
  SELECT document.organization_id, document.project_id, flow.id, document.resource_type,
    document.resource_id, document.requester_id, document.title, document.reference_number,
    coalesce(document.amount, 0), 'pending', 1, document.requester_id, document.created_at
  FROM documents AS document
  JOIN public.approval_flows AS flow
    ON flow.organization_id = document.organization_id
    AND flow.resource_type = document.resource_type
    AND flow.is_active
    AND flow.deleted_at IS NULL
  WHERE document.requester_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.approval_requests AS existing
      WHERE existing.organization_id = document.organization_id
        AND existing.resource_type = document.resource_type
        AND existing.resource_id = document.resource_id
        AND existing.status = 'pending'
        AND existing.deleted_at IS NULL
    )
  RETURNING id, organization_id, project_id, approval_flow_id, resource_type, resource_id
)
INSERT INTO public.approval_steps (
  organization_id, project_id, approval_request_id, step_number, approver_roles, status, created_at
)
SELECT request.organization_id, request.project_id, request.id,
  flow_step.step_number, flow_step.approver_roles,
  CASE WHEN flow_step.step_number = 1 THEN 'pending' ELSE 'waiting' END,
  timezone('utc'::text, now())
FROM inserted_requests AS request
JOIN public.approval_flow_steps AS flow_step
  ON flow_step.organization_id = request.organization_id
  AND flow_step.approval_flow_id = request.approval_flow_id
  AND flow_step.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.save_approval_flow(
  p_organization_id UUID,
  p_resource_type TEXT,
  p_name TEXT,
  p_is_active BOOLEAN,
  p_steps JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  flow_id UUID;
  step_record JSONB;
  role_values public.user_role_type[];
  step_index INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Only an organization owner or admin can manage approval flows'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_resource_type NOT IN ('boq_revision', 'project_addendum', 'daily_report')
    OR length(trim(p_name)) NOT BETWEEN 2 AND 120
    OR jsonb_typeof(p_steps) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_steps) NOT BETWEEN 1 AND 8
  THEN
    RAISE EXCEPTION 'Approval flow configuration is invalid'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.approval_flows (organization_id, resource_type, name, is_active)
  VALUES (p_organization_id, p_resource_type, trim(p_name), p_is_active)
  ON CONFLICT (organization_id, resource_type)
  DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active
  RETURNING id INTO flow_id;

  DELETE FROM public.approval_flow_steps
  WHERE organization_id = p_organization_id AND approval_flow_id = flow_id;

  FOR step_record IN SELECT value FROM jsonb_array_elements(p_steps)
  LOOP
    step_index := step_index + 1;
    IF jsonb_typeof(step_record->'roles') IS DISTINCT FROM 'array'
      OR jsonb_array_length(step_record->'roles') = 0
    THEN
      RAISE EXCEPTION 'Every approval step needs at least one approver role'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT array_agg(role_value::public.user_role_type ORDER BY role_value)
    INTO role_values
    FROM jsonb_array_elements_text(step_record->'roles') AS role_item(role_value);

    IF cardinality(role_values) <> (
      SELECT count(DISTINCT role_value)
      FROM jsonb_array_elements_text(step_record->'roles') AS role_item(role_value)
    ) THEN
      RAISE EXCEPTION 'Approver roles cannot be duplicated within a step'
        USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.approval_flow_steps (
      organization_id, approval_flow_id, step_number, approver_roles
    ) VALUES (p_organization_id, flow_id, step_index, role_values);
  END LOOP;

  IF p_is_active AND EXISTS (
    SELECT 1
    FROM public.approval_requests
    WHERE organization_id = p_organization_id
      AND approval_flow_id = flow_id
      AND status = 'pending'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot edit an active flow while requests are pending'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  RETURN flow_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_approval_step(
  p_request_id UUID,
  p_step_number INTEGER,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_record public.approval_requests%ROWTYPE;
  target_roles public.user_role_type[];
BEGIN
  SELECT * INTO request_record
  FROM public.approval_requests
  WHERE id = p_request_id AND deleted_at IS NULL;

  SELECT approver_roles INTO target_roles
  FROM public.approval_steps
  WHERE organization_id = request_record.organization_id
    AND approval_request_id = request_record.id
    AND step_number = p_step_number
    AND status = 'pending'
    AND deleted_at IS NULL;

  IF target_roles IS NOT NULL THEN
    INSERT INTO public.notifications (organization_id, user_id, title, message, type, link)
    SELECT request_record.organization_id, member.user_id, 'Persetujuan diperlukan',
      p_message, 'warning', 'approvals'
    FROM public.organization_members AS member
    WHERE member.organization_id = request_record.organization_id
      AND member.is_active
      AND member.role = ANY(target_roles)
      AND member.user_id <> request_record.requester_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_approval_request(
  p_organization_id UUID,
  p_project_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_requester_comment TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  flow_record public.approval_flows%ROWTYPE;
  request_id UUID;
  request_title TEXT;
  request_reference TEXT;
  request_amount NUMERIC(18, 2) := 0;
  step_record RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_organization_id)
    OR length(coalesce(p_requester_comment, '')) > 2000
  THEN
    RAISE EXCEPTION 'Approval request is invalid or user is not an organization member'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO flow_record
  FROM public.approval_flows
  WHERE organization_id = p_organization_id
    AND resource_type = p_resource_type
    AND is_active
    AND deleted_at IS NULL
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active approval flow is configured for this document'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.approval_flow_steps
    WHERE organization_id = p_organization_id
      AND approval_flow_id = flow_record.id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The approval flow has no approver steps'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  CASE p_resource_type
    WHEN 'boq_revision' THEN
      SELECT version.title, 'Rev ' || version.revision_number::TEXT, version.grand_total
      INTO request_title, request_reference, request_amount
      FROM public.boq_versions AS version
      WHERE version.id = p_resource_id
        AND version.organization_id = p_organization_id
        AND version.project_id = p_project_id
        AND version.created_by = auth.uid()
        AND version.status = 'draft'
        AND version.deleted_at IS NULL
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Only the author of an editable BOQ draft can submit it'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    WHEN 'project_addendum' THEN
      SELECT addendum.title, addendum.addendum_number, addendum.amount
      INTO request_title, request_reference, request_amount
      FROM public.project_addendums AS addendum
      WHERE addendum.id = p_resource_id
        AND addendum.organization_id = p_organization_id
        AND addendum.project_id = p_project_id
        AND addendum.created_by = auth.uid()
        AND addendum.approved_at IS NULL
        AND addendum.deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Only the author of an unapproved addendum can submit it'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    WHEN 'daily_report' THEN
      SELECT 'Laporan harian ' || to_char(report.report_date, 'DD Mon YYYY'),
        to_char(report.report_date, 'YYYY-MM-DD'), 0
      INTO request_title, request_reference, request_amount
      FROM public.daily_reports AS report
      WHERE report.id = p_resource_id
        AND report.organization_id = p_organization_id
        AND report.project_id = p_project_id
        AND report.submitted_by = auth.uid()
        AND report.status = 'submitted'
        AND report.deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Only the author of a submitted daily report can request approval'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported approval resource type'
        USING ERRCODE = 'check_violation';
  END CASE;

  INSERT INTO public.approval_requests (
    organization_id, project_id, approval_flow_id, resource_type, resource_id,
    requester_id, title, reference_number, amount, requester_comment
  ) VALUES (
    p_organization_id, p_project_id, flow_record.id, p_resource_type, p_resource_id,
    auth.uid(), request_title, request_reference, coalesce(request_amount, 0),
    trim(coalesce(p_requester_comment, ''))
  )
  RETURNING id INTO request_id;

  FOR step_record IN
    SELECT step_number, approver_roles
    FROM public.approval_flow_steps
    WHERE organization_id = p_organization_id
      AND approval_flow_id = flow_record.id
      AND deleted_at IS NULL
    ORDER BY step_number
  LOOP
    INSERT INTO public.approval_steps (
      organization_id, project_id, approval_request_id, step_number,
      approver_roles, status
    ) VALUES (
      p_organization_id, p_project_id, request_id, step_record.step_number,
      step_record.approver_roles,
      CASE WHEN step_record.step_number = 1 THEN 'pending' ELSE 'waiting' END
    );
  END LOOP;

  IF p_resource_type = 'boq_revision' THEN
    UPDATE public.boq_versions
    SET status = 'pending_approval'
    WHERE id = p_resource_id AND organization_id = p_organization_id
      AND project_id = p_project_id;
  END IF;

  PERFORM public.notify_approval_step(
    request_id, 1, 'Dokumen ' || request_reference || ' menunggu persetujuan Anda.'
  );
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_boq_revision_approval(
  p_organization_id UUID,
  p_project_id UUID,
  p_boq_version_id UUID,
  p_comment TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type, 'estimator'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'You are not allowed to submit a BOQ revision'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.start_approval_request(
    p_organization_id, p_project_id, 'boq_revision', p_boq_version_id, p_comment
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_addendum_with_approval(
  p_organization_id UUID,
  p_project_id UUID,
  p_addendum_number TEXT,
  p_title TEXT,
  p_description TEXT,
  p_amount NUMERIC,
  p_time_extension_days INTEGER,
  p_comment TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  addendum_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type, 'project_manager'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'You are not allowed to create a project addendum'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.project_addendums (
    organization_id, project_id, addendum_number, title, description,
    amount, time_extension_days, created_by
  ) VALUES (
    p_organization_id, p_project_id, trim(p_addendum_number), trim(p_title),
    trim(coalesce(p_description, '')), p_amount, p_time_extension_days, auth.uid()
  )
  RETURNING id INTO addendum_id;

  PERFORM public.start_approval_request(
    p_organization_id, p_project_id, 'project_addendum', addendum_id, p_comment
  );
  RETURN addendum_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delegate_approval_step(
  p_approval_step_id UUID,
  p_delegate_user_id UUID,
  p_expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  step_record public.approval_steps%ROWTYPE;
  request_record public.approval_requests%ROWTYPE;
  delegation_id UUID;
BEGIN
  SELECT * INTO step_record
  FROM public.approval_steps
  WHERE id = p_approval_step_id AND status = 'pending' AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This approval step is no longer pending'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  SELECT * INTO request_record
  FROM public.approval_requests
  WHERE id = step_record.approval_request_id AND status = 'pending'
    AND deleted_at IS NULL;
  IF NOT FOUND OR request_record.requester_id = auth.uid()
    OR NOT public.has_role(request_record.organization_id, step_record.approver_roles)
  THEN
    RAISE EXCEPTION 'Only an eligible approver can delegate this approval step'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_delegate_user_id = auth.uid()
    OR p_delegate_user_id = request_record.requester_id
    OR p_expires_at <= now()
    OR p_expires_at > now() + interval '30 days'
    OR NOT EXISTS (
      SELECT 1 FROM public.organization_members AS member
      WHERE member.organization_id = request_record.organization_id
        AND member.user_id = p_delegate_user_id
        AND member.is_active
    )
  THEN
    RAISE EXCEPTION 'Delegation target or expiry is invalid'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.approval_delegations
  SET revoked_at = now()
  WHERE organization_id = request_record.organization_id
    AND approval_step_id = step_record.id
    AND revoked_at IS NULL
    AND deleted_at IS NULL;

  INSERT INTO public.approval_delegations (
    organization_id, project_id, approval_step_id, delegate_user_id, expires_at
  ) VALUES (
    request_record.organization_id, request_record.project_id,
    step_record.id, p_delegate_user_id, p_expires_at
  )
  RETURNING id INTO delegation_id;

  INSERT INTO public.notifications (organization_id, user_id, title, message, type, link)
  VALUES (
    request_record.organization_id, p_delegate_user_id, 'Delegasi persetujuan',
    'Anda menerima delegasi untuk ' || request_record.reference_number || '.',
    'warning', 'approvals'
  );
  RETURN delegation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_approval_step(
  p_approval_request_id UUID,
  p_decision TEXT,
  p_comment TEXT,
  p_approver_signature_path TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_record public.approval_requests%ROWTYPE;
  step_record public.approval_steps%ROWTYPE;
  next_step_number INTEGER;
BEGIN
  IF auth.uid() IS NULL
    OR p_decision IS NULL
    OR p_decision NOT IN ('approved', 'rejected')
    OR length(trim(coalesce(p_comment, ''))) NOT BETWEEN 1 AND 2000
  THEN
    RAISE EXCEPTION 'Decision and comment are required'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO request_record
  FROM public.approval_requests
  WHERE id = p_approval_request_id AND status = 'pending' AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR request_record.requester_id = auth.uid() THEN
    RAISE EXCEPTION 'This request cannot be processed by the requester'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO step_record
  FROM public.approval_steps
  WHERE organization_id = request_record.organization_id
    AND approval_request_id = request_record.id
    AND step_number = request_record.current_step
    AND status = 'pending'
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The current approval step is unavailable'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  IF NOT public.has_role(request_record.organization_id, step_record.approver_roles)
    AND NOT EXISTS (
      SELECT 1 FROM public.approval_delegations AS delegation
      WHERE delegation.organization_id = request_record.organization_id
        AND delegation.approval_step_id = step_record.id
        AND delegation.delegate_user_id = auth.uid()
        AND delegation.expires_at > now()
        AND delegation.revoked_at IS NULL
        AND delegation.deleted_at IS NULL
    )
  THEN
    RAISE EXCEPTION 'You are not an approver for the current step'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.approval_steps
  SET status = p_decision,
      comment = trim(p_comment),
      acted_by = auth.uid(),
      acted_at = now()
  WHERE id = step_record.id;

  IF p_decision = 'rejected' THEN
    UPDATE public.approval_steps
    SET status = 'skipped'
    WHERE organization_id = request_record.organization_id
      AND approval_request_id = request_record.id
      AND status = 'waiting';
    UPDATE public.approval_requests SET status = 'rejected' WHERE id = request_record.id;

    IF request_record.resource_type = 'boq_revision' THEN
      UPDATE public.boq_versions
      SET status = 'rejected', approved_by = NULL, approved_at = NULL
      WHERE id = request_record.resource_id
        AND organization_id = request_record.organization_id
        AND status = 'pending_approval'
        AND deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'The BOQ revision is no longer awaiting approval'
          USING ERRCODE = 'object_not_in_prerequisite_state';
      END IF;
    ELSIF request_record.resource_type = 'daily_report' THEN
      UPDATE public.daily_reports
      SET status = 'draft', submitted_at = NULL, submitted_by = NULL
      WHERE id = request_record.resource_id
        AND organization_id = request_record.organization_id
        AND status = 'submitted'
        AND deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'The daily report is no longer awaiting approval'
          USING ERRCODE = 'object_not_in_prerequisite_state';
      END IF;
    ELSIF request_record.resource_type = 'project_addendum' THEN
      PERFORM 1
      FROM public.project_addendums
      WHERE id = request_record.resource_id
        AND organization_id = request_record.organization_id
        AND approved_at IS NULL
        AND deleted_at IS NULL
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'The project addendum is no longer awaiting approval'
          USING ERRCODE = 'object_not_in_prerequisite_state';
      END IF;
    END IF;

    INSERT INTO public.notifications (organization_id, user_id, title, message, type, link)
    VALUES (
      request_record.organization_id, request_record.requester_id, 'Pengajuan ditolak',
      request_record.reference_number || ': ' || trim(p_comment), 'warning', 'approvals'
    );
    RETURN;
  END IF;

  SELECT min(step_number) INTO next_step_number
  FROM public.approval_steps
  WHERE organization_id = request_record.organization_id
    AND approval_request_id = request_record.id
    AND status = 'waiting'
    AND deleted_at IS NULL;

  IF next_step_number IS NOT NULL THEN
    UPDATE public.approval_steps SET status = 'pending'
    WHERE organization_id = request_record.organization_id
      AND approval_request_id = request_record.id
      AND step_number = next_step_number;
    UPDATE public.approval_requests
    SET current_step = next_step_number WHERE id = request_record.id;
    PERFORM public.notify_approval_step(
      request_record.id, next_step_number,
      'Dokumen ' || request_record.reference_number || ' menunggu persetujuan Anda.'
    );
    RETURN;
  END IF;

  UPDATE public.approval_requests SET status = 'approved' WHERE id = request_record.id;

  IF request_record.resource_type = 'boq_revision' THEN
    UPDATE public.boq_versions
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = request_record.resource_id
      AND organization_id = request_record.organization_id
      AND status = 'pending_approval'
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The BOQ revision is no longer awaiting approval'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  ELSIF request_record.resource_type = 'project_addendum' THEN
    UPDATE public.project_addendums
    SET approved_by = auth.uid(), approved_at = now()
    WHERE id = request_record.resource_id
      AND organization_id = request_record.organization_id
      AND approved_at IS NULL
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The project addendum is no longer awaiting approval'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  ELSIF request_record.resource_type = 'daily_report' THEN
    IF p_approver_signature_path IS DISTINCT FROM (
      request_record.organization_id::TEXT || '/' || request_record.project_id::TEXT
      || '/daily-reports/' || request_record.resource_id::TEXT || '/signatures/approver.png'
    ) THEN
      RAISE EXCEPTION 'A valid approver signature is required for daily reports'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects AS signature
      WHERE signature.bucket_id = 'org-project-files'
        AND signature.name = p_approver_signature_path
        AND signature.updated_at >= request_record.created_at
    ) THEN
      RAISE EXCEPTION 'The approver signature must be uploaded for this request'
        USING ERRCODE = 'check_violation';
    END IF;
    UPDATE public.daily_reports
    SET status = 'approved', approver_signature_path = p_approver_signature_path
    WHERE id = request_record.resource_id
      AND organization_id = request_record.organization_id
      AND status = 'submitted'
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The daily report is no longer awaiting approval'
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  END IF;

  INSERT INTO public.notifications (organization_id, user_id, title, message, type, link)
  VALUES (
    request_record.organization_id, request_record.requester_id, 'Pengajuan disetujui',
    'Dokumen ' || request_record.reference_number || ' telah disetujui.',
    'success', 'approvals'
  );
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
  submitted_id UUID;
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
  RETURNING id INTO submitted_id;
  IF submitted_id IS NULL THEN
    RAISE EXCEPTION 'Draft report not found or not editable'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM public.start_approval_request(
    p_organization_id, p_project_id, 'daily_report', p_report_id
  );
  RETURN submitted_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_approval_request(UUID, UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_approval_flows(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_approval_step(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_organization_approval_flows() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_daily_report(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_approval_flow(UUID, TEXT, TEXT, BOOLEAN, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_boq_revision_approval(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_project_addendum_with_approval(UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delegate_approval_step(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_approval_step(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_daily_report(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_approval_flow(UUID, TEXT, TEXT, BOOLEAN, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_boq_revision_approval(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_addendum_with_approval(UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delegate_approval_step(UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_approval_step(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_daily_report(UUID, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_boq_version_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  related_request_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'BOQ revisions must be created as drafts' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved', 'pending_approval') THEN
      RAISE EXCEPTION 'Approved or pending BOQ revisions cannot be deleted' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'Approved BOQ revisions are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.revision_number IS DISTINCT FROM OLD.revision_number
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'BOQ revision identity cannot be changed' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT status INTO related_request_status
    FROM public.approval_requests
    WHERE organization_id = OLD.organization_id
      AND resource_type = 'boq_revision'
      AND resource_id = OLD.id
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'pending_approval'
        AND related_request_status = 'pending' AND OLD.created_by = auth.uid())
      OR (OLD.status = 'pending_approval' AND NEW.status IN ('approved', 'rejected')
        AND related_request_status = NEW.status)
    ) THEN
      RAISE EXCEPTION 'BOQ status can only change through the approval workflow'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status = 'approved'
      AND (NEW.approved_by IS DISTINCT FROM auth.uid() OR NEW.approved_at IS NULL)
    THEN
      RAISE EXCEPTION 'BOQ approval metadata is invalid' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status <> 'approved'
      AND (NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL)
    THEN
      RAISE EXCEPTION 'Only approved BOQ revisions can have approval metadata'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  THEN
    RAISE EXCEPTION 'BOQ approval metadata is managed by the approval workflow'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
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
  related_request_status TEXT;
BEGIN
  report_prefix := NEW.organization_id::TEXT || '/' || NEW.project_id::TEXT
    || '/daily-reports/' || NEW.id::TEXT || '/';

  IF jsonb_typeof(NEW.photo_paths) IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.photo_paths) > 10
    OR length(NEW.site_manager_name) > 120
    OR length(NEW.weather_conditions) > 300
    OR length(NEW.work_summary) > 5000
    OR length(NEW.obstacles) > 3000
    OR length(NEW.solutions) > 3000
  THEN
    RAISE EXCEPTION 'Daily report values exceed the allowed limits' USING ERRCODE = 'check_violation';
  END IF;

  FOR photo_record IN SELECT value FROM jsonb_array_elements(NEW.photo_paths)
  LOOP
    IF jsonb_typeof(photo_record) IS DISTINCT FROM 'object'
      OR left(coalesce(photo_record->>'path', ''), length(report_prefix || 'photos/'))
        <> report_prefix || 'photos/'
      OR length(coalesce(photo_record->>'caption', '')) > 160
    THEN
      RAISE EXCEPTION 'Report photo path does not belong to this report' USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  IF NEW.site_manager_signature_path IS NOT NULL
    AND NEW.site_manager_signature_path <> report_prefix || 'signatures/site-manager.png'
  THEN
    RAISE EXCEPTION 'Site manager signature path does not belong to this report' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.approver_signature_path IS NOT NULL
    AND NEW.approver_signature_path <> report_prefix || 'signatures/approver.png'
  THEN
    RAISE EXCEPTION 'Approver signature path does not belong to this report' USING ERRCODE = 'check_violation';
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
      RAISE EXCEPTION 'Only a site manager can create a draft report' USING ERRCODE = 'insufficient_privilege';
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
    RAISE EXCEPTION 'Report identity cannot be changed' USING ERRCODE = 'check_violation';
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
      RAISE EXCEPTION 'Only the authoring site manager can edit a draft report' USING ERRCODE = 'insufficient_privilege';
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
      RAISE EXCEPTION 'A site manager name and signature are required to submit a report' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.submitted_at := now();
    NEW.submitted_by := auth.uid();
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' AND NEW.status IN ('approved', 'draft') THEN
    SELECT status INTO related_request_status
    FROM public.approval_requests
    WHERE organization_id = OLD.organization_id
      AND resource_type = 'daily_report'
      AND resource_id = OLD.id
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT (
      (NEW.status = 'approved' AND related_request_status = 'approved')
      OR (NEW.status = 'draft' AND related_request_status = 'rejected')
    )
      OR ROW(
        NEW.report_date, NEW.site_manager_name, NEW.site_manager_signature_path,
        NEW.weather_conditions, NEW.work_summary, NEW.obstacles, NEW.solutions,
        NEW.photo_paths, NEW.created_at, NEW.deleted_at
      ) IS DISTINCT FROM ROW(
        OLD.report_date, OLD.site_manager_name, OLD.site_manager_signature_path,
        OLD.weather_conditions, OLD.work_summary, OLD.obstacles, OLD.solutions,
        OLD.photo_paths, OLD.created_at, OLD.deleted_at
      )
    THEN
      RAISE EXCEPTION 'Submitted report decisions must use the approval workflow'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.status = 'approved' THEN
      IF NEW.approver_signature_path IS NULL THEN
        RAISE EXCEPTION 'A valid approver signature is required' USING ERRCODE = 'check_violation';
      END IF;
      NEW.approved_at := now();
      NEW.approved_by := auth.uid();
    ELSIF NEW.submitted_at IS NOT NULL
      OR NEW.submitted_by IS NOT NULL
      OR NEW.approver_signature_path IS DISTINCT FROM OLD.approver_signature_path
      OR NEW.approved_at IS NOT NULL
      OR NEW.approved_by IS NOT NULL
    THEN
      RAISE EXCEPTION 'Rejected reports cannot have approval metadata' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid report status transition' USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_project_addendum_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  THEN
    IF NEW.approved_at IS NULL
      OR NEW.approved_by IS DISTINCT FROM auth.uid()
      OR NOT EXISTS (
        SELECT 1 FROM public.approval_requests AS request
        WHERE request.organization_id = OLD.organization_id
          AND request.project_id = OLD.project_id
          AND request.resource_type = 'project_addendum'
          AND request.resource_id = OLD.id
          AND request.status = 'approved'
          AND request.deleted_at IS NULL
      )
    THEN
      RAISE EXCEPTION 'Addendum approval metadata is managed by the approval workflow'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_addendums_approval_guard ON public.project_addendums;
CREATE TRIGGER trg_project_addendums_approval_guard
  BEFORE UPDATE ON public.project_addendums
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_addendum_approval();

DROP POLICY IF EXISTS "Organization project files uploadable by field roles" ON storage.objects;
CREATE POLICY "Organization project files uploadable by field roles"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-project-files'
    AND cardinality(storage.foldername(storage.objects.name)) >= 2
    AND storage.objects.name NOT LIKE '%/signatures/approver.png'
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      WHERE project.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND project.id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type,
            'site_manager'::public.user_role_type
          ]
        )
    )
  );

DROP POLICY IF EXISTS "Organization project files updatable by field roles" ON storage.objects;
CREATE POLICY "Organization project files updatable by field roles"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-project-files'
    AND cardinality(storage.foldername(storage.objects.name)) >= 2
    AND storage.objects.name NOT LIKE '%/signatures/approver.png'
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      WHERE project.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND project.id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type,
            'site_manager'::public.user_role_type
          ]
        )
    )
  )
  WITH CHECK (
    bucket_id = 'org-project-files'
    AND cardinality(storage.foldername(storage.objects.name)) >= 2
    AND storage.objects.name NOT LIKE '%/signatures/approver.png'
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      WHERE project.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND project.id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type,
            'site_manager'::public.user_role_type
          ]
        )
    )
  );

DROP POLICY IF EXISTS "Organization project files deletable by managers" ON storage.objects;
CREATE POLICY "Organization project files deletable by managers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-project-files'
    AND cardinality(storage.foldername(storage.objects.name)) >= 2
    AND storage.objects.name NOT LIKE '%/signatures/approver.png'
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      WHERE project.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND project.id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type
          ]
        )
    )
  );

DROP POLICY IF EXISTS "Approval workflow approver signatures uploadable" ON storage.objects;
CREATE POLICY "Approval workflow approver signatures uploadable"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-project-files'
    AND storage.objects.name = (
      (storage.foldername(storage.objects.name))[1] || '/'
      || (storage.foldername(storage.objects.name))[2] || '/daily-reports/'
      || (storage.foldername(storage.objects.name))[4] || '/signatures/approver.png'
    )
    AND EXISTS (
      SELECT 1
      FROM public.approval_requests AS request
      JOIN public.approval_steps AS step
        ON step.organization_id = request.organization_id
        AND step.approval_request_id = request.id
        AND step.step_number = request.current_step
        AND step.status = 'pending'
      WHERE request.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND request.project_id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND request.resource_type = 'daily_report'
        AND request.resource_id::TEXT = (storage.foldername(storage.objects.name))[4]
        AND request.status = 'pending'
        AND request.requester_id <> auth.uid()
        AND (
          public.has_role(request.organization_id, step.approver_roles)
          OR EXISTS (
            SELECT 1 FROM public.approval_delegations AS delegation
            WHERE delegation.organization_id = request.organization_id
              AND delegation.approval_step_id = step.id
              AND delegation.delegate_user_id = auth.uid()
              AND delegation.expires_at > now()
              AND delegation.revoked_at IS NULL
              AND delegation.deleted_at IS NULL
          )
        )
    )
  );
DROP POLICY IF EXISTS "Approval workflow approver signatures updatable" ON storage.objects;
CREATE POLICY "Approval workflow approver signatures updatable"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-project-files'
    AND storage.objects.name = (
      (storage.foldername(storage.objects.name))[1] || '/'
      || (storage.foldername(storage.objects.name))[2] || '/daily-reports/'
      || (storage.foldername(storage.objects.name))[4] || '/signatures/approver.png'
    )
    AND EXISTS (
      SELECT 1
      FROM public.approval_requests AS request
      JOIN public.approval_steps AS step
        ON step.organization_id = request.organization_id
        AND step.approval_request_id = request.id
        AND step.step_number = request.current_step
        AND step.status = 'pending'
      WHERE request.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND request.project_id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND request.resource_type = 'daily_report'
        AND request.resource_id::TEXT = (storage.foldername(storage.objects.name))[4]
        AND request.status = 'pending'
        AND request.requester_id <> auth.uid()
        AND (
          public.has_role(request.organization_id, step.approver_roles)
          OR EXISTS (
            SELECT 1 FROM public.approval_delegations AS delegation
            WHERE delegation.organization_id = request.organization_id
              AND delegation.approval_step_id = step.id
              AND delegation.delegate_user_id = auth.uid()
              AND delegation.expires_at > now()
              AND delegation.revoked_at IS NULL
              AND delegation.deleted_at IS NULL
          )
        )
    )
  )
  WITH CHECK (
    bucket_id = 'org-project-files'
    AND storage.objects.name = (
      (storage.foldername(storage.objects.name))[1] || '/'
      || (storage.foldername(storage.objects.name))[2] || '/daily-reports/'
      || (storage.foldername(storage.objects.name))[4] || '/signatures/approver.png'
    )
    AND EXISTS (
      SELECT 1
      FROM public.approval_requests AS request
      JOIN public.approval_steps AS step
        ON step.organization_id = request.organization_id
        AND step.approval_request_id = request.id
        AND step.step_number = request.current_step
        AND step.status = 'pending'
      WHERE request.organization_id::TEXT = (storage.foldername(storage.objects.name))[1]
        AND request.project_id::TEXT = (storage.foldername(storage.objects.name))[2]
        AND request.resource_type = 'daily_report'
        AND request.resource_id::TEXT = (storage.foldername(storage.objects.name))[4]
        AND request.status = 'pending'
        AND request.requester_id <> auth.uid()
        AND (
          public.has_role(request.organization_id, step.approver_roles)
          OR EXISTS (
            SELECT 1 FROM public.approval_delegations AS delegation
            WHERE delegation.organization_id = request.organization_id
              AND delegation.approval_step_id = step.id
              AND delegation.delegate_user_id = auth.uid()
              AND delegation.expires_at > now()
              AND delegation.revoked_at IS NULL
              AND delegation.deleted_at IS NULL
          )
        )
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.project_addendums FROM anon, authenticated;
GRANT SELECT ON public.project_addendums TO authenticated;
