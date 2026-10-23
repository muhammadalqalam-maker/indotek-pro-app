CREATE TABLE IF NOT EXISTS public.safety_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  inspection_date DATE NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 180),
  inspector_name TEXT NOT NULL CHECK (length(trim(inspector_name)) BETWEEN 2 AND 120),
  location TEXT NOT NULL CHECK (length(trim(location)) BETWEEN 2 AND 180),
  items JSONB NOT NULL,
  overall_notes TEXT NOT NULL DEFAULT '' CHECK (length(overall_notes) <= 2000),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  incident_number TEXT NOT NULL CHECK (length(trim(incident_number)) BETWEEN 4 AND 32),
  incident_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Near Miss (Hampir Celaka)',
    'First Aid (P3K)',
    'Medical Treatment',
    'Lost Time Injury (LTI)',
    'Kerusakan Alat'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('Rendah', 'Sedang', 'Tinggi', 'Kritis')),
  location TEXT NOT NULL CHECK (length(trim(location)) BETWEEN 2 AND 180),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 5 AND 3000),
  immediate_action TEXT NOT NULL CHECK (length(trim(immediate_action)) BETWEEN 2 AND 2000),
  corrective_action TEXT NOT NULL DEFAULT '' CHECK (length(corrective_action) <= 2000),
  reporter_name TEXT NOT NULL CHECK (length(trim(reporter_name)) BETWEEN 2 AND 120),
  status TEXT NOT NULL DEFAULT 'investigating'
    CHECK (status IN ('investigating', 'action_taken', 'closed')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, incident_number),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.toolbox_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  meeting_date DATE NOT NULL,
  topic TEXT NOT NULL CHECK (length(trim(topic)) BETWEEN 2 AND 180),
  presenter_name TEXT NOT NULL CHECK (length(trim(presenter_name)) BETWEEN 2 AND 120),
  attendees_count INTEGER NOT NULL CHECK (attendees_count BETWEEN 1 AND 10000),
  key_points TEXT[] NOT NULL CHECK (
    cardinality(key_points) BETWEEN 1 AND 20
    AND array_position(key_points, '') IS NULL
  ),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS safety_inspections_org_project_date_idx
  ON public.safety_inspections (organization_id, project_id, inspection_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS safety_incidents_org_project_date_idx
  ON public.safety_incidents (organization_id, project_id, incident_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS safety_incidents_org_status_date_idx
  ON public.safety_incidents (organization_id, status, incident_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS toolbox_meetings_org_project_date_idx
  ON public.toolbox_meetings (organization_id, project_id, meeting_date DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_safety_inspection_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  checklist_item JSONB;
BEGIN
  IF jsonb_typeof(NEW.items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Inspection checklist items must be a JSON array.';
  END IF;

  IF jsonb_array_length(NEW.items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Inspection checklist must contain between 1 and 100 items.';
  END IF;

  FOR checklist_item IN SELECT value FROM jsonb_array_elements(NEW.items)
  LOOP
    IF jsonb_typeof(checklist_item) IS DISTINCT FROM 'object'
      OR jsonb_typeof(checklist_item -> 'label') IS DISTINCT FROM 'string'
      OR length(trim(checklist_item ->> 'label')) NOT BETWEEN 2 AND 200
      OR jsonb_typeof(checklist_item -> 'result') IS DISTINCT FROM 'string'
      OR checklist_item ->> 'result' NOT IN ('compliant', 'non_compliant', 'not_applicable')
      OR jsonb_typeof(checklist_item -> 'notes') IS DISTINCT FROM 'string'
      OR length(checklist_item ->> 'notes') > 1000
      OR jsonb_typeof(checklist_item -> 'follow_up') IS DISTINCT FROM 'string'
      OR length(checklist_item ->> 'follow_up') > 1000
      OR (
        checklist_item ->> 'result' = 'non_compliant'
        AND length(trim(checklist_item ->> 'follow_up')) NOT BETWEEN 2 AND 1000
      )
    THEN
      RAISE EXCEPTION 'Inspection checklist item is invalid.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS safety_inspections_validate_items ON public.safety_inspections;
CREATE TRIGGER safety_inspections_validate_items
  BEFORE INSERT OR UPDATE OF items ON public.safety_inspections
  FOR EACH ROW EXECUTE FUNCTION public.validate_safety_inspection_items();

CREATE OR REPLACE FUNCTION public.validate_toolbox_key_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  discussion_point TEXT;
BEGIN
  IF cardinality(NEW.key_points) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Toolbox meeting must contain between 1 and 20 discussion points.';
  END IF;

  FOREACH discussion_point IN ARRAY NEW.key_points
  LOOP
    IF discussion_point IS NULL OR length(trim(discussion_point)) NOT BETWEEN 2 AND 500 THEN
      RAISE EXCEPTION 'Toolbox meeting discussion point is invalid.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS toolbox_meetings_validate_key_points ON public.toolbox_meetings;
CREATE TRIGGER toolbox_meetings_validate_key_points
  BEFORE INSERT OR UPDATE OF key_points ON public.toolbox_meetings
  FOR EACH ROW EXECUTE FUNCTION public.validate_toolbox_key_points();

DROP TRIGGER IF EXISTS safety_inspections_set_updated_at ON public.safety_inspections;
CREATE TRIGGER safety_inspections_set_updated_at
  BEFORE UPDATE ON public.safety_inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS safety_incidents_set_updated_at ON public.safety_incidents;
CREATE TRIGGER safety_incidents_set_updated_at
  BEFORE UPDATE ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS toolbox_meetings_set_updated_at ON public.toolbox_meetings;
CREATE TRIGGER toolbox_meetings_set_updated_at
  BEFORE UPDATE ON public.toolbox_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS safety_inspections_audit ON public.safety_inspections;
CREATE TRIGGER safety_inspections_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.safety_inspections
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS safety_incidents_audit ON public.safety_incidents;
CREATE TRIGGER safety_incidents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS toolbox_meetings_audit ON public.toolbox_meetings;
CREATE TRIGGER toolbox_meetings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.toolbox_meetings
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.validate_safety_incident_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'investigating' AND NEW.status = 'action_taken' THEN
      IF length(trim(NEW.corrective_action)) NOT BETWEEN 2 AND 2000 THEN
        RAISE EXCEPTION 'A corrective action is required before recording follow-up.';
      END IF;
    ELSIF OLD.status <> 'action_taken' OR NEW.status <> 'closed' THEN
      RAISE EXCEPTION 'Safety incident status transition is not allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS safety_incidents_validate_status ON public.safety_incidents;
CREATE TRIGGER safety_incidents_validate_status
  BEFORE UPDATE OF status ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION public.validate_safety_incident_status_transition();

ALTER TABLE public.safety_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolbox_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS safety_inspections_read_org ON public.safety_inspections;
CREATE POLICY safety_inspections_read_org
  ON public.safety_inspections FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS safety_inspections_create_roles ON public.safety_inspections;
CREATE POLICY safety_inspections_create_roles
  ON public.safety_inspections FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS safety_inspections_update_roles ON public.safety_inspections;
CREATE POLICY safety_inspections_update_roles
  ON public.safety_inspections FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));

DROP POLICY IF EXISTS safety_incidents_read_org ON public.safety_incidents;
CREATE POLICY safety_incidents_read_org
  ON public.safety_incidents FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS safety_incidents_create_roles ON public.safety_incidents;
CREATE POLICY safety_incidents_create_roles
  ON public.safety_incidents FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS safety_incidents_update_roles ON public.safety_incidents;
CREATE POLICY safety_incidents_update_roles
  ON public.safety_incidents FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));

DROP POLICY IF EXISTS toolbox_meetings_read_org ON public.toolbox_meetings;
CREATE POLICY toolbox_meetings_read_org
  ON public.toolbox_meetings FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS toolbox_meetings_create_roles ON public.toolbox_meetings;
CREATE POLICY toolbox_meetings_create_roles
  ON public.toolbox_meetings FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS toolbox_meetings_update_roles ON public.toolbox_meetings;
CREATE POLICY toolbox_meetings_update_roles
  ON public.toolbox_meetings FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));

REVOKE ALL ON public.safety_inspections, public.safety_incidents, public.toolbox_meetings
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE
  ON public.safety_inspections, public.safety_incidents, public.toolbox_meetings
  TO authenticated;
