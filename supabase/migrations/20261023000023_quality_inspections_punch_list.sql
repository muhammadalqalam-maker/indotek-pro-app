DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'quality-evidence'
      AND (
        name <> 'quality-evidence'
        OR public
        OR file_size_limit IS DISTINCT FROM 10485760
        OR allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
      )
  ) THEN
    RAISE EXCEPTION 'The quality-evidence bucket exists with an incompatible configuration';
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quality-evidence',
  'quality-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.qc_inspections (
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

CREATE TABLE IF NOT EXISTS public.punch_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 4 AND 32),
  location_zone TEXT NOT NULL CHECK (length(trim(location_zone)) BETWEEN 2 AND 180),
  category TEXT NOT NULL CHECK (category IN ('Arsitektur', 'Struktur', 'MEP', 'Finishing')),
  defect_description TEXT NOT NULL CHECK (length(trim(defect_description)) BETWEEN 5 AND 3000),
  assigned_to_subcon TEXT NOT NULL CHECK (length(trim(assigned_to_subcon)) BETWEEN 2 AND 180),
  due_date DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'ready_for_inspection', 'closed')),
  before_photo_path TEXT NOT NULL,
  after_photo_path TEXT,
  reported_by TEXT NOT NULL CHECK (length(trim(reported_by)) BETWEEN 2 AND 120),
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  CHECK (
    before_photo_path LIKE organization_id::text || '/' || project_id::text || '/' || id::text || '/before/%'
  ),
  CHECK (
    after_photo_path IS NULL
    OR after_photo_path LIKE organization_id::text || '/' || project_id::text || '/' || id::text || '/after/%'
  ),
  CHECK (
    (
      status = 'closed'
      AND after_photo_path IS NOT NULL
      AND closed_by IS NOT NULL
      AND closed_at IS NOT NULL
    )
    OR (
      status <> 'closed'
      AND after_photo_path IS NULL
      AND closed_by IS NULL
      AND closed_at IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS qc_inspections_org_project_date_idx
  ON public.qc_inspections (organization_id, project_id, inspection_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS punch_list_items_org_project_status_due_idx
  ON public.punch_list_items (organization_id, project_id, status, due_date)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_qc_inspection_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  checklist_item JSONB;
BEGIN
  IF jsonb_typeof(NEW.items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'QC checklist items must be a JSON array.';
  END IF;
  IF jsonb_array_length(NEW.items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'QC checklist must contain between 1 and 100 items.';
  END IF;

  FOR checklist_item IN SELECT value FROM jsonb_array_elements(NEW.items)
  LOOP
    IF jsonb_typeof(checklist_item) IS DISTINCT FROM 'object'
      OR jsonb_typeof(checklist_item -> 'label') IS DISTINCT FROM 'string'
      OR length(trim(checklist_item ->> 'label')) NOT BETWEEN 2 AND 200
      OR jsonb_typeof(checklist_item -> 'result') IS DISTINCT FROM 'string'
      OR checklist_item ->> 'result' NOT IN ('pass', 'fail', 'not_applicable')
      OR jsonb_typeof(checklist_item -> 'notes') IS DISTINCT FROM 'string'
      OR length(checklist_item ->> 'notes') > 1000
    THEN
      RAISE EXCEPTION 'QC checklist item is invalid.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS qc_inspections_validate_items ON public.qc_inspections;
CREATE TRIGGER qc_inspections_validate_items
  BEFORE INSERT OR UPDATE OF items ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.validate_qc_inspection_items();

CREATE OR REPLACE FUNCTION public.validate_punch_list_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'open' OR NEW.after_photo_path IS NOT NULL THEN
      RAISE EXCEPTION 'Punch List items must start open without an after photo.';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects object
      WHERE object.bucket_id = 'quality-evidence'
        AND object.name = NEW.before_photo_path
    ) THEN
      RAISE EXCEPTION 'The Punch List before photo must exist in private storage.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'closed'
    AND (to_jsonb(NEW) - ARRAY['updated_at', 'deleted_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at', 'deleted_at'])
  THEN
    RAISE EXCEPTION 'Closed Punch List items cannot be changed.';
  END IF;

  IF NEW.after_photo_path IS DISTINCT FROM OLD.after_photo_path
    AND NEW.status <> 'closed'
  THEN
    RAISE EXCEPTION 'After photos can only be attached while closing a Punch List item.';
  END IF;
  IF NEW.before_photo_path IS DISTINCT FROM OLD.before_photo_path THEN
    RAISE EXCEPTION 'The Punch List before photo cannot be replaced.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'open' AND NEW.status = 'in_progress' THEN
      RETURN NEW;
    ELSIF OLD.status = 'in_progress' AND NEW.status = 'ready_for_inspection' THEN
      RETURN NEW;
    ELSIF OLD.status = 'ready_for_inspection' AND NEW.status = 'closed' THEN
      IF NEW.after_photo_path IS NULL THEN
        RAISE EXCEPTION 'An after photo is required before closing a Punch List item.';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM storage.objects object
        WHERE object.bucket_id = 'quality-evidence'
          AND object.name = NEW.after_photo_path
      ) THEN
        RAISE EXCEPTION 'The Punch List after photo must exist in private storage.';
      END IF;
      IF NOT public.has_role(
        NEW.organization_id,
        ARRAY[
          'owner'::public.user_role_type,
          'admin'::public.user_role_type,
          'project_manager'::public.user_role_type,
          'safety_officer'::public.user_role_type
        ]
      ) THEN
        RAISE EXCEPTION 'Current role cannot close Punch List items.';
      END IF;
      NEW.closed_by := auth.uid();
      NEW.closed_at := timezone('utc'::text, now());
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Punch List status transition is not allowed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS punch_list_items_validate_transition ON public.punch_list_items;
CREATE TRIGGER punch_list_items_validate_transition
  BEFORE INSERT OR UPDATE ON public.punch_list_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_punch_list_transition();

DROP TRIGGER IF EXISTS qc_inspections_set_updated_at ON public.qc_inspections;
CREATE TRIGGER qc_inspections_set_updated_at
  BEFORE UPDATE ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS punch_list_items_set_updated_at ON public.punch_list_items;
CREATE TRIGGER punch_list_items_set_updated_at
  BEFORE UPDATE ON public.punch_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS qc_inspections_audit ON public.qc_inspections;
CREATE TRIGGER qc_inspections_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS punch_list_items_audit ON public.punch_list_items;
CREATE TRIGGER punch_list_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.punch_list_items
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qc_inspections_read_org ON public.qc_inspections;
CREATE POLICY qc_inspections_read_org
  ON public.qc_inspections FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS qc_inspections_create_roles ON public.qc_inspections;
CREATE POLICY qc_inspections_create_roles
  ON public.qc_inspections FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS qc_inspections_update_roles ON public.qc_inspections;
CREATE POLICY qc_inspections_update_roles
  ON public.qc_inspections FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));

DROP POLICY IF EXISTS punch_list_items_read_org ON public.punch_list_items;
CREATE POLICY punch_list_items_read_org
  ON public.punch_list_items FOR SELECT
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS punch_list_items_create_roles ON public.punch_list_items;
CREATE POLICY punch_list_items_create_roles
  ON public.punch_list_items FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));
DROP POLICY IF EXISTS punch_list_items_update_roles ON public.punch_list_items;
CREATE POLICY punch_list_items_update_roles
  ON public.punch_list_items FOR UPDATE
  USING (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ))
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type,
      'safety_officer'::public.user_role_type
    ]
  ));

REVOKE ALL ON public.qc_inspections, public.punch_list_items
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE
  ON public.qc_inspections, public.punch_list_items
  TO authenticated;

DROP POLICY IF EXISTS "Quality evidence readable by referenced organization members" ON storage.objects;
CREATE POLICY "Quality evidence readable by referenced organization members"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quality-evidence'
    AND cardinality(storage.foldername(storage.objects.name)) = 4
    AND EXISTS (
      SELECT 1
      FROM public.punch_list_items item
      WHERE item.organization_id::text = (storage.foldername(storage.objects.name))[1]
        AND item.project_id::text = (storage.foldername(storage.objects.name))[2]
        AND item.id::text = (storage.foldername(storage.objects.name))[3]
        AND (item.before_photo_path = storage.objects.name OR item.after_photo_path = storage.objects.name)
        AND item.deleted_at IS NULL
        AND public.is_org_member(item.organization_id)
    )
  );

DROP POLICY IF EXISTS "Quality evidence upload by field roles" ON storage.objects;
CREATE POLICY "Quality evidence upload by field roles"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'quality-evidence'
    AND cardinality(storage.foldername(storage.objects.name)) = 4
    AND (storage.foldername(storage.objects.name))[4] IN ('before', 'after')
    AND EXISTS (
      SELECT 1
      FROM public.projects project
      WHERE project.organization_id::text = (storage.foldername(storage.objects.name))[1]
        AND project.id::text = (storage.foldername(storage.objects.name))[2]
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type,
            'site_manager'::public.user_role_type,
            'safety_officer'::public.user_role_type
          ]
        )
    )
  );

DROP POLICY IF EXISTS "Quality evidence delete by field roles" ON storage.objects;
CREATE POLICY "Quality evidence delete by field roles"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'quality-evidence'
    AND cardinality(storage.foldername(storage.objects.name)) = 4
    AND (storage.foldername(storage.objects.name))[4] IN ('before', 'after')
    AND EXISTS (
      SELECT 1
      FROM public.projects project
      WHERE project.organization_id::text = (storage.foldername(storage.objects.name))[1]
        AND project.id::text = (storage.foldername(storage.objects.name))[2]
        AND NOT EXISTS (
          SELECT 1
          FROM public.punch_list_items item
          WHERE (
            item.before_photo_path = storage.objects.name
            OR item.after_photo_path = storage.objects.name
          )
            AND item.deleted_at IS NULL
        )
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type,
            'site_manager'::public.user_role_type,
            'safety_officer'::public.user_role_type
          ]
        )
    )
  );
